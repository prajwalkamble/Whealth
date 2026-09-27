// The dashboard's aggregations, computed in the browser over an array instead
// of by Postgres over a table.
//
// This mirrors lib/queries.js on purpose: the widgets take the same shapes
// either way, so demo mode reuses the real dashboard components rather than a
// parallel set that could drift from them. Keep the two in step -- a field
// added to a summary there needs adding here, or the demo renders a gap.

import {
  monthBounds,
  monthBoundsFor,
  monthName,
  previousMonth,
  zonedYearMonth,
} from "@/lib/time";

const within = (date, { startOfMonth, endOfMonth }) => {
  const at = new Date(date);
  return at >= startOfMonth && at <= endOfMonth;
};

const sum = (rows, type) =>
  rows
    .filter((row) => row.type === type)
    .reduce((total, row) => total + Number(row.amount), 0);

// Null rather than 0 when nothing came in: "0% saved" would claim the guest
// spent everything they earned, which is not what no income means.
const savingsRate = (income, expenses) =>
  income > 0 ? ((income - expenses) / income) * 100 : null;

export function summaryFrom(accounts, transactions) {
  const thisMonth = monthBounds();
  const lastMonth = monthBoundsFor(
    ...Object.values(previousMonth(zonedYearMonth()))
  );

  const current = transactions.filter((t) => within(t.date, thisMonth));
  const previous = transactions.filter((t) => within(t.date, lastMonth));

  const monthlyIncome = sum(current, "INCOME");
  const monthlyExpenses = sum(current, "EXPENSE");
  const previousIncome = sum(previous, "INCOME");
  const previousExpenses = sum(previous, "EXPENSE");

  const totalBalance = accounts.reduce((total, a) => total + a.balance, 0);

  // The balance on the 1st, for the Total Balance change -- counting only
  // accounts that existed then, exactly as the real dashboard does.
  const existing = accounts.filter(
    (a) => new Date(a.createdAt) < thisMonth.startOfMonth
  );
  const netSince = new Map();
  for (const t of transactions) {
    if (new Date(t.date) < thisMonth.startOfMonth) continue;
    const signed = t.type === "INCOME" ? Number(t.amount) : -Number(t.amount);
    netSince.set(t.accountId, (netSince.get(t.accountId) ?? 0) + signed);
  }

  const balanceSince = existing.length
    ? {
        start: existing.reduce(
          (total, a) => total + a.balance - (netSince.get(a.id) ?? 0),
          0
        ),
        now: existing.reduce((total, a) => total + a.balance, 0),
      }
    : null;

  return {
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    savingsRate: savingsRate(monthlyIncome, monthlyExpenses),
    previous: {
      income: previousIncome,
      expenses: previousExpenses,
      savingsRate: savingsRate(previousIncome, previousExpenses),
    },
    net: monthlyIncome - monthlyExpenses,
    balanceSince,
  };
}

const CASH_FLOW_MONTHS = 6;

export function cashFlowFrom(transactions, months = CASH_FLOW_MONTHS) {
  const { year, month } = zonedYearMonth();

  return Array.from({ length: months }, (_, index) => {
    const offset = month - (months - 1 - index);
    const bounds = monthBoundsFor(year, offset);
    const rows = transactions.filter((t) => within(t.date, bounds));
    const { year: y, month: m } = zonedYearMonth(bounds.startOfMonth);

    return {
      month: `${y}-${String(m + 1).padStart(2, "0")}`,
      label: monthName(y, m).slice(0, 3),
      income: sum(rows, "INCOME"),
      expense: sum(rows, "EXPENSE"),
    };
  });
}

export function breakdownFrom(transactions) {
  const bounds = monthBounds();
  const rows = transactions.filter((t) => within(t.date, bounds));

  const of = (type) => {
    const totals = new Map();
    for (const row of rows) {
      if (row.type !== type) continue;
      totals.set(
        row.category,
        (totals.get(row.category) ?? 0) + Number(row.amount)
      );
    }
    return [...totals.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .filter((row) => row.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  };

  return { expenses: of("EXPENSE"), income: of("INCOME") };
}

// This month's spending on the default account, against the budget.
export function budgetFrom(transactions, accounts, amount) {
  const bounds = monthBounds();
  const defaultAccount = accounts.find((a) => a.isDefault) ?? accounts[0];

  const currentExpenses = transactions
    .filter(
      (t) =>
        t.type === "EXPENSE" &&
        t.accountId === defaultAccount?.id &&
        within(t.date, bounds)
    )
    .reduce((total, t) => total + Number(t.amount), 0);

  return {
    budget: amount ? { amount } : null,
    currentExpenses,
  };
}

// Account balances follow from the sample opening balance plus everything
// posted against them, so a transaction the guest adds moves the right total
// instead of leaving the balance stale.
export function accountsWithTotals(accounts, transactions) {
  return accounts.map((account) => {
    const rows = transactions.filter((t) => t.accountId === account.id);
    const net = rows.reduce(
      (total, t) =>
        total + (t.type === "INCOME" ? Number(t.amount) : -Number(t.amount)),
      0
    );
    return {
      ...account,
      balance: account.openingBalance + net,
      _count: { transactions: rows.length },
    };
  });
}

// Everything the dashboard page needs, in the shape getDashboardPageData
// returns it.
export function dashboardFrom(accounts, transactions, budgetAmount) {
  return {
    accounts,
    transactions,
    summary: summaryFrom(accounts, transactions),
    cashFlow: cashFlowFrom(transactions),
    breakdown: breakdownFrom(transactions),
    budget: budgetFrom(transactions, accounts, budgetAmount),
  };
}
