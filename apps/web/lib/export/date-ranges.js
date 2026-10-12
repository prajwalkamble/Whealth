// The date ranges an export can cover.
//
// Built on lib/time.js rather than beside it: every boundary comes from
// zonedMidnight, so a range means the same thing here as everywhere else in
// the app and respects APP_TIME_ZONE instead of the server's UTC. There is no
// second date system.
//
// Week start: Monday. The application had no week-start preference to follow
// -- lib/time.js deals only in months -- so this is a choice, and it is
// recorded here rather than buried in a component. ISO-8601 and Indian
// business convention both start the week on Monday.
//
// Every range is [from, to] inclusive, with `to` the last millisecond of the
// final day, matching how monthBoundsFor already expresses a month.

import {
  APP_TIME_ZONE,
  monthBoundsFor,
  monthName,
  previousMonth,
  zonedMidnight,
  zonedYearMonth,
} from "../time";

const MS = 24 * 60 * 60 * 1000;

// The civil date (in the app timezone) that `date` falls on.
const zonedDayParts = (date, timeZone = APP_TIME_ZONE) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  // zonedMidnight takes a 0-11 month, as lib/time.js does throughout.
  return { year: get("year"), month: get("month") - 1, day: get("day") };
};

// Midnight at the start of the civil day containing `date`.
const startOfDay = (date, timeZone = APP_TIME_ZONE) => {
  const { year, month, day } = zonedDayParts(date, timeZone);
  return zonedMidnight(year, month, day, timeZone);
};

// A span of whole days beginning at `start`, ending on the last millisecond of
// the final day. Built by stepping civil days through zonedMidnight so a
// daylight-saving shift cannot make a "day" 23 or 25 hours of arithmetic.
const daySpan = (start, days, timeZone = APP_TIME_ZONE) => {
  const { year, month, day } = zonedDayParts(start, timeZone);
  const from = zonedMidnight(year, month, day, timeZone);
  const next = zonedMidnight(year, month, day + days, timeZone);
  return { from, to: new Date(next.getTime() - 1) };
};

// The Monday on or before `date`.
const startOfWeek = (date, timeZone = APP_TIME_ZONE) => {
  const dayStart = startOfDay(date, timeZone);
  // getUTCDay on the zoned midnight instant would read the wrong weekday, so
  // the weekday is taken in the app timezone.
  const weekday = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short" })
    .format(dayStart);
  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const offset = Math.max(order.indexOf(weekday), 0);
  const { year, month, day } = zonedDayParts(dayStart, timeZone);
  return zonedMidnight(year, month, day - offset, timeZone);
};

// Quarters are three calendar months, assembled from monthBoundsFor so they
// inherit its timezone handling and month-length arithmetic.
const quarterOf = ({ year, month }) => ({ year, quarter: Math.floor(month / 3) });

const quarterBounds = ({ year, quarter }) => {
  const first = monthBoundsFor(year, quarter * 3);
  const last = monthBoundsFor(year, quarter * 3 + 2);
  return { from: first.startOfMonth, to: last.endOfMonth };
};

const previousQuarter = ({ year, quarter }) =>
  quarter === 0 ? { year: year - 1, quarter: 3 } : { year, quarter: quarter - 1 };

const yearBounds = (year) => ({
  from: monthBoundsFor(year, 0).startOfMonth,
  to: monthBoundsFor(year, 11).endOfMonth,
});

// The presets offered in the UI. Each resolves against `now` so a range is
// always relative to when the export is run, never to a hardcoded date.
export const RANGE_PRESETS = {
  today: {
    label: "Today",
    resolve: (now) => daySpan(now, 1),
  },
  yesterday: {
    label: "Yesterday",
    resolve: (now) => daySpan(new Date(startOfDay(now).getTime() - MS), 1),
  },
  "this-week": {
    label: "This week",
    resolve: (now) => daySpan(startOfWeek(now), 7),
  },
  "previous-week": {
    label: "Previous week",
    resolve: (now) => daySpan(new Date(startOfWeek(now).getTime() - MS), 7),
  },
  "this-month": {
    label: "This month",
    resolve: (now) => {
      const { startOfMonth, endOfMonth } = monthBoundsFor(
        ...Object.values(zonedYearMonth(now))
      );
      return { from: startOfMonth, to: endOfMonth };
    },
  },
  "previous-month": {
    label: "Previous month",
    resolve: (now) => {
      const prior = previousMonth(zonedYearMonth(now));
      const { startOfMonth, endOfMonth } = monthBoundsFor(prior.year, prior.month);
      return { from: startOfMonth, to: endOfMonth };
    },
  },
  "this-quarter": {
    label: "This quarter",
    resolve: (now) => quarterBounds(quarterOf(zonedYearMonth(now))),
  },
  "previous-quarter": {
    label: "Previous quarter",
    resolve: (now) => quarterBounds(previousQuarter(quarterOf(zonedYearMonth(now)))),
  },
  "this-year": {
    label: "This year",
    resolve: (now) => yearBounds(zonedYearMonth(now).year),
  },
  "previous-year": {
    label: "Previous year",
    resolve: (now) => yearBounds(zonedYearMonth(now).year - 1),
  },
};

export const RANGE_KEYS = Object.keys(RANGE_PRESETS);

// Resolves a preset key, or a custom { from, to } pair, into real bounds.
//
// Throws rather than silently correcting: an export over a range the caller
// did not mean is worse than an export that refuses to run.
export function resolveRange(preset, { from, to } = {}, now = new Date()) {
  if (preset === "custom") {
    const start = from instanceof Date ? from : new Date(from);
    const end = to instanceof Date ? to : new Date(to);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new Error("Enter a valid date range");
    }
    if (start > end) throw new Error("The start date is after the end date");
    // Widened to whole civil days, so a range picked as two dates covers both
    // of them entirely rather than stopping at midnight.
    const first = daySpan(start, 1);
    const last = daySpan(end, 1);
    return { from: first.from, to: last.to, label: "Custom range" };
  }

  const found = RANGE_PRESETS[preset];
  if (!found) throw new Error("Unknown date range");
  return { ...found.resolve(now), label: found.label };
}

// "01 Sep 2026 to 30 Sep 2026", for report headers and filenames.
export const formatRange = ({ from, to }, timeZone = APP_TIME_ZONE) => {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return { from: fmt.format(from), to: fmt.format(to) };
};

// YYYY-MM-DD in the app timezone, for filenames that sort.
export const isoDay = (date, timeZone = APP_TIME_ZONE) => {
  const { year, month, day } = zonedDayParts(date, timeZone);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

export { monthName };
