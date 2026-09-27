import { describe, it, expect } from "vitest";
import {
  accountInputSchema,
  transactionInputSchema,
  budgetInputSchema,
  feedbackInputSchema,
  FEEDBACK_TYPES,
  FEEDBACK_WORD_MINIMUM,
  countWords,
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
  it("rejects a category that is not in the list", () => {
    expect(() =>
      parseOrThrow(transactionInputSchema, { ...base, category: "Groceries" })
    ).toThrow(/Choose a category from the list/);
  });

  it("rejects a category of the other transaction type", () => {
    expect(() =>
      parseOrThrow(transactionInputSchema, { ...base, type: "INCOME", category: "food" })
    ).toThrow(/Choose a category from the list/);
  });

  it("reports validation failures as ActionErrors, whose message the user sees", () => {
    try {
      parseOrThrow(transactionInputSchema, { ...base, amount: -1 });
      throw new Error("expected a validation failure");
    } catch (error) {
      expect(error.name).toBe("ActionError");
    }
  });

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

describe("feedbackInputSchema", () => {
  const ok = { type: "problem", message: "The dashboard chart is blank." };

  it("accepts each kind the widget offers", () => {
    for (const type of Object.keys(FEEDBACK_TYPES)) {
      expect(feedbackInputSchema.safeParse({ ...ok, type }).success).toBe(true);
    }
  });

  it("rejects a kind that is not on the list", () => {
    // A server action is a public endpoint, so the type cannot be trusted.
    expect(feedbackInputSchema.safeParse({ ...ok, type: "rate" }).success).toBe(false);
    expect(feedbackInputSchema.safeParse({ ...ok, type: "spam" }).success).toBe(false);
  });

  it("rejects a message below the word minimum", () => {
    // The client disables Send below this too, but the action is a public
    // endpoint, so the rule has to hold here.
    expect(feedbackInputSchema.safeParse({ ...ok, message: "" }).success).toBe(false);
    expect(feedbackInputSchema.safeParse({ ...ok, message: "   " }).success).toBe(false);
    expect(feedbackInputSchema.safeParse({ ...ok, message: "two words" }).success).toBe(false);
    expect(feedbackInputSchema.safeParse({ ...ok, message: "now three words" }).success).toBe(true);
  });

  it("counts words the way the client's hint does", () => {
    expect(countWords("  one   two \n three  ")).toBe(3);
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
    expect(countWords(null)).toBe(0);
    // A single very long token is one word, however many characters it has.
    expect(countWords("a".repeat(500))).toBe(1);
  });

  it("caps the message length", () => {
    const long = "word ".repeat(FEEDBACK_WORD_MINIMUM + 1);
    expect(
      feedbackInputSchema.safeParse({ ...ok, message: long + "x".repeat(4001) }).success
    ).toBe(false);
    expect(
      feedbackInputSchema.safeParse({ ...ok, message: "one two three" }).success
    ).toBe(true);
  });

  it("trims the message and drops unknown keys", () => {
    const parsed = parseOrThrow(feedbackInputSchema, {
      ...ok,
      message: "  spaced out here  ",
      userId: "someone-else",
    });
    expect(parsed.message).toBe("spaced out here");
    expect(parsed.userId).toBeUndefined();
  });
});
