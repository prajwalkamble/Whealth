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

// Aggregates only -- no row from any user leaves this function -- which is why
// it may read through adminDb on the public landing page.
export const getLandingStats = unstable_cache(
  async () => {
    const [activeUsers, transactions, ratings, uptime] = await Promise.all([
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
    ]);

    return {
      activeUsers,
      transactions,
      rating: ratings._count > 0 ? ratings._avg.score : null,
      ratingCount: ratings._count,
      uptime,
    };
  },
  ["landing-stats"],
  { tags: [LANDING_STATS_TAG], revalidate: LANDING_STATS_TTL_SECONDS }
);
