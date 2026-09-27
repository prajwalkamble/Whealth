import { describe, it, expect } from "vitest";
import { DEMO_ACCOUNTS, DEMO_BUDGET, demoTransactions } from "@/lib/demo/data";
import {
  accountsWithTotals,
  dashboardFrom,
} from "@/lib/demo/compute";
import { monthBounds } from "@/lib/time";

const build = () => {
  const transactions = demoTransactions();
  const accounts = accountsWithTotals(DEMO_ACCOUNTS, transactions);
  return { transactions, accounts, page: dashboardFrom(accounts, transactions, DEMO_BUDGET) };
};

describe("demo sample data", () => {
  it("generates history without posting anything in the future", () => {
    const { transactions } = build();
    expect(transactions.length).toBeGreaterThan(30);
    const now = Date.now();
    for (const t of transactions) {
      expect(new Date(t.date).getTime(), t.id).toBeLessThanOrEqual(now);
    }
  });

  it("is deterministic across calls", () => {
    const a = demoTransactions().map((t) => `${t.id}:${t.amount}:${t.date}`);
    const b = demoTransactions().map((t) => `${t.id}:${t.amount}:${t.date}`);
    expect(a).toEqual(b);
  });

  it("derives balances from opening balance plus activity", () => {
    const { accounts, transactions } = build();
    for (const account of accounts) {
      const net = transactions
        .filter((t) => t.accountId === account.id)
        .reduce((s, t) => s + (t.type === "INCOME" ? t.amount : -t.amount), 0);
      const opening = DEMO_ACCOUNTS.find((a) => a.id === account.id).openingBalance;
      expect(account.balance).toBeCloseTo(opening + net, 6);
      expect(account._count.transactions).toBeGreaterThan(0);
    }
  });
});

describe("demo dashboard shape", () => {
  it("returns the same keys the real dashboard page destructures", () => {
    const { page } = build();
    expect(Object.keys(page).sort()).toEqual([
      "accounts", "breakdown", "budget", "cashFlow", "summary", "transactions",
    ]);
  });

  it("summarises this month from this month's rows only", () => {
    const { page, transactions } = build();
    const { startOfMonth, endOfMonth } = monthBounds();
    const inMonth = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= startOfMonth && d <= endOfMonth;
    });
    const income = inMonth.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
    const expenses = inMonth.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);

    expect(page.summary.monthlyIncome).toBeCloseTo(income, 6);
    expect(page.summary.monthlyExpenses).toBeCloseTo(expenses, 6);
    expect(page.summary.net).toBeCloseTo(income - expenses, 6);
  });

  it("gives the cash flow chart six months, oldest first", () => {
    const { page } = build();
    expect(page.cashFlow).toHaveLength(6);
    const months = page.cashFlow.map((m) => m.month);
    expect([...months].sort()).toEqual(months);
    for (const m of page.cashFlow) expect(typeof m.label).toBe("string");
  });

  it("has a balance baseline, so Total Balance shows a percentage not 'New account'", () => {
    const { page } = build();
    expect(page.summary.balanceSince).not.toBeNull();
    expect(page.summary.balanceSince.start).toBeGreaterThan(0);
  });

  it("breaks this month down by category", () => {
    const { page } = build();
    expect(page.breakdown.expenses.length).toBeGreaterThan(0);
    expect(page.breakdown.income.length).toBeGreaterThan(0);
    // Sorted largest first, like the real query.
    const amounts = page.breakdown.expenses.map((r) => r.amount);
    expect([...amounts].sort((a, b) => b - a)).toEqual(amounts);
  });

  it("measures the budget against the default account only", () => {
    const { page, transactions } = build();
    const { startOfMonth, endOfMonth } = monthBounds();
    const expected = transactions
      .filter((t) => t.type === "EXPENSE" && t.accountId === "demo-account-primary")
      .filter((t) => new Date(t.date) >= startOfMonth && new Date(t.date) <= endOfMonth)
      .reduce((s, t) => s + t.amount, 0);
    expect(page.budget.budget.amount).toBe(DEMO_BUDGET);
    expect(page.budget.currentExpenses).toBeCloseTo(expected, 6);
  });
});
