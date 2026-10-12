import { describe, it, expect } from "vitest";

const {
  round2, roundUp2, periodicRate, futureValueOfLump, futureValueOfSeries,
  contributionForTarget, levelPayment, periodsToClear, amortise, describeMonths, deflate,
} = await import("@/lib/tools/finance");

// The primitives every tool is built from. Expected values are derived from
// the standard closed forms, not from running this code and recording what it
// said -- a test written that way only pins the bug in place.
describe("rounding", () => {
  it("rounds money to paise", () => {
    expect(round2(1234.5678)).toBe(1234.57);
    expect(round2(0.005)).toBe(0.01);
    expect(round2(-1.005)).toBe(-1.01);
  });

  it("returns zero for values that are not finite", () => {
    expect(round2(NaN)).toBe(0);
    expect(round2(Infinity)).toBe(0);
  });
});

describe("periodic rate", () => {
  // Nominal division: 12% a year is the 1% a month a lender actually charges.
  it("divides a nominal annual rate", () => {
    expect(periodicRate(12, 12)).toBeCloseTo(0.01, 10);
    expect(periodicRate(7.2, 12)).toBeCloseTo(0.006, 10);
    expect(periodicRate(10, 1)).toBeCloseTo(0.1, 10);
  });

  it("is zero for unusable input", () => {
    expect(periodicRate("abc", 12)).toBe(0);
    expect(periodicRate(12, 0)).toBe(0);
  });
});

describe("compound growth", () => {
  // 1000 at 10% for 2 years = 1000 * 1.1^2 = 1210.
  it("compounds a lump sum", () => {
    expect(futureValueOfLump(1000, 0.1, 2)).toBeCloseTo(1210, 6);
  });

  // 100/period at 10% for 3 periods, paid at period end:
  // 100*1.1^2 + 100*1.1 + 100 = 121 + 110 + 100 = 331.
  it("compounds a level series as an ordinary annuity", () => {
    expect(futureValueOfSeries(100, 0.1, 3)).toBeCloseTo(331, 6);
  });

  // The branch that would otherwise divide by zero and return NaN.
  it("returns plain contributions at a zero rate", () => {
    expect(futureValueOfSeries(500, 0, 12)).toBe(6000);
  });

  it("returns the present value when there are no periods", () => {
    expect(futureValueOfLump(1000, 0.1, 0)).toBe(1000);
    expect(futureValueOfSeries(100, 0.1, 0)).toBe(0);
  });
});

describe("contribution for a target", () => {
  // Inverse of the annuity: a contribution that grows to 331 at 10% over 3
  // periods must be 100.
  it("inverts the annuity", () => {
    expect(contributionForTarget({ target: 331, present: 0, rate: 0.1, periods: 3 }))
      .toBeCloseTo(100, 6);
  });

  it("subtracts what the existing balance will itself become", () => {
    // 1000 compounds to 1210 on its own, leaving 331 to be funded. Over two
    // periods the annuity factor is (1.1^2 - 1)/0.1 = 2.1, so 331/2.1 = 157.62.
    // Without subtracting the 1210 the answer would be 1541/2.1 = 733.81.
    expect(contributionForTarget({ target: 1541, present: 1000, rate: 0.1, periods: 2 }))
      .toBeCloseTo(157.62, 2);
  });

  // "Contribute a negative amount" is not an answer a planning tool gives.
  it("is zero when the existing balance already reaches the target", () => {
    expect(contributionForTarget({ target: 1000, present: 5000, rate: 0.1, periods: 5 })).toBe(0);
  });

  it("splits the target evenly at a zero rate", () => {
    expect(contributionForTarget({ target: 1200, present: 0, rate: 0, periods: 12 })).toBe(100);
  });
});

describe("level payment (EMI)", () => {
  // A textbook case: 100,000 at 12% nominal over 12 months.
  // P*r*(1+r)^n / ((1+r)^n - 1) with r = 0.01, n = 12 -> 8884.88.
  it("matches the standard annuity formula", () => {
    expect(levelPayment({ principal: 100000, rate: 0.01, periods: 12 })).toBeCloseTo(8884.88, 2);
  });

  it("splits principal evenly at a zero rate", () => {
    expect(levelPayment({ principal: 12000, rate: 0, periods: 12 })).toBe(1000);
  });

  it("is zero for a cleared loan", () => {
    expect(levelPayment({ principal: 0, rate: 0.01, periods: 12 })).toBe(0);
  });
});

describe("periods to clear", () => {
  it("agrees with the payment that was derived from the same terms", () => {
    const payment = levelPayment({ principal: 100000, rate: 0.01, periods: 12 });
    expect(periodsToClear({ principal: 100000, rate: 0.01, payment })).toBeCloseTo(12, 6);
  });

  // The case that must never print a number: the payment never clears it.
  it("returns null when the payment cannot cover the interest", () => {
    expect(periodsToClear({ principal: 100000, rate: 0.01, payment: 500 })).toBeNull();
    expect(periodsToClear({ principal: 100000, rate: 0.01, payment: 1000 })).toBeNull();
  });
});

describe("amortisation", () => {
  const loan = { principal: 100000, rate: 0.01 };
  const payment = levelPayment({ ...loan, periods: 12 });

  it("clears the loan in the scheduled number of periods", () => {
    const result = amortise({ ...loan, payment });
    expect(result.periods).toBe(12);
    expect(result.cleared).toBe(true);
  });

  it("ends on exactly zero rather than overshooting", () => {
    const result = amortise({ ...loan, payment });
    expect(result.schedule.at(-1).balance).toBe(0);
  });

  // Every total must equal the sum of the rows it claims to total.
  it("totals interest to the sum of its own schedule", () => {
    const result = amortise({ ...loan, payment });
    const summed = result.schedule.reduce((t, row) => t + row.interest, 0);
    expect(result.totalInterest).toBeCloseTo(summed, 2);
  });

  it("repays exactly the principal across the schedule", () => {
    const result = amortise({ ...loan, payment });
    const principalSum = result.schedule.reduce((t, row) => t + row.principal, 0);
    expect(principalSum).toBeCloseTo(100000, 2);
  });

  it("shortens the term and cuts interest when extra is paid", () => {
    const base = amortise({ ...loan, payment });
    const faster = amortise({ ...loan, payment, extraPayment: 2000 });
    expect(faster.periods).toBeLessThan(base.periods);
    expect(faster.totalInterest).toBeLessThan(base.totalInterest);
  });

  // Half the balance cleared up front: the remaining 50,000 at the same
  // instalment needs ln(8884.88/(8884.88-500))/ln(1.01) = 5.82 periods, so the
  // schedule ends on the 6th -- a final part-instalment, not a 7th full one.
  it("applies a lump sum before any interest accrues on it", () => {
    const faster = amortise({ ...loan, payment, lumpSum: 50000 });
    expect(faster.periods).toBe(6);
    expect(faster.schedule.at(-1).payment).toBeLessThan(payment);
    expect(faster.schedule.at(-1).balance).toBe(0);
  });

  it("reports failure instead of looping when the payment is too small", () => {
    const result = amortise({ ...loan, payment: 100 });
    expect(result.cleared).toBe(false);
    expect(result.periods).toBeNull();
  });

  it("handles a zero-interest loan", () => {
    const result = amortise({ principal: 12000, rate: 0, payment: 1000 });
    expect(result.periods).toBe(12);
    expect(result.totalInterest).toBe(0);
  });
});

describe("month descriptions", () => {
  it.each([
    [0, "0 months"],
    [1, "1 month"],
    [11, "11 months"],
    [12, "1 year"],
    [13, "1 year 1 month"],
    [28, "2 years 4 months"],
  ])("describes %i months", (months, expected) => {
    expect(describeMonths(months)).toBe(expected);
  });

  it("returns null for an unknown duration", () => {
    expect(describeMonths(null)).toBeNull();
    expect(describeMonths(Infinity)).toBeNull();
  });
});

describe("inflation adjustment", () => {
  // 1210 in 2 years at 10% inflation is 1000 of today's money.
  it("discounts a future sum to today's money", () => {
    expect(deflate(1210, 10, 2)).toBeCloseTo(1000, 6);
  });

  it("leaves the amount alone when no inflation is assumed", () => {
    expect(deflate(1000, 0, 5)).toBe(1000);
  });
});

// Rounding up, for a figure someone will act on.
describe("rounding up", () => {
  it("never lands below the value", () => {
    expect(roundUp2(19482.1712)).toBe(19482.18);
    expect(roundUp2(100)).toBe(100);
    expect(roundUp2(0.001)).toBe(0.01);
  });

  it("does not inflate a value already on a paisa", () => {
    expect(roundUp2(12.34)).toBe(12.34);
    expect(roundUp2(0.1)).toBe(0.1);
  });

  it("returns zero for values that are not finite", () => {
    expect(roundUp2(NaN)).toBe(0);
  });
});
