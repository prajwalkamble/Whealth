"use server";

import { enforceRateLimit } from "@/lib/arcjet";
import { runAction } from "@/lib/action-error";
import { requireClerkUserId } from "@/lib/session";
import { monthBounds } from "@/lib/time";
import { revalidatePath, revalidateTag } from "next/cache";
import { LANDING_STATS_TAG } from "@/lib/stats";
import { withCurrentTenant } from "@/lib/prisma";
import { accountInputSchema, parseOrThrow } from "@/app/lib/schema";

const serializeTransaction = (obj) => {
  const serialized = { ...obj };
  if (obj.balance) {
    serialized.balance = obj.balance.toNumber();
  }
  if (obj.amount) {
    serialized.amount = obj.amount.toNumber();
  }
  return serialized;
};

export async function createAccount(rawData) {
  return runAction(async () => {
    const clerkUserId = await requireClerkUserId();

    // Re-validated server-side: the form schema only ever ran in the browser.
    // Parsing also drops unknown keys, so the create below cannot be fed extra
    // columns such as id or userId.
    const data = parseOrThrow(accountInputSchema, rawData);

    await enforceRateLimit("account", clerkUserId);

    const account = await withCurrentTenant(async (tx, userId) => {
      // Two first-account requests in flight at once both counted zero
      // accounts and both became the default. Holding the user's row lock
      // makes the second wait and see the first.
      await tx.$executeRaw`SELECT 1 FROM users WHERE id = ${userId} FOR UPDATE`;

      // Check if this is the user's first account
      const existingAccounts = await tx.account.count({ where: { userId } });

      const shouldBeDefault = existingAccounts === 0 ? true : data.isDefault;

      // If the account should be default, unset other default accounts
      if (shouldBeDefault) {
        await tx.account.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.account.create({
        data: {
          name: data.name,
          type: data.type,
          balance: data.balance,
          userId,
          isDefault: shouldBeDefault,
        },
      });
    });

    revalidatePath("/dashboard");
    // A first account turns a signed-up user into an active one.
    revalidateTag(LANDING_STATS_TAG);
    return { success: true, data: serializeTransaction(account) };
  });
}

export async function getUserAccounts() {
  return withCurrentTenant(async (tx, userId) => {
    const accounts = await tx.account.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });
    return accounts.map(serializeTransaction);
  });
}

// The four figures on the dashboard's stat cards. Aggregated by the database
// rather than summed from the transaction list, which is capped and would
// quietly under-report once an account grows past the cap.
export async function getDashboardSummary() {
  return withCurrentTenant(async (tx, userId) => {
    const { startOfMonth, endOfMonth } = monthBounds();
    const monthWindow = { gte: startOfMonth, lte: endOfMonth };

    const [balance, income, expenses] = await Promise.all([
      tx.account.aggregate({ where: { userId }, _sum: { balance: true } }),
      tx.transaction.aggregate({
        where: { userId, type: "INCOME", date: monthWindow },
        _sum: { amount: true },
      }),
      tx.transaction.aggregate({
        where: { userId, type: "EXPENSE", date: monthWindow },
        _sum: { amount: true },
      }),
    ]);

    const monthlyIncome = income._sum.amount?.toNumber() ?? 0;
    const monthlyExpenses = expenses._sum.amount?.toNumber() ?? 0;

    return {
      totalBalance: balance._sum.balance?.toNumber() ?? 0,
      monthlyIncome,
      monthlyExpenses,
      // Null rather than 0 when nothing came in: "0% saved" would claim the
      // user spent everything they earned, which is not what no income means.
      savingsRate:
        monthlyIncome > 0
          ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100
          : null,
    };
  });
}

// The dashboard overview needs exactly two things: the handful of most recent
// transactions per account, and this month's expenses for the category
// breakdown. It used to load every transaction the user had ever made and ship
// all of them to the browser to be filtered there.
const RECENT_TRANSACTION_LIMIT = 100;
const MONTHLY_TRANSACTION_LIMIT = 2000;

export async function getDashboardData() {
  return withCurrentTenant(async (tx, userId) => {
    // This month on the app's calendar, matching the budget and the reports.
    const { startOfMonth } = monthBounds();

    const [recent, thisMonth] = await Promise.all([
      tx.transaction.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: RECENT_TRANSACTION_LIMIT,
      }),
      tx.transaction.findMany({
        where: { userId, date: { gte: startOfMonth } },
        orderBy: { date: "desc" },
        take: MONTHLY_TRANSACTION_LIMIT,
      }),
    ]);

    // The two windows overlap, so de-duplicate before handing them over.
    const byId = new Map();
    for (const row of [...recent, ...thisMonth]) byId.set(row.id, row);

    return [...byId.values()]
      .sort((a, b) => b.date - a.date)
      .map(serializeTransaction);
  });
}
