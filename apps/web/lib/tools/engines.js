import {
  MAX_PERIODS,
  amortise,
  contributionForTarget,
  deflate,
  describeMonths,
  futureValueOfLump,
  futureValueOfSeries,
  levelPayment,
  periodicRate,
  periodsToClear,
  round2,
  roundUp2,
} from "./finance";

// The ten tools' calculations.
//
// Every function here is pure: numbers in, a structured result out. Nothing
// formats currency, nothing reads the DOM, nothing reaches a network. That is
// what makes them testable, and it is why the forms can stay thin.
//
// Each returns either { ok: true, ... } or { ok: false, reason } -- a result a
// component can render directly, rather than throwing for a user's typo.

const ok = (data) => ({ ok: true, ...data });
const no = (reason) => ({ ok: false, reason });

// 1. Financial Runway Planner ------------------------------------------------
//
// Burn is spending net of income that keeps arriving. When that income covers
// the spending the runway is not "infinite" -- it is simply not a runway
// question any more, and saying so is more useful than printing ∞.
export function financialRunway({ savings, essential, discretionary = 0, otherIncome = 0 }) {
  if (savings < 0 || essential < 0 || discretionary < 0 || otherIncome < 0) {
    return no("Amounts cannot be negative.");
  }
  if (essential === 0 && discretionary === 0) {
    return no("Enter your monthly expenses to estimate a runway.");
  }

  const essentialBurn = round2(essential - otherIncome);
  const lifestyleBurn = round2(essential + discretionary - otherIncome);

  const runway = (burn) => (burn <= 0 ? null : savings / burn);

  return ok({
    essentialBurn,
    lifestyleBurn,
    essentialMonths: runway(essentialBurn),
    lifestyleMonths: runway(lifestyleBurn),
    // Named so the UI does not have to infer it from two nulls.
    essentialCovered: essentialBurn <= 0,
    lifestyleCovered: lifestyleBurn <= 0,
    savings,
  });
}

// 2. Emergency Fund Planner --------------------------------------------------
export function emergencyFund({ essential, debtPayments = 0, months, current = 0 }) {
  if (essential < 0 || debtPayments < 0 || current < 0) return no("Amounts cannot be negative.");
  if (months <= 0) return no("Choose how many months of cover you want.");

  const monthlyNeed = round2(essential + debtPayments);
  if (monthlyNeed === 0) return no("Enter your monthly essential costs.");

  const target = round2(monthlyNeed * months);
  const gap = round2(Math.max(0, target - current));

  return ok({
    monthlyNeed,
    target,
    current,
    gap,
    funded: gap === 0,
    // How long what they already hold would actually last.
    coverageMonths: current / monthlyNeed,
    // The same reserve sized at the usual planning horizons, so the chosen one
    // can be seen in context rather than in isolation.
    scenarios: [3, 6, 9, 12].map((m) => ({
      months: m,
      target: round2(monthlyNeed * m),
      gap: round2(Math.max(0, monthlyNeed * m - current)),
    })),
  });
}

// 3. Goal Funding Planner ----------------------------------------------------
export function goalFunding({ goal, current = 0, months, annualReturn = 0, frequency = "monthly" }) {
  if (goal <= 0) return no("Enter the amount you are saving towards.");
  if (current < 0) return no("Amounts cannot be negative.");
  if (months <= 0) return no("Enter how long you have.");
  if (annualReturn < 0) return no("An expected return cannot be negative.");

  const perYear = frequency === "yearly" ? 1 : 12;
  const periods = frequency === "yearly" ? Math.floor(months / 12) : months;
  if (periods <= 0) return no("That period is shorter than one contribution.");

  const rate = periodicRate(annualReturn, perYear);
  const contribution = contributionForTarget({ target: goal, present: current, rate, periods });

  const contributions = round2(contribution * periods);
  const fromCurrent = round2(futureValueOfLump(current, rate, periods));
  const projected = round2(fromCurrent + futureValueOfSeries(contribution, rate, periods));

  return ok({
    contribution: round2(contribution),
    frequency,
    periods,
    contributions,
    fromCurrent,
    // Growth is stated separately from money put in, because the difference is
    // the whole point and conflating them overstates what saving alone does.
    growth: round2(projected - current - contributions),
    projected,
    // Already there: the target is met by the existing balance compounding.
    alreadyFunded: contribution === 0,
    shortfall: round2(Math.max(0, goal - projected)),
  });
}

// 4. Debt Payoff Planner -----------------------------------------------------
//
// Simulated month by month across every debt at once. Interest accrues on each
// balance; minimums are paid on all of them; whatever is left over goes to the
// one debt the chosen strategy puts first, and rolls onward as each clears.
const STRATEGIES = {
  avalanche: (a, b) => b.rate - a.rate || a.balance - b.balance,
  snowball: (a, b) => a.balance - b.balance || b.rate - a.rate,
};

export function debtPayoff({ debts, extra = 0, strategy = "avalanche" }) {
  if (!Array.isArray(debts) || debts.length === 0) return no("Add at least one debt.");
  if (extra < 0) return no("An extra payment cannot be negative.");
  if (!STRATEGIES[strategy]) return no("Choose a repayment strategy.");

  const working = debts.map((debt, index) => ({
    index,
    name: debt.name || `Debt ${index + 1}`,
    balance: round2(debt.balance),
    rate: periodicRate(debt.rate, 12),
    annualRate: debt.rate,
    minimum: round2(debt.minimum),
  }));

  if (working.some((d) => d.balance <= 0)) return no("Every debt needs a balance above zero.");
  if (working.some((d) => d.minimum <= 0)) return no("Every debt needs a minimum payment above zero.");

  // A minimum that does not cover the month's interest never clears the debt,
  // however long the simulation runs. Saying which one is the useful answer.
  const stuck = working.find((d) => d.minimum <= round2(d.balance * d.rate));
  if (stuck) {
    return no(
      `The minimum on ${stuck.name} does not cover its monthly interest, so that balance would grow. Increase it to continue.`
    );
  }

  const order = [...working].sort(STRATEGIES[strategy]);
  const cleared = [];
  let totalInterest = 0;
  let totalPaid = 0;
  let month = 0;

  while (order.some((d) => d.balance > 0) && month < MAX_PERIODS) {
    month += 1;

    // Interest first, on every outstanding balance.
    for (const debt of order) {
      if (debt.balance <= 0) continue;
      const interest = round2(debt.balance * debt.rate);
      debt.balance = round2(debt.balance + interest);
      totalInterest = round2(totalInterest + interest);
    }

    // Every minimum, then the surplus -- including the minimums freed by debts
    // already cleared, which is what makes either strategy accelerate.
    let pool = round2(
      extra + working.reduce((sum, d) => sum + d.minimum, 0)
    );

    for (const debt of order) {
      if (debt.balance <= 0 || pool <= 0) continue;
      const pay = Math.min(debt.balance, round2(Math.min(debt.minimum, pool)));
      debt.balance = round2(debt.balance - pay);
      pool = round2(pool - pay);
      totalPaid = round2(totalPaid + pay);
    }

    for (const debt of order) {
      if (pool <= 0) break;
      if (debt.balance <= 0) continue;
      const pay = Math.min(debt.balance, pool);
      debt.balance = round2(debt.balance - pay);
      pool = round2(pool - pay);
      totalPaid = round2(totalPaid + pay);
    }

    for (const debt of order) {
      if (debt.balance <= 0 && !cleared.some((c) => c.index === debt.index)) {
        cleared.push({ index: debt.index, name: debt.name, month });
      }
    }
  }

  const finished = order.every((d) => d.balance <= 0);
  if (!finished) return no("These debts do not clear within 100 years at this rate of repayment.");

  return ok({
    strategy,
    months: month,
    duration: describeMonths(month),
    totalInterest,
    totalPaid,
    order: cleared,
  });
}

// Both strategies, and the difference between them. The difference is the
// point: it is what tells someone whether the cheaper order is worth the
// slower first win.
export function compareDebtStrategies({ debts, extra = 0 }) {
  const avalanche = debtPayoff({ debts, extra, strategy: "avalanche" });
  const snowball = debtPayoff({ debts, extra, strategy: "snowball" });
  if (!avalanche.ok) return avalanche;
  if (!snowball.ok) return snowball;
  return ok({
    avalanche,
    snowball,
    interestDifference: round2(snowball.totalInterest - avalanche.totalInterest),
    monthsDifference: snowball.months - avalanche.months,
  });
}

// 5. Loan Prepayment Planner -------------------------------------------------
export function loanPrepayment({ balance, annualRate, payment, extra = 0, lumpSum = 0 }) {
  if (balance <= 0) return no("Enter the amount still outstanding.");
  if (annualRate < 0) return no("An interest rate cannot be negative.");
  if (payment <= 0) return no("Enter your current instalment.");
  if (extra < 0 || lumpSum < 0) return no("Amounts cannot be negative.");
  if (lumpSum >= balance) return no("That lump sum would clear the loan outright.");

  const rate = periodicRate(annualRate, 12);
  const base = amortise({ principal: balance, rate, payment });
  if (!base.cleared) {
    return no("That instalment does not cover the monthly interest, so the balance would grow.");
  }

  const faster = amortise({ principal: balance, rate, payment, extraPayment: extra, lumpSum });

  return ok({
    original: {
      months: base.periods,
      duration: describeMonths(base.periods),
      interest: base.totalInterest,
      total: round2(base.totalInterest + balance),
    },
    accelerated: {
      months: faster.periods,
      duration: describeMonths(faster.periods),
      interest: faster.totalInterest,
      total: round2(faster.totalInterest + balance),
    },
    interestSaved: round2(base.totalInterest - faster.totalInterest),
    monthsSaved: base.periods - faster.periods,
    monthsSavedLabel: describeMonths(base.periods - faster.periods),
    changed: extra > 0 || lumpSum > 0,
    schedule: faster.schedule,
  });
}

// 6. Investment Growth Planner -----------------------------------------------
export function investmentGrowth({
  initial = 0,
  contribution = 0,
  frequency = "monthly",
  years,
  annualReturn,
  inflation = 0,
}) {
  if (initial < 0 || contribution < 0) return no("Amounts cannot be negative.");
  if (years <= 0) return no("Enter how long you plan to stay invested.");
  if (annualReturn < 0) return no("An expected return cannot be negative.");
  if (inflation < 0) return no("Inflation cannot be negative.");
  if (initial === 0 && contribution === 0) return no("Enter an initial amount or a contribution.");

  const perYear = frequency === "yearly" ? 1 : 12;
  const periods = Math.round(years * perYear);
  const rate = periodicRate(annualReturn, perYear);

  const fromInitial = round2(futureValueOfLump(initial, rate, periods));
  const fromContributions = round2(futureValueOfSeries(contribution, rate, periods));
  const projected = round2(fromInitial + fromContributions);
  const invested = round2(initial + contribution * periods);

  // A year-by-year series, so the shape of compounding is visible rather than
  // just its endpoint.
  const series = [];
  for (let year = 0; year <= Math.ceil(years); year += 1) {
    const n = Math.min(Math.round(year * perYear), periods);
    const value = round2(futureValueOfLump(initial, rate, n) + futureValueOfSeries(contribution, rate, n));
    const paidIn = round2(initial + contribution * n);
    series.push({ year, invested: paidIn, value, growth: round2(value - paidIn) });
  }

  return ok({
    periods,
    invested,
    growth: round2(projected - invested),
    projected,
    // What that sum would buy in today's money, when an inflation figure is given.
    realValue: inflation > 0 ? round2(deflate(projected, inflation, years)) : null,
    series,
  });
}

// 7. SIP Goal Planner --------------------------------------------------------
//
// Two directions of the same question, because people arrive with either.
export function sipForGoal({ target, current = 0, years, annualReturn }) {
  if (target <= 0) return no("Enter the amount you are investing towards.");
  if (current < 0) return no("Amounts cannot be negative.");
  if (years <= 0) return no("Enter how long you have.");
  if (annualReturn < 0) return no("An expected return cannot be negative.");

  const periods = Math.round(years * 12);
  const rate = periodicRate(annualReturn, 12);
  const sip = contributionForTarget({ target, present: current, rate, periods });

  const fromCurrent = round2(futureValueOfLump(current, rate, periods));
  const contributions = round2(sip * periods);
  const projected = round2(fromCurrent + futureValueOfSeries(sip, rate, periods));

  return ok({
    sip: round2(sip),
    periods,
    contributions,
    fromCurrent,
    growth: round2(projected - current - contributions),
    projected,
    alreadyFunded: sip === 0,
  });
}

export function sipProjection({ sip, current = 0, years, annualReturn }) {
  if (sip <= 0) return no("Enter your monthly SIP.");
  if (current < 0) return no("Amounts cannot be negative.");
  if (years <= 0) return no("Enter how long you plan to invest.");
  if (annualReturn < 0) return no("An expected return cannot be negative.");

  const periods = Math.round(years * 12);
  const rate = periodicRate(annualReturn, 12);
  const contributions = round2(sip * periods);
  const projected = round2(
    futureValueOfLump(current, rate, periods) + futureValueOfSeries(sip, rate, periods)
  );

  return ok({
    periods,
    contributions,
    growth: round2(projected - current - contributions),
    projected,
  });
}

// 8. Net Worth Calculator ----------------------------------------------------
export function netWorth({ assets, liabilities }) {
  const sum = (rows) =>
    (rows ?? []).reduce((total, row) => total + (Number(row.amount) || 0), 0);

  if ((assets ?? []).some((a) => Number(a.amount) < 0)) return no("Assets cannot be negative.");
  if ((liabilities ?? []).some((l) => Number(l.amount) < 0)) {
    return no("Liabilities cannot be negative — enter what you owe as a positive amount.");
  }

  const totalAssets = round2(sum(assets));
  const totalLiabilities = round2(sum(liabilities));

  if (totalAssets === 0 && totalLiabilities === 0) {
    return no("Enter at least one asset or liability.");
  }

  const share = (amount, total) => (total > 0 ? (amount / total) * 100 : 0);

  return ok({
    totalAssets,
    totalLiabilities,
    netWorth: round2(totalAssets - totalLiabilities),
    assetBreakdown: (assets ?? [])
      .filter((a) => Number(a.amount) > 0)
      .map((a) => ({ label: a.label, amount: round2(Number(a.amount)), share: share(Number(a.amount), totalAssets) })),
    liabilityBreakdown: (liabilities ?? [])
      .filter((l) => Number(l.amount) > 0)
      .map((l) => ({ label: l.label, amount: round2(Number(l.amount)), share: share(Number(l.amount), totalLiabilities) })),
  });
}

// 9. Home Affordability Planner ----------------------------------------------
//
// Worked backwards from what is left after existing commitments, not from a
// multiple of income: the instalment a lender will actually look at is the one
// your income can still carry.
export function homeAffordability({
  monthlyIncome,
  existingDebt = 0,
  downPayment = 0,
  annualRate,
  years,
  maxDtiPercent = 40,
  otherHomeCosts = 0,
}) {
  if (monthlyIncome <= 0) return no("Enter your monthly income.");
  if (existingDebt < 0 || downPayment < 0 || otherHomeCosts < 0) {
    return no("Amounts cannot be negative.");
  }
  if (annualRate < 0) return no("An interest rate cannot be negative.");
  if (years <= 0) return no("Enter the loan tenure.");
  if (maxDtiPercent <= 0 || maxDtiPercent > 100) {
    return no("The share of income going to debt must be between 1 and 100.");
  }

  const ceiling = round2(monthlyIncome * (maxDtiPercent / 100));
  const available = round2(ceiling - existingDebt - otherHomeCosts);

  if (available <= 0) {
    return no(
      "Your existing commitments already use the share of income you chose, so there is nothing left for a home loan under these assumptions."
    );
  }

  const rate = periodicRate(annualRate, 12);
  const periods = Math.round(years * 12);

  // The loan an instalment of `available` would service for `periods` months.
  const loan =
    rate === 0
      ? round2(available * periods)
      : round2((available * (Math.pow(1 + rate, periods) - 1)) / (rate * Math.pow(1 + rate, periods)));

  const price = round2(loan + downPayment);
  const emi = round2(levelPayment({ principal: loan, rate, periods }));
  const totalInterest = round2(emi * periods - loan);

  return ok({
    price,
    loan,
    downPayment,
    emi,
    availableForEmi: available,
    totalInterest,
    periods,
    // What share of income the instalment plus existing commitments would take.
    dtiPercent: round2(((emi + existingDebt + otherHomeCosts) / monthlyIncome) * 100),
    downPaymentPercent: price > 0 ? round2((downPayment / price) * 100) : 0,
  });
}

// 10. Rent vs. Buy Planner ---------------------------------------------------
//
// A scenario comparison, not a verdict. Renting frees capital that could be
// invested; buying builds equity but carries interest, upkeep and purchase
// costs. Both sides are totalled over the same horizon on the user's own
// assumptions, and every one of those assumptions is reported back.
export function rentVsBuy({
  monthlyRent,
  rentIncreasePercent = 0,
  propertyPrice,
  downPayment,
  annualRate,
  loanYears,
  years,
  maintenancePercent = 1,
  purchaseCostPercent = 0,
  appreciationPercent = 0,
  investmentReturnPercent = 0,
}) {
  if (monthlyRent < 0 || propertyPrice <= 0 || downPayment < 0) {
    return no("Enter a rent and a property price.");
  }
  if (downPayment > propertyPrice) return no("The deposit cannot exceed the property price.");
  if (annualRate < 0 || loanYears <= 0 || years <= 0) {
    return no("Check the interest rate and the time periods.");
  }
  if ([rentIncreasePercent, maintenancePercent, purchaseCostPercent, appreciationPercent, investmentReturnPercent].some((v) => v < 0)) {
    return no("Percentages cannot be negative.");
  }

  const months = Math.round(years * 12);
  const rate = periodicRate(annualRate, 12);
  const loan = round2(propertyPrice - downPayment);
  const loanPeriods = Math.round(loanYears * 12);
  const emi = round2(levelPayment({ principal: loan, rate, periods: loanPeriods }));

  // --- Renting. Rent rises each year; the capital not spent on a deposit and
  // purchase costs is invested instead.
  const purchaseCosts = round2(propertyPrice * (purchaseCostPercent / 100));
  const investedCapital = round2(downPayment + purchaseCosts);
  const investReturn = periodicRate(investmentReturnPercent, 12);

  // Both sides are measured the same way:
  //
  //   net cost = everything paid out  -  what you still own at the end
  //
  // Lower is better, and either can come out negative. Using one definition
  // for both is what makes the two numbers comparable at all.
  let rentPaid = 0;
  let rent = monthlyRent;
  let portfolio = investedCapital;
  let totalInvested = investedCapital;
  const monthlyOwnerCost = round2((propertyPrice * (maintenancePercent / 100)) / 12);

  for (let month = 1; month <= months; month += 1) {
    if (month > 1 && (month - 1) % 12 === 0) {
      rent = round2(rent * (1 + rentIncreasePercent / 100));
    }
    rentPaid = round2(rentPaid + rent);

    // The renter also invests whatever the owner spends beyond the rent.
    // Comparing a renter who saves nothing against an owner building equity
    // would stack the comparison before it starts.
    const ownerOutlay = round2(emi + monthlyOwnerCost);
    const surplus = Math.max(0, round2(ownerOutlay - rent));
    portfolio = round2(portfolio * (1 + investReturn) + surplus);
    totalInvested = round2(totalInvested + surplus);
  }

  // --- Buying. Interest, upkeep and purchase costs are spent; the deposit and
  // the principal repaid turn into equity, and the property may appreciate.
  const schedule = amortise({ principal: loan, rate, payment: emi, maxPeriods: months });
  const monthsRun = Math.min(months, schedule.schedule.length);
  const interestPaid = round2(
    schedule.schedule.slice(0, monthsRun).reduce((sum, row) => sum + row.interest, 0)
  );
  const remainingLoan = monthsRun > 0 ? schedule.schedule[monthsRun - 1].balance : loan;
  const principalRepaid = round2(loan - remainingLoan);
  const upkeep = round2(monthlyOwnerCost * months);
  const propertyValue = round2(propertyPrice * Math.pow(1 + appreciationPercent / 100, years));
  const equity = round2(propertyValue - remainingLoan);

  const rentNetCost = round2(rentPaid + totalInvested - portfolio);
  const buyNetCost = round2(
    downPayment + purchaseCosts + interestPaid + principalRepaid + upkeep - equity
  );

  return ok({
    years,
    rent: {
      totalRent: rentPaid,
      investedCapital,
      totalInvested,
      portfolioValue: portfolio,
      netCost: rentNetCost,
    },
    buy: {
      emi,
      interestPaid,
      upkeep,
      purchaseCosts,
      propertyValue,
      remainingLoan,
      principalRepaid,
      equity,
      netCost: buyNetCost,
    },
    difference: round2(Math.abs(rentNetCost - buyNetCost)),
    // Named, never asserted as advice: it is the cheaper option UNDER THESE
    // ASSUMPTIONS, which the page states alongside it.
    lowerCost: rentNetCost === buyNetCost ? null : rentNetCost < buyNetCost ? "rent" : "buy",
  });
}

// 11. Retirement Withdrawal Planner ------------------------------------------
//
// For someone already retired: how long does the money last?
//
// Simulated month by month rather than solved in closed form, because the two
// forces pull against each other — the corpus earns a return while the
// withdrawal rises with inflation — and the month one overtakes the other is
// the answer. A closed form would hide that crossing point.
//
// MAX_RETIREMENT_YEARS is a reporting ceiling, not a life expectancy. Reaching
// it means the money outlasts the horizon this tool will model, which is a
// different answer from "it runs out in year 50".
export const MAX_RETIREMENT_YEARS = 50;

export function retirementWithdrawal({
  corpus,
  monthlyWithdrawal,
  otherMonthlyIncome = 0,
  annualReturn,
  inflation,
}) {
  if (corpus < 0 || monthlyWithdrawal < 0 || otherMonthlyIncome < 0) {
    return no("Amounts cannot be negative.");
  }
  if (annualReturn < 0 || inflation < 0) return no("Rates cannot be negative.");
  if (monthlyWithdrawal === 0) return no("Enter what you need to draw each month.");
  if (corpus === 0) return no("Enter the savings you are drawing from.");

  const rate = periodicRate(annualReturn, 12);

  // The withdrawal that could continue indefinitely: the corpus's return after
  // inflation. Below this the pot keeps growing in real terms; above it, the
  // pot is being spent down however healthy the headline return looks.
  const realAnnual = (1 + annualReturn / 100) / (1 + inflation / 100) - 1;
  const sustainableMonthly =
    realAnnual > 0 ? round2((corpus * realAnnual) / 12 + otherMonthlyIncome) : null;

  let balance = corpus;
  let withdrawal = monthlyWithdrawal;
  let totalWithdrawn = 0;
  let months = 0;
  const yearly = [];

  const limit = MAX_RETIREMENT_YEARS * 12;
  while (balance > 0 && months < limit) {
    // The year's withdrawal is set at its start, then held for twelve months.
    if (months > 0 && months % 12 === 0) {
      withdrawal = round2(withdrawal * (1 + inflation / 100));
      yearly.push({
        year: months / 12,
        balance: round2(balance),
        monthlyWithdrawal: withdrawal,
      });
    }

    // Other income is held flat in nominal terms. Most pensions and annuities
    // are, and assuming otherwise would flatter the result.
    const draw = Math.max(0, round2(withdrawal - otherMonthlyIncome));
    balance = round2(balance * (1 + rate) - draw);
    totalWithdrawn = round2(totalWithdrawn + Math.min(draw, Math.max(0, balance + draw)));
    months += 1;
  }

  const depleted = balance <= 0;

  return ok({
    depleted,
    months: depleted ? months : null,
    duration: depleted ? describeMonths(months) : null,
    // Not "forever": it is longer than this tool models, which is honest.
    horizonYears: MAX_RETIREMENT_YEARS,
    endingBalance: depleted ? 0 : round2(balance),
    totalWithdrawn,
    firstYearMonthly: monthlyWithdrawal,
    finalMonthly: round2(withdrawal),
    sustainableMonthly,
    // Above the sustainable rate the pot is being run down, whatever the
    // headline return says. Worth stating plainly.
    drawingDown: sustainableMonthly !== null && monthlyWithdrawal > sustainableMonthly,
    realReturnPercent: round2(realAnnual * 100),
    yearly: yearly.slice(0, MAX_RETIREMENT_YEARS),
  });
}

// 12. Retirement Corpus Planner ----------------------------------------------
//
// For someone still working: how large does the pot need to be, and is the
// current rate of saving going to get there?
//
// The target is the present value at retirement of a withdrawal that itself
// rises with inflation every year — a growing annuity — rather than expenses
// multiplied by a round number of years, which ignores both the return the pot
// keeps earning and the rising cost of the same lifestyle.
export function retirementCorpus({
  currentAge,
  retirementAge,
  yearsInRetirement,
  monthlyExpenses,
  currentSavings = 0,
  monthlyContribution = 0,
  returnBefore,
  returnAfter,
  inflation,
}) {
  if (currentAge <= 0 || retirementAge <= 0) return no("Enter your age and your retirement age.");
  if (retirementAge <= currentAge) return no("Your retirement age must be later than your age now.");
  if (yearsInRetirement <= 0) return no("Enter how many years the money should cover.");
  if (monthlyExpenses <= 0) return no("Enter your monthly expenses.");
  if (currentSavings < 0 || monthlyContribution < 0) return no("Amounts cannot be negative.");
  if (returnBefore < 0 || returnAfter < 0 || inflation < 0) return no("Rates cannot be negative.");

  const yearsToRetirement = retirementAge - currentAge;
  const g = inflation / 100;
  const r = returnAfter / 100;

  // Today's lifestyle, priced at retirement.
  const annualAtRetirement = round2(monthlyExpenses * 12 * Math.pow(1 + g, yearsToRetirement));

  // Present value at retirement of an income rising with inflation for n years.
  //
  // The r === g branch is not a nicety: the general form divides by (r - g),
  // so equal rates would be a division by zero rather than the simple answer
  // it actually has.
  const n = yearsInRetirement;
  const target =
    Math.abs(r - g) < 1e-9
      ? round2((annualAtRetirement * n) / (1 + r))
      : round2((annualAtRetirement / (r - g)) * (1 - Math.pow((1 + g) / (1 + r), n)));

  const months = Math.round(yearsToRetirement * 12);
  const rateBefore = periodicRate(returnBefore, 12);

  const fromSavings = round2(futureValueOfLump(currentSavings, rateBefore, months));
  const fromContributions = round2(futureValueOfSeries(monthlyContribution, rateBefore, months));
  const projected = round2(fromSavings + fromContributions);

  // Sub-rupee differences are rounding, not a shortfall. requiredMonthly is
  // rounded up for the same reason, so saving what the tool asks for comes
  // back as on track rather than a rupee short.
  const rawGap = round2(Math.max(0, target - projected));
  const gap = rawGap < 1 ? 0 : rawGap;

  // Rounded up, so saving exactly what this says always reaches the target
  // rather than landing a rupee short after three hundred months of
  // compounding.
  const required = roundUp2(
    contributionForTarget({ target, present: currentSavings, rate: rateBefore, periods: months })
  );

  return ok({
    yearsToRetirement,
    target,
    projected,
    gap,
    onTrack: gap === 0,
    fromSavings,
    fromContributions,
    contributed: round2(monthlyContribution * months),
    requiredMonthly: required,
    shortfallMonthly: round2(Math.max(0, required - monthlyContribution)),
    annualAtRetirement,
    monthlyAtRetirement: round2(annualAtRetirement / 12),
    // Shown so the number is not mistaken for today's money.
    inflationFactor: round2(Math.pow(1 + g, yearsToRetirement)),
  });
}
