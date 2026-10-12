import { describe, it, expect } from "vitest";

const E = await import("@/lib/tools/engines");
const { levelPayment, round2 } = await import("@/lib/tools/finance");
const {
  TOOLS, CATEGORIES, CATEGORY_IDS, TOOL_SLUGS, groupedTools, relatedTools,
  resolveCategory, toolsInCategory, visibleCategories, FOOTER_TOOL_SLUGS,
} = await import("@/lib/tools/registry");

// 1 -------------------------------------------------------------------------
describe("Financial Runway Planner", () => {
  it("divides savings by the relevant burn", () => {
    const r = E.financialRunway({ savings: 588000, essential: 70000, discretionary: 15000 });
    expect(r.essentialBurn).toBe(70000);
    expect(r.lifestyleBurn).toBe(85000);
    expect(r.essentialMonths).toBeCloseTo(8.4, 2);
    expect(r.lifestyleMonths).toBeCloseTo(6.92, 2);
  });

  it("nets off income that keeps arriving", () => {
    const r = E.financialRunway({ savings: 100000, essential: 50000, otherIncome: 30000 });
    expect(r.essentialBurn).toBe(20000);
    expect(r.essentialMonths).toBe(5);
  });

  // The case that must not print infinity.
  it("reports costs as covered rather than an endless runway", () => {
    const r = E.financialRunway({ savings: 100000, essential: 30000, otherIncome: 40000 });
    expect(r.essentialCovered).toBe(true);
    expect(r.essentialMonths).toBeNull();
    expect(Number.isFinite(r.essentialMonths)).toBe(false);
  });

  it("still reports a lifestyle shortfall when essentials are covered", () => {
    const r = E.financialRunway({ savings: 120000, essential: 30000, discretionary: 20000, otherIncome: 35000 });
    expect(r.essentialCovered).toBe(true);
    expect(r.lifestyleBurn).toBe(15000);
    expect(r.lifestyleMonths).toBe(8);
  });

  it("refuses negative amounts and empty expenses", () => {
    expect(E.financialRunway({ savings: -1, essential: 10 }).ok).toBe(false);
    expect(E.financialRunway({ savings: 100, essential: 0, discretionary: 0 }).ok).toBe(false);
  });

  it("gives a zero runway with no savings", () => {
    expect(E.financialRunway({ savings: 0, essential: 50000 }).essentialMonths).toBe(0);
  });
});

// 2 -------------------------------------------------------------------------
describe("Emergency Fund Planner", () => {
  it("sizes the target against essential costs", () => {
    const r = E.emergencyFund({ essential: 60000, debtPayments: 10000, months: 6, current: 150000 });
    expect(r.monthlyNeed).toBe(70000);
    expect(r.target).toBe(420000);
    expect(r.gap).toBe(270000);
    expect(r.coverageMonths).toBeCloseTo(2.142, 2);
  });

  it("reports no gap once the reserve is funded", () => {
    const r = E.emergencyFund({ essential: 50000, months: 6, current: 400000 });
    expect(r.gap).toBe(0);
    expect(r.funded).toBe(true);
  });

  it("offers the usual horizons for context", () => {
    const r = E.emergencyFund({ essential: 50000, months: 6, current: 0 });
    expect(r.scenarios.map((s) => s.months)).toEqual([3, 6, 9, 12]);
    expect(r.scenarios.find((s) => s.months === 12).target).toBe(600000);
  });

  it("refuses an impossible request", () => {
    expect(E.emergencyFund({ essential: 0, months: 6 }).ok).toBe(false);
    expect(E.emergencyFund({ essential: 100, months: 0 }).ok).toBe(false);
    expect(E.emergencyFund({ essential: 100, months: 6, current: -5 }).ok).toBe(false);
  });
});

// 3 -------------------------------------------------------------------------
describe("Goal Funding Planner", () => {
  it("separates contributions from growth", () => {
    const r = E.goalFunding({ goal: 1000000, current: 100000, months: 60, annualReturn: 12 });
    // The invariant that makes the breakdown honest: the projected value is
    // what you already have, plus what you put in, plus what it grew by --
    // and nothing is counted twice.
    expect(round2(100000 + r.contributions + r.growth)).toBeCloseTo(r.projected, 0);
    // Solved for the goal, so it lands on the goal.
    expect(r.projected).toBeCloseTo(1000000, 0);
    expect(r.contribution).toBeGreaterThan(0);
    expect(r.growth).toBeGreaterThan(0);
  });

  it("needs no contribution when the balance alone gets there", () => {
    const r = E.goalFunding({ goal: 100000, current: 90000, months: 60, annualReturn: 12 });
    expect(r.alreadyFunded).toBe(true);
    expect(r.contribution).toBe(0);
  });

  it("works with no assumed return", () => {
    const r = E.goalFunding({ goal: 120000, current: 0, months: 12, annualReturn: 0 });
    expect(r.contribution).toBe(10000);
    expect(r.growth).toBe(0);
  });

  it("supports yearly contributions", () => {
    const r = E.goalFunding({ goal: 100000, months: 24, annualReturn: 0, frequency: "yearly" });
    expect(r.periods).toBe(2);
    expect(r.contribution).toBe(50000);
  });

  it("refuses a period shorter than one contribution", () => {
    expect(E.goalFunding({ goal: 100000, months: 6, annualReturn: 10, frequency: "yearly" }).ok).toBe(false);
  });

  it("refuses invalid input", () => {
    expect(E.goalFunding({ goal: 0, months: 12 }).ok).toBe(false);
    expect(E.goalFunding({ goal: 100, months: 0 }).ok).toBe(false);
    expect(E.goalFunding({ goal: 100, months: 12, annualReturn: -5 }).ok).toBe(false);
  });
});

// 4 -------------------------------------------------------------------------
describe("Debt Payoff Planner", () => {
  const debts = [
    { name: "Card", balance: 80000, rate: 36, minimum: 4000 },
    { name: "Personal loan", balance: 200000, rate: 14, minimum: 6000 },
    { name: "Car loan", balance: 300000, rate: 9, minimum: 8000 },
  ];

  it("clears every debt and reports a duration", () => {
    const r = E.debtPayoff({ debts, extra: 5000, strategy: "avalanche" });
    expect(r.ok).toBe(true);
    expect(r.months).toBeGreaterThan(0);
    expect(r.order).toHaveLength(3);
  });

  // The defining behaviour of each strategy.
  it("avalanche clears the highest rate first", () => {
    const r = E.debtPayoff({ debts, extra: 5000, strategy: "avalanche" });
    expect(r.order[0].name).toBe("Card");
  });

  it("snowball clears the smallest balance first", () => {
    const r = E.debtPayoff({ debts, extra: 5000, strategy: "snowball" });
    expect(r.order[0].name).toBe("Card");
    const other = E.debtPayoff({
      debts: [
        { name: "Big but cheap", balance: 500000, rate: 8, minimum: 12000 },
        { name: "Small but dear", balance: 40000, rate: 30, minimum: 2500 },
      ],
      extra: 5000,
      strategy: "snowball",
    });
    expect(other.order[0].name).toBe("Small but dear");
  });

  // Mathematically avalanche cannot cost more interest than snowball.
  it("never costs more interest under avalanche than snowball", () => {
    const c = E.compareDebtStrategies({ debts, extra: 5000 });
    expect(c.avalanche.totalInterest).toBeLessThanOrEqual(c.snowball.totalInterest);
    expect(c.interestDifference).toBeGreaterThanOrEqual(0);
  });

  it("clears faster when more is paid", () => {
    const slow = E.debtPayoff({ debts, extra: 0, strategy: "avalanche" });
    const fast = E.debtPayoff({ debts, extra: 20000, strategy: "avalanche" });
    expect(fast.months).toBeLessThan(slow.months);
    expect(fast.totalInterest).toBeLessThan(slow.totalInterest);
  });

  // The failure that must be named, not silently run for 100 years.
  it("refuses when a minimum does not cover its own interest", () => {
    const r = E.debtPayoff({
      debts: [{ name: "Runaway", balance: 100000, rate: 36, minimum: 500 }],
      extra: 0,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("Runaway");
  });

  it("refuses empty or invalid debts", () => {
    expect(E.debtPayoff({ debts: [] }).ok).toBe(false);
    expect(E.debtPayoff({ debts: [{ balance: 0, rate: 10, minimum: 100 }] }).ok).toBe(false);
    expect(E.debtPayoff({ debts: [{ balance: 100, rate: 10, minimum: 0 }] }).ok).toBe(false);
    expect(E.debtPayoff({ debts, extra: -1 }).ok).toBe(false);
  });

  // A single debt is a plain amortisation, so the two engines must agree.
  it("agrees with the amortisation engine on one debt", () => {
    const r = E.debtPayoff({
      debts: [{ name: "Only", balance: 100000, rate: 12, minimum: 8884.88 }],
      extra: 0,
    });
    expect(r.months).toBe(12);
    expect(r.totalInterest).toBeCloseTo(6618.6, 0);
  });
});

// 5 -------------------------------------------------------------------------
describe("Loan Prepayment Planner", () => {
  const base = { balance: 2500000, annualRate: 8.5, payment: 25000 };

  it("shortens the term and saves interest", () => {
    const r = E.loanPrepayment({ ...base, extra: 5000 });
    expect(r.accelerated.months).toBeLessThan(r.original.months);
    expect(r.interestSaved).toBeGreaterThan(0);
    expect(r.monthsSaved).toBe(r.original.months - r.accelerated.months);
  });

  it("changes nothing when nothing extra is paid", () => {
    const r = E.loanPrepayment({ ...base, extra: 0 });
    expect(r.interestSaved).toBe(0);
    expect(r.monthsSaved).toBe(0);
    expect(r.changed).toBe(false);
  });

  it("counts a lump sum", () => {
    const r = E.loanPrepayment({ ...base, lumpSum: 500000 });
    expect(r.accelerated.months).toBeLessThan(r.original.months);
    expect(r.interestSaved).toBeGreaterThan(0);
  });

  it("refuses an instalment that cannot cover the interest", () => {
    const r = E.loanPrepayment({ balance: 2500000, annualRate: 8.5, payment: 5000 });
    expect(r.ok).toBe(false);
  });

  it("refuses a lump sum that would clear the loan", () => {
    expect(E.loanPrepayment({ ...base, lumpSum: 2500000 }).ok).toBe(false);
  });

  it("refuses invalid input", () => {
    expect(E.loanPrepayment({ balance: 0, annualRate: 8, payment: 100 }).ok).toBe(false);
    expect(E.loanPrepayment({ ...base, extra: -1 }).ok).toBe(false);
  });
});

// 6 -------------------------------------------------------------------------
describe("Investment Growth Planner", () => {
  it("splits what was paid in from what it grew by", () => {
    const r = E.investmentGrowth({ initial: 100000, contribution: 10000, years: 10, annualReturn: 12 });
    expect(r.invested).toBe(round2(100000 + 10000 * 120));
    expect(round2(r.invested + r.growth)).toBeCloseTo(r.projected, 0);
    expect(r.growth).toBeGreaterThan(0);
  });

  it("is just the contributions at a zero return", () => {
    const r = E.investmentGrowth({ initial: 0, contribution: 1000, years: 1, annualReturn: 0 });
    expect(r.projected).toBe(12000);
    expect(r.growth).toBe(0);
  });

  it("reports a smaller figure in today's money when inflation is assumed", () => {
    const r = E.investmentGrowth({ initial: 100000, contribution: 0, years: 10, annualReturn: 10, inflation: 6 });
    expect(r.realValue).toBeLessThan(r.projected);
  });

  it("leaves the real value unset when no inflation is given", () => {
    expect(E.investmentGrowth({ initial: 100000, years: 5, annualReturn: 10 }).realValue).toBeNull();
  });

  it("produces a year-by-year series that ends at the projection", () => {
    const r = E.investmentGrowth({ initial: 50000, contribution: 5000, years: 5, annualReturn: 10 });
    expect(r.series[0].value).toBe(50000);
    expect(r.series.at(-1).value).toBeCloseTo(r.projected, 0);
  });

  it("refuses invalid input", () => {
    expect(E.investmentGrowth({ years: 0, annualReturn: 10 }).ok).toBe(false);
    expect(E.investmentGrowth({ initial: 0, contribution: 0, years: 5, annualReturn: 10 }).ok).toBe(false);
    expect(E.investmentGrowth({ initial: 100, years: 5, annualReturn: -1 }).ok).toBe(false);
  });
});

// 7 -------------------------------------------------------------------------
describe("SIP Goal Planner", () => {
  it("solves for the monthly SIP a target needs", () => {
    const r = E.sipForGoal({ target: 5000000, current: 0, years: 10, annualReturn: 12 });
    expect(r.sip).toBeGreaterThan(0);
    expect(r.projected).toBeCloseTo(5000000, 0);
  });

  // The two directions must agree: feed the solved SIP back in and the
  // projection must land on the original target.
  it("round-trips against the projection", () => {
    const solved = E.sipForGoal({ target: 2500000, current: 200000, years: 8, annualReturn: 11 });
    const projected = E.sipProjection({ sip: solved.sip, current: 200000, years: 8, annualReturn: 11 });
    expect(projected.projected).toBeCloseTo(2500000, -1);
  });

  it("asks for nothing when the existing investment gets there", () => {
    const r = E.sipForGoal({ target: 100000, current: 500000, years: 5, annualReturn: 10 });
    expect(r.alreadyFunded).toBe(true);
    expect(r.sip).toBe(0);
  });

  it("refuses invalid input in both directions", () => {
    expect(E.sipForGoal({ target: 0, years: 5, annualReturn: 10 }).ok).toBe(false);
    expect(E.sipProjection({ sip: 0, years: 5, annualReturn: 10 }).ok).toBe(false);
    expect(E.sipProjection({ sip: 1000, years: 0, annualReturn: 10 }).ok).toBe(false);
  });
});

// 8 -------------------------------------------------------------------------
describe("Net Worth Calculator", () => {
  const assets = [
    { label: "Cash", amount: 50000 },
    { label: "Investments", amount: 800000 },
    { label: "Property", amount: 4000000 },
  ];
  const liabilities = [
    { label: "Home loan", amount: 2500000 },
    { label: "Card", amount: 50000 },
  ];

  it("subtracts what is owed from what is owned", () => {
    const r = E.netWorth({ assets, liabilities });
    expect(r.totalAssets).toBe(4850000);
    expect(r.totalLiabilities).toBe(2550000);
    expect(r.netWorth).toBe(2300000);
  });

  it("reports a negative position honestly", () => {
    const r = E.netWorth({ assets: [{ label: "Cash", amount: 10000 }], liabilities: [{ label: "Loan", amount: 500000 }] });
    expect(r.netWorth).toBe(-490000);
  });

  it("shares sum to 100 per cent on each side", () => {
    const r = E.netWorth({ assets, liabilities });
    expect(r.assetBreakdown.reduce((t, a) => t + a.share, 0)).toBeCloseTo(100, 6);
    expect(r.liabilityBreakdown.reduce((t, l) => t + l.share, 0)).toBeCloseTo(100, 6);
  });

  it("leaves empty rows out of the breakdown", () => {
    const r = E.netWorth({ assets: [...assets, { label: "Vehicles", amount: 0 }], liabilities });
    expect(r.assetBreakdown.some((a) => a.label === "Vehicles")).toBe(false);
  });

  it("refuses negative entries and an empty form", () => {
    expect(E.netWorth({ assets: [{ label: "Cash", amount: -1 }], liabilities: [] }).ok).toBe(false);
    expect(E.netWorth({ assets: [], liabilities: [{ label: "Loan", amount: -1 }] }).ok).toBe(false);
    expect(E.netWorth({ assets: [], liabilities: [] }).ok).toBe(false);
  });
});

// 9 -------------------------------------------------------------------------
describe("Home Affordability Planner", () => {
  const base = { monthlyIncome: 200000, existingDebt: 20000, downPayment: 1500000, annualRate: 8.5, years: 20 };

  it("works back from what income can still carry", () => {
    const r = E.homeAffordability(base);
    expect(r.availableForEmi).toBe(60000); // 40% of 200000, less 20000
    expect(r.loan).toBeGreaterThan(0);
    expect(r.price).toBe(round2(r.loan + 1500000));
  });

  // The instalment derived from the affordable loan must be the instalment
  // that was used to derive it.
  it("is internally consistent: the EMI matches the loan it sized", () => {
    const r = E.homeAffordability(base);
    const emi = levelPayment({ principal: r.loan, rate: 8.5 / 100 / 12, periods: 240 });
    expect(r.emi).toBeCloseTo(emi, 0);
    expect(r.emi).toBeCloseTo(r.availableForEmi, 0);
  });

  it("reduces what is affordable when more income is already committed", () => {
    const less = E.homeAffordability({ ...base, existingDebt: 50000 });
    expect(less.price).toBeLessThan(E.homeAffordability(base).price);
  });

  it("counts recurring home costs against the same ceiling", () => {
    const withCosts = E.homeAffordability({ ...base, otherHomeCosts: 10000 });
    expect(withCosts.availableForEmi).toBe(50000);
  });

  it("refuses when commitments already use the whole allowance", () => {
    const r = E.homeAffordability({ ...base, existingDebt: 90000 });
    expect(r.ok).toBe(false);
  });

  it("refuses invalid input", () => {
    expect(E.homeAffordability({ ...base, monthlyIncome: 0 }).ok).toBe(false);
    expect(E.homeAffordability({ ...base, years: 0 }).ok).toBe(false);
    expect(E.homeAffordability({ ...base, maxDtiPercent: 0 }).ok).toBe(false);
    expect(E.homeAffordability({ ...base, maxDtiPercent: 150 }).ok).toBe(false);
  });
});

// 10 ------------------------------------------------------------------------
describe("Rent vs. Buy Planner", () => {
  const base = {
    monthlyRent: 35000,
    rentIncreasePercent: 5,
    propertyPrice: 9000000,
    downPayment: 1800000,
    annualRate: 8.5,
    loanYears: 20,
    years: 10,
    maintenancePercent: 1,
    purchaseCostPercent: 7,
    appreciationPercent: 5,
    investmentReturnPercent: 10,
  };

  it("reports both sides and never only a verdict", () => {
    const r = E.rentVsBuy(base);
    expect(r.ok).toBe(true);
    expect(r.rent.totalRent).toBeGreaterThan(0);
    expect(r.buy.interestPaid).toBeGreaterThan(0);
    expect(r.buy.propertyValue).toBeGreaterThan(base.propertyPrice);
    expect(["rent", "buy", null]).toContain(r.lowerCost);
  });

  // Strong appreciation must favour owning; none at all must not.
  it("responds to the appreciation assumption", () => {
    const strong = E.rentVsBuy({ ...base, appreciationPercent: 12 });
    const none = E.rentVsBuy({ ...base, appreciationPercent: 0 });
    expect(strong.buy.netCost).toBeLessThan(none.buy.netCost);
  });

  it("responds to the investment return assumption", () => {
    const high = E.rentVsBuy({ ...base, investmentReturnPercent: 15 });
    const low = E.rentVsBuy({ ...base, investmentReturnPercent: 2 });
    expect(high.rent.netCost).toBeLessThan(low.rent.netCost);
  });

  it("grows the rent each year", () => {
    const flat = E.rentVsBuy({ ...base, rentIncreasePercent: 0 });
    expect(flat.rent.totalRent).toBe(35000 * 120);
    expect(E.rentVsBuy(base).rent.totalRent).toBeGreaterThan(flat.rent.totalRent);
  });

  it("reports equity as the property less what is still owed", () => {
    const r = E.rentVsBuy(base);
    expect(r.buy.equity).toBeCloseTo(round2(r.buy.propertyValue - r.buy.remainingLoan), 2);
  });

  it("refuses an impossible scenario", () => {
    expect(E.rentVsBuy({ ...base, downPayment: 10000000 }).ok).toBe(false);
    expect(E.rentVsBuy({ ...base, propertyPrice: 0 }).ok).toBe(false);
    expect(E.rentVsBuy({ ...base, years: 0 }).ok).toBe(false);
    expect(E.rentVsBuy({ ...base, appreciationPercent: -1 }).ok).toBe(false);
  });
});

// 11 ------------------------------------------------------------------------
describe("Retirement Withdrawal Planner", () => {
  const base = {
    corpus: 12000000, monthlyWithdrawal: 60000, otherMonthlyIncome: 15000,
    annualReturn: 8, inflation: 6,
  };

  it("reports how long the savings last", () => {
    const r = E.retirementWithdrawal(base);
    expect(r.ok).toBe(true);
    expect(r.depleted).toBe(true);
    expect(r.months).toBeGreaterThan(0);
    expect(r.duration).toBeTruthy();
  });

  // The figure most people get wrong: what matters is the return AFTER
  // inflation, not the headline return.
  it("computes the sustainable draw from the real return", () => {
    const r = E.retirementWithdrawal(base);
    // (1.08 / 1.06) - 1 = 1.8868%
    expect(r.realReturnPercent).toBeCloseTo(1.89, 1);
    // corpus * real / 12, plus the pension that does not come from the pot.
    expect(r.sustainableMonthly).toBeCloseTo((12000000 * 0.018868) / 12 + 15000, 0);
  });

  it("says the pot is being drawn down when the draw exceeds that", () => {
    expect(E.retirementWithdrawal(base).drawingDown).toBe(true);
    const modest = E.retirementWithdrawal({ ...base, monthlyWithdrawal: 20000 });
    expect(modest.drawingDown).toBe(false);
  });

  it("lasts longer when the draw is smaller", () => {
    const small = E.retirementWithdrawal({ ...base, monthlyWithdrawal: 45000 });
    const large = E.retirementWithdrawal({ ...base, monthlyWithdrawal: 90000 });
    expect(large.months).toBeLessThan(small.months ?? Infinity);
  });

  it("lasts longer when a pension covers part of the spending", () => {
    const withPension = E.retirementWithdrawal(base);
    const without = E.retirementWithdrawal({ ...base, otherMonthlyIncome: 0 });
    expect(without.months).toBeLessThan(withPension.months);
  });

  // Not "forever": longer than this tool models, which is a different claim.
  it("reports outlasting the horizon rather than an infinite life", () => {
    const r = E.retirementWithdrawal({ ...base, monthlyWithdrawal: 16000, otherMonthlyIncome: 0 });
    expect(r.depleted).toBe(false);
    expect(r.months).toBeNull();
    expect(r.horizonYears).toBe(50);
    expect(r.endingBalance).toBeGreaterThan(0);
  });

  it("cannot sustain any draw when returns trail inflation", () => {
    const r = E.retirementWithdrawal({ ...base, annualReturn: 4, inflation: 7 });
    expect(r.sustainableMonthly).toBeNull();
    expect(r.depleted).toBe(true);
  });

  it("raises the withdrawal with inflation each year", () => {
    const r = E.retirementWithdrawal(base);
    expect(r.finalMonthly).toBeGreaterThan(r.firstYearMonthly);
    const flat = E.retirementWithdrawal({ ...base, inflation: 0 });
    expect(flat.finalMonthly).toBe(flat.firstYearMonthly);
  });

  it("refuses unusable input", () => {
    expect(E.retirementWithdrawal({ ...base, corpus: 0 }).ok).toBe(false);
    expect(E.retirementWithdrawal({ ...base, monthlyWithdrawal: 0 }).ok).toBe(false);
    expect(E.retirementWithdrawal({ ...base, annualReturn: -1 }).ok).toBe(false);
    expect(E.retirementWithdrawal({ ...base, corpus: -5 }).ok).toBe(false);
  });
});

// 12 ------------------------------------------------------------------------
describe("Retirement Corpus Planner", () => {
  const base = {
    currentAge: 35, retirementAge: 60, yearsInRetirement: 25, monthlyExpenses: 50000,
    currentSavings: 1500000, monthlyContribution: 20000,
    returnBefore: 11, returnAfter: 7, inflation: 6,
  };

  it("inflates today's expenses to what they cost at retirement", () => {
    const r = E.retirementCorpus(base);
    // 1.06^25 = 4.2919
    expect(r.inflationFactor).toBeCloseTo(4.29, 1);
    expect(r.monthlyAtRetirement).toBeCloseTo(50000 * Math.pow(1.06, 25), 0);
  });

  it("targets the present value of a rising income, not expenses times years", () => {
    const r = E.retirementCorpus(base);
    const naive = r.annualAtRetirement * 25;
    // The pot keeps earning, so the real target is below the naive product --
    // and far above the un-inflated version people usually reach for.
    expect(r.target).toBeLessThan(naive);
    expect(r.target).toBeGreaterThan(50000 * 12 * 25);
  });

  // The branch that would otherwise divide by zero.
  it("handles a return equal to inflation", () => {
    const r = E.retirementCorpus({ ...base, returnAfter: 6, inflation: 6 });
    expect(r.ok).toBe(true);
    expect(Number.isFinite(r.target)).toBe(true);
    expect(r.target).toBeCloseTo((r.annualAtRetirement * 25) / 1.06, 0);
  });

  it("projects the pot from savings and contributions", () => {
    const r = E.retirementCorpus(base);
    expect(r.projected).toBeCloseTo(round2(r.fromSavings + r.fromContributions), 0);
    expect(r.fromContributions).toBeGreaterThan(r.contributed);
  });

  it("reports a shortfall and what would close it", () => {
    const r = E.retirementCorpus({ ...base, monthlyContribution: 5000 });
    expect(r.onTrack).toBe(false);
    expect(r.gap).toBeGreaterThan(0);
    expect(r.requiredMonthly).toBeGreaterThan(5000);
    expect(r.shortfallMonthly).toBeCloseTo(r.requiredMonthly - 5000, 2);
  });

  // The required contribution must actually reach the target.
  it("is internally consistent: saving the required amount closes the gap", () => {
    const r = E.retirementCorpus({ ...base, monthlyContribution: 5000 });
    const fixed = E.retirementCorpus({ ...base, monthlyContribution: r.requiredMonthly });
    expect(fixed.projected).toBeCloseTo(fixed.target, -2);
    expect(fixed.onTrack).toBe(true);
  });

  // Retiring earlier produces a SMALLER nominal target -- fifteen years of
  // inflation instead of twenty-five -- while being considerably harder. The
  // measure of difficulty is what it demands of you each month, not the size
  // of the number at the end.
  it("demands a larger monthly contribution when retiring earlier", () => {
    const early = E.retirementCorpus({ ...base, retirementAge: 50, yearsInRetirement: 35 });
    const later = E.retirementCorpus(base);
    expect(early.requiredMonthly).toBeGreaterThan(later.requiredMonthly);
    // Fewer years of inflation, so the figure quoted at retirement is smaller.
    expect(early.inflationFactor).toBeLessThan(later.inflationFactor);
  });

  it("refuses an impossible plan", () => {
    expect(E.retirementCorpus({ ...base, retirementAge: 30 }).ok).toBe(false);
    expect(E.retirementCorpus({ ...base, currentAge: 0 }).ok).toBe(false);
    expect(E.retirementCorpus({ ...base, yearsInRetirement: 0 }).ok).toBe(false);
    expect(E.retirementCorpus({ ...base, monthlyExpenses: 0 }).ok).toBe(false);
    expect(E.retirementCorpus({ ...base, inflation: -1 }).ok).toBe(false);
  });
});

// Registry ------------------------------------------------------------------
describe("tools registry", () => {
  it("holds every tool exactly once", () => {
    expect(TOOLS).toHaveLength(12);
    expect(new Set(TOOL_SLUGS).size).toBe(12);
  });

  it("puts every tool in a declared category", () => {
    const ids = new Set(CATEGORIES.map((c) => c.id));
    for (const tool of TOOLS) expect(ids.has(tool.category)).toBe(true);
  });

  it("has every tool in a category, with only Other empty", () => {
    const empty = groupedTools().filter((g) => g.tools.length === 0).map((g) => g.id);
    expect(empty).toEqual(["other"]);
  });

  it("groups them in the declared category order", () => {
    expect(groupedTools().map((g) => g.name)).toEqual([
      "Retirement", "Savings", "Investing", "Debt", "Home & Property", "Net Worth", "Other",
    ]);
    expect(groupedTools().find((g) => g.id === "savings").tools.map((t) => t.name)).toEqual([
      "Financial Runway Planner",
      "Emergency Fund Planner",
      "Goal Funding Planner",
    ]);
  });

  // A related link pointing at a slug that does not exist is a 404.
  it("only relates tools that exist, and never to itself", () => {
    for (const tool of TOOLS) {
      for (const slug of tool.related) {
        expect(TOOL_SLUGS, `${tool.slug} -> ${slug}`).toContain(slug);
        expect(slug).not.toBe(tool.slug);
      }
      expect(relatedTools(tool.slug).length).toBeGreaterThan(0);
    }
  });

  it("gives every tool a problem-oriented summary", () => {
    for (const tool of TOOLS) {
      expect(tool.summary.length).toBeGreaterThan(40);
      expect(tool.question).toMatch(/\?$/);
    }
  });

  it("features four real tools in the footer", () => {
    expect(FOOTER_TOOL_SLUGS).toHaveLength(4);
    for (const slug of FOOTER_TOOL_SLUGS) expect(TOOL_SLUGS).toContain(slug);
  });
});

// The footer's Tools column is generated from the registry, so a label can
// never drift from the page it points at -- and every href it emits must be a
// route that actually exists.
describe("footer tools column", () => {
  it("lists the four featured tools and ends with All Tools", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync(new URL("../components/footer.jsx", import.meta.url), "utf8")
    );
    // Built from FOOTER_TOOL_SLUGS rather than typed out by hand.
    expect(source).toContain("FOOTER_TOOL_SLUGS");
    expect(source).toContain('{ label: "All Tools", href: "/tools" }');
  });

  it("uses a short label for each featured tool", () => {
    for (const slug of FOOTER_TOOL_SLUGS) {
      const tool = TOOLS.find((t) => t.slug === slug);
      expect(tool.short.length).toBeLessThan(tool.name.length);
    }
  });

  // Enabling the Company column must not introduce a link to a page that does
  // not exist. Only About has one today; the rest render as plain text.
  it("only links Company entries that have a page", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync(new URL("../components/footer.jsx", import.meta.url), "utf8");
    const company = source.slice(source.indexOf('title: "Company"'), source.indexOf('title: "Tools"'));
    expect(company).toContain('{ label: "About", href: "/about" }');
    for (const label of ["Contact", "Careers", "Open Source", "Blog"]) {
      expect(company).toContain(`{ label: "${label}" }`);
    }
    // Removed, as specified.
    expect(company).not.toContain("Contributors");
  });
});

// Category filtering. The URL is the source of truth, so what ?category=
// resolves to is the contract this page rests on.
describe("category filtering", () => {
  it("has real tools in Retirement", () => {
    expect(toolsInCategory("retirement").map((t) => t.name)).toEqual([
      "Retirement Withdrawal Planner",
      "Retirement Corpus Planner",
    ]);
  });

  it("declares the categories in filter order, with Other last", () => {
    expect(CATEGORY_IDS).toEqual([
      "retirement", "savings", "investing", "debt", "home", "net-worth", "other",
    ]);
  });

  it("resolves each category to itself", () => {
    for (const id of CATEGORY_IDS) {
      const resolved = resolveCategory(id);
      expect(resolved.id).toBe(id);
      expect(resolved.valid).toBe(true);
    }
  });

  it("treats a missing category as all tools", () => {
    for (const value of [undefined, null, ""]) {
      const resolved = resolveCategory(value);
      expect(resolved.id).toBeNull();
      expect(resolved.valid).toBe(true);
    }
    expect(toolsInCategory(resolveCategory(undefined).id)).toHaveLength(12);
  });

  // The guard against a typed or stale URL turning into a broken page -- or
  // worse, into a category that does not exist.
  it.each(["foo", "bitcoin", "123", "Retirement", "../admin", "<script>"])(
    "falls back to all tools for %s",
    (value) => {
      const resolved = resolveCategory(value);
      expect(resolved.valid).toBe(false);
      expect(resolved.id).toBeNull();
      expect(toolsInCategory(resolved.id)).toHaveLength(12);
    }
  );

  it("takes the first value when the parameter is repeated", () => {
    expect(resolveCategory(["debt", "savings"]).id).toBe("debt");
  });

  it("returns only the tools in the selected category", () => {
    expect(toolsInCategory("debt").map((t) => t.name)).toEqual([
      "Debt Payoff Planner",
      "Loan Prepayment Planner",
    ]);
    expect(toolsInCategory("home").map((t) => t.name)).toEqual([
      "Home Affordability Planner",
      "Rent vs. Buy Planner",
    ]);
    expect(toolsInCategory("net-worth").map((t) => t.name)).toEqual(["Net Worth Calculator"]);
    expect(toolsInCategory("savings")).toHaveLength(3);
    expect(toolsInCategory("investing")).toHaveLength(2);
    expect(toolsInCategory("retirement")).toHaveLength(2);
  });

  // The point of expanding the taxonomy: nothing is parked in Other because it
  // had nowhere else to go.
  it("leaves Other empty rather than using it as a dumping ground", () => {
    expect(toolsInCategory("other")).toEqual([]);
  });

  // Retirement and Other are declared but hold no tools yet. They must still
  // resolve as valid, so a direct link shows the empty state honestly instead
  // of silently redirecting to All.
  it("treats the still-empty Other category as valid", () => {
    const resolved = resolveCategory("other");
    expect(resolved.valid).toBe(true);
    expect(resolved.id).toBe("other");
    expect(toolsInCategory("other")).toEqual([]);
  });

  it("covers every tool exactly once across the five categories", () => {
    const seen = CATEGORY_IDS.flatMap((id) => toolsInCategory(id).map((t) => t.slug));
    expect(seen).toHaveLength(12);
    expect(new Set(seen).size).toBe(12);
  });

  it("gives each tool a route and a category label for the card", () => {
    for (const tool of toolsInCategory(null)) {
      expect(tool.href).toBe(`/tools/${tool.slug}`);
      expect(tool.categoryLabel).toBeTruthy();
      expect(TOOL_SLUGS).toContain(tool.slug);
    }
  });

  // The whole point of the design: filtering is an array operation over static
  // module data. If this ever became async, it would mean a request was added.
  // A tab that leads to an empty page is worse than no tab. The selected one
  // is the exception: a shared link to an empty category must still show which
  // chip is active.
  it("hides a category that holds no tools", () => {
    const shown = visibleCategories().map((c) => c.id);
    expect(shown).toEqual(["retirement", "savings", "investing", "debt", "home", "net-worth"]);
    expect(shown).not.toContain("other");
  });

  it("still shows an empty category while it is the selected one", () => {
    expect(visibleCategories("other").map((c) => c.id)).toContain("other");
    // And keeps it in its declared position rather than appending it.
    expect(visibleCategories("other").at(-1).id).toBe("other");
  });

  it("filters synchronously, with no promise anywhere", () => {
    const result = toolsInCategory("investing");
    expect(Array.isArray(result)).toBe(true);
    expect(typeof result.then).toBe("undefined");
  });
});
