import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { SECURITY, SECURITY_LINK } from "@/lib/legal/security";
import { LEGAL_LINKS } from "@/lib/legal/versions";
import { POLICY } from "@/lib/legal/policy";

// Guards on the public Security page.
//
// A security page fails differently from every other page: the failure is a
// sentence that is no longer true, and nothing breaks when it stops being
// true. Someone enables a feature, someone removes a control, someone pastes
// in a reassuring line from another product's page, and the document quietly
// becomes a false statement to users about how safe their money data is.
//
// So these tests assert the page's discipline rather than its prose. The list
// of forbidden claims is the important one: each entry is a phrase that cannot
// be substantiated for WHealthOS today, and if the day comes that one of them
// can be, the evidence belongs in lib/legal/security.js and the test should be
// changed in the same commit that changes the page -- deliberately, not by
// deleting an assertion to make a build pass.

const WEB = path.resolve(import.meta.dirname, "..");
const read = (relative) => readFileSync(path.join(WEB, relative), "utf8");

const PAGE = "app/(marketing)/security/page.jsx";
const FOOTER = "components/footer.jsx";

const page = read(PAGE);

// What the page actually renders. The source comments discuss the claims that
// were deliberately left off -- "row-level security", "two-step verification"
// -- so a forbidden-phrase check against the raw file would flag the very
// comments that explain the omissions. JSX also breaks prose across lines at
// whatever column the formatter chose, so whitespace is collapsed before any
// sentence is looked for.
const rendered = page
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/^\s*\/\/.*$/gm, " ")
  .replace(/\s+/g, " ");
const prose = rendered.toLowerCase();

describe("The Security page route", () => {
  it("exists at the canonical route", () => {
    expect(SECURITY_LINK).toBe("/security");
    expect(
      existsSync(path.join(WEB, "app/(marketing)/security/page.jsx"))
    ).toBe(true);
  });

  it("is reachable from the footer, in both the Legal column and the bottom bar", () => {
    const footer = read(FOOTER);
    const linked = footer.match(/\{ label: "Security", href: SECURITY_LINK \}/g);
    // One in the Legal column, one in the bottom bar. A label with no href
    // renders as plain text, which is how this page looked before it existed.
    expect(linked).toHaveLength(2);
    expect(footer).toContain('from "@/lib/legal/security"');
  });

  it("declares its canonical URL for search engines", () => {
    expect(page).toContain('canonical: "/security"');
  });

  it("ships no client JavaScript", () => {
    // Like the other legal pages: it has to be readable when everything else
    // is broken, which is exactly when someone goes looking for it.
    expect(page).not.toContain('"use client"');
  });
});

describe("Claims the page may not make", () => {
  // Every phrase here was checked during the security audit and is either
  // false for WHealthOS or unverifiable from the repository. The audit's
  // reasoning for each is recorded in lib/legal/security.js under
  // "NOT claimed on the page, and why".
  const FORBIDDEN = [
    "bank-grade",
    "bank grade",
    "military-grade",
    "military grade",
    "zero-knowledge",
    "zero knowledge",
    "can never be accessed",
    "cannot be accessed by anyone",
    "all data remains in india",
    "all attacks",
    "every attack",
    "continuously monitor",
    "24/7",
    "soc 2",
    "iso 27001",
    "gdpr compliant",
    "dpdp compliant",
    "fully compliant",
    "globally compliant",
    "certified secure",
    "guaranteed uptime",
    "no security incidents have ever",
    "row-level security",
    "row level security",
    "two-factor",
    "two-step verification",
    "multi-factor",
    "passkey",
    "automatic backups",
    "point-in-time recovery",
  ];

  it.each(FORBIDDEN)("does not claim %s", (phrase) => {
    // These are phrases with no honest use on this page in any form. The
    // subjects the page does raise in order to deny them -- monitoring,
    // penetration testing, scanning -- are asserted separately below, so that
    // flipping a denial into a claim fails here too.
    expect(prose).not.toContain(phrase);
  });

  it("states plainly that it is not a certification or a compliance claim", () => {
    expect(rendered).toContain("not a certification");
    expect(rendered).toContain("holds no security certification");
  });

  it("does not promise an incident notification deadline", () => {
    expect(prose).not.toMatch(/within \d+ (hours|days)/);
    expect(prose).not.toContain("72 hours");
    expect(prose).not.toContain("notify you within");
  });

  it("does not publish a rate-limit threshold", () => {
    // lib/arcjet.js holds the real numbers. Naming them on a public page
    // mainly helps somebody stay just underneath them.
    expect(prose).not.toMatch(/\b\d+\s*(requests|scans|transactions)\s*per\b/);
    expect(rendered).toContain("limits are not published");
  });
});

describe("Gaps the page has to keep admitting", () => {
  // Each of these subjects appears on the page exactly once, in the negative.
  // A later edit that turns one into a capability has to come with evidence in
  // lib/legal/security.js, and changing this test is how that gets noticed.
  it.each([
    ["penetration testing", "no penetration test has been commissioned"],
    ["dependency scanning", "no automated dependency-vulnerability scanning"],
    ["continuous monitoring", "no round-the-clock monitoring"],
    ["automated pipelines", "no automated pipeline that runs them on every change"],
    ["alerting", "no automated alerting"],
    // Said out loud because the paragraph above it credits Supabase with disk
    // encryption, and a reader who stopped there could reasonably conclude
    // that nobody at WHealthOS can read their records.
    ["no end-to-end encryption", "not end-to-end encryption"],
  ])("still admits it has %s", (_subject, sentence) => {
    expect(prose).toContain(sentence);
  });

  it.each([
    /we (run|conduct|perform|commission)[^.]{0,40}penetration/,
    /(we )?(continuously|constantly) monitor/,
    /(automated|automatic) (dependency|vulnerability) scanning (is|runs)/,
    /(is|are) end-to-end encrypted/,
    /end-to-end encryption (keeps|protects|means|ensures)/,
    /zero-knowledge/,
  ])("does not turn a gap into a capability: %s", (pattern) => {
    expect(prose).not.toMatch(pattern);
  });
});

describe("Claims the page does make", () => {
  it("reads its review date from the facts module rather than hardcoding one", () => {
    expect(page).toContain("{SECURITY.lastReviewed}");
    expect(page).not.toContain(SECURITY.lastReviewed);
    expect(SECURITY.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("attributes encryption at rest to the provider instead of claiming it", () => {
    expect(page).toContain("{SECURITY.encryptionAtRestProvider}");
    expect(rendered).toContain("provider&rsquo;s statement about its infrastructure");
    expect(rendered).toContain("not end-to-end encryption");
  });

  it("admits that the operator can read the database", () => {
    // The temptation on a security page is to let "we never look at your data"
    // stand in for a technical control. There is no such control here, and the
    // page says so.
    expect(rendered).toContain("administrative access to the database");
  });

  it("warns that closing the sign-in leaves the financial records behind", () => {
    // The same gap the Terms and the Privacy Policy disclose. All three have to
    // agree, because a reader who finds one of them will act on it.
    expect(rendered).toContain("does not delete the financial records");
  });
});

describe("Links and contacts", () => {
  it("gives the verified contact address, not an invented security@ one", () => {
    expect(page).toContain("POLICY.privacyContact.value");
    expect(page).not.toMatch(/security@/);
    expect(POLICY.privacyContact.value).toBe("hello@whealthos.com");
  });

  it("links the two legal documents through their canonical constants", () => {
    expect(page).toContain("LEGAL_LINKS.privacy");
    expect(page).toContain("LEGAL_LINKS.terms");
    for (const href of Object.values(LEGAL_LINKS)) {
      const route = href.replace(/^\//, "");
      expect(
        existsSync(path.join(WEB, `app/(marketing)/${route}/page.jsx`))
      ).toBe(true);
    }
  });

  it("links no page that does not exist", () => {
    // The Cookie Policy and the AI Usage page have both since been written,
    // at /cookie-policy and /ai-usage. Neither /cookies nor /ai is a route,
    // and the Security page must not link one as though it were.
    for (const route of ["/cookies", "/ai", "/status"]) {
      expect(page).not.toContain(`"${route}"`);
    }
  });

  it("numbers its sections 1 to 10 in order", () => {
    const numbers = [...page.matchAll(/<Section id="[^"]+" number="(\d+)"/g)].map(
      (m) => Number(m[1])
    );
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});
