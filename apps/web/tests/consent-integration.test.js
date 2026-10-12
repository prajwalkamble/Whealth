import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { PrismaClient } from "@whealthos/database";
import pg from "pg";

// Legal consent, end to end against a real database.
//
// The point of these tests is not that the happy path works. It is that the
// browser cannot talk its way into a consent record: not by skipping the
// checkbox, not by claiming a version, not by naming someone else's account,
// and not by asking twice.

// Which Clerk user the mocked auth() reports. null means signed out.
let currentClerkId = null;
let currentClerkProfile = null;

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: currentClerkId }),
  currentUser: async () => currentClerkProfile,
}));

vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
  unstable_cache: (fn) => fn,
}));

vi.mock("@arcjet/next", () => ({
  request: async () => ({}),
  default: () => ({ protect: async () => ({ isDenied: () => false }) }),
  tokenBucket: () => ({}),
  shield: () => ({}),
  detectBot: () => ({}),
}));

vi.mock("@/lib/arcjet", () => ({ enforceRateLimit: async () => {} }));

const { acceptLegalTerms } = await import("@/actions/legal");
const { createAccount } = await import("@/actions/dashboard");
const { getUserAccounts } = await import("@/lib/queries");
const { checkUser } = await import("@/lib/checkUser");
const { LEGAL_VERSIONS, LEGAL_LINKS } = await import("@/lib/legal/versions");

// Fixtures and assertions go through an admin connection that is not subject
// to the policies, so a test can see rows the application role cannot.
const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
// The RLS-restricted application role, for the tamper checks.
const app = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const NEW = "clerk_consent_new";
const RETURNING = "clerk_consent_returning";
const OTHER = "clerk_consent_other";
const ALL = [NEW, RETURNING, OTHER];

const profile = (id) => ({
  id,
  firstName: "Consent",
  lastName: "Tester",
  username: null,
  imageUrl: "https://example.test/c.png",
  primaryEmailAddress: {
    emailAddress: `${id}@example.test`,
    verification: { status: "verified" },
  },
  emailAddresses: [
    {
      emailAddress: `${id}@example.test`,
      verification: { status: "verified" },
    },
  ],
});

const cleanup = () =>
  admin.user.deleteMany({ where: { clerkUserId: { in: ALL } } });

const consentsOf = (clerkUserId) =>
  admin.legalConsent.findMany({
    where: { user: { clerkUserId } },
    orderBy: { acceptedAt: "asc" },
  });

// Runs fn with the tenant context the signed-in app uses, on the restricted
// role, so the policies apply exactly as they do in a request.
async function asTenant(tenantId, fn) {
  const c = await app.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    return await fn(c);
  } finally {
    await c.query("ROLLBACK").catch(() => {});
    c.release();
  }
}

beforeAll(cleanup);

beforeEach(async () => {
  currentClerkId = null;
  currentClerkProfile = null;
});

afterAll(async () => {
  await cleanup();
  await admin.$disconnect();
  await app.end();
  const { db, adminDb } = await import("@/lib/prisma");
  await db.$disconnect();
  await adminDb.$disconnect();
});

describe("Legal versions", () => {
  it("names a version for each document", () => {
    expect(LEGAL_VERSIONS.TERMS).toMatch(/\S/);
    expect(LEGAL_VERSIONS.PRIVACY).toMatch(/\S/);
  });

  it("cannot be rewritten at runtime", () => {
    expect(Object.isFrozen(LEGAL_VERSIONS)).toBe(true);
    expect(() => {
      "use strict";
      LEGAL_VERSIONS.TERMS = "99.0";
    }).toThrow();
    expect(LEGAL_VERSIONS.TERMS).not.toBe("99.0");
  });

  it("points at the canonical legal routes", () => {
    expect(LEGAL_LINKS).toEqual({ terms: "/terms", privacy: "/privacy" });
  });
});

describe("Accepting the Terms", () => {
  it("refuses a caller with no session, and writes nothing", async () => {
    currentClerkId = null;
    const result = await acceptLegalTerms(true);

    expect(result).toEqual({ success: false, error: "Unauthorized" });
    expect(await admin.user.count({ where: { clerkUserId: { in: ALL } } })).toBe(0);
  });

  // The checkbox being unchecked is not the only way to arrive without
  // consent: this is a public HTTP endpoint, so it is also what a hand-made
  // request looks like.
  it.each([
    ["false", false],
    ["nothing at all", undefined],
    ["the string 'true'", "true"],
    ["the number 1", 1],
    ["a forged payload naming its own version and user", {
      accepted: true,
      userId: "00000000-0000-0000-0000-000000000000",
      termsVersion: "99.0",
      privacyVersion: "99.0",
      acceptedAt: "2024-01-01T00:00:00.000Z",
    }],
  ])("refuses %s, and creates no account", async (_label, payload) => {
    currentClerkId = NEW;
    currentClerkProfile = profile(NEW);

    const result = await acceptLegalTerms(payload);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/accept the Terms of Service/);
    expect(await admin.user.findUnique({ where: { clerkUserId: NEW } })).toBeNull();
    expect(await consentsOf(NEW)).toHaveLength(0);
  });

  it("records the server's versions and timestamp, and creates the account", async () => {
    currentClerkId = NEW;
    currentClerkProfile = profile(NEW);

    const before = Date.now();
    expect(await acceptLegalTerms(true)).toEqual({ success: true });
    const after = Date.now();

    const user = await admin.user.findUnique({ where: { clerkUserId: NEW } });
    expect(user).not.toBeNull();

    const consents = await consentsOf(NEW);
    expect(consents).toHaveLength(1);
    expect(consents[0].userId).toBe(user.id);
    expect(consents[0].termsVersion).toBe(LEGAL_VERSIONS.TERMS);
    expect(consents[0].privacyVersion).toBe(LEGAL_VERSIONS.PRIVACY);

    // Generated where the clock is trusted. A client-supplied time would have
    // to arrive through the one boolean the action accepts, and there is no
    // room in a boolean for 2024.
    const at = consents[0].acceptedAt.getTime();
    expect(at).toBeGreaterThanOrEqual(before - 1000);
    expect(at).toBeLessThanOrEqual(after + 1000);
  });

  it("is safe to retry: a second acceptance adds nothing", async () => {
    currentClerkId = NEW;
    currentClerkProfile = profile(NEW);

    expect(await acceptLegalTerms(true)).toEqual({ success: true });
    expect(await acceptLegalTerms(true)).toEqual({ success: true });

    expect(await consentsOf(NEW)).toHaveLength(1);
    expect(await admin.user.count({ where: { clerkUserId: NEW } })).toBe(1);
  });

  it("runs the two writes as one unit", async () => {
    // Every account that exists has a consent record, and every consent record
    // belongs to an account. Asserted as a property of the table rather than
    // of this one row, so a future path that creates users elsewhere trips it.
    const orphans = await admin.$queryRaw`
      SELECT count(*)::int AS n FROM legal_consents c
       LEFT JOIN users u ON u.id = c."userId" WHERE u.id IS NULL`;
    expect(orphans[0].n).toBe(0);

    const provisioned = await admin.user.findMany({
      where: { clerkUserId: { in: ALL } },
      include: { legalConsents: true },
    });
    for (const user of provisioned) {
      expect(user.legalConsents.length).toBeGreaterThan(0);
    }
  });
});

// The redirect in the (main) layout is what a person experiences, but it is
// not what stops them. Every tenant-scoped read and write resolves the Clerk
// session to a WHealthOS row first, and until consent is given there is no row
// to resolve to -- so the app refuses, whatever the browser asks it directly.
describe("Before consent, the app has nothing to offer", () => {
  const UNCONSENTED = "clerk_consent_bypass";

  beforeEach(async () => {
    await admin.user.deleteMany({ where: { clerkUserId: UNCONSENTED } });
    currentClerkId = UNCONSENTED;
    currentClerkProfile = profile(UNCONSENTED);
  });

  afterAll(() =>
    admin.user.deleteMany({ where: { clerkUserId: UNCONSENTED } })
  );

  it("refuses a write called directly, without the page it came from", async () => {
    const result = await createAccount({
      name: "Bypass",
      type: "CURRENT",
      balance: "1000",
      isDefault: true,
    });
    expect(result).toEqual({ success: false, error: "User not found" });
  });

  it("refuses a read the same way", async () => {
    await expect(getUserAccounts()).rejects.toThrow(/User not found/);
  });

  it("starts working the moment consent is recorded", async () => {
    expect(await acceptLegalTerms(true)).toEqual({ success: true });
    const result = await createAccount({
      name: "Allowed",
      type: "CURRENT",
      balance: "1000",
      isDefault: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("Existing accounts", () => {
  // Everyone who signed up before this feature existed. They have an account
  // and no consent record, and the only honest thing to do with that is leave
  // it alone: a record nobody gave is not evidence of anything.
  it("are not asked again, and no consent is invented for them", async () => {
    const existing = await admin.user.create({
      data: {
        clerkUserId: RETURNING,
        email: `${RETURNING}@example.test`,
        name: "Signed up earlier",
        imageUrl: "",
      },
    });

    currentClerkId = RETURNING;
    currentClerkProfile = profile(RETURNING);

    // What the (main) layout does on every navigation: a row comes back, so it
    // renders the app instead of redirecting to the consent step.
    const user = await checkUser();
    expect(user.id).toBe(existing.id);
    expect(await consentsOf(RETURNING)).toHaveLength(0);
  });
});

describe("The consent record is tamper-resistant", () => {
  let user;
  let other;

  beforeAll(async () => {
    currentClerkId = NEW;
    currentClerkProfile = profile(NEW);
    await acceptLegalTerms(true);
    user = await admin.user.findUnique({ where: { clerkUserId: NEW } });

    other = await admin.user.create({
      data: {
        clerkUserId: OTHER,
        email: `${OTHER}@example.test`,
        name: "Someone else",
        imageUrl: "",
        legalConsents: {
          create: {
            termsVersion: LEGAL_VERSIONS.TERMS,
            privacyVersion: LEGAL_VERSIONS.PRIVACY,
          },
        },
      },
    });
  });

  it("is readable by its owner", async () => {
    const rows = await asTenant(user.id, (c) =>
      c.query(`SELECT "termsVersion" FROM legal_consents`)
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].termsVersion).toBe(LEGAL_VERSIONS.TERMS);
  });

  it("is not readable by anyone else", async () => {
    const rows = await asTenant(other.id, (c) =>
      c.query(`SELECT * FROM legal_consents WHERE "userId" = $1`, [user.id])
    );
    expect(rows.rows).toHaveLength(0);
  });

  it("cannot be written by a signed-in tenant, even for themselves", async () => {
    await expect(
      asTenant(user.id, (c) =>
        c.query(
          `INSERT INTO legal_consents (id,"userId","termsVersion","privacyVersion")
           VALUES (gen_random_uuid(), $1, '99.0', '99.0')`,
          [user.id]
        )
      )
    ).rejects.toThrow(/row-level security/i);
  });

  it("cannot be written for somebody else", async () => {
    await expect(
      asTenant(user.id, (c) =>
        c.query(
          `INSERT INTO legal_consents (id,"userId","termsVersion","privacyVersion")
           VALUES (gen_random_uuid(), $1, '99.0', '99.0')`,
          [other.id]
        )
      )
    ).rejects.toThrow(/row-level security/i);
  });

  it("cannot have its version amended after the fact", async () => {
    const result = await asTenant(user.id, (c) =>
      c.query(`UPDATE legal_consents SET "termsVersion" = '99.0'`)
    );
    // The write policy matches nothing for a tenant, so the row is invisible
    // to UPDATE rather than rejected by it. Either way it does not change.
    expect(result.rowCount).toBe(0);

    const consents = await consentsOf(NEW);
    expect(consents[0].termsVersion).toBe(LEGAL_VERSIONS.TERMS);
  });

  it("cannot be deleted by its owner", async () => {
    const result = await asTenant(user.id, (c) =>
      c.query(`DELETE FROM legal_consents`)
    );
    expect(result.rowCount).toBe(0);
    expect(await consentsOf(NEW)).toHaveLength(1);
  });

  it("has RLS enabled and forced, like every other table", async () => {
    const { rows } = await app.query(
      `SELECT relrowsecurity, relforcerowsecurity FROM pg_class
        WHERE relname = 'legal_consents'`
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].relrowsecurity).toBe(true);
    expect(rows[0].relforcerowsecurity).toBe(true);
  });
});
