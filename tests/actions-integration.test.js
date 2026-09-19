import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

// Which Clerk user the mocked auth() reports. Tests flip this to switch tenant.
let currentClerkId = null;
// Set by a test to make the rate limiter deny the next call.
let rateLimitDenied = false;

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: currentClerkId }),
  currentUser: async () => null,
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

vi.mock("@/lib/arcjet", () => ({
  default: {
    protect: async () => ({
      isDenied: () => rateLimitDenied,
      reason: { isRateLimit: () => true, remaining: 0, reset: 3600 },
    }),
  },
}));

const { createAccount, getUserAccounts, getDashboardData } = await import(
  "@/actions/dashboard"
);
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
const { getLandingStats, uptimeSlot } = await import("@/lib/stats");
const { recordUptime } = await import("@/lib/inngest/functions");
const { db: appDb, withTenant } = await import("@/lib/prisma");

// Fixtures are created with an admin connection that bypasses RLS.
const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

const TENANTS = {
  alice: { clerkUserId: "clerk_it_alice", email: "it-alice@example.test" },
  bob: { clerkUserId: "clerk_it_bob", email: "it-bob@example.test" },
  // Signed up but never created an account: not an "active" user.
  carol: { clerkUserId: "clerk_it_carol", email: "it-carol@example.test" },
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
    // Throws rather than returning {success:false}: useFetch only reads its
    // error state from a rejection.
    await expect(updateDefaultAccount(bobAccount)).rejects.toThrow(/not found/i);
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
    await expect(
      createAccount({ name: "Junk", type: "CURRENT", balance: "abc", isDefault: false })
    ).rejects.toThrow(/Invalid balance/);
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
    await expect(
      createTransaction({
        type: "EXPENSE",
        amount: 10,
        date: new Date(),
        accountId: bobAccount,
        category: "other-expense",
        isRecurring: false,
      })
    ).rejects.toThrow(/Account not found/);
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
    await expect(getTransaction(mine.data.id)).rejects.toThrow(/not found/i);
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
    await expect(
      updateTransaction(mine.data.id, {
        type: "INCOME",
        amount: 999999,
        date: new Date(),
        accountId: aliceAccount,
        category: "salary",
        isRecurring: false,
      })
    ).rejects.toThrow(/not found/i);
    expect(await balanceOf(bobAccount)).toBe(bobBalance);
  });

  it("surfaces a rate-limit denial as an error", async () => {
    asTenant("alice");
    rateLimitDenied = true;
    await expect(
      createTransaction({
        type: "EXPENSE",
        amount: 1,
        date: new Date(),
        accountId: aliceAccount,
        category: "food",
        isRecurring: false,
      })
    ).rejects.toThrow(/Too many requests/);
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
    await expect(
      createTransaction({
        type: "EXPENSE",
        amount: -500,
        date: new Date(),
        accountId: aliceAccount,
        category: "food",
        isRecurring: false,
      })
    ).rejects.toThrow(/greater than zero/i);
    expect(await balanceOf(aliceAccount)).toBe(before);
  });

  it("rejects a zero amount", async () => {
    asTenant("alice");
    await expect(
      createTransaction({
        type: "EXPENSE",
        amount: 0,
        date: new Date(),
        accountId: aliceAccount,
        category: "food",
        isRecurring: false,
      })
    ).rejects.toThrow(/greater than zero/i);
  });

  it("rejects a type outside the enum", async () => {
    asTenant("alice");
    await expect(
      createTransaction({
        type: "REFUND",
        amount: 10,
        date: new Date(),
        accountId: aliceAccount,
        category: "food",
        isRecurring: false,
      })
    ).rejects.toThrow();
  });

  it("rejects a recurring transaction with no interval", async () => {
    asTenant("alice");
    await expect(
      createTransaction({
        type: "EXPENSE",
        amount: 10,
        date: new Date(),
        accountId: aliceAccount,
        category: "food",
        isRecurring: true,
      })
    ).rejects.toThrow(/interval is required/i);
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
    await expect(updateBudget(0)).rejects.toThrow(/greater than zero/i);
    await expect(updateBudget(-50)).rejects.toThrow(/greater than zero/i);
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
    await expect(submitRating(5)).rejects.toThrow(/Create an account/);
    expect(await getMyRating()).toBeNull();
  });

  it.each([0, 6, 3.5, "abc"])("rejects %s stars", async (score) => {
    asTenant("alice");
    await expect(submitRating(score)).rejects.toThrow(
      /between 1 and 5|whole number|must be a number/
    );
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
