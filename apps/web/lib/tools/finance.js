// Shared financial primitives.
//
// Every tool's engine is built from these, so compound growth and loan
// amortisation are defined once and tested once rather than re-derived in ten
// places.
//
// Precision. These tools are stateless browser arithmetic -- nothing is
// persisted, so there is no Decimal column to honour -- but floating point
// still drifts over a 360-month loop. The rule here is the one lenders
// actually use: round money to paise at each period boundary rather than
// carrying full binary precision to the end. That makes a schedule
// reproducible and makes a total equal to the sum of its rows.

// Money, to paise. Half-up at the boundary, via a scaled round, because
// Math.round(x * 100) alone mis-rounds values like 1.005 that cannot be
// represented exactly.
export const round2 = (value) => {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON * Math.sign(value || 1)) * 100) / 100;
};

// Money, rounded UP to paise.
//
// For a contribution a plan depends on. Rounding to nearest can land fractions
// of a rupee short, which compounds over three hundred months into a target
// the tool told you to aim for and then reports as missed. Rounding up can
// only overshoot, which is the safe direction for a number someone will act
// on.
export const roundUp2 = (value) => {
  if (!Number.isFinite(value)) return 0;
  return Math.ceil(value * 100 - Number.EPSILON) / 100;
};

// An annual percentage rate as a per-period decimal.
//
// Nominal division, not an effective-rate conversion: a 12% loan at 1% a month
// is how a lender quotes and charges it, and converting to 0.9489% would make
// every EMI here disagree with the borrower's statement.
export const periodicRate = (annualPercent, periodsPerYear = 12) => {
  const rate = Number(annualPercent);
  if (!Number.isFinite(rate) || periodsPerYear <= 0) return 0;
  return rate / 100 / periodsPerYear;
};

// Future value of a present sum compounded for n periods.
export const futureValueOfLump = (present, rate, periods) => {
  if (!Number.isFinite(present) || periods <= 0) return Number(present) || 0;
  return present * Math.pow(1 + rate, periods);
};

// Future value of a level contribution made at the END of each period
// (an ordinary annuity), which is how a monthly investment is normally timed.
//
// The zero-rate branch is not an optimisation: the closed form divides by the
// rate, so a 0% assumption would be NaN rather than simply contributions.
export const futureValueOfSeries = (payment, rate, periods) => {
  if (!Number.isFinite(payment) || periods <= 0) return 0;
  if (rate === 0) return payment * periods;
  return payment * ((Math.pow(1 + rate, periods) - 1) / rate);
};

// The level contribution needed to reach a target, given a starting sum.
//
// Returns 0 rather than a negative when the starting sum already compounds
// past the target: "contribute a negative amount" is not an answer a planning
// tool should give.
export const contributionForTarget = ({ target, present = 0, rate, periods }) => {
  if (periods <= 0) return 0;
  const fromPresent = futureValueOfLump(present, rate, periods);
  const shortfall = target - fromPresent;
  if (shortfall <= 0) return 0;
  if (rate === 0) return shortfall / periods;
  return shortfall / ((Math.pow(1 + rate, periods) - 1) / rate);
};

// The level payment that clears a loan over a fixed number of periods --
// the EMI.
export const levelPayment = ({ principal, rate, periods }) => {
  if (principal <= 0 || periods <= 0) return 0;
  if (rate === 0) return principal / periods;
  const factor = Math.pow(1 + rate, periods);
  return (principal * rate * factor) / (factor - 1);
};

// How many periods a given payment takes to clear a balance.
//
// Returns null when the payment cannot cover the interest -- the balance grows
// and the loan never ends. A tool must say that rather than print a very large
// number of months.
export const periodsToClear = ({ principal, rate, payment }) => {
  if (principal <= 0) return 0;
  if (payment <= 0) return null;
  if (rate === 0) return Math.ceil(principal / payment);
  if (payment <= principal * rate) return null;
  return Math.log(payment / (payment - principal * rate)) / Math.log(1 + rate);
};

// The guard every repayment loop needs. 100 years of months: long enough that
// no real schedule reaches it, short enough that a mistake cannot hang a tab.
export const MAX_PERIODS = 1200;

// Runs a loan to completion one period at a time.
//
// Simulated rather than solved in closed form because extra payments, a
// lump sum and the final part-period all change the shape, and a schedule a
// borrower can check row by row is worth more than one formula.
export function amortise({
  principal,
  rate,
  payment,
  extraPayment = 0,
  lumpSum = 0,
  maxPeriods = MAX_PERIODS,
}) {
  let balance = round2(principal - lumpSum);
  if (balance <= 0) {
    return { periods: 0, totalInterest: 0, totalPaid: round2(lumpSum), schedule: [], cleared: true };
  }

  const perPeriod = payment + extraPayment;
  // Interest-only or worse: say so instead of looping to the cap and
  // reporting a 100-year payoff as though it were an answer.
  if (perPeriod <= round2(balance * rate) && rate > 0) {
    return { periods: null, totalInterest: null, totalPaid: null, schedule: [], cleared: false };
  }

  let totalInterest = 0;
  let periods = 0;
  const schedule = [];

  while (balance > 0 && periods < maxPeriods) {
    const interest = round2(balance * rate);
    // The last instalment is only what is left, never a full payment that
    // would overshoot into a negative balance.
    const due = Math.min(round2(balance + interest), round2(perPeriod));
    const principalPaid = round2(due - interest);

    balance = round2(balance - principalPaid);
    totalInterest = round2(totalInterest + interest);
    periods += 1;

    schedule.push({ period: periods, payment: due, interest, principal: principalPaid, balance });
  }

  return {
    periods,
    totalInterest,
    totalPaid: round2(totalInterest + principal),
    schedule,
    cleared: balance <= 0,
  };
}

// Months as "2 years 4 months", which is how someone reads a payoff date.
export function describeMonths(totalMonths) {
  if (totalMonths === null || totalMonths === undefined || !Number.isFinite(totalMonths)) {
    return null;
  }
  const whole = Math.max(0, Math.round(totalMonths));
  const years = Math.floor(whole / 12);
  const months = whole % 12;
  if (years === 0) return `${months} month${months === 1 ? "" : "s"}`;
  if (months === 0) return `${years} year${years === 1 ? "" : "s"}`;
  return `${years} year${years === 1 ? "" : "s"} ${months} month${months === 1 ? "" : "s"}`;
}

// Today plus n months, for "debt-free by" style output.
export function monthsFromNow(months, from = new Date()) {
  if (months === null || !Number.isFinite(months)) return null;
  const date = new Date(from.getTime());
  date.setMonth(date.getMonth() + Math.round(months));
  return date;
}

// Purchasing power of a future sum in today's money.
export const deflate = (amount, inflationPercent, years) => {
  const rate = Number(inflationPercent) / 100;
  if (!Number.isFinite(rate) || rate <= 0 || years <= 0) return amount;
  return amount / Math.pow(1 + rate, years);
};
