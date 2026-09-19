import { describe, it, expect, vi, beforeEach } from "vitest";

// No database here: the queries are stubbed so these tests pin down what is
// counted and how uptime is derived from the heartbeat slots.
const db = vi.hoisted(() => ({
  userCount: vi.fn(),
  transactionCount: vi.fn(),
  ratingAggregate: vi.fn(),
  uptimeFirst: vi.fn(),
  uptimeCount: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  adminDb: {
    user: { count: db.userCount },
    transaction: { count: db.transactionCount },
    rating: { aggregate: db.ratingAggregate },
    uptimeCheck: { findFirst: db.uptimeFirst, count: db.uptimeCount },
  },
}));
// unstable_cache needs Next's request context; pass straight through.
vi.mock("next/cache", () => ({ unstable_cache: (fn) => fn }));

const { getLandingStats, uptimeSlot, UPTIME_SLOT_MS } = await import("@/lib/stats");
const { ratingInputSchema } = await import("@/app/lib/schema");

const NOW = new Date("2026-09-19T10:07:30Z"); // current slot starts 10:05
const minutesAgo = (m) => new Date(uptimeSlot(NOW).getTime() - m * 60 * 1000);

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  db.userCount.mockResolvedValue(0);
  db.transactionCount.mockResolvedValue(0);
  db.ratingAggregate.mockResolvedValue({ _avg: { score: null }, _count: 0 });
  db.uptimeFirst.mockResolvedValue(null);
  db.uptimeCount.mockResolvedValue(0);
});

describe("uptimeSlot", () => {
  it("floors to the 5-minute boundary the cron fires on", () => {
    expect(uptimeSlot(NOW).toISOString()).toBe("2026-09-19T10:05:00.000Z");
    expect(uptimeSlot(new Date("2026-09-19T10:05:00Z")).toISOString()).toBe(
      "2026-09-19T10:05:00.000Z"
    );
    expect(UPTIME_SLOT_MS).toBe(300000);
  });
});

describe("getLandingStats", () => {
  it("counts only users who created an account or a transaction as active", async () => {
    db.userCount.mockResolvedValue(3);
    const stats = await getLandingStats();

    expect(stats.activeUsers).toBe(3);
    expect(db.userCount).toHaveBeenCalledWith({
      where: {
        OR: [{ accounts: { some: {} } }, { transactions: { some: {} } }],
      },
    });
  });

  it("reports the real transaction count", async () => {
    db.transactionCount.mockResolvedValue(1234);
    expect((await getLandingStats()).transactions).toBe(1234);
  });

  it("has no rating until someone rates, then averages all ratings", async () => {
    expect((await getLandingStats()).rating).toBeNull();

    db.ratingAggregate.mockResolvedValue({ _avg: { score: 4.25 }, _count: 4 });
    const stats = await getLandingStats();
    expect(stats.rating).toBe(4.25);
    expect(stats.ratingCount).toBe(4);
  });

  it("has no uptime before the first heartbeat", async () => {
    expect((await getLandingStats()).uptime).toBeNull();
  });

  it("has no uptime while only the current slot is recorded", async () => {
    db.uptimeFirst.mockResolvedValue({ slot: uptimeSlot(NOW) });
    expect((await getLandingStats()).uptime).toBeNull();
  });

  it("counts missing slots since the first heartbeat as downtime", async () => {
    // First heartbeat 100 minutes ago = 20 completed slots; 19 recorded.
    db.uptimeFirst.mockResolvedValue({ slot: minutesAgo(100) });
    db.uptimeCount.mockResolvedValue(19);

    expect((await getLandingStats()).uptime).toBeCloseTo(95, 10);
    expect(db.uptimeCount).toHaveBeenCalledWith({
      where: { slot: { gte: minutesAgo(100), lt: uptimeSlot(NOW) } },
    });
  });

  it("only looks at the last 30 days once the checker is older than that", async () => {
    db.uptimeFirst.mockResolvedValue({ slot: minutesAgo(60 * 24 * 90) });
    db.uptimeCount.mockResolvedValue(8640); // every slot in 30 days

    expect((await getLandingStats()).uptime).toBe(100);
    const { gte } = db.uptimeCount.mock.calls[0][0].where.slot;
    expect(uptimeSlot(NOW).getTime() - gte.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

describe("ratingInputSchema", () => {
  it.each([1, 3, 5, "4"])("accepts %s", (score) => {
    expect(ratingInputSchema.safeParse(score).success).toBe(true);
  });

  it.each([0, 6, 3.5, -1, "abc", null])("rejects %s", (score) => {
    expect(ratingInputSchema.safeParse(score).success).toBe(false);
  });
});
