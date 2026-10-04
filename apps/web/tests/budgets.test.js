import { describe, it, expect } from "vitest";

const { budgetEntrySchema, EXPENSE_CATEGORY_IDS } = await import("@/app/lib/schema");

const parse = (patch) => budgetEntrySchema.safeParse({ amount: 5000, category: null, ...patch });

describe("budget entry", () => {
  it("accepts an overall budget, which has no category", () => {
    const result = parse({});
    expect(result.success).toBe(true);
    expect(result.data.category).toBeNull();
  });

  it("treats an empty category as the overall budget", () => {
    expect(parse({ category: "" }).data.category).toBeNull();
  });

  it("accepts a known expense category", () => {
    const result = parse({ category: "groceries" });
    expect(result.success).toBe(true);
    expect(result.data.category).toBe("groceries");
  });

  // A limit filed against a name nothing is categorised under would measure
  // spending that can never exist.
  it("rejects a category the app does not know", () => {
    expect(parse({ category: "yacht-maintenance" }).success).toBe(false);
  });

  // Income categories are not spending, so they cannot be budgeted.
  it("rejects an income category", () => {
    expect(EXPENSE_CATEGORY_IDS).not.toContain("salary");
    expect(parse({ category: "salary" }).success).toBe(false);
  });

  it.each([[0], [-1], ["-250"]])("rejects %s as an amount", (amount) => {
    expect(parse({ amount }).success).toBe(false);
  });

  it("coerces a numeric string", () => {
    expect(parse({ amount: "7500" }).data.amount).toBe(7500);
  });

  it("rejects a non-numeric amount", () => {
    expect(parse({ amount: "lots" }).success).toBe(false);
  });

  it("lists only expense categories as budgetable", () => {
    expect(EXPENSE_CATEGORY_IDS).toContain("groceries");
    expect(EXPENSE_CATEGORY_IDS).toContain("housing");
    expect(EXPENSE_CATEGORY_IDS.length).toBeGreaterThan(5);
  });
});

// The arithmetic the budgets page reports. Kept here rather than asserted
// through the database so the rules stay checkable without a test database.
describe("budget progress", () => {
  const progress = (amount, spent) => ({
    remaining: amount - spent,
    percentUsed: (spent / amount) * 100,
  });

  it("reports what is left when under the limit", () => {
    const { remaining, percentUsed } = progress(10000, 4000);
    expect(remaining).toBe(6000);
    expect(percentUsed).toBe(40);
  });

  it("goes negative when over the limit rather than flooring at zero", () => {
    const { remaining, percentUsed } = progress(10000, 12500);
    expect(remaining).toBe(-2500);
    expect(percentUsed).toBe(125);
  });

  it("reports nothing spent as zero, not as a missing value", () => {
    const { remaining, percentUsed } = progress(10000, 0);
    expect(remaining).toBe(10000);
    expect(percentUsed).toBe(0);
  });

  // The database CHECK keeps amount > 0, so the percentage cannot divide by
  // zero. This records the dependency rather than the behaviour.
  it("never divides by zero, because a budget must be positive", () => {
    expect(budgetEntrySchema.safeParse({ amount: 0, category: null }).success).toBe(false);
  });
});
