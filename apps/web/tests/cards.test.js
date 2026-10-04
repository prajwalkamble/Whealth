import { describe, it, expect } from "vitest";

const { cardInputSchema, CARD_NETWORKS, CARD_TYPES } = await import("@/app/lib/schema");

// A card that passes every rule, used as the starting point so each case below
// changes exactly one thing.
const valid = {
  name: "Everyday credit card",
  issuer: "HDFC Bank",
  network: "VISA",
  type: "CREDIT",
  last4: "0042",
  expiryMonth: 9,
  expiryYear: new Date().getFullYear() + 2,
  creditLimit: 150000,
  billingDay: 1,
  dueDay: 18,
  accountId: null,
};

const parse = (patch) => cardInputSchema.safeParse({ ...valid, ...patch });

describe("card input", () => {
  it("accepts a complete credit card", () => {
    const result = parse({});
    expect(result.success).toBe(true);
    expect(result.data.last4).toBe("0042");
  });

  // The whole point of the model: there is no field for any of this, so a
  // client that sends it gets it dropped rather than stored.
  it("strips anything that could be used to transact", () => {
    const result = cardInputSchema.safeParse({
      ...valid,
      number: "4111111111111111",
      cvv: "123",
      pin: "4321",
    });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("number");
    expect(result.data).not.toHaveProperty("cvv");
    expect(result.data).not.toHaveProperty("pin");
  });

  it("keeps a leading zero on the last four digits", () => {
    expect(parse({ last4: "0007" }).data.last4).toBe("0007");
  });

  it.each([["12"], ["abcd"], ["12345"], [""]])(
    "rejects %s as the last four digits",
    (last4) => {
      expect(parse({ last4 }).success).toBe(false);
    }
  );

  it.each([[0], [13], [-1]])("rejects month %i", (expiryMonth) => {
    expect(parse({ expiryMonth }).success).toBe(false);
  });

  it("rejects an expiry year far outside the plausible range", () => {
    expect(parse({ expiryYear: 1990 }).success).toBe(false);
    expect(parse({ expiryYear: 2999 }).success).toBe(false);
  });

  // A debit card has no limit of its own, so a number there would be
  // measured against nothing.
  it("rejects a credit limit on a debit card", () => {
    const result = parse({ type: "DEBIT", creditLimit: 50000 });
    expect(result.success).toBe(false);
  });

  it("allows a debit card with no limit", () => {
    expect(parse({ type: "DEBIT", creditLimit: "" }).success).toBe(true);
  });

  it("treats an untouched optional field as not set, not as zero", () => {
    const { data } = parse({ creditLimit: "", billingDay: "", dueDay: "" });
    expect(data.creditLimit).toBeNull();
    expect(data.billingDay).toBeNull();
    expect(data.dueDay).toBeNull();
  });

  it.each([[0], [32]])("rejects day %i of the month", (billingDay) => {
    expect(parse({ billingDay }).success).toBe(false);
  });

  it("rejects an account id that is not a uuid", () => {
    expect(parse({ accountId: "not-a-uuid" }).success).toBe(false);
  });

  it("accepts no linked account", () => {
    expect(parse({ accountId: "" }).data.accountId).toBeNull();
  });

  it("rejects a network or type outside the enum", () => {
    expect(parse({ network: "SOMETHING" }).success).toBe(false);
    expect(parse({ type: "PREPAID" }).success).toBe(false);
  });

  it("exposes the enums the form renders from", () => {
    expect(CARD_NETWORKS).toContain("RUPAY");
    expect(CARD_TYPES).toEqual(["CREDIT", "DEBIT"]);
  });

  it("requires a name and an issuer", () => {
    expect(parse({ name: "  " }).success).toBe(false);
    expect(parse({ issuer: "" }).success).toBe(false);
  });
});
