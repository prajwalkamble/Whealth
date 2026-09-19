import { describe, it, expect } from "vitest";
import {
  monthBounds,
  monthBoundsFor,
  monthName,
  previousMonth,
  zonedYearMonth,
} from "@/lib/time";

const iso = (date) => date.toISOString();

describe("app calendar (Asia/Kolkata by default)", () => {
  it("puts a transaction dated 1 September in India into September", () => {
    // The date picker's local midnight on 1 Sep is 18:30 UTC on 31 Aug. The
    // server's UTC calendar used to count it as August.
    expect(zonedYearMonth(new Date("2026-08-31T18:30:00Z"))).toEqual({
      year: 2026,
      month: 8,
    });
    expect(zonedYearMonth(new Date("2026-08-31T18:29:59Z"))).toEqual({
      year: 2026,
      month: 7,
    });
  });

  it("gives month bounds as the instants of Indian midnight", () => {
    const { startOfMonth, endOfMonth } = monthBoundsFor(2026, 8);
    expect(iso(startOfMonth)).toBe("2026-08-31T18:30:00.000Z");
    expect(iso(endOfMonth)).toBe("2026-09-30T18:29:59.999Z");
  });

  it("rolls December into January", () => {
    expect(iso(monthBoundsFor(2026, 11).endOfMonth)).toBe(
      "2026-12-31T18:29:59.999Z"
    );
    expect(previousMonth({ year: 2026, month: 0 })).toEqual({
      year: 2025,
      month: 11,
    });
  });

  it("finds the month containing an instant", () => {
    const { startOfMonth } = monthBounds(new Date("2026-09-20T12:00:00Z"));
    expect(iso(startOfMonth)).toBe("2026-08-31T18:30:00.000Z");
  });

  it("names months", () => {
    expect(monthName(2026, 8)).toBe("September");
  });

  it("handles zones with daylight saving", () => {
    // London is on BST (UTC+1) until the last Sunday of October.
    const { startOfMonth, endOfMonth } = monthBoundsFor(2026, 9, "Europe/London");
    expect(iso(startOfMonth)).toBe("2026-09-30T23:00:00.000Z");
    expect(iso(endOfMonth)).toBe("2026-10-31T23:59:59.999Z");
  });
});
