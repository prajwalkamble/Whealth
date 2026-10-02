import { unstable_cache } from "next/cache";
import { adminDb } from "./prisma";

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
// This is what users' own figures show, not a claim that WHealthOS produced
// the saving: there is no baseline to compare against and no control group, so
// any statement about the product improving outcomes would be unsupported.
// Users with no recorded income are excluded, because a savings rate needs
// something to divide by.
//
// Negative results are returned as they are. If people are spending more than
// they earn, that is the honest figure.
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

  const rates = [...totals.values()]
    .filter(({ income }) => income > 0)
    .map(({ income, expenses }) => ((income - expenses) / income) * 100);

  if (rates.length === 0) return null;
  return rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
}

// Aggregates only -- no row from any user leaves this function -- which is why
// it may read through adminDb on the public landing page.
export const getLandingStats = unstable_cache(
  async () => {
    const [activeUsers, transactions, ratings, uptime, savingsRate] =
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
      averageSavingsRate(),
    ]);

    return {
      activeUsers,
      transactions,
      rating: ratings._count > 0 ? ratings._avg.score : null,
      ratingCount: ratings._count,
      uptime,
      savingsRate,
    };
  },
  ["landing-stats"],
  { tags: [LANDING_STATS_TAG], revalidate: LANDING_STATS_TTL_SECONDS }
);
