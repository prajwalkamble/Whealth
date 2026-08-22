import { describe, it, expect } from "vitest";
import {
  accountInputSchema,
  transactionInputSchema,
  budgetInputSchema,
  parseOrThrow,
} from "@/app/lib/schema";

const base = {
  type: "EXPENSE",
  amount: 100,
  date: new Date(),
  accountId: "acc_1",
  category: "food",
  isRecurring: false,
};

describe("transactionInputSchema", () => {
  it("accepts a valid payload", () => {
    expect(parseOrThrow(transactionInputSchema, base).amount).toBe(100);
  });
  it("accepts a numeric string amount from a form", () => {
    expect(parseOrThrow(transactionInputSchema, { ...base, amount: "42.50" }).amount).toBe(42.5);
  });
  it("rejects negative", () => {
    expect(() => parseOrThrow(transactionInputSchema, { ...base, amount: -1 })).toThrow(/greater than zero/i);
  });
  it("rejects zero", () => {
    expect(() => parseOrThrow(transactionInputSchema, { ...base, amount: 0 })).toThrow(/greater than zero/i);
  });
  it("rejects NaN", () => {
    expect(() => parseOrThrow(transactionInputSchema, { ...base, amount: "abc" })).toThrow();
  });
  it("rejects Infinity", () => {
    expect(() => parseOrThrow(transactionInputSchema, { ...base, amount: Infinity })).toThrow();
  });
  it("rejects a bad enum", () => {
    expect(() => parseOrThrow(transactionInputSchema, { ...base, type: "REFUND" })).toThrow();
  });
  it("rejects an invalid date", () => {
    expect(() => parseOrThrow(transactionInputSchema, { ...base, date: "not-a-date" })).toThrow();
  });
  it("requires an interval when recurring", () => {
    expect(() => parseOrThrow(transactionInputSchema, { ...base, isRecurring: true })).toThrow(/interval is required/i);
  });
  it("strips unknown keys", () => {
    const out = parseOrThrow(transactionInputSchema, { ...base, userId: "evil", id: "x", status: "PENDING" });
    expect(out.userId).toBeUndefined();
    expect(out.id).toBeUndefined();
    expect(out.status).toBeUndefined();
  });
  it("coerces an ISO date string", () => {
    const out = parseOrThrow(transactionInputSchema, { ...base, date: "2026-03-01T00:00:00.000Z" });
    expect(out.date instanceof Date).toBe(true);
  });
});

describe("accountInputSchema", () => {
  it("coerces a string balance", () => {
    const out = parseOrThrow(accountInputSchema, { name: "A", type: "CURRENT", balance: "1000", isDefault: false });
    expect(out.balance).toBe(1000);
  });
  it("allows a zero and a negative balance", () => {
    expect(parseOrThrow(accountInputSchema, { name: "A", type: "CURRENT", balance: "0" }).balance).toBe(0);
    expect(parseOrThrow(accountInputSchema, { name: "A", type: "CURRENT", balance: "-50" }).balance).toBe(-50);
  });
  it("rejects a non-numeric balance with the old message", () => {
    expect(() => parseOrThrow(accountInputSchema, { name: "A", type: "CURRENT", balance: "abc" })).toThrow(/Invalid balance/);
  });
  it("rejects an empty name", () => {
    expect(() => parseOrThrow(accountInputSchema, { name: "  ", type: "CURRENT", balance: "1" })).toThrow(/Name is required/);
  });
});

describe("budgetInputSchema", () => {
  it("accepts a positive amount", () => {
    expect(parseOrThrow(budgetInputSchema, 2000)).toBe(2000);
  });
  it("rejects zero and negative", () => {
    expect(() => parseOrThrow(budgetInputSchema, 0)).toThrow(/greater than zero/i);
    expect(() => parseOrThrow(budgetInputSchema, -5)).toThrow(/greater than zero/i);
  });
});
