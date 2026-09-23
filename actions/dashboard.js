"use server";

import { enforceRateLimit } from "@/lib/arcjet";
import { runAction } from "@/lib/action-error";
import { requireClerkUserId } from "@/lib/session";
import {
  APP_TIME_ZONE,
  monthBounds,
  monthBoundsFor,
  monthName,
  previousMonth,
  zonedYearMonth,
} from "@/lib/time";
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

async function accountsFor(tx, userId) {
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
}

// The four figures on the dashboard's stat cards, each with the change
// against last month. Aggregated by the database rather than summed from the
// transaction list, which is capped and would quietly under-report once an
// account grows past the cap.
async function summaryFor(tx, userId) {
    const thisMonth = monthBounds();
    const lastMonth = monthBoundsFor(
      ...Object.values(previousMonth(zonedYearMonth()))
    );

    const totals = async ({ startOfMonth, endOfMonth }) => {
      const window = { gte: startOfMonth, lte: endOfMonth };
      const [income, expenses] = await Promise.all([
        tx.transaction.aggregate({
          where: { userId, type: "INCOME", date: window },
          _sum: { amount: true },
        }),
        tx.transaction.aggregate({
          where: { userId, type: "EXPENSE", date: window },
          _sum: { amount: true },
        }),
      ]);
      return {
        income: income._sum.amount?.toNumber() ?? 0,
        expenses: expenses._sum.amount?.toNumber() ?? 0,
      };
    };

    const [balance, current, previous, accounts, sinceFirst] = await Promise.all([
      tx.account.aggregate({ where: { userId }, _sum: { balance: true } }),
      totals(thisMonth),
      totals(lastMonth),
      tx.account.findMany({
        where: { userId },
        select: { id: true, balance: true, createdAt: true },
      }),
      tx.transaction.groupBy({
        by: ["accountId", "type"],
        where: { userId, date: { gte: thisMonth.startOfMonth } },
        _sum: { amount: true },
      }),
    ]);

    // The balance on the 1st, for the Total Balance change. Only accounts
    // that existed on the 1st count: an account opened later in the month
    // had no balance then, and working one back from today's figure lands on
    // its opening balance -- whatever was typed at creation -- which made a
    // ₹5,000 opening read as the starting point and today's total as +1,142%.
    const netSinceFirst = new Map();
    for (const row of sinceFirst) {
      const amount = row._sum.amount?.toNumber() ?? 0;
      const signed = row.type === "INCOME" ? amount : -amount;
      netSinceFirst.set(row.accountId, (netSinceFirst.get(row.accountId) ?? 0) + signed);
    }
    const existing = accounts.filter((a) => a.createdAt < thisMonth.startOfMonth);
    const balanceSince = existing.length
      ? {
          start: existing.reduce(
            (sum, a) => sum + a.balance.toNumber() - (netSinceFirst.get(a.id) ?? 0),
            0
          ),
          now: existing.reduce((sum, a) => sum + a.balance.toNumber(), 0),
        }
      : null;

    // Null rather than 0 when nothing came in: "0% saved" would claim the
    // user spent everything they earned, which is not what no income means.
    const savingsRate = ({ income, expenses }) =>
      income > 0 ? ((income - expenses) / income) * 100 : null;

    return {
      totalBalance: balance._sum.balance?.toNumber() ?? 0,
      monthlyIncome: current.income,
      monthlyExpenses: current.expenses,
      savingsRate: savingsRate(current),
      // Last month, for the change shown on each card. Null where there is
      // nothing to compare against, so the card says so instead of "+100%".
      previous: {
        income: previous.income,
        expenses: previous.expenses,
        savingsRate: savingsRate(previous),
        net: previous.income - previous.expenses,
      },
      net: current.income - current.expenses,
      // null when every account was opened this month: there is no earlier
      // balance to measure against.
      balanceSince,
    };
}

// Income and expenses per calendar month for the cash-flow chart. Grouped by
// the database on the app's calendar, so a year of history is a dozen rows
// whatever the number of transactions behind it.
const CASH_FLOW_MONTHS = 6;

async function cashFlowFor(tx, userId, months = CASH_FLOW_MONTHS) {
    const { year, month } = zonedYearMonth();
    // Start at the first day of the earliest month in the window.
    const { startOfMonth: from } = monthBoundsFor(year, month - (months - 1));
    const { endOfMonth: to } = monthBoundsFor(year, month);

    const rows = await tx.$queryRaw`
      SELECT
        to_char(("date" AT TIME ZONE 'UTC') AT TIME ZONE ${APP_TIME_ZONE}, 'YYYY-MM') AS month,
        COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME'), 0)::float8 AS income,
        COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE'), 0)::float8 AS expense
      FROM transactions
      WHERE "userId" = ${userId} AND "date" >= ${from} AND "date" <= ${to}
      GROUP BY 1
      ORDER BY 1`;

    // Months with no activity are absent from the result but still belong on
    // the chart, otherwise the axis skips them.
    const byMonth = new Map(rows.map((row) => [row.month, row]));
    return Array.from({ length: months }, (_, index) => {
      const at = monthBoundsFor(year, month - (months - 1 - index)).startOfMonth;
      const { year: y, month: m } = zonedYearMonth(at);
      const key = `${y}-${String(m + 1).padStart(2, "0")}`;
      const row = byMonth.get(key);
      return {
        month: key,
        label: monthName(y, m).slice(0, 3),
        income: row?.income ?? 0,
        expense: row?.expense ?? 0,
      };
    });
}

// This month's totals per category, for the breakdown charts.
async function breakdownFor(tx, userId) {
    const { startOfMonth, endOfMonth } = monthBounds();

    const rows = await tx.transaction.groupBy({
      by: ["type", "category"],
      where: { userId, date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
    });

    const of = (type) =>
      rows
        .filter((row) => row.type === type)
        .map((row) => ({
          category: row.category,
          amount: row._sum.amount?.toNumber() ?? 0,
        }))
        .filter((row) => row.amount > 0)
        .sort((a, b) => b.amount - a.amount);

    return { expenses: of("EXPENSE"), income: of("INCOME") };
}

// The dashboard overview needs exactly two things: the handful of most recent
// transactions per account, and this month's expenses for the category
// breakdown. It used to load every transaction the user had ever made and ship
// all of them to the browser to be filtered there.
const RECENT_TRANSACTION_LIMIT = 100;
const MONTHLY_TRANSACTION_LIMIT = 2000;

async function recentTransactionsFor(tx, userId) {
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
}

// Everything the dashboard renders, in ONE transaction.
//
// Each helper above used to be its own action, and the page called five of
// them at once plus the budget and the rating: seven interactive transactions
// racing for pool connections on every load. Past a few of those, Prisma gives
// up waiting for one and the page fails with "Unable to start a transaction in
// the given time". One transaction also means the tenant context is set once
// and every figure comes from the same consistent snapshot.
export async function getDashboardPageData() {
  return withCurrentTenant(async (tx, userId) => {
    const accounts = await accountsFor(tx, userId);
    const defaultAccount = accounts.find((account) => account.isDefault);

    const [transactions, summary, cashFlow, breakdown] = await Promise.all([
      recentTransactionsFor(tx, userId),
      summaryFor(tx, userId),
      cashFlowFor(tx, userId),
      breakdownFor(tx, userId),
    ]);

    // Same shape getCurrentBudget returns; kept here rather than calling that
    // action, which would open a second transaction.
    const { startOfMonth, endOfMonth } = monthBounds();
    const [budgetRow, budgetExpenses, rating] = await Promise.all([
      tx.budget.findUnique({ where: { userId } }),
      defaultAccount
        ? tx.transaction.aggregate({
            where: {
              userId,
              type: "EXPENSE",
              accountId: defaultAccount.id,
              date: { gte: startOfMonth, lte: endOfMonth },
            },
            _sum: { amount: true },
          })
        : null,
      tx.rating.findUnique({ where: { userId }, select: { score: true } }),
    ]);

    return {
      accounts,
      transactions,
      summary,
      cashFlow,
      breakdown,
      budget: {
        budget: budgetRow
          ? { ...budgetRow, amount: budgetRow.amount.toNumber() }
          : null,
        currentExpenses: budgetExpenses?._sum.amount?.toNumber() ?? 0,
      },
      rating: rating?.score ?? null,
    };
  });
}

// The same reads on their own, for pages that need one of them.
export async function getUserAccounts() {
  return withCurrentTenant(accountsFor);
}

export async function getDashboardSummary() {
  return withCurrentTenant(summaryFor);
}

export async function getMonthlyCashFlow(months = CASH_FLOW_MONTHS) {
  return withCurrentTenant((tx, userId) => cashFlowFor(tx, userId, months));
}

export async function getCategoryBreakdown() {
  return withCurrentTenant(breakdownFor);
}

export async function getDashboardData() {
  return withCurrentTenant(recentTransactionsFor);
}
