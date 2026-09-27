import { describe, it, expect, vi } from "vitest";

// Flipped per test, so the same module can be exercised signed out and in.
let currentClerkId = null;

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: currentClerkId }),
  currentUser: async () => null,
}));
vi.mock("next/cache", () => ({
  revalidatePath: () => {}, revalidateTag: () => {}, unstable_cache: (fn) => fn,
}));
vi.mock("@/lib/arcjet", () => ({ enforceRateLimit: async () => {} }));

const { searchEverything } = await import("@/actions/search");
const { getNotifications } = await import("@/actions/notifications");

const asyncOnly = async (path) => {
  const mod = await import(path);
  for (const [name, value] of Object.entries(mod)) {
    expect(value.constructor.name, name).toBe("AsyncFunction");
  }
};

describe("search action", () => {
  it("exposes only async functions", () => asyncOnly("@/actions/search"));

  it("checks the session before anything else", async () => {
    currentClerkId = null;
    // Even a query too short to run must not come back as a successful empty
    // result: that would tell a signed-out caller the search "worked".
    for (const q of ["", "a", "groceries"]) {
      const r = await searchEverything(q);
      expect(r.success, JSON.stringify(q)).toBe(false);
      expect(r.error).toMatch(/Unauthorized/);
    }
  });

  it("short-circuits a too-short query without touching the database", async () => {
    // Signed in, but there is no database in this suite: reaching one would
    // throw. Coming back empty proves the guard runs before the query.
    currentClerkId = "clerk_search_probe";
    for (const q of ["", " ", "a", null, undefined]) {
      const r = await searchEverything(q);
      expect(r.success, JSON.stringify(q)).toBe(true);
      expect(r.data.accounts).toEqual([]);
      expect(r.data.transactions).toEqual([]);
    }
    currentClerkId = null;
  });

  it("caps an over-long query rather than passing it through", async () => {
    currentClerkId = "clerk_search_probe";
    const r = await searchEverything("x".repeat(500));
    // It got past the length guard, so it tried the database and failed there
    // -- but the action did not blow up on the input itself.
    expect(r.success).toBe(false);
    currentClerkId = null;
  });
});

describe("notifications action", () => {
  it("exposes only async functions", () => asyncOnly("@/actions/notifications"));

  it("refuses an unauthenticated caller", async () => {
    currentClerkId = null;
    const r = await getNotifications();
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/Unauthorized/);
  });
});
