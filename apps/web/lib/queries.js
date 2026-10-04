// Read-only queries behind the signed-in pages.
//
// Deliberately NOT a "use server" module. Every export of one of those is a
// public HTTP endpoint, and these are only ever called from server components
// -- so exporting them as actions published a handful of endpoints that
// nothing in the app called. They are ordinary server-side functions: the
// pages import them directly, and the tenant transaction below is still what
// scopes every row to the caller.
//
// Writes stay in actions/: they are what the browser actually invokes.

import {
  APP_TIME_ZONE,
  monthBounds,
  monthBoundsFor,
  monthName,
  previousMonth,
  zonedYearMonth,
} from "@/lib/time";
import {
  categoryBreakdown,
  monthlyFlow,
  monthWindow,
  periodTotals,
  windowBounds,
} from "@/lib/analytics";
import { budgetPace, budgetTotals, periodProgress } from "@/lib/budget-pace";
import { withCurrentTenant } from "@/lib/prisma";

// Prisma Decimal instances cannot cross the server/client boundary.
//
// Every column is converted only if it is actually present. A query may select
// part of a row -- the /transactions table joins each transaction's account for
// its name alone -- and a serializer that assumed a joined account carried a
// balance threw "Cannot read properties of undefined (reading 'toNumber')" for
// the whole page. Recursing on the join keeps the one rule in one place.
export const serializeDecimals = (obj) => {
  const serialized = { ...obj };
  if (obj.balance != null) {
    serialized.balance = obj.balance.toNumber();
  }
  if (obj.amount != null) {
    serialized.amount = obj.amount.toNumber();
  }
  if (obj.account) {
    serialized.account = serializeDecimals(obj.account);
  }
  return serialized;
};

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
  return accounts.map(serializeDecimals);
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
export const CASH_FLOW_MONTHS = 6;

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
    .map(serializeDecimals);
}

// This month's spending on one account, against the budget. accountId is
// required: passing undefined puts no filter on the column at all, so the
// figure silently became "every account" rather than the default one.
async function budgetFor(tx, userId, accountId) {
  const { startOfMonth, endOfMonth } = monthBounds();

  const [budget, expenses] = await Promise.all([
    // The overall monthly budget is the row with no category. findFirst
    // rather than findUnique: userId stopped being unique when per-category
    // budgets arrived.
    tx.budget.findFirst({ where: { userId, category: null } }),
    accountId
      ? tx.transaction.aggregate({
          where: {
            userId,
            type: "EXPENSE",
            accountId,
            date: { gte: startOfMonth, lte: endOfMonth },
          },
          _sum: { amount: true },
        })
      : null,
  ]);

  return {
    budget: budget ? { ...budget, amount: budget.amount.toNumber() } : null,
    currentExpenses: expenses?._sum.amount?.toNumber() ?? 0,
  };
}

// Everything the dashboard renders, in ONE transaction.
//
// Each helper above used to be its own action, and the page called five of
// them at once plus the budget: six interactive transactions racing for pool
// connections on every load. Past a few of those, Prisma gives up waiting for
// one and the page fails with "Unable to start a transaction in the given
// time". One transaction also means the tenant context is set once and every
// figure comes from the same consistent snapshot.
export async function getDashboardPageData() {
  return withCurrentTenant(async (tx, userId) => {
    const accounts = await accountsFor(tx, userId);
    const defaultAccount = accounts.find((account) => account.isDefault);

    const [transactions, summary, cashFlow, breakdown, budget] =
      await Promise.all([
        recentTransactionsFor(tx, userId),
        summaryFor(tx, userId),
        cashFlowFor(tx, userId),
        breakdownFor(tx, userId),
        budgetFor(tx, userId, defaultAccount?.id),
      ]);

    return { accounts, transactions, summary, cashFlow, breakdown, budget };
  });
}

// The same reads on their own, for pages and tests that need one of them.
export async function getUserAccounts() {
  return withCurrentTenant(accountsFor);
}

// Cards, newest first, with the account each one settles from.
//
// creditLimit is a Decimal and crosses into a client component, so it is
// converted here at the serialisation boundary like every other money column.
async function cardsFor(tx, userId) {
  const rows = await tx.card.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { account: { select: { id: true, name: true } } },
  });

  return rows.map((card) => ({
    ...card,
    creditLimit: card.creditLimit == null ? null : card.creditLimit.toNumber(),
  }));
}

export async function getUserCards() {
  return withCurrentTenant(cardsFor);
}

// Cards and the accounts they can be linked to, in ONE transaction.
//
// The page needs both, and calling the two readers concurrently opened two
// interactive transactions racing for pool connections on every load -- the
// same pattern the dashboard comment below describes having fixed. One
// transaction, two queries inside it.
export async function getCardsPageData() {
  return withCurrentTenant(async (tx, userId) => {
    const [cards, accounts] = await Promise.all([
      cardsFor(tx, userId),
      tx.account.findMany({
        where: { userId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);
    return { cards, accounts };
  });
}

// Budgets with what was actually spent against each one, for a chosen month,
// plus the same figure for the month before so each row can carry its change.
//
// Spending is derived from transactions every time rather than stored on the
// budget row: a total kept alongside the limit is a second source of truth
// that drifts the moment a transaction is edited or deleted.
//
// Two groupBys and two aggregates for the whole page rather than a query per
// budget, so adding budgets does not add round trips.
//
// Note what the period selector does and does not do. A Budget row has no
// period: it is one standing limit with no history. Choosing a past month
// re-measures real spending for that month against the limit as it stands
// today -- it does not recover what the limit was back then, because that is
// not stored. The UI says so.
async function budgetsFor(tx, userId, { year, month } = {}) {
  const target =
    year != null && month != null ? { year, month } : zonedYearMonth();
  const prior = previousMonth(target);

  const now = monthBoundsFor(target.year, target.month);
  const before = monthBoundsFor(prior.year, prior.month);

  const expenseIn = ({ startOfMonth, endOfMonth }) => ({
    userId,
    type: "EXPENSE",
    date: { gte: startOfMonth, lte: endOfMonth },
  });

  const [budgets, nowByCategory, beforeByCategory, nowAll, beforeAll] =
    await Promise.all([
      tx.budget.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      tx.transaction.groupBy({
        by: ["category"],
        where: expenseIn(now),
        _sum: { amount: true },
        _count: { _all: true },
      }),
      tx.transaction.groupBy({
        by: ["category"],
        where: expenseIn(before),
        _sum: { amount: true },
      }),
      tx.transaction.aggregate({
        where: expenseIn(now),
        _sum: { amount: true },
        _count: { _all: true },
      }),
      tx.transaction.aggregate({
        where: expenseIn(before),
        _sum: { amount: true },
      }),
    ]);

  const spendNow = new Map(
    nowByCategory.map((r) => [
      r.category,
      { spent: r._sum.amount?.toNumber() ?? 0, count: r._count._all },
    ])
  );
  const spendBefore = new Map(
    beforeByCategory.map((r) => [r.category, r._sum.amount?.toNumber() ?? 0])
  );

  const progress = periodProgress(now);

  const rows = budgets.map((budget) => {
    const limit = budget.amount.toNumber();
    const overall = budget.category === null;

    const { spent, count } = overall
      ? { spent: nowAll._sum.amount?.toNumber() ?? 0, count: nowAll._count._all }
      : spendNow.get(budget.category) ?? { spent: 0, count: 0 };

    const previousSpent = overall
      ? beforeAll._sum.amount?.toNumber() ?? 0
      : spendBefore.get(budget.category) ?? 0;

    const pace = budgetPace({ amount: limit, spent, previousSpent, progress });

    return {
      id: budget.id,
      category: budget.category,
      amount: limit,
      spent,
      transactions: count,
      previousSpent,
      remaining: pace.remaining,
      percentUsed: pace.percentUsed,
      pace,
    };
  });

  return {
    budgets: rows,
    progress,
    period: {
      year: target.year,
      month: target.month,
      label: monthName(target.year, target.month),
      previousLabel: monthName(prior.year, prior.month),
    },
    totals: budgetTotals(rows),
  };
}

export async function getBudgets(period) {
  return withCurrentTenant((tx, userId) => budgetsFor(tx, userId, period));
}

// Goals with progress, derived from their contributions.
//
// One groupBy for every goal rather than a query per goal, so adding goals
// does not add round trips. saved is the sum of real contribution rows; there
// is no stored running total to drift.
async function goalsFor(tx, userId) {
  const [goals, sums] = await Promise.all([
    tx.goal.findMany({
      where: { userId },
      orderBy: [{ status: "asc" }, { targetDate: "asc" }, { createdAt: "desc" }],
    }),
    tx.goalContribution.groupBy({
      by: ["goalId"],
      where: { userId },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const progress = new Map(
    sums.map((row) => [
      row.goalId,
      { saved: row._sum.amount?.toNumber() ?? 0, count: row._count._all },
    ])
  );

  return goals.map((goal) => {
    const target = goal.targetAmount.toNumber();
    const { saved, count } = progress.get(goal.id) ?? { saved: 0, count: 0 };

    return {
      id: goal.id,
      name: goal.name,
      description: goal.description,
      targetAmount: target,
      targetDate: goal.targetDate ? goal.targetDate.toISOString() : null,
      // Pacing is measured from when the goal was set, so the client needs it.
      createdAt: goal.createdAt.toISOString(),
      status: goal.status,
      saved,
      contributions: count,
      remaining: Math.max(target - saved, 0),
      // target is > 0 by database constraint, so this cannot divide by zero.
      percentComplete: Math.min((saved / target) * 100, 100),
    };
  });
}

export async function getGoals() {
  return withCurrentTenant(goalsFor);
}

// A goal's own contribution history, newest first.
export async function getGoalContributions(goalId) {
  return withCurrentTenant(async (tx, userId) => {
    const rows = await tx.goalContribution.findMany({
      // Scoped by userId as well as goalId: the id alone is guessable.
      where: { goalId, userId },
      orderBy: { date: "desc" },
      take: 50,
    });
    return rows.map((row) => ({
      id: row.id,
      amount: row.amount.toNumber(),
      date: row.date.toISOString(),
      note: row.note,
    }));
  });
}

// Everything the Analytics page needs, in one transaction.
//
// Rows are fetched once for the whole window and aggregated in lib/analytics.js
// rather than issuing a query per month or per category: the page compares two
// periods and breaks both down, and doing that in SQL would be a dozen round
// trips for data already in hand.
//
// `months` is clamped so a crafted value cannot ask for an unbounded range.
// Filters are applied in the query, and withCurrentTenant scopes every read to
// the caller, so an accountId belonging to someone else returns nothing.
export async function getAnalytics({ months = 6, accountId = null, type = null } = {}) {
  const span = Math.min(Math.max(Number(months) || 6, 2), 24);

  return withCurrentTenant(async (tx, userId) => {
    const window = monthWindow(span);
    const { startOfMonth, endOfMonth } = windowBounds(window);

    // The period analysed is the newest month in the window; the one before it
    // is the comparison.
    const currentMonth = window[window.length - 1];
    const priorMonth = previousMonth(currentMonth);
    const currentBounds = monthBoundsFor(currentMonth.year, currentMonth.month);
    const priorBounds = monthBoundsFor(priorMonth.year, priorMonth.month);

    const from =
      priorBounds.startOfMonth < startOfMonth ? priorBounds.startOfMonth : startOfMonth;

    const [rows, accounts] = await Promise.all([
      tx.transaction.findMany({
        where: {
          userId,
          date: { gte: from, lte: endOfMonth },
          ...(accountId ? { accountId } : {}),
          ...(type ? { type } : {}),
        },
        select: { type: true, amount: true, category: true, date: true, accountId: true },
        orderBy: { date: "asc" },
      }),
      tx.account.findMany({ where: { userId }, select: { id: true, name: true } }),
    ]);

    // Decimal -> number once, at the boundary, before any arithmetic.
    const transactions = rows.map((row) => ({
      type: row.type,
      amount: row.amount.toNumber(),
      category: row.category,
      date: row.date,
      accountId: row.accountId,
    }));

    const inRange = (a, b) => transactions.filter((t) => t.date >= a && t.date <= b);
    const current = inRange(currentBounds.startOfMonth, currentBounds.endOfMonth);
    const prior = inRange(priorBounds.startOfMonth, priorBounds.endOfMonth);

    return {
      span,
      accounts,
      hasAnyTransactions: transactions.length > 0,
      // Whether a comparison is possible at all, so the page can say "not
      // enough data" instead of printing a change against nothing.
      hasPriorData: prior.length > 0,
      flow: monthlyFlow(window, transactions),
      current: periodTotals(current),
      previous: periodTotals(prior),
      categories: categoryBreakdown(current, prior),
      period: {
        label: monthName(currentMonth.year, currentMonth.month),
        year: currentMonth.year,
        previousLabel: monthName(priorMonth.year, priorMonth.month),
      },
    };
  });
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

export async function getRecentTransactions() {
  return withCurrentTenant(recentTransactionsFor);
}

export async function getCurrentBudget(accountId) {
  return withCurrentTenant((tx, userId) => budgetFor(tx, userId, accountId));
}

// The caller's own rating, for the star control on the settings page. Null
// until they have rated.
export async function getMyRating() {
  return withCurrentTenant(async (tx, userId) => {
    const rating = await tx.rating.findUnique({
      where: { userId },
      select: { score: true },
    });
    return rating?.score ?? null;
  });
}
