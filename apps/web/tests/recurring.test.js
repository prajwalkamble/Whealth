import { describe, it, expect } from "vitest";
import { occurrence, nextOccurrenceAfter } from "@/lib/recurring";

const d = (iso) => new Date(iso);
const iso = (date) => date.toISOString();

describe("occurrence", () => {
  it("clamps to the end of short months instead of overflowing", () => {
    // setMonth() used to turn 31 Jan into 3 Mar.
    const start = d("2026-01-31T00:00:00Z");
    expect(iso(occurrence(start, "MONTHLY", 1))).toBe("2026-02-28T00:00:00.000Z");
  });

  it("counts from the start, so a month-end series returns to the 31st", () => {
    const start = d("2026-01-31T00:00:00Z");
    expect(iso(occurrence(start, "MONTHLY", 2))).toBe("2026-03-31T00:00:00.000Z");
    expect(iso(occurrence(start, "MONTHLY", 3))).toBe("2026-04-30T00:00:00.000Z");
  });

  it("handles 29 February in yearly series", () => {
    const start = d("2028-02-29T00:00:00Z");
    expect(iso(occurrence(start, "YEARLY", 1))).toBe("2029-02-28T00:00:00.000Z");
    expect(iso(occurrence(start, "YEARLY", 4))).toBe("2032-02-29T00:00:00.000Z");
  });

  it("steps days and weeks", () => {
    const start = d("2026-09-01T00:00:00Z");
    expect(iso(occurrence(start, "DAILY", 3))).toBe("2026-09-04T00:00:00.000Z");
    expect(iso(occurrence(start, "WEEKLY", 2))).toBe("2026-09-15T00:00:00.000Z");
  });

  it("rejects an unknown interval", () => {
    expect(() => occurrence(new Date(), "HOURLY", 1)).toThrow(/Unknown recurring interval/);
  });
});

describe("nextOccurrenceAfter", () => {
  it("is never the start date itself", () => {
    const start = d("2026-09-20T10:00:00Z");
    expect(iso(nextOccurrenceAfter(start, "MONTHLY", start))).toBe(
      "2026-10-20T10:00:00.000Z"
    );
  });

  it("skips occurrences already in the past rather than backfilling them", () => {
    // Rent entered today but dated in January: the next rent is October's.
    const start = d("2026-01-10T00:00:00Z");
    const now = d("2026-09-20T08:00:00Z");
    expect(iso(nextOccurrenceAfter(start, "MONTHLY", now))).toBe(
      "2026-10-10T00:00:00.000Z"
    );
  });

  it("is strictly after the reference instant", () => {
    const start = d("2026-09-01T00:00:00Z");
    expect(iso(nextOccurrenceAfter(start, "DAILY", d("2026-09-05T00:00:00Z")))).toBe(
      "2026-09-06T00:00:00.000Z"
    );
  });
});
