import { describe, it, expect, vi } from "vitest";

// The inngest module pulls in Prisma and Resend at import time; neither is
// needed to exercise the scheduling predicate.
vi.mock("@/actions/send-email", () => ({ sendEmail: async () => ({ success: true }) }));

const { isTransactionDue } = await import("@/lib/inngest/functions");

const days = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

describe("isTransactionDue", () => {
  it("does not fire a brand new recurring transaction before its first due date", () => {
    // The regression: createTransaction leaves lastProcessed null but sets
    // nextRecurringDate a month out. Treating "never processed" as "due now"
    // made the nightly cron post a duplicate the following night.
    expect(
      isTransactionDue({ lastProcessed: null, nextRecurringDate: days(30) })
    ).toBe(false);
  });

  it("fires once the due date has passed and it was never processed", () => {
    expect(
      isTransactionDue({ lastProcessed: null, nextRecurringDate: days(-1) })
    ).toBe(true);
  });

  it("fires when a processed transaction comes due again", () => {
    expect(
      isTransactionDue({ lastProcessed: days(-30), nextRecurringDate: days(-1) })
    ).toBe(true);
  });

  it("does not fire a processed transaction that is not due yet", () => {
    expect(
      isTransactionDue({ lastProcessed: days(-1), nextRecurringDate: days(29) })
    ).toBe(false);
  });

  it("fires a legacy row that has no schedule and was never processed", () => {
    expect(
      isTransactionDue({ lastProcessed: null, nextRecurringDate: null })
    ).toBe(true);
  });

  it("does not re-fire a legacy row that was already processed", () => {
    expect(
      isTransactionDue({ lastProcessed: days(-1), nextRecurringDate: null })
    ).toBe(false);
  });

  it("accepts a date that arrived as a JSON string", () => {
    expect(
      isTransactionDue({
        lastProcessed: null,
        nextRecurringDate: days(-1).toISOString(),
      })
    ).toBe(true);
  });
});
