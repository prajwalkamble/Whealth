import { describe, it, expect } from "vitest";

const {
  periodProgress,
  budgetPace,
  statusOf,
  attentionItems,
  NEAR_LIMIT_PERCENT,
  MIN_DAYS_FOR_PACE,
  AT_RISK_OVERSHOOT_PERCENT,
  budgetTotals,
} = await import("@/lib/budget-pace");

// A 30-day month, as plain instants, so these assertions do not depend on a
// timezone. The real bounds come from lib/time.js in the query.
const JUNE = {
  startOfMonth: new Date("2026-06-01T00:00:00Z"),
  endOfMonth: new Date("2026-07-01T00:00:00Z"),
};
const dayOf = (n) => new Date(`2026-06-${String(n).padStart(2, "0")}T00:00:00Z`);

const progressOn = (day) => periodProgress(JUNE, dayOf(day));

describe("period progress", () => {
  it("counts the days of the month", () => {
    expect(progressOn(1).totalDays).toBe(30);
  });

  it("reports elapsed and remaining days mid-month", () => {
    const p = progressOn(11);
    expect(p.daysElapsed).toBe(10);
    expect(p.daysRemaining).toBe(20);
    expect(p.elapsedShare).toBeCloseTo(33.33, 1);
  });

  it("handles the first instant of the period without going negative", () => {
    const p = periodProgress(JUNE, JUNE.startOfMonth);
    expect(p.daysElapsed).toBe(0);
    expect(p.daysRemaining).toBe(30);
    expect(p.elapsedShare).toBe(0);
  });

  it("clamps a past period to fully elapsed", () => {
    const p = periodProgress(JUNE, new Date("2026-09-01T00:00:00Z"));
    expect(p.daysElapsed).toBe(30);
    expect(p.daysRemaining).toBe(0);
    expect(p.isPast).toBe(true);
  });

  it("clamps a future period to not started", () => {
    const p = periodProgress(JUNE, new Date("2026-01-01T00:00:00Z"));
    expect(p.daysElapsed).toBe(0);
    expect(p.isFuture).toBe(true);
    expect(p.elapsedShare).toBe(0);
  });

  // February 2028 is a leap month; the bounds come from lib/time.js, so this
  // only checks the day arithmetic does not assume 30.
  it("counts a 29-day February correctly", () => {
    const feb = {
      startOfMonth: new Date("2028-02-01T00:00:00Z"),
      endOfMonth: new Date("2028-03-01T00:00:00Z"),
    };
    expect(periodProgress(feb, new Date("2028-02-15T00:00:00Z")).totalDays).toBe(29);
  });
});

describe("budget pace", () => {
  const pace = (spent, day, amount = 30000, previousSpent = null) =>
    budgetPace({ amount, spent, previousSpent, progress: progressOn(day) });

  it("computes utilisation and what is left", () => {
    const p = pace(12000, 11);
    expect(p.percentUsed).toBe(40);
    expect(p.remaining).toBe(18000);
  });

  it("spreads the budget evenly for the expected daily pace", () => {
    expect(pace(0, 11).expectedPerDay).toBe(1000);
  });

  it("divides spending by elapsed days for the actual pace", () => {
    expect(pace(12000, 11).actualPerDay).toBe(1200);
  });

  it("projects the month at the current rate", () => {
    expect(pace(12000, 11).projected).toBe(36000);
    expect(pace(12000, 11).projectedOverBy).toBe(6000);
  });

  it("reports no overshoot when the projection lands inside the budget", () => {
    expect(pace(9000, 11).projectedOverBy).toBeNull();
  });

  // The guard that stops one weekly shop on the 1st reading as a crisis.
  it("withholds pace and projection before enough of the month has passed", () => {
    const p = pace(5000, 2);
    expect(p.actualPerDay).toBeNull();
    expect(p.projected).toBeNull();
    expect(p.projectedOverBy).toBeNull();
  });

  it("never divides by zero on the first instant of the period", () => {
    const p = budgetPace({ amount: 30000, spent: 0, progress: periodProgress(JUNE, JUNE.startOfMonth) });
    expect(Number.isFinite(p.percentUsed)).toBe(true);
    expect(p.actualPerDay).toBeNull();
    expect(p.remainingPerDay).toBe(1000);
  });

  it("gives no daily allowance once the period is over", () => {
    const p = budgetPace({ amount: 30000, spent: 10000, progress: periodProgress(JUNE, new Date("2026-09-01T00:00:00Z")) });
    expect(p.remainingPerDay).toBeNull();
  });

  it("gives no daily allowance when nothing is left", () => {
    expect(pace(31000, 11).remainingPerDay).toBeNull();
  });

  it("goes negative when spending exceeds the budget rather than flooring", () => {
    const p = pace(33000, 20);
    expect(p.remaining).toBe(-3000);
    expect(p.percentUsed).toBeCloseTo(110, 6);
  });

  it("handles spending exactly equal to the budget", () => {
    const p = pace(30000, 20);
    expect(p.percentUsed).toBe(100);
    expect(p.remaining).toBe(0);
    expect(p.status.id).not.toBe("exceeded");
  });

  it("produces no NaN or Infinity anywhere, for any day of the month", () => {
    for (let day = 1; day <= 30; day++) {
      for (const spent of [0, 1, 15000, 30000, 45000]) {
        const p = pace(spent, day);
        for (const [key, value] of Object.entries(p)) {
          if (typeof value !== "number") continue;
          expect(Number.isFinite(value), `${key} on day ${day} spent ${spent}`).toBe(true);
        }
      }
    }
  });

  it("compares spending with the previous month when there is one", () => {
    expect(pace(12000, 11, 30000, 10000).spendChangePercent).toBeCloseTo(20, 6);
  });

  it("returns null rather than a percentage when the previous month was zero", () => {
    expect(pace(12000, 11, 30000, 0).spendChangePercent).toBeNull();
  });

  it("returns null when there is no previous month at all", () => {
    expect(pace(12000, 11, 30000, null).spendChangePercent).toBeNull();
  });

  it("keeps small decimal amounts exact enough to render", () => {
    const p = budgetPace({ amount: 100.5, spent: 25.25, progress: progressOn(11) });
    expect(p.remaining).toBeCloseTo(75.25, 2);
  });

  it("handles very large amounts", () => {
    const p = budgetPace({ amount: 1e9, spent: 5e8, progress: progressOn(16) });
    expect(p.percentUsed).toBe(50);
    expect(Number.isFinite(p.projected)).toBe(true);
  });
});

describe("status", () => {
  const status = (spent, day, amount = 30000) =>
    budgetPace({ amount, spent, progress: progressOn(day) }).status.id;

  it("calls anything over the budget exceeded", () => {
    expect(status(31000, 20)).toBe("exceeded");
  });

  // The distinction the brief asks for, and the reason status is not a fixed
  // percentage: the same utilisation means different things at different
  // points in the month.
  it("treats the same utilisation differently early and late in the month", () => {
    expect(status(24000, 10)).not.toBe("on-track"); // 80% used, 30% elapsed
    expect(status(24000, 28)).toBe("on-track"); // 80% used, 90% elapsed
  });

  it("flags spending that is projected past the budget", () => {
    expect(status(15000, 11)).toBe("at-risk"); // 1500/day -> 45000 projected
  });

  it("calls a mild overshoot watch rather than at risk", () => {
    // Day 16 (15 elapsed, 50% of the month), 52% used -> projects ~104% of
    // the budget: ahead, but comfortably inside the at-risk overshoot.
    expect(status(15600, 16, 30000)).toBe("watch");
  });

  it("calls a large projected overshoot at risk", () => {
    // Same point in the month, far more spent -> projects ~140%.
    expect(status(21000, 16, 30000)).toBe("at-risk");
  });

  it("is on track when nothing has been spent", () => {
    expect(status(0, 15)).toBe("on-track");
  });

  it("does not raise an alarm from a single early transaction", () => {
    expect(status(2000, 2)).toBe("on-track");
  });

  it("shares its near-limit threshold with the alert cron", () => {
    expect(NEAR_LIMIT_PERCENT).toBe(80);
    expect(MIN_DAYS_FOR_PACE).toBeGreaterThan(0);
  });
});

describe("attention items", () => {
  const make = (id, amount, spent, day) => ({
    id,
    category: id,
    amount,
    pace: budgetPace({ amount, spent, progress: progressOn(day) }),
  });
  const labelOf = (b) => b.category;

  it("says nothing when every budget is fine", () => {
    expect(attentionItems([make("food", 10000, 1000, 15)], labelOf)).toEqual([]);
  });

  it("reports an exceeded budget with its real overshoot", () => {
    const [item] = attentionItems([make("food", 10000, 12000, 20)], labelOf);
    expect(item.tone).toBe("exceeded");
    expect(item.text).toContain("20%");
  });

  it("reports a near-limit budget with its real percentage", () => {
    const [item] = attentionItems([make("food", 10000, 8500, 28)], labelOf);
    expect(item.text).toContain("85%");
  });

  it("raises one item per budget, not one per condition", () => {
    const items = attentionItems([make("food", 10000, 12000, 20)], labelOf);
    expect(items).toHaveLength(1);
  });
});

describe("budget totals", () => {
  const row = (category, amount, spent, previousSpent = 0) => ({
    category,
    amount,
    spent,
    previousSpent,
  });

  it("sums category budgets when there is no overall budget", () => {
    const t = budgetTotals([
      row("groceries", 8000, 6000),
      row("transport", 4000, 1500),
    ]);
    expect(t.budgeted).toBe(12000);
    expect(t.spent).toBe(7500);
    expect(t.remaining).toBe(4500);
    expect(t.percentUsed).toBe(62.5);
  });

  // The guard this function exists for. An overall budget already covers every
  // category, so adding it to the category rows counts the same spending twice
  // -- reporting more budgeted than the user set, and a utilisation that is
  // too low. These numbers are chosen so a naive sum is obviously wrong:
  // 30000 + 8000 + 4000 = 42000 budgeted, and 7500 + 7500 = 15000 spent.
  it("does not double-count when an overall budget covers the categories", () => {
    const t = budgetTotals([
      row(null, 30000, 7500),
      row("groceries", 8000, 6000),
      row("transport", 4000, 1500),
    ]);
    expect(t.budgeted).toBe(30000);
    expect(t.spent).toBe(7500);
    expect(t.budgeted).not.toBe(42000);
    expect(t.spent).not.toBe(15000);
  });

  it("uses the overall budget regardless of where it sits in the list", () => {
    const first = budgetTotals([row(null, 30000, 7500), row("food", 8000, 6000)]);
    const last = budgetTotals([row("food", 8000, 6000), row(null, 30000, 7500)]);
    expect(first).toEqual(last);
  });

  it("uses the overall budget even when it is the only one", () => {
    const t = budgetTotals([row(null, 30000, 12000)]);
    expect(t).toMatchObject({ budgeted: 30000, spent: 12000, remaining: 18000 });
    expect(t.percentUsed).toBe(40);
  });

  // No budgets is not "nothing used": there is no denominator, so there is no
  // percentage, and the UI must say so rather than print 0%.
  it("reports utilisation as null when there are no budgets", () => {
    const t = budgetTotals([]);
    expect(t.budgeted).toBe(0);
    expect(t.spent).toBe(0);
    expect(t.percentUsed).toBeNull();
    expect(Number.isNaN(t.percentUsed)).toBe(false);
  });

  it("goes negative on remaining when spending exceeds the budget", () => {
    const t = budgetTotals([row(null, 10000, 13000)]);
    expect(t.remaining).toBe(-3000);
    expect(t.percentUsed).toBe(130);
  });

  it("reports zero spending as zero, not as missing", () => {
    const t = budgetTotals([row("food", 5000, 0)]);
    expect(t.spent).toBe(0);
    expect(t.percentUsed).toBe(0);
  });

  it("compares with the prior period using the same double-count guard", () => {
    const t = budgetTotals([
      row(null, 30000, 12000, 10000),
      row("groceries", 8000, 6000, 5000),
    ]);
    // The overall row's prior spend already covers groceries; summing both
    // would give 15000 and a wrong percentage.
    expect(t.previousSpent).toBe(10000);
    expect(t.spendChangePercent).toBeCloseTo(20, 6);
  });

  it("sums prior spend across categories when there is no overall budget", () => {
    const t = budgetTotals([row("a", 5000, 3000, 2000), row("b", 5000, 1000, 1000)]);
    expect(t.previousSpent).toBe(3000);
    expect(t.spendChangePercent).toBeCloseTo(33.333, 2);
  });

  it("reports no comparison when the prior period had no spending", () => {
    expect(budgetTotals([row(null, 10000, 4000, 0)]).spendChangePercent).toBeNull();
  });

  it("treats a missing previousSpent as zero rather than NaN", () => {
    const t = budgetTotals([{ category: null, amount: 10000, spent: 4000 }]);
    expect(t.previousSpent).toBe(0);
    expect(t.spendChangePercent).toBeNull();
  });

  it("produces no NaN or Infinity for any shape of input", () => {
    const shapes = [
      [],
      [row(null, 1, 0)],
      [row("a", 1, 1e9)],
      [row(null, 1e9, 0), row("a", 1, 1)],
      [row("a", 0.01, 0.005)],
    ];
    for (const rows of shapes) {
      const t = budgetTotals(rows);
      for (const [key, value] of Object.entries(t)) {
        if (value === null) continue;
        expect(Number.isFinite(value), `${key} for ${JSON.stringify(rows)}`).toBe(true);
      }
    }
  });
});
