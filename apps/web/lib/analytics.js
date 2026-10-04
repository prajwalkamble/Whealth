// Analytics aggregation.
//
// Every figure on the Analytics page is computed here from real transaction
// rows. Nothing is estimated, projected or interpreted: the page reports what
// the ledger says and stops.
//
// Two rules this file exists to enforce:
//
//   1. A percentage change against a zero baseline is not 0%, and it is not
//      infinity. It is unanswerable, and `change()` returns null so the UI can
//      say "no prior data" instead of printing a number that means nothing.
//
//   2. Amounts are summed directly because the schema has no currency column:
//      every transaction is in one currency. If a currency column is ever
//      added, these sums become wrong and must be grouped by it first.

import { APP_TIME_ZONE, monthBoundsFor, previousMonth, zonedYearMonth } from "./time";

// Percentage change from `before` to `after`.
//
// null means "cannot be expressed": there was nothing before, so any increase
// is an infinite proportion of it. The caller is expected to render that as
// text rather than as a number.
export function change(after, before) {
  if (!Number.isFinite(after) || !Number.isFinite(before)) return null;
  if (before === 0) return null;
  return ((after - before) / Math.abs(before)) * 100;
}

// The month a period starts in, and the N months before it, oldest first.
export function monthWindow(months, from = new Date()) {
  const out = [];
  let cursor = zonedYearMonth(from);
  for (let i = 0; i < months; i++) {
    out.unshift(cursor);
    cursor = previousMonth(cursor);
  }
  return out;
}

// Bounds covering a whole window, so one query can fetch every month at once.
export function windowBounds(window) {
  const first = monthBoundsFor(window[0].year, window[0].month);
  const last = monthBoundsFor(
    window[window.length - 1].year,
    window[window.length - 1].month
  );
  return { startOfMonth: first.startOfMonth, endOfMonth: last.endOfMonth };
}

// Which month of the window a date belongs to, in the app's timezone rather
// than the server's, so a transaction at 23:30 on the 31st does not land in
// the following month for a user in another zone.
// month + 1 because lib/time.js works in 0-11, as JS Date does. Padding the
// raw index produced "2026-09" for October: self-consistent for bucketing, but
// a key nobody could read correctly and a month out for anything that later
// formats from it.
export function monthKeyOf(date, timeZone = APP_TIME_ZONE) {
  return keyOf(zonedYearMonth(date, timeZone));
}

export const keyOf = ({ year, month }) =>
  `${year}-${String(month + 1).padStart(2, "0")}`;

// Income, expenses and net per month across the window.
//
// Months with no activity are present with zeros rather than missing, so the
// chart has a continuous axis instead of silently collapsing a quiet month.
export function monthlyFlow(window, transactions) {
  const buckets = new Map(
    window.map((m) => [keyOf(m), { income: 0, expenses: 0 }])
  );

  for (const row of transactions) {
    const bucket = buckets.get(monthKeyOf(row.date));
    if (!bucket) continue;
    if (row.type === "INCOME") bucket.income += row.amount;
    else bucket.expenses += row.amount;
  }

  return window.map((m) => {
    const { income, expenses } = buckets.get(keyOf(m));
    return { year: m.year, month: m.month, income, expenses, net: income - expenses };
  });
}

// Spending by category for one period, with the same categories in the period
// before it, so each row can carry its own change.
export function categoryBreakdown(current, previous) {
  const sum = (rows) => {
    const out = new Map();
    for (const row of rows) {
      if (row.type !== "EXPENSE") continue;
      const entry = out.get(row.category) ?? { amount: 0, count: 0 };
      entry.amount += row.amount;
      entry.count += 1;
      out.set(row.category, entry);
    }
    return out;
  };

  const now = sum(current);
  const before = sum(previous);
  const total = [...now.values()].reduce((s, e) => s + e.amount, 0);

  // Every category present in either period, so one that stopped entirely is
  // still reported rather than vanishing from the comparison.
  const categories = new Set([...now.keys(), ...before.keys()]);

  return [...categories]
    .map((category) => {
      const amount = now.get(category)?.amount ?? 0;
      const previousAmount = before.get(category)?.amount ?? 0;
      return {
        category,
        amount,
        count: now.get(category)?.count ?? 0,
        previousAmount,
        // Guarded: a period with no spending at all would divide by zero.
        share: total > 0 ? (amount / total) * 100 : 0,
        changePercent: change(amount, previousAmount),
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

// The totals the page leads with, for one period and the one before it.
export function periodTotals(rows) {
  let income = 0;
  let expenses = 0;
  for (const row of rows) {
    if (row.type === "INCOME") income += row.amount;
    else expenses += row.amount;
  }
  const net = income - expenses;
  return {
    income,
    expenses,
    net,
    // Savings rate is only meaningful against income that exists. With no
    // income the rate is undefined, not zero -- spending with no earnings is
    // not a 0% savings rate, it is a question the data cannot answer.
    savingsRate: income > 0 ? (net / income) * 100 : null,
  };
}
