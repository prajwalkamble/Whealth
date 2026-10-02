import { unstable_cache } from "next/cache";
import { adminDb } from "./prisma";
import { monthBounds, monthBoundsFor, previousMonth, zonedYearMonth } from "./time";

// Invalidated by the actions that change a number (see revalidateTag calls),
// so a new account, transaction or rating shows up on the next page load. The
// revalidate window is the backstop for changes made outside those actions:
// recurring transactions posted by the cron, and each new uptime slot.
export const LANDING_STATS_TAG = "landing-stats";
const LANDING_STATS_TTL_SECONDS = 300;

export const UPTIME_SLOT_MS = 5 * 60 * 1000;
const UPTIME_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

// The start of the 5-minute slot containing `date`. The heartbeat cron fires
// on these boundaries, so a slightly late run still lands in its own slot.
export const uptimeSlot = (date) =>
  new Date(Math.floor(date.getTime() / UPTIME_SLOT_MS) * UPTIME_SLOT_MS);

// Percentage of completed 5-minute slots in the last 30 days that have a
// heartbeat. Counting starts at the first heartbeat ever recorded, so the time
// before the checker existed is not reported as downtime. Null until at least
// one slot has completed.
async function uptimePercentage(now) {
  const currentSlot = uptimeSlot(now);
  const first = await adminDb.uptimeCheck.findFirst({
    orderBy: { slot: "asc" },
    select: { slot: true },
  });
  if (!first) return null;

  const windowStart = new Date(
    Math.max(
      first.slot.getTime(),
      uptimeSlot(new Date(now.getTime() - UPTIME_WINDOW_MS)).getTime()
    )
  );
  const expected =
    (currentSlot.getTime() - windowStart.getTime()) / UPTIME_SLOT_MS;
  if (expected < 1) return null;

  const recorded = await adminDb.uptimeCheck.count({
    where: { slot: { gte: windowStart, lt: currentSlot } },
  });
  return (Math.min(recorded, expected) / expected) * 100;
}

// The average savings rate across users who have recorded income.
//
// This is what users' own figures show -- income minus expenses as a share of
// income -- not a claim that WHealthOS produced the saving: there is no
// baseline and no control group. Users with no recorded income are excluded,
// because a rate needs something to divide by, and negative results are
// returned as they are.
async function averageSavingsRate() {
  const rows = await adminDb.transaction.groupBy({
    by: ["userId", "type"],
    _sum: { amount: true },
  });

  const totals = new Map();
  for (const row of rows) {
    const entry = totals.get(row.userId) ?? { income: 0, expenses: 0 };
    const amount = row._sum.amount?.toNumber() ?? 0;
    if (row.type === "INCOME") entry.income += amount;
    else entry.expenses += amount;
    totals.set(row.userId, entry);
  }

  // Averaged per user, not over pooled totals: otherwise one large account
  // dominates the figure.
  const rates = [...totals.values()]
    .filter(({ income }) => income > 0)
    .map(({ income, expenses }) => ((income - expenses) / income) * 100);

  if (rates.length === 0) return null;
  return rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
}

// The share of recorded transactions that completed.
//
// Worth being precise about what this does and does not measure. Every
// transaction row carries a status, and this is the real proportion of them
// that are COMPLETED. But a transaction that fails validation or a failed
// write never becomes a row at all, so those are not in the denominator. The
// figure reflects the state of recorded transactions, not an attempt-to-
// success ratio across everything a user tried to do.
async function transactionSuccessRate() {
  const [total, completed] = await Promise.all([
    adminDb.transaction.count(),
    adminDb.transaction.count({ where: { status: "COMPLETED" } }),
  ]);

  if (total === 0) return null;
  return (completed / total) * 100;
}

// The share of users whose savings rate improved on last month.
//
// This measures a change in users' own figures -- income minus expenses, as a
// proportion of income, this month against last. It is not a claim that
// WHealthOS produced the improvement: there is no control group, and someone
// may simply have earned more. Only users who recorded income in both months
// are counted, since a savings rate needs something to divide by.
async function improvedSavingsShare() {
  const thisMonth = monthBounds();
  const lastMonth = monthBoundsFor(
    ...Object.values(previousMonth(zonedYearMonth()))
  );

  const totalsFor = async ({ startOfMonth, endOfMonth }) => {
    const rows = await adminDb.transaction.groupBy({
      by: ["userId", "type"],
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
    });

    const byUser = new Map();
    for (const row of rows) {
      const entry = byUser.get(row.userId) ?? { income: 0, expenses: 0 };
      const amount = row._sum.amount?.toNumber() ?? 0;
      if (row.type === "INCOME") entry.income += amount;
      else entry.expenses += amount;
      byUser.set(row.userId, entry);
    }
    return byUser;
  };

  const [current, previous] = await Promise.all([
    totalsFor(thisMonth),
    totalsFor(lastMonth),
  ]);

  const rate = ({ income, expenses }) => ((income - expenses) / income) * 100;

  let compared = 0;
  let improved = 0;
  for (const [userId, now] of current) {
    const before = previous.get(userId);
    if (!before || now.income <= 0 || before.income <= 0) continue;
    compared++;
    if (rate(now) > rate(before)) improved++;
  }

  // Nothing to report until at least one user has two comparable months.
  if (compared === 0) return null;
  return (improved / compared) * 100;
}

// Aggregates only -- no row from any user leaves this function -- which is why
// it may read through adminDb on the public landing page.
export const getLandingStats = unstable_cache(
  async () => {
    const [activeUsers, transactions, ratings, uptime, successRate, improved, savingsRate] =
      await Promise.all([
      // "Active" means the user has actually used the app, not just signed up:
      // they created an account or recorded a transaction.
      adminDb.user.count({
        where: {
          OR: [{ accounts: { some: {} } }, { transactions: { some: {} } }],
        },
      }),
      adminDb.transaction.count(),
      adminDb.rating.aggregate({ _avg: { score: true }, _count: true }),
      uptimePercentage(new Date()),
      transactionSuccessRate(),
      improvedSavingsShare(),
      averageSavingsRate(),
    ]);

    return {
      activeUsers,
      transactions,
      rating: ratings._count > 0 ? ratings._avg.score : null,
      ratingCount: ratings._count,
      uptime,
      successRate,
      improved,
      savingsRate,
    };
  },
  ["landing-stats"],
  { tags: [LANDING_STATS_TAG], revalidate: LANDING_STATS_TTL_SECONDS }
);
