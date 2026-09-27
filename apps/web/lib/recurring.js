import { addDays, addMonths, addWeeks, addYears } from "date-fns";

// Must stay in step with the RecurringInterval enum in prisma/schema.prisma.
const STEP = {
  DAILY: addDays,
  WEEKLY: addWeeks,
  MONTHLY: addMonths,
  YEARLY: addYears,
};

// Enough for 100 years of daily occurrences; anything past it is corrupt data.
const MAX_STEPS = 36_600;

// The n-th occurrence of a series whose first occurrence is `start`.
//
// Always counted from the start, never from the previous occurrence. Stepping
// from the previous one drifted: setMonth() turned Jan 31 into Mar 3, and the
// series stayed on the 3rd from then on. date-fns clamps to the end of short
// months instead, and counting from the start lets a series anchored on the
// 31st return to the 31st: Jan 31, Feb 28, Mar 31.
export function occurrence(start, interval, n) {
  const step = STEP[interval];
  if (!step) throw new Error(`Unknown recurring interval: ${interval}`);
  return step(new Date(start), n);
}

// The first occurrence of the series strictly after `after`. Occurrence 0 is
// the transaction itself, so this is never the start date.
//
// For a series that starts in the past this skips the occurrences in between
// rather than backfilling them: entering "rent, monthly" dated January should
// schedule the next rent, not post eight back-dated copies overnight.
export function nextOccurrenceAfter(start, interval, after = new Date()) {
  const limit = new Date(after).getTime();
  for (let n = 1; n <= MAX_STEPS; n++) {
    const candidate = occurrence(start, interval, n);
    if (candidate.getTime() > limit) return candidate;
  }
  throw new Error("Recurring series is too far in the past to schedule");
}
