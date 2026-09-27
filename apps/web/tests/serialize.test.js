import { describe, it, expect, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: null }),
  currentUser: async () => null,
}));
vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
  unstable_cache: (fn) => fn,
}));

const { serializeDecimals } = await import("@/lib/queries");

// Stands in for a Prisma Decimal: an object whose value only comes out of
// toNumber(). Its truthiness is what matters -- Decimal(0) is still an object.
const decimal = (value) => ({ toNumber: () => value });

describe("serializeDecimals", () => {
  it("converts a transaction's amount", () => {
    const row = serializeDecimals({ id: "t1", amount: decimal(250.5) });
    expect(row.amount).toBe(250.5);
  });

  it("converts an account's balance", () => {
    const row = serializeDecimals({ id: "a1", balance: decimal(62099) });
    expect(row.balance).toBe(62099);
  });

  it("converts a zero amount rather than leaving the Decimal in place", () => {
    const row = serializeDecimals({ amount: decimal(0), balance: decimal(0) });
    expect(row.amount).toBe(0);
    expect(row.balance).toBe(0);
  });

  // The regression: /transactions joins each transaction's account for its
  // name alone, so the joined row has no balance. Assuming one was there threw
  // "Cannot read properties of undefined (reading 'toNumber')" and runAction
  // turned that into an empty transactions page.
  it("handles a joined account that was only partly selected", () => {
    const row = serializeDecimals({
      id: "t1",
      amount: decimal(2500),
      account: { id: "a1", name: "Daily Transactions" },
    });

    expect(row.amount).toBe(2500);
    expect(row.account).toEqual({ id: "a1", name: "Daily Transactions" });
    expect("balance" in row.account).toBe(false);
  });

  it("still converts a joined account's balance when it was selected", () => {
    const row = serializeDecimals({
      amount: decimal(100),
      account: { id: "a1", name: "Savings", balance: decimal(5000) },
    });
    expect(row.account.balance).toBe(5000);
  });

  it("leaves a row with no account untouched", () => {
    const row = serializeDecimals({ id: "t1", amount: decimal(10) });
    expect(row.account).toBeUndefined();
  });

  it("does not mutate the row it was given", () => {
    const original = { amount: decimal(5), account: { name: "A" } };
    const row = serializeDecimals(original);
    expect(typeof original.amount.toNumber).toBe("function");
    expect(row.account).not.toBe(original.account);
  });
});
