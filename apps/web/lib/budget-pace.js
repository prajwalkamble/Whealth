// Budget pace: how far through the month the spending is, against how far
// through the month the calendar is.
//
// What the data actually supports, and what it does not:
//
//   SUPPORTED        the budget amount, and spending for any month, from real
//                    Budget rows and Transaction rows.
//   DERIVED          elapsed/remaining days, utilisation, expected pace, actual
//                    pace, projection at current pace, status, and the change
//                    in SPENDING against the previous month.
//   NOT SUPPORTED    anything needing a historical budget AMOUNT. The Budget
//                    row holds one current amount with no period and no
//                    history, so "September's budget was X", budget adherence
//                    over N periods, and "exceeded in 4 of the last 5" cannot
//                    be computed without inventing the past. They are not here.
//
// There is no currency column anywhere in the schema, so amounts are summed
// directly. If one is ever added, every total in this file becomes wrong until
// it groups by currency first.

import { change } from "./analytics";

// The share of a budget at which it is worth saying something.
//
// 80 is not a new number: it is the threshold the budget alert cron has always
// used (lib/inngest/functions.js). Sharing the constant keeps the page and the
// email from disagreeing about whether a budget is near its limit.
export const NEAR_LIMIT_PERCENT = 80;

// How far past the budget a straight-line projection has to land before the
// budget is called at risk rather than merely worth watching.
//
// Any spending ahead of the calendar projects over the budget -- that is just
// arithmetic -- so an overshoot threshold is what separates "slightly ahead"
// from "will not fit". Without it the at-risk state swallows the watch state
// entirely and one of them is unreachable.
export const AT_RISK_OVERSHOOT_PERCENT = 10;

// Pace is meaningless in the first day or so of a month: one ordinary weekly
// shop on the 1st annualises to an alarming number. Below this, pace,
// projection and the ahead-of-pace status are withheld rather than guessed.
export const MIN_DAYS_FOR_PACE = 3;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Where the month is, as of `now`.
//
// Days are counted from the month bounds the rest of the app uses, so this
// agrees with the figures on every other page and handles month length, leap
// years and the app timezone without a second date system.
export function periodProgress({ startOfMonth, endOfMonth }, now = new Date()) {
  const total = Math.max(Math.round((endOfMonth - startOfMonth) / MS_PER_DAY), 1);

  // Clamped: a month in the past is fully elapsed, one in the future has not
  // started, and neither should produce a negative day count.
  const rawElapsed = (now - startOfMonth) / MS_PER_DAY;
  const elapsed = Math.min(Math.max(rawElapsed, 0), total);

  return {
    totalDays: total,
    // Whole days completed, so "day 1" reads as 1 rather than 0.9.
    daysElapsed: Math.floor(elapsed),
    daysRemaining: Math.max(total - Math.floor(elapsed), 0),
    // The fraction used for pace comparison, not rounded, so a budget is not
    // judged against a step function.
    elapsedShare: (elapsed / total) * 100,
    isCurrent: now >= startOfMonth && now <= endOfMonth,
    isPast: now > endOfMonth,
    isFuture: now < startOfMonth,
  };
}

// Status, from utilisation measured against the calendar rather than against a
// fixed percentage.
//
//   exceeded   spent more than the budget. Unambiguous.
//   at-risk    projected past the budget at the current pace, or already near
//              the limit with a meaningful part of the month left.
//   watch      running measurably ahead of where the calendar is.
//   on-track   everything else, including a month that is simply over.
//
// 80% used with 90% of the month gone is on track. 80% used with 30% gone is
// not. That distinction is the whole point of the function.
export function statusOf({ percentUsed, projected, amount, progress }) {
  if (percentUsed > 100) {
    return { id: "exceeded", label: "Exceeded" };
  }

  const enoughElapsed = progress.daysElapsed >= MIN_DAYS_FOR_PACE;
  // Is spending running ahead of where the calendar is? Everything below turns
  // on this rather than on utilisation alone.
  const aheadOfCalendar = percentUsed > progress.elapsedShare;

  if (enoughElapsed && projected !== null && projected > amount) {
    const overshoot = ((projected - amount) / amount) * 100;
    return overshoot >= AT_RISK_OVERSHOOT_PERCENT
      ? { id: "at-risk", label: "At risk" }
      : { id: "watch", label: "Ahead of pace" };
  }

  // Near the limit only counts when spending is also ahead of the calendar.
  // 80% used with 90% of the month gone is not a problem; 80% used with 30%
  // gone already failed the projection check above.
  if (percentUsed >= NEAR_LIMIT_PERCENT && aheadOfCalendar && progress.daysRemaining > 0) {
    return { id: "at-risk", label: "Near limit" };
  }

  return { id: "on-track", label: "On track" };
}

// Everything the page shows for one budget, derived from the three things the
// database actually holds: the limit, what was spent, and when the month runs.
//
// Every quotient here is guarded. amount is > 0 by database CHECK, so
// utilisation cannot divide by zero; the rest are explicit.
export function budgetPace({ amount, spent, previousSpent = null, progress }) {
  const percentUsed = (spent / amount) * 100;
  const remaining = amount - spent;

  // Withheld rather than guessed when too little of the month has passed.
  const enoughElapsed = progress.daysElapsed >= MIN_DAYS_FOR_PACE;

  const actualPerDay = enoughElapsed ? spent / progress.daysElapsed : null;
  const expectedPerDay = amount / progress.totalDays;

  // A straight-line projection, and labelled as exactly that in the UI. It is
  // not a forecast: it is what the month totals if the current rate holds.
  const projected =
    actualPerDay === null ? null : actualPerDay * progress.totalDays;

  // What is left, spread over the days left. Undefined on the final day, when
  // there are no remaining days to spread it over.
  const remainingPerDay =
    progress.daysRemaining > 0 && remaining > 0
      ? remaining / progress.daysRemaining
      : null;

  return {
    percentUsed,
    remaining,
    actualPerDay,
    expectedPerDay,
    projected,
    projectedOverBy: projected !== null && projected > amount ? projected - amount : null,
    remainingPerDay,
    // null when there is nothing to compare against, so the UI says so rather
    // than printing a percentage against zero.
    spendChangePercent: previousSpent === null ? null : change(spent, previousSpent),
    status: statusOf({ percentUsed, projected, amount, progress }),
  };
}

// The page's headline totals, across every budget in the period.
//
// The guard that matters: an overall budget (category null) already covers
// every category, so adding it to the category budgets counts the same
// spending twice and reports a total that is nonsense -- more budgeted than
// the user ever set, and a utilisation that is too low. When an overall budget
// exists it IS the total; the category budgets are breakdowns within it.
//
// Without one, the category budgets are all there is, so they sum.
export function budgetTotals(rows) {
  const overall = rows.find((row) => row.category === null);

  const budgeted = overall
    ? overall.amount
    : rows.reduce((sum, row) => sum + row.amount, 0);
  const spent = overall
    ? overall.spent
    : rows.reduce((sum, row) => sum + row.spent, 0);

  // Same guard applied to the prior period, so the comparison is like for
  // like: an overall budget's previous spend already includes every category.
  const previousSpent = overall
    ? overall.previousSpent ?? 0
    : rows.reduce((sum, row) => sum + (row.previousSpent ?? 0), 0);

  return {
    budgeted,
    spent,
    previousSpent,
    // null when the prior period had no spending: an increase from zero has no
    // percentage, and the UI must say so rather than print one.
    spendChangePercent: change(spent, previousSpent),
    remaining: budgeted - spent,
    // Every amount is > 0 by database CHECK, so this only divides by zero when
    // there are no budgets at all. null, not 0%, because "no budgets" is not
    // "nothing used".
    percentUsed: budgeted > 0 ? (spent / budgeted) * 100 : null,
  };
}

// The one-line facts worth surfacing, each traceable to a calculation above.
// Returns only conditions that are actually true; an empty array means there
// is nothing to say, and the UI shows nothing rather than reassurance.
export function attentionItems(budgets, labelOf) {
  const items = [];

  for (const budget of budgets) {
    const { status, percentUsed, projectedOverBy } = budget.pace;
    const label = labelOf(budget);

    if (status.id === "exceeded") {
      items.push({
        id: `${budget.id}-exceeded`,
        tone: "exceeded",
        text: `${label} is over budget by ${Math.round(percentUsed - 100)}%.`,
      });
      continue;
    }

    if (projectedOverBy !== null) {
      items.push({
        id: `${budget.id}-projected`,
        tone: "at-risk",
        text: `${label} is projected above its budget at the current pace.`,
      });
      continue;
    }

    if (percentUsed >= NEAR_LIMIT_PERCENT) {
      items.push({
        id: `${budget.id}-near`,
        tone: "at-risk",
        text: `${label} is ${Math.round(percentUsed)}% used.`,
      });
      continue;
    }

    if (status.id === "watch") {
      items.push({
        id: `${budget.id}-pace`,
        tone: "watch",
        text: `${label} is running ahead of the expected pace.`,
      });
    }
  }

  return items;
}
