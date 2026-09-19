"use server";

import { withCurrentTenant } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { LANDING_STATS_TAG } from "@/lib/stats";
import { ActionError, runAction } from "@/lib/action-error";
import { enforceRateLimit } from "@/lib/arcjet";
import { requireClerkUserId } from "@/lib/session";
import { APP_TIME_ZONE } from "@/lib/time";

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

// Serialises changes to one user's accounts. Two requests that both unset the
// old default and set a new one could otherwise interleave and leave two
// defaults (or none); holding the user's row lock makes the second wait.
async function lockUserAccounts(tx, userId) {
  await tx.$executeRaw`SELECT 1 FROM users WHERE id = ${userId} FOR UPDATE`;
}

export async function updateDefaultAccount(accountId) {
  return runAction(async () => {
    const clerkUserId = await requireClerkUserId();
    await enforceRateLimit("write", clerkUserId);

    const account = await withCurrentTenant(async (tx, userId) => {
      await lockUserAccounts(tx, userId);

      const target = await tx.account.findFirst({
        where: { id: accountId, userId },
        select: { id: true },
      });
      if (!target) throw new ActionError("Account not found");

      await tx.account.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });

      return tx.account.update({
        where: { id: accountId },
        data: { isDefault: true },
      });
    });

    revalidatePath("/dashboard");
    return { success: true, data: serializeTransaction(account) };
  });
}

// The table pages client-side, so it gets the most recent transactions,
// bounded, with the truncation reported rather than hidden.
// Not exported: a "use server" module may only export async functions.
const ACCOUNT_TRANSACTION_LIMIT = 500;

export async function getAccountWithTransactions(accountId) {
  return withCurrentTenant(async (tx, userId) => {
    const account = await tx.account.findFirst({
      where: { id: accountId, userId },
      include: {
        transactions: {
          orderBy: { date: "desc" },
          take: ACCOUNT_TRANSACTION_LIMIT,
        },
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!account) return null;

    // The chart used to be drawn from the same 500 rows, so "All Time" and its
    // totals silently stopped at the 500th transaction. Per-day sums over the
    // whole history are small whatever the account's size. Days follow the
    // app's calendar, like every other date grouping.
    const dailyTotals = await tx.$queryRaw`
      SELECT
        to_char(("date" AT TIME ZONE 'UTC') AT TIME ZONE ${APP_TIME_ZONE}, 'YYYY-MM-DD') AS day,
        COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME'), 0)::float8 AS income,
        COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE'), 0)::float8 AS expense
      FROM transactions
      WHERE "accountId" = ${accountId} AND "userId" = ${userId}
      GROUP BY 1
      ORDER BY 1`;

    return {
      ...serializeTransaction(account),
      transactions: account.transactions.map(serializeTransaction),
      dailyTotals,
      transactionLimit: ACCOUNT_TRANSACTION_LIMIT,
      hasMoreTransactions:
        account._count.transactions > account.transactions.length,
    };
  });
}

export async function bulkDeleteTransactions(transactionIds) {
  return runAction(async () => {
    const clerkUserId = await requireClerkUserId();
    await enforceRateLimit("write", clerkUserId);

    if (
      !Array.isArray(transactionIds) ||
      !transactionIds.every((id) => typeof id === "string")
    ) {
      throw new ActionError("Invalid transaction selection");
    }

    const deletedCount = await withCurrentTenant(async (tx, userId) => {
      const transactions = await tx.transaction.findMany({
        where: {
          id: { in: transactionIds },
          userId,
        },
        select: { id: true, type: true, amount: true, accountId: true },
      });

      if (transactions.length === 0) return 0;

      // Deleting an expense returns money to the account and deleting income
      // takes it back out. amount is a Prisma Decimal, whose valueOf() is a
      // string -- call toNumber() or the accumulator concatenates instead of
      // adding.
      const accountBalanceChanges = transactions.reduce((acc, transaction) => {
        const amount = transaction.amount.toNumber();
        const change = transaction.type === "EXPENSE" ? amount : -amount;

        acc[transaction.accountId] = (acc[transaction.accountId] || 0) + change;
        return acc;
      }, {});

      await tx.transaction.deleteMany({
        where: {
          id: { in: transactions.map((t) => t.id) },
          userId,
        },
      });

      for (const [accountId, balanceChange] of Object.entries(
        accountBalanceChanges
      )) {
        await tx.account.updateMany({
          where: { id: accountId, userId },
          data: {
            balance: {
              increment: balanceChange,
            },
          },
        });
      }

      return transactions.length;
    });

    revalidatePath("/dashboard");
    revalidatePath("/account/[id]", "page");
    revalidateTag(LANDING_STATS_TAG);

    return { success: true, data: { deleted: deletedCount } };
  });
}
