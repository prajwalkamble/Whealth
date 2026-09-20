import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

// Which Clerk user the mocked auth() reports. Tests flip this to switch tenant.
let currentClerkId = null;
// Set by a test to make the rate limiter deny the next call.
let rateLimitDenied = false;
// The Clerk profile currentUser() returns, and how often checkUser asked.
let currentClerkProfile = null;
let currentUserCalls = 0;

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: currentClerkId }),
  currentUser: async () => {
    currentUserCalls++;
    return currentClerkProfile;
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
  // lib/stats wraps its query in unstable_cache at import time.
  unstable_cache: (fn) => fn,
}));

vi.mock("@arcjet/next", () => ({
  request: async () => ({}),
  default: () => ({ protect: async () => ({ isDenied: () => false }) }),
  tokenBucket: () => ({}),
  shield: () => ({}),
  detectBot: () => ({}),
}));

vi.mock("@/lib/arcjet", async () => {
  const { ActionError } = await import("@/lib/action-error");
  return {
    enforceRateLimit: async () => {
      if (rateLimitDenied) {
        throw new ActionError("Too many requests. Please try again later.");
      }
    },
  };
});

// Actions the browser calls report failure by returning { success: false }
// rather than throwing, so the message survives production builds (see
// lib/action-error.js). This reads like the rejects.toThrow it replaces.
const expectFailure = async (promise, pattern) => {
  const result = await promise;
  expect(result.success).toBe(false);
  if (pattern) expect(result.error).toMatch(pattern);
  return result;
};

const {
  createAccount,
  getUserAccounts,
  getDashboardData,
  getDashboardSummary,
} = await import("@/actions/dashboard");
const {
  updateDefaultAccount,
  getAccountWithTransactions,
  bulkDeleteTransactions,
} = await import("@/actions/accounts");
const {
  createTransaction,
  updateTransaction,
  getTransaction,
  getUserTransactions,
} = await import("@/actions/transaction");
const { getCurrentBudget, updateBudget } = await import("@/actions/budget");
const { getMyRating, submitRating } = await import("@/actions/rating");
const { saveThemePreference } = await import("@/actions/preferences");
const { getLandingStats, uptimeSlot } = await import("@/lib/stats");
const { monthBounds } = await import("@/lib/time");
const { recordUptime, processRecurringTransaction } = await import(
  "@/lib/inngest/functions"
);
const { checkUser } = await import("@/lib/checkUser");
const { db: appDb, withTenant } = await import("@/lib/prisma");

// Fixtures are created with an admin connection that bypasses RLS.
const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

const TENANTS = {
  alice: { clerkUserId: "clerk_it_alice", email: "it-alice@example.test" },
  bob: { clerkUserId: "clerk_it_bob", email: "it-bob@example.test" },
  // Signed up but never created an account: not an "active" user.
  carol: { clerkUserId: "clerk_it_carol", email: "it-carol@example.test" },
  dave: { clerkUserId: "clerk_it_dave", email: "it-dave@example.test" },
};

const asTenant = (name) => {
  currentClerkId = TENANTS[name].clerkUserId;
};

const balanceOf = async (accountId) => {
  const row = await admin.account.findUnique({ where: { id: accountId } });
  return row === null ? null : row.balance.toNumber();
};

let aliceAccount;
let bobAccount;

beforeAll(async () => {
  await admin.user.deleteMany({
    where: { clerkUserId: { in: Object.values(TENANTS).map((t) => t.clerkUserId) } },
  });

  for (const [name, t] of Object.entries(TENANTS)) {
    const user = await admin.user.create({
      data: { ...t, name, imageUrl: "https://example.test/avatar.png" },
    });
    TENANTS[name].id = user.id;
  }
});

afterAll(async () => {
  await admin.user.deleteMany({
    where: { clerkUserId: { in: Object.values(TENANTS).map((t) => t.clerkUserId) } },
  });
  await admin.$disconnect();
  const { db, adminDb } = await import("@/lib/prisma");
  await db.$disconnect();
  await adminDb.$disconnect();
});

describe("Account actions", () => {
  it("creates the first account and forces it default", async () => {
    asTenant("alice");
    const res = await createAccount({
      name: "Alice Checking",
      type: "CURRENT",
      balance: "1000",
      isDefault: false,
    });
    expect(res.success).toBe(true);
    expect(res.data.isDefault).toBe(true);
    expect(res.data.balance).toBe(1000);
    aliceAccount = res.data.id;
  });

  it("returns balance as a number, not a Decimal", async () => {
    asTenant("alice");
    const accounts = await getUserAccounts();
    expect(typeof accounts[0].balance).toBe("number");
  });

  it("scopes account listing to the calling tenant", async () => {
    asTenant("bob");
    const res = await createAccount({
      name: "Bob Savings",
      type: "SAVINGS",
      balance: "500",
      isDefault: true,
    });
    bobAccount = res.data.id;

    const bobAccounts = await getUserAccounts();
    expect(bobAccounts.map((a) => a.id)).toEqual([bobAccount]);

    asTenant("alice");
    const aliceAccounts = await getUserAccounts();
    expect(aliceAccounts.map((a) => a.id)).toEqual([aliceAccount]);
  });

  it("rejects an unauthenticated caller", async () => {
    currentClerkId = null;
    await expect(getUserAccounts()).rejects.toThrow(/Unauthorized/);
  });

  it("refuses to make another tenant's account default", async () => {
    asTenant("alice");
    await expectFailure(updateDefaultAccount(bobAccount), /not found/i);
    expect((await admin.account.findUnique({ where: { id: bobAccount } })).isDefault).toBe(true);
  });

  it("moves the default flag between a tenant's own accounts", async () => {
    asTenant("alice");
    const second = await createAccount({
      name: "Alice Savings",
      type: "SAVINGS",
      balance: "0",
      isDefault: false,
    });
    const res = await updateDefaultAccount(second.data.id);
    expect(res.success).toBe(true);

    const accounts = await getUserAccounts();
    expect(accounts.filter((a) => a.isDefault).map((a) => a.id)).toEqual([second.data.id]);

    await updateDefaultAccount(aliceAccount);
  });

  it("rejects a non-numeric balance", async () => {
    asTenant("alice");
    await expectFailure(createAccount({ name: "Junk", type: "CURRENT", balance: "abc", isDefault: false }), /Invalid balance/);
  });
});

describe("Transaction actions", () => {
  it("creates an expense and decrements the account", async () => {
    asTenant("alice");
    const res = await createTransaction({
      type: "EXPENSE",
      amount: 250,
      description: "Groceries",
      date: new Date(),
      accountId: aliceAccount,
      category: "groceries",
      isRecurring: false,
    });
    expect(res.success).toBe(true);
    expect(await balanceOf(aliceAccount)).toBe(750);
  });

  it("creates income and increments the account", async () => {
    asTenant("alice");
    await createTransaction({
      type: "INCOME",
      amount: 100,
      date: new Date(),
      accountId: aliceAccount,
      category: "salary",
      isRecurring: false,
    });
    expect(await balanceOf(aliceAccount)).toBe(850);
  });

  it("refuses to post into another tenant's account", async () => {
    asTenant("alice");
    await expectFailure(createTransaction({
        type: "EXPENSE",
        amount: 10,
        date: new Date(),
        accountId: bobAccount,
        category: "other-expense",
        isRecurring: false,
      }), /Account not found/);
    expect(await balanceOf(bobAccount)).toBe(500);
  });

  it("computes nextRecurringDate for a recurring transaction", async () => {
    asTenant("alice");
    const start = new Date("2026-01-10T00:00:00Z");
    const res = await createTransaction({
      type: "EXPENSE",
      amount: 30,
      date: start,
      accountId: aliceAccount,
      category: "utilities",
      isRecurring: true,
      recurringInterval: "MONTHLY",
    });
    const next = new Date(res.data.nextRecurringDate);
    expect(next.getTime()).toBeGreaterThan(start.getTime());
  });

  it("re-bases the balance when an amount is edited", async () => {
    asTenant("alice");
    const created = await createTransaction({
      type: "EXPENSE",
      amount: 100,
      date: new Date(),
      accountId: aliceAccount,
      category: "food",
      isRecurring: false,
    });
    const before = await balanceOf(aliceAccount);

    await updateTransaction(created.data.id, {
      type: "EXPENSE",
      amount: 40,
      date: new Date(),
      accountId: aliceAccount,
      category: "food",
      isRecurring: false,
    });
    // -100 backed out, -40 applied => net +60
    expect(await balanceOf(aliceAccount)).toBe(before + 60);
  });

  it("re-bases both accounts when a transaction moves between them", async () => {
    asTenant("alice");
    const accounts = await getUserAccounts();
    const other = accounts.find((a) => a.id !== aliceAccount).id;

    const created = await createTransaction({
      type: "EXPENSE",
      amount: 75,
      date: new Date(),
      accountId: aliceAccount,
      category: "shopping",
      isRecurring: false,
    });
    const fromBefore = await balanceOf(aliceAccount);
    const toBefore = await balanceOf(other);

    await updateTransaction(created.data.id, {
      type: "EXPENSE",
      amount: 75,
      date: new Date(),
      accountId: other,
      category: "shopping",
      isRecurring: false,
    });

    expect(await balanceOf(aliceAccount)).toBe(fromBefore + 75);
    expect(await balanceOf(other)).toBe(toBefore - 75);
  });

  it("flips the sign correctly when EXPENSE is edited to INCOME", async () => {
    asTenant("alice");
    const created = await createTransaction({
      type: "EXPENSE",
      amount: 60,
      date: new Date(),
      accountId: aliceAccount,
      category: "food",
      isRecurring: false,
    });
    const before = await balanceOf(aliceAccount);

    await updateTransaction(created.data.id, {
      type: "INCOME",
      amount: 60,
      date: new Date(),
      accountId: aliceAccount,
      category: "salary",
      isRecurring: false,
    });
    // -60 backed out, +60 applied => net +120
    expect(await balanceOf(aliceAccount)).toBe(before + 120);
  });

  it("refuses to read another tenant's transaction", async () => {
    asTenant("bob");
    const mine = await createTransaction({
      type: "EXPENSE",
      amount: 20,
      date: new Date(),
      accountId: bobAccount,
      category: "food",
      isRecurring: false,
    });
    asTenant("alice");
    // Not found, not an error: the edit page turns null into a 404.
    expect(await getTransaction(mine.data.id)).toBeNull();
  });

  it("refuses to edit another tenant's transaction", async () => {
    asTenant("bob");
    const mine = await createTransaction({
      type: "EXPENSE",
      amount: 20,
      date: new Date(),
      accountId: bobAccount,
      category: "food",
      isRecurring: false,
    });
    const bobBalance = await balanceOf(bobAccount);

    asTenant("alice");
    await expectFailure(updateTransaction(mine.data.id, {
        type: "INCOME",
        amount: 999999,
        date: new Date(),
        accountId: aliceAccount,
        category: "salary",
        isRecurring: false,
      }), /not found/i);
    expect(await balanceOf(bobAccount)).toBe(bobBalance);
  });

  it("surfaces a rate-limit denial as an error", async () => {
    asTenant("alice");
    rateLimitDenied = true;
    await expectFailure(createTransaction({
        type: "EXPENSE",
        amount: 1,
        date: new Date(),
        accountId: aliceAccount,
        category: "food",
        isRecurring: false,
      }), /Too many requests/);
    rateLimitDenied = false;
  });

  it("serializes amounts as numbers across the client boundary", async () => {
    asTenant("alice");
    const res = await getUserTransactions();
    expect(res.success).toBe(true);
    for (const t of res.data) {
      expect(typeof t.amount).toBe("number");
      expect(typeof t.account.balance).toBe("number");
    }
  });
});

describe("Server-side validation", () => {
  it("rejects a negative amount instead of inverting the balance", async () => {
    asTenant("alice");
    const before = await balanceOf(aliceAccount);
    await expectFailure(createTransaction({
        type: "EXPENSE",
        amount: -500,
        date: new Date(),
        accountId: aliceAccount,
        category: "food",
        isRecurring: false,
      }), /greater than zero/i);
    expect(await balanceOf(aliceAccount)).toBe(before);
  });

  it("rejects a zero amount", async () => {
    asTenant("alice");
    await expectFailure(createTransaction({
        type: "EXPENSE",
        amount: 0,
        date: new Date(),
        accountId: aliceAccount,
        category: "food",
        isRecurring: false,
      }), /greater than zero/i);
  });

  it("rejects a type outside the enum", async () => {
    asTenant("alice");
    await expectFailure(createTransaction({
        type: "REFUND",
        amount: 10,
        date: new Date(),
        accountId: aliceAccount,
        category: "food",
        isRecurring: false,
      }));
  });

  it("rejects a recurring transaction with no interval", async () => {
    asTenant("alice");
    await expectFailure(createTransaction({
        type: "EXPENSE",
        amount: 10,
        date: new Date(),
        accountId: aliceAccount,
        category: "food",
        isRecurring: true,
      }), /interval is required/i);
  });

  it("strips unknown keys so a payload cannot reassign ownership", async () => {
    asTenant("alice");
    const res = await createTransaction({
      type: "EXPENSE",
      amount: 15,
      date: new Date(),
      accountId: aliceAccount,
      category: "food",
      isRecurring: false,
      userId: TENANTS.bob.id,
      status: "PENDING",
    });
    const row = await admin.transaction.findUnique({ where: { id: res.data.id } });
    expect(row.userId).toBe(TENANTS.alice.id);
    expect(row.status).toBe("COMPLETED");
  });

  it("clears recurringInterval when isRecurring is false", async () => {
    asTenant("alice");
    const res = await createTransaction({
      type: "EXPENSE",
      amount: 12,
      date: new Date(),
      accountId: aliceAccount,
      category: "food",
      isRecurring: false,
      recurringInterval: "MONTHLY",
    });
    const row = await admin.transaction.findUnique({ where: { id: res.data.id } });
    expect(row.recurringInterval).toBeNull();
    expect(row.nextRecurringDate).toBeNull();
  });
});

describe("Bulk delete", () => {
  it("restores the balance and only deletes the caller's rows", async () => {
    asTenant("alice");
    const a = await createTransaction({
      type: "EXPENSE",
      amount: 200,
      date: new Date(),
      accountId: aliceAccount,
      category: "food",
      isRecurring: false,
    });
    const b = await createTransaction({
      type: "EXPENSE",
      amount: 300,
      date: new Date(),
      accountId: aliceAccount,
      category: "food",
      isRecurring: false,
    });
    const after = await balanceOf(aliceAccount);

    const res = await bulkDeleteTransactions([a.data.id, b.data.id]);
    expect(res.success).toBe(true);
    expect(res.data.deleted).toBe(2);
    const restored = await balanceOf(aliceAccount);
    expect(restored).toBe(after + 500);
    expect(typeof restored).toBe("number");
  });

  it("reports zero deleted for another tenant's ids instead of deleting them", async () => {
    asTenant("bob");
    const bobTx = await createTransaction({
      type: "EXPENSE",
      amount: 42,
      date: new Date(),
      accountId: bobAccount,
      category: "food",
      isRecurring: false,
    });
    const bobBalance = await balanceOf(bobAccount);

    asTenant("alice");
    const aliceBalance = await balanceOf(aliceAccount);
    const res = await bulkDeleteTransactions([bobTx.data.id]);

    expect(res.success).toBe(true);
    expect(res.data.deleted).toBe(0);
    expect(await admin.transaction.findUnique({ where: { id: bobTx.data.id } })).not.toBeNull();
    expect(await balanceOf(bobAccount)).toBe(bobBalance);
    expect(await balanceOf(aliceAccount)).toBe(aliceBalance);
  });
});

describe("Account detail page data", () => {
  it("returns the account with its transactions serialized", async () => {
    asTenant("alice");
    const data = await getAccountWithTransactions(aliceAccount);
    expect(data).not.toBeNull();
    expect(typeof data.balance).toBe("number");
    expect(typeof data._count.transactions).toBe("number");
    for (const t of data.transactions) expect(typeof t.amount).toBe("number");
  });

  it("returns null for another tenant's account so the page 404s", async () => {
    asTenant("alice");
    expect(await getAccountWithTransactions(bobAccount)).toBeNull();
  });

  it("returns null for an id that does not exist", async () => {
    asTenant("alice");
    expect(
      await getAccountWithTransactions("00000000-0000-0000-0000-000000000000")
    ).toBeNull();
  });
});

describe("Budget actions", () => {
  it("rejects a zero or negative budget", async () => {
    asTenant("alice");
    await expectFailure(updateBudget(0), /greater than zero/i);
    await expectFailure(updateBudget(-50), /greater than zero/i);
  });

  it("creates then updates a budget through the same upsert", async () => {
    asTenant("alice");
    const created = await updateBudget(2000);
    expect(created.success).toBe(true);
    expect(created.data.amount).toBe(2000);

    const updated = await updateBudget(3000);
    expect(updated.data.amount).toBe(3000);
    expect(updated.data.id).toBe(created.data.id);
  });

  it("keeps budgets separate per tenant", async () => {
    asTenant("bob");
    await updateBudget(999);
    const bobBudget = await getCurrentBudget(bobAccount);
    expect(bobBudget.budget.amount).toBe(999);

    asTenant("alice");
    const aliceBudget = await getCurrentBudget(aliceAccount);
    expect(aliceBudget.budget.amount).toBe(3000);
  });

  it("sums only the current month's expenses for the given account", async () => {
    asTenant("alice");
    const lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);

    const before = (await getCurrentBudget(aliceAccount)).currentExpenses;
    await createTransaction({
      type: "EXPENSE",
      amount: 5000,
      date: lastYear,
      accountId: aliceAccount,
      category: "food",
      isRecurring: false,
    });
    const after = (await getCurrentBudget(aliceAccount)).currentExpenses;
    expect(after).toBe(before);
  });

  it("returns currentExpenses as a number", async () => {
    asTenant("alice");
    const { currentExpenses } = await getCurrentBudget(aliceAccount);
    expect(typeof currentExpenses).toBe("number");
  });
});

describe("Dashboard data", () => {
  it("returns only the calling tenant's transactions", async () => {
    asTenant("alice");
    const rows = await getDashboardData();
    const ids = new Set(rows.map((r) => r.userId));
    expect([...ids]).toEqual([TENANTS.alice.id]);
  });
});

describe("Ratings", () => {
  it("refuses a rating from a user who has not created an account", async () => {
    asTenant("carol");
    await expectFailure(submitRating(5), /Create an account/);
    expect(await getMyRating()).toBeNull();
  });

  it.each([0, 6, 3.5, "abc"])("rejects %s stars", async (score) => {
    asTenant("alice");
    await expectFailure(submitRating(score), /between 1 and 5|whole number|must be a number/);
  });

  it("stores one rating per user and lets them change it", async () => {
    asTenant("alice");
    expect(await getMyRating()).toBeNull();

    expect((await submitRating(4)).data.score).toBe(4);
    expect(await getMyRating()).toBe(4);

    expect((await submitRating(5)).data.score).toBe(5);
    expect(await getMyRating()).toBe(5);

    const rows = await admin.rating.findMany({
      where: { userId: TENANTS.alice.id },
    });
    expect(rows.map((r) => r.score)).toEqual([5]);
  });

  it("isolates ratings per tenant under RLS", async () => {
    asTenant("bob");
    await submitRating(2);

    const visibleToAlice = await withTenant(TENANTS.alice.id, (tx) =>
      tx.rating.findMany({ select: { userId: true } })
    );
    expect(visibleToAlice.map((r) => r.userId)).toEqual([TENANTS.alice.id]);
  });

  it("enforces the 1-5 range in the database as well", async () => {
    await expect(
      admin.rating.update({
        where: { userId: TENANTS.alice.id },
        data: { score: 9 },
      })
    ).rejects.toThrow(/ratings_score_range/);
  });
});

describe("Landing stats", () => {
  it("counts a user as active only once they create an account", async () => {
    const before = await getLandingStats();

    asTenant("carol");
    await createAccount({
      name: "Carol Checking",
      type: "CURRENT",
      balance: "0",
      isDefault: true,
    });

    const after = await getLandingStats();
    expect(after.activeUsers).toBe(before.activeUsers + 1);
  });

  it("reports the true transaction count and rating average", async () => {
    const stats = await getLandingStats();
    const ratings = await admin.rating.aggregate({ _avg: { score: true } });

    expect(stats.transactions).toBe(await admin.transaction.count());
    expect(stats.rating).toBeCloseTo(ratings._avg.score, 10);
  });

  it("records one uptime slot per 5-minute window, idempotently", async () => {
    const slot = uptimeSlot(new Date());
    const existed = await admin.uptimeCheck.findUnique({ where: { slot } });

    await recordUptime["fn"]({});
    await recordUptime["fn"]({});

    expect(await admin.uptimeCheck.count({ where: { slot } })).toBe(1);
    if (!existed) await admin.uptimeCheck.delete({ where: { slot } });
  });

  it("gives the request-path role no access to the uptime table", async () => {
    await expect(
      appDb.$queryRaw`SELECT count(*) FROM uptime_checks`
    ).rejects.toThrow(/permission denied/);
  });
});

describe("Recurring schedules", () => {
  const DAY = 24 * 60 * 60 * 1000;

  const createRecurring = (overrides = {}) =>
    createTransaction({
      type: "EXPENSE",
      amount: 100,
      date: new Date("2026-01-10T00:00:00Z"),
      accountId: aliceAccount,
      category: "housing",
      description: "Rent",
      isRecurring: true,
      recurringInterval: "MONTHLY",
      ...overrides,
    });

  it("schedules a back-dated series from today, not in the past", async () => {
    asTenant("alice");
    const res = await createRecurring();
    const next = new Date(res.data.nextRecurringDate);
    expect(next.getTime()).toBeGreaterThan(Date.now());
    // Still on the series' own day of the month.
    expect(next.getUTCDate()).toBe(10);
  });

  it("keeps the schedule when an edit does not touch it", async () => {
    asTenant("alice");
    const created = await createRecurring();
    const edited = await updateTransaction(created.data.id, {
      type: "EXPENSE",
      amount: 100,
      date: new Date("2026-01-10T00:00:00Z"),
      accountId: aliceAccount,
      category: "housing",
      description: "Rent (typo fixed)",
      isRecurring: true,
      recurringInterval: "MONTHLY",
    });
    expect(edited.success).toBe(true);
    // Recomputing it from the original date used to land in the past, and
    // the nightly job posted the occurrence a second time.
    expect(edited.data.nextRecurringDate).toEqual(created.data.nextRecurringDate);
  });

  it("reschedules when the edit changes the interval", async () => {
    asTenant("alice");
    const created = await createRecurring();
    const edited = await updateTransaction(created.data.id, {
      type: "EXPENSE",
      amount: 100,
      date: new Date("2026-01-10T00:00:00Z"),
      accountId: aliceAccount,
      category: "housing",
      description: "Rent",
      isRecurring: true,
      recurringInterval: "WEEKLY",
    });
    const next = new Date(edited.data.nextRecurringDate);
    expect(next.getTime()).toBeGreaterThan(Date.now());
    expect(next.getTime() - Date.now()).toBeLessThanOrEqual(7 * DAY);
  });

  it("posts every missed occurrence on its own date, once", async () => {
    asTenant("alice");
    const anchor = new Date(Date.now() - 3 * DAY);
    const created = await createRecurring({
      date: anchor,
      recurringInterval: "DAILY",
      amount: 7,
      description: "Daily coffee",
      category: "food",
    });
    // As if the nightly job had been down since the day after the anchor.
    await admin.transaction.update({
      where: { id: created.data.id },
      data: { nextRecurringDate: new Date(anchor.getTime() + DAY) },
    });
    const before = await balanceOf(aliceAccount);

    const step = { run: async (_id, fn) => fn() };
    const event = { data: { transactionId: created.data.id, userId: TENANTS.alice.id } };
    await processRecurringTransaction["fn"]({ event, step });
    // Running again must not post anything twice.
    await processRecurringTransaction["fn"]({ event, step });

    const copies = await admin.transaction.findMany({
      where: { userId: TENANTS.alice.id, description: "Daily coffee (Recurring)" },
      orderBy: { date: "asc" },
    });
    expect(copies.map((c) => c.date.getTime())).toEqual([
      anchor.getTime() + DAY,
      anchor.getTime() + 2 * DAY,
      anchor.getTime() + 3 * DAY,
    ]);
    expect(await balanceOf(aliceAccount)).toBeCloseTo(before - 21, 6);

    const template = await admin.transaction.findUnique({ where: { id: created.data.id } });
    expect(template.nextRecurringDate.getTime()).toBe(anchor.getTime() + 4 * DAY);
  });
});

describe("Tenant scoping of getUserTransactions", () => {
  it("ignores a userId in the filters instead of letting it widen the query", async () => {
    asTenant("alice");
    for (const query of [
      { userId: { not: "" } },
      { userId: TENANTS.bob.id },
      { OR: [{ userId: TENANTS.bob.id }] },
    ]) {
      const res = await getUserTransactions(query);
      expect(res.success).toBe(true);
      expect(new Set(res.data.map((t) => t.userId))).toEqual(
        new Set([TENANTS.alice.id])
      );
    }
  });

  it("still applies the allowed filters", async () => {
    asTenant("alice");
    const res = await getUserTransactions({ type: "INCOME" });
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data.every((t) => t.type === "INCOME")).toBe(true);
  });
});

describe("Account defaults under concurrency", () => {
  it("leaves exactly one default when two first accounts are created at once", async () => {
    asTenant("dave");
    const results = await Promise.all([
      createAccount({ name: "Dave A", type: "CURRENT", balance: "0", isDefault: false }),
      createAccount({ name: "Dave B", type: "SAVINGS", balance: "0", isDefault: false }),
    ]);
    expect(results.every((r) => r.success)).toBe(true);

    const accounts = await admin.account.findMany({ where: { userId: TENANTS.dave.id } });
    expect(accounts).toHaveLength(2);
    expect(accounts.filter((a) => a.isDefault)).toHaveLength(1);
  });
});

describe("Account chart totals", () => {
  it("sums the whole history per day, not just the table's rows", async () => {
    asTenant("alice");
    const account = await getAccountWithTransactions(aliceAccount);
    const totals = account.dailyTotals.reduce(
      (acc, day) => ({ income: acc.income + day.income, expense: acc.expense + day.expense }),
      { income: 0, expense: 0 }
    );

    const byType = await admin.transaction.groupBy({
      by: ["type"],
      where: { accountId: aliceAccount },
      _sum: { amount: true },
    });
    const sum = (type) =>
      byType.find((row) => row.type === type)?._sum.amount?.toNumber() ?? 0;

    expect(totals.income).toBeCloseTo(sum("INCOME"), 6);
    expect(totals.expense).toBeCloseTo(sum("EXPENSE"), 6);
    expect(account.dailyTotals.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.day))).toBe(true);
  });
});

describe("Category validation", () => {
  it("refuses a category that is not in the list", async () => {
    asTenant("alice");
    await expectFailure(
      createTransaction({
        type: "EXPENSE",
        amount: 10,
        date: new Date(),
        accountId: aliceAccount,
        category: "Groceries",
        isRecurring: false,
      }),
      /Choose a category from the list/
    );
  });
});

describe("User provisioning (checkUser)", () => {
  const EXTRA = ["clerk_it_erin", "clerk_it_erin2", "clerk_it_erin3", "clerk_it_frank"];
  const cleanup = () =>
    admin.user.deleteMany({
      where: {
        OR: [{ clerkUserId: { in: EXTRA } }, { email: "it-erin@example.test" }],
      },
    });

  const profile = (id, { email = "it-erin@example.test", verified = true, firstName = "Erin" } = {}) => {
    const address = email
      ? { emailAddress: email, verification: { status: verified ? "verified" : "unverified" } }
      : null;
    return {
      id,
      firstName,
      lastName: null,
      username: null,
      imageUrl: "https://example.test/erin.png",
      primaryEmailAddress: address,
      emailAddresses: address ? [address] : [],
    };
  };

  beforeAll(cleanup);
  afterAll(cleanup);

  it("creates the row on first sign-in", async () => {
    currentClerkId = "clerk_it_erin";
    currentClerkProfile = profile("clerk_it_erin");
    const user = await checkUser();
    expect(user).toMatchObject({ clerkUserId: "clerk_it_erin", email: "it-erin@example.test", name: "Erin" });
  });

  it("does not call Clerk again while the profile is fresh", async () => {
    currentClerkId = "clerk_it_erin";
    currentUserCalls = 0;
    await checkUser();
    await checkUser();
    expect(currentUserCalls).toBe(0);
  });

  it("syncs a changed Clerk profile once the row is a day old", async () => {
    await admin.$executeRaw`UPDATE users SET "updatedAt" = now() - interval '2 days' WHERE "clerkUserId" = 'clerk_it_erin'`;
    currentClerkId = "clerk_it_erin";
    currentClerkProfile = profile("clerk_it_erin", { firstName: "Erin Renamed" });
    const user = await checkUser();
    expect(user.name).toBe("Erin Renamed");
  });

  it("re-links a returning person's data when their email is verified", async () => {
    const original = await admin.user.findUnique({ where: { clerkUserId: "clerk_it_erin" } });

    // Same person, new Clerk account.
    currentClerkId = "clerk_it_erin2";
    currentClerkProfile = profile("clerk_it_erin2");
    const user = await checkUser();

    expect(user.id).toBe(original.id);
    expect(user.clerkUserId).toBe("clerk_it_erin2");
  });

  it("refuses to hand existing data to an unverified email", async () => {
    currentClerkId = "clerk_it_erin3";
    currentClerkProfile = profile("clerk_it_erin3", { verified: false });
    await expect(checkUser()).rejects.toThrow(/already registered/);
    expect(await admin.user.findUnique({ where: { clerkUserId: "clerk_it_erin3" } })).toBeNull();
  });

  it("lets someone without an email address sign in", async () => {
    currentClerkId = "clerk_it_frank";
    currentClerkProfile = profile("clerk_it_frank", { email: null, firstName: "Frank" });
    const user = await checkUser();
    expect(user).toMatchObject({ clerkUserId: "clerk_it_frank", email: null, name: "Frank" });
  });
});

describe("Theme preference", () => {
  it("saves the theme on the caller's own account", async () => {
    asTenant("alice");
    expect(await saveThemePreference("dark")).toEqual({
      success: true,
      data: { theme: "dark" },
    });

    const alice = await admin.user.findUnique({ where: { id: TENANTS.alice.id } });
    const bob = await admin.user.findUnique({ where: { id: TENANTS.bob.id } });
    expect(alice.theme).toBe("dark");
    expect(bob.theme).toBeNull();
  });

  it("refuses a theme that is not one of the three", async () => {
    asTenant("alice");
    await expectFailure(saveThemePreference("solarized"), /Unknown theme/);
  });

  it("rejects an unauthenticated caller", async () => {
    currentClerkId = null;
    await expectFailure(saveThemePreference("light"), /Unauthorized/);
  });
});

describe("Dashboard summary (stat cards)", () => {
  it("matches the database's own totals for this month", async () => {
    asTenant("alice");
    const summary = await getDashboardSummary();

    const { startOfMonth, endOfMonth } = monthBounds();
    const window = { gte: startOfMonth, lte: endOfMonth };
    const [balance, income, expenses] = await Promise.all([
      admin.account.aggregate({
        where: { userId: TENANTS.alice.id },
        _sum: { balance: true },
      }),
      admin.transaction.aggregate({
        where: { userId: TENANTS.alice.id, type: "INCOME", date: window },
        _sum: { amount: true },
      }),
      admin.transaction.aggregate({
        where: { userId: TENANTS.alice.id, type: "EXPENSE", date: window },
        _sum: { amount: true },
      }),
    ]);

    expect(summary.totalBalance).toBeCloseTo(balance._sum.balance.toNumber(), 6);
    expect(summary.monthlyIncome).toBeCloseTo(income._sum.amount?.toNumber() ?? 0, 6);
    expect(summary.monthlyExpenses).toBeCloseTo(expenses._sum.amount?.toNumber() ?? 0, 6);
  });

  it("counts only the caller's own accounts and transactions", async () => {
    asTenant("bob");
    const summary = await getDashboardSummary();
    const bobBalance = await admin.account.aggregate({
      where: { userId: TENANTS.bob.id },
      _sum: { balance: true },
    });
    expect(summary.totalBalance).toBeCloseTo(bobBalance._sum.balance.toNumber(), 6);
  });

  it("reports no savings rate when nothing came in this month", async () => {
    // carol has an account but no transactions at all.
    asTenant("carol");
    const summary = await getDashboardSummary();
    expect(summary.monthlyIncome).toBe(0);
    // Null, not 0%: no income is not the same as having saved nothing.
    expect(summary.savingsRate).toBeNull();
  });

  it("derives the savings rate from this month's income and expenses", async () => {
    asTenant("alice");
    const { monthlyIncome, monthlyExpenses, savingsRate } =
      await getDashboardSummary();
    if (monthlyIncome > 0) {
      expect(savingsRate).toBeCloseTo(
        ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100,
        6
      );
    }
  });
});
