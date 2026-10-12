import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import {
  AI_AUDIT_DATE, AI_FACTS, AI_FEATURES, AI_PROVIDER, AI_USAGE_LINK,
  PROVIDER_TERMS,
} from "@/lib/legal/ai";
import { LEGAL_LINKS } from "@/lib/legal/versions";

// Guards on the AI Usage page.
//
// The failure mode for this document is a third AI call site. Someone adds a
// feature that sends something to a model, the page still describes two, and
// the page is now false about the most sensitive thing it covers. These tests
// cannot watch Google, but they can count the callers, hold the model name to
// the one the code actually uses, and refuse to let the page acquire the
// reassuring sentences this audit established it cannot support.

const WEB = path.resolve(import.meta.dirname, "..");
const read = (relative) => readFileSync(path.join(WEB, relative), "utf8");
const PAGE = "app/(marketing)/ai-usage/page.jsx";
const page = read(PAGE);

// Comments on the page and in lib/legal/ai.js discuss, by name, the claims
// that must never be made. Stripping them is what lets the forbidden-phrase
// checks below look at the published words only.
const rendered = page
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/^\s*\/\/.*$/gm, " ")
  .replace(/\s+/g, " ");

// Everything the module actually exports, as one searchable string. The
// comment block in lib/legal/ai.js is not part of it.
const exported = JSON.stringify({
  AI_FEATURES, AI_PROVIDER, PROVIDER_TERMS, AI_FACTS, AI_AUDIT_DATE,
}).toLowerCase();

describe("The AI Usage route", () => {
  it("exists and declares its canonical URL", () => {
    expect(existsSync(path.join(WEB, PAGE))).toBe(true);
    expect(page).toContain(`canonical: "${AI_USAGE_LINK}"`);
    expect(AI_USAGE_LINK).toBe("/ai-usage");
    // The constant and the directory are two places the route is written.
    // Neither may move without the other.
    expect(PAGE).toBe(`app/(marketing)${AI_USAGE_LINK}/page.jsx`);
  });

  it("ships no client JavaScript", () => {
    expect(page).not.toContain('"use client"');
  });

  it("numbers its sections 1 to 10 in order", () => {
    const numbers = [...page.matchAll(/<Section id="[^"]+" number="(\d+)"/g)].map(
      (m) => Number(m[1])
    );
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("is reachable from the footer's Legal column", () => {
    const footer = read("components/footer.jsx");
    expect(footer).toContain('{ label: "AI Usage", href: AI_USAGE_LINK }');
    expect(footer).toContain('from "@/lib/legal/ai"');
  });

  it("is linked from the one place in the product that talks about AI", () => {
    // The Settings page used to say "Your financial data is never sent to an
    // external AI service", under a Privacy heading, in the signed-in app.
    // It was false -- the receipt scanner and the monthly summary both send
    // to Google -- and it contradicted the Privacy Policy. It must not come
    // back, in that wording or any other.
    const settings = read("app/(main)/settings/page.jsx");
    expect(settings).not.toMatch(
      /never sent to an external AI|not sent to an? (?:external )?AI|no (?:data|information) (?:is )?sent to (?:an? )?AI/i
    );
    expect(settings).toContain("AI_USAGE_LINK");
    expect(settings).toContain("Two features do send information to an external AI");
  });

  it("links only to pages that exist", () => {
    for (const href of [...Object.values(LEGAL_LINKS), "/security"]) {
      const route = href.replace(/^\//, "");
      expect(
        existsSync(path.join(WEB, `app/(marketing)/${route}/page.jsx`))
      ).toBe(true);
    }
  });

  it("dates itself from the audit rather than hardcoding a date", () => {
    expect(page).toContain("{AI_AUDIT_DATE}");
    expect(page).not.toContain(AI_AUDIT_DATE);
    expect(AI_AUDIT_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("The code is the authority for what the page says", () => {
  it("records the model the code actually calls, without publishing it", () => {
    // lib/ai/gemini.js is not imported by the page -- importing it would
    // construct the Google client inside a marketing render -- so the two
    // copies of the model name are reconciled here instead.
    const source = read("lib/ai/gemini.js");
    const match = source.match(/GEMINI_MODEL = "([^"]+)"/);
    expect(match).not.toBeNull();
    expect(AI_PROVIDER.model).toBe(match[1]);

    // The audit knows it. The page does not say it, and must not start.
    expect(page).not.toContain("AI_PROVIDER.model");
    expect(rendered).not.toContain(AI_PROVIDER.model);
    expect(rendered).not.toMatch(/gemini[-\s]?\d/i);
  });

  it("keeps our own file paths off a public page", () => {
    // Section 2 used to print the module and function behind each feature.
    // Those stay in lib/legal/ai.js as provenance; the page shows neither.
    for (const feature of AI_FEATURES) {
      expect(rendered).not.toContain(feature.where);
      expect(rendered).not.toContain(feature.status);
    }
    expect(rendered).not.toMatch(/\b\w+\/[\w-]+\.(?:js|jsx|mjs)\b/);
    expect(rendered).not.toContain("<code>");
  });

  it("counts every caller of the model, and there are exactly two", () => {
    // The whole page rests on "two features and no others". A third call site
    // makes it false, so adding one has to break this test.
    const callers = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir)) {
        if (entry === "node_modules" || entry.startsWith(".next")) continue;
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.(js|jsx|mjs)$/.test(entry)) continue;
        const relative = path.relative(WEB, full);
        if (relative === "lib/ai/gemini.js") continue;
        if (relative.startsWith("tests/")) continue;
        if (/\bgenerateContent\s*\(/.test(readFileSync(full, "utf8"))) {
          callers.push(relative);
        }
      }
    };
    walk(WEB);

    expect(callers.sort()).toEqual([
      "actions/transaction.js",
      "lib/inngest/functions.js",
    ]);
    expect(AI_FACTS.featureCount).toBe(callers.length);
    expect(AI_FEATURES).toHaveLength(callers.length);
  });

  it("points each feature at the code that implements it", () => {
    for (const feature of AI_FEATURES) {
      const [file] = feature.where.split(" ");
      expect(existsSync(path.join(WEB, file))).toBe(true);
    }
  });

  it("renders the features from the evidence rather than retyping them", () => {
    expect(page).toContain("AI_FEATURES.map");
    // No feature's prose may be typed into the page: the module is the one
    // place it is written.
    for (const feature of AI_FEATURES) {
      expect(rendered).not.toContain(feature.sends);
      expect(rendered).not.toContain(feature.limits);
    }
  });

  it("has the switch section 7 promises, wired all the way through", () => {
    // Section 7 tells people they can stop their figures being sent to a
    // model. That sentence is only true if every one of these holds.
    expect(AI_FACTS.monthlySummaryCanBeSwitchedOff).toBe(true);

    // The column exists and defaults to the behaviour accounts already had.
    const schema = readFileSync(
      path.resolve(WEB, "../../database/prisma/schema.prisma"), "utf8"
    );
    expect(schema).toMatch(/monthlyInsights\s+Boolean\s+@default\(true\)/);

    // The job reads it, and skips the model when it is off.
    const job = read("lib/inngest/functions.js");
    expect(job).toContain("monthlyInsights: true");
    expect(job).toContain("if (!user.monthlyInsights) return null;");

    // Something can write it, and the page it is surfaced on reads it.
    expect(read("actions/preferences.js")).toContain(
      "export async function setMonthlyInsights"
    );
    expect(read("lib/queries.js")).toContain("getMonthlyInsightsEnabled");
    const settings = read("app/(main)/settings/page.jsx");
    expect(settings).toContain("AiSummaryToggle");
    expect(settings).toContain("getMonthlyInsightsEnabled");
  });

  it("does not let the Terms go on saying the switch is missing", () => {
    // The Terms said "There is currently no setting that turns it off".
    // It was true when written and is not any more.
    const terms = read("app/(marketing)/terms/page.jsx");
    expect(terms).not.toMatch(/no setting that turns it off/i);
    expect(terms).toContain("you can turn it off in Settings");
  });
});

describe("Claims the audit could not support", () => {
  // Each of these was considered and rejected on the evidence. The reasons
  // are in lib/legal/ai.js. They are forbidden in the published words of the
  // page and in the exported evidence alike.
  const FORBIDDEN = [
    "never used for training",
    "not used for training",
    "never used to train",
    "not used to train",
    "excluded from training",
    "immediately deleted",
    "zero data retention",
    "no human",
    "never read by",
    "cannot be read by anyone",
    "stays in india",
    "remains in india",
    "processed in india",
    "data residency",
    "end-to-end encrypted",
    "anonymised",
    "anonymized",
    "fully anonymous",
    "de-identified",
    "runs locally",
    "on-device",
    "self-hosted model handles",
    "bank-grade",
    "military-grade",
    "enterprise-grade",
    "gdpr compliant",
    "dpdp compliant",
    "eu ai act compliant",
    "fully compliant",
    "certified",
    "soc 2",
    "iso 27001",
    "always accurate",
    "100% accurate",
    "guaranteed accurate",
    "fully reviewed",
    "always reviewed",
    "human reviews every",
    "unbiased",
    "hallucination-free",
    "financial advice you can",
    "data processing agreement in place",
  ];

  it.each(FORBIDDEN)("the page never claims %j", (phrase) => {
    expect(rendered.toLowerCase()).not.toContain(phrase);
  });

  it.each(FORBIDDEN)("the evidence module never claims %j", (phrase) => {
    expect(exported).not.toContain(phrase);
  });

  it("keeps the provider tier recorded as unconfirmed until someone confirms it", () => {
    // The moment this flips to true, the callout in section 4 disappears and
    // the page must instead state which tier applies. That is a deliberate
    // edit, not something to happen by accident.
    expect(PROVIDER_TERMS.tierConfirmed).toBe(false);
    expect(page).toContain("!PROVIDER_TERMS.tierConfirmed");
  });
});

describe("Gaps the page has to keep admitting", () => {
  const ADMISSIONS = [
    // The commentary is on until you turn it off, and the page says both
    // halves of that rather than only the reassuring one.
    "It is on until you turn it off.",
    "Stopping the summary email itself",
    // Which Google terms apply is unknown.
    "We have not yet confirmed which applies to WHealthOS",
    "assume the less favourable column",
    // Nobody checks the commentary.
    "Nobody at WHealthOS reads it before it reaches you",
    // The model cannot touch records, and the scan still needs approval.
    "cannot edit, delete or add a transaction",
    // No measurement of accuracy exists.
    "no accuracy figure",
    // The local model is not real.
    "That does not exist",
    "nothing is processed locally today",
    // The page is not a safeguard and not a compliance claim.
    "Publishing it does not make anything more secure",
    "not a statement of compliance",
  ];

  it.each(ADMISSIONS)("still says %j", (phrase) => {
    expect(rendered).toContain(phrase);
  });

  // Two of the claims this audit rejected cannot simply be banned by phrase,
  // because the page rejects them in so many words -- "deleted immediately"
  // and "processed locally" both appear inside their own denial. What must
  // never happen is the denial turning into an assertion, so the affirmative
  // forms are banned instead.
  const AFFIRMATIVE = [
    /(?:inputs?|prompts?|images?|data) (?:are|is) deleted immediately/i,
    /deleted immediately after/i,
    /(?:your|the|all|any) (?:data|figures|information|records|receipts?) (?:is|are) processed locally/i,
    /everything is processed locally/i,
    /processing (?:happens|is done|stays) locally/i,
    /runs locally/i,
    /on your device/i,
  ];

  it.each(AFFIRMATIVE)("never turns a denial into a promise: %s", (pattern) => {
    expect(rendered).not.toMatch(pattern);
  });

  it("keeps both denials intact", () => {
    expect(rendered).toContain("deleted immediately, or unreadable by any person");
    expect(rendered).toContain("nothing is processed locally today");
  });

  it("gives both of Google's tiers, not just the comfortable one", () => {
    expect(PROVIDER_TERMS.paid.length).toBeGreaterThan(0);
    expect(PROVIDER_TERMS.unpaid.length).toBeGreaterThan(0);
    expect(page).toContain("PROVIDER_TERMS.paid.map");
    expect(page).toContain("PROVIDER_TERMS.unpaid.map");
    // The sentence that makes the unpaid column matter.
    expect(
      PROVIDER_TERMS.unpaid.some((line) =>
        line.toLowerCase().includes("human reviewers may read")
      )
    ).toBe(true);
  });
});
