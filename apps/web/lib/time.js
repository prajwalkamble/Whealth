// Every "this month" figure -- budget progress, budget alerts, monthly
// reports, the dashboard -- is measured on the calendar of this zone.
//
// The server runs in UTC. A transaction dated 1 September in India is stored
// as 18:30 UTC on 31 August, so month boundaries taken from the server clock
// put everything dated the 1st into the previous month, and the dashboard
// (browser time) and the budget (server time) disagreed about the same data.
export const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Asia/Kolkata";

const formatters = new Map();
function zonedParts(date, timeZone) {
  if (!formatters.has(timeZone)) {
    formatters.set(
      timeZone,
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      })
    );
  }
  const parts = Object.fromEntries(
    formatters
      .get(timeZone)
      .formatToParts(date)
      .map((part) => [part.type, Number(part.value)])
  );
  return { ...parts, month: parts.month - 1 };
}

// How far the zone's wall clock is ahead of UTC at `date`, in ms.
function offsetMs(date, timeZone) {
  const p = zonedParts(date, timeZone);
  const wallClockAsUtc = Date.UTC(
    p.year,
    p.month,
    p.day,
    p.hour,
    p.minute,
    p.second
  );
  return wallClockAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

// The instant the zone's wall clock reads 00:00 on the given day. Month 12
// rolls into January of the next year, as with Date.UTC.
export function zonedMidnight(year, month, day = 1, timeZone = APP_TIME_ZONE) {
  const wallClock = Date.UTC(year, month, day);
  const firstGuess = wallClock - offsetMs(new Date(wallClock), timeZone);
  // Re-read the offset at the real instant, for zones with daylight saving.
  return new Date(wallClock - offsetMs(new Date(firstGuess), timeZone));
}

// The calendar { year, month } (month 0-11) that `date` falls in, in the zone.
export function zonedYearMonth(date = new Date(), timeZone = APP_TIME_ZONE) {
  const { year, month } = zonedParts(date, timeZone);
  return { year, month };
}

export function previousMonth({ year, month }) {
  return month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
}

// First and last instant of a calendar month in the zone.
export function monthBoundsFor(year, month, timeZone = APP_TIME_ZONE) {
  const startOfMonth = zonedMidnight(year, month, 1, timeZone);
  const startOfNext = zonedMidnight(year, month + 1, 1, timeZone);
  return { startOfMonth, endOfMonth: new Date(startOfNext.getTime() - 1) };
}

// Bounds of the calendar month (in the zone) that contains `date`.
export function monthBounds(date = new Date(), timeZone = APP_TIME_ZONE) {
  const { year, month } = zonedYearMonth(date, timeZone);
  return monthBoundsFor(year, month, timeZone);
}

export function monthName(year, month, timeZone = APP_TIME_ZONE) {
  // Mid-month, so no offset can push it into a neighbouring month.
  return new Date(Date.UTC(year, month, 15)).toLocaleString("en-IN", {
    month: "long",
    timeZone,
  });
}
