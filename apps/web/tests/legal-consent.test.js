import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { LEGAL_VERSIONS, LEGAL_LINKS } from "@/lib/legal/versions";

// The parts of the consent flow that can be checked without a database or a
// browser. The behavioural tests live in tests/consent-integration.test.js.
//
// There is no DOM test runner in this project and adding one for a single
// checkbox was not worth a new dependency, so the two assertions that would
// normally be made by rendering the form are made against its source instead.
// They are narrow on purpose: whether the box starts unchecked, and whether
// the links are the canonical ones. Both are the kind of thing a later edit
// breaks silently.

const WEB = path.resolve(import.meta.dirname, "..");
const read = (relative) => readFileSync(path.join(WEB, relative), "utf8");

// Files that legitimately contain a date string which may coincide with a
// document version: each records when a page's factual claims were last
// checked, not which text a user accepted.
const AUDIT_DATED_FILES = [
  "lib/legal/security.js",
  "lib/legal/cookies.js",
  "lib/legal/ai.js",
];

const CONSENT_FORM = "app/(auth)/welcome/_components/consent-form.jsx";
const SIGN_UP_PAGE = "app/(auth)/sign-up/[[...sign-up]]/page.jsx";

// Every source file the app ships, so "the version is defined in one place"
// can be asserted rather than hoped for.
const sourceFiles = (dir = WEB, found = []) => {
  for (const entry of readdirSync(dir)) {
    if (["node_modules", ".next", ".next-build", "tests", "public"].includes(entry)) {
      continue;
    }
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, found);
    else if (/\.(js|jsx|mjs)$/.test(entry)) found.push(full);
  }
  return found;
};

describe("Legal document routes", () => {
  it.each(Object.entries(LEGAL_LINKS))(
    "%s resolves to a page that exists",
    (_name, href) => {
      // Both documents live in the marketing group. A page must exist at the
      // route, or the consent checkbox links somewhere that 404s.
      const page = path.join(WEB, "app/(marketing)", href, "page.jsx");
      expect(existsSync(page), `${href} -> ${page}`).toBe(true);
    }
  );

  it("is not duplicated by a second copy of either document", () => {
    const pages = sourceFiles()
      .filter((file) => /\/(terms|privacy)\/page\.jsx$/.test(file))
      .map((file) => path.relative(WEB, file));
    expect(pages.sort()).toEqual([
      "app/(marketing)/privacy/page.jsx",
      "app/(marketing)/terms/page.jsx",
    ]);
  });
});

describe("Version constants", () => {
  it("are defined in exactly one file", () => {
    const versions = [...new Set(Object.values(LEGAL_VERSIONS))];

    for (const version of versions) {
      const holders = sourceFiles()
        .filter((file) => readFileSync(file, "utf8").includes(`"${version}"`))
        .map((file) => path.relative(WEB, file))
        // These two record the date their page's claims were last checked
        // against the running application. That is a different fact which
        // happens to be the same string, because the audits and the Terms
        // rebuild landed on the same day. Neither is a document version --
        // the assertion below proves neither can become one -- so they do not
        // break the rule this test exists to enforce.
        .filter((relative) => !AUDIT_DATED_FILES.includes(relative));

      expect(holders, `version ${version}`).toEqual(["lib/legal/versions.js"]);
    }
  });

  it.each(AUDIT_DATED_FILES)("%s holds an audit date, never a document version", (file) => {
    // The exemption above is only safe while these files hold no version of
    // their own. If somebody adds one, a consent record could end up naming a
    // string this file is no longer the source of.
    const source = read(file);
    expect(source).not.toMatch(/\b(TERMS|PRIVACY)\s*:/);
    expect(source).not.toContain("LEGAL_VERSIONS");
    expect(source).not.toMatch(/\bversion\s*:/);
  });

  it("are literals, not something derived from today's date", () => {
    const source = read("lib/legal/versions.js");
    expect(source).not.toMatch(/new Date|Date\.now|toISOString/);
    for (const version of Object.values(LEGAL_VERSIONS)) {
      expect(source).toContain(`"${version}"`);
    }
  });
});

describe("The consent checkbox", () => {
  it("starts unchecked", () => {
    const source = read(CONSENT_FORM);
    expect(source).toContain("useState(false)");
    // defaultChecked would make it checked on arrival, which is the one thing
    // a consent checkbox must never be.
    expect(source).not.toContain("defaultChecked");
  });

  it("links to the canonical routes rather than its own copies of them", () => {
    const source = read(CONSENT_FORM);
    expect(source).toContain("LEGAL_LINKS.terms");
    expect(source).toContain("LEGAL_LINKS.privacy");
    expect(source).not.toMatch(/href="\/(terms|privacy)"/);
    expect(source).not.toMatch(/https?:\/\/[^"']*\/(terms|privacy)/);
  });

  it("keeps its refusal reachable rather than silently inert", () => {
    const source = read(CONSENT_FORM);
    // The submit is marked inactive but stays focusable and clickable, so
    // pressing it says what is missing. disabled={loading} is the only hard
    // disable: a hard disable while unchecked drops the button out of the tab
    // order and makes the error below it unreachable by anyone who cannot see
    // that the checkbox is the problem.
    expect(source).toContain("aria-disabled={!accepted || undefined}");
    expect(source).toContain("disabled={loading}");
    // The lookbehind matters: aria-disabled={!accepted ...} contains the same
    // text, and it is the one that should be there.
    expect(source).not.toMatch(/(?<!aria-)disabled=\{!accepted/);
    // ...and pressing it moves the cursor to the control that needs attention.
    expect(source).toContain("checkboxRef.current?.focus()");
  });

  it("is announced to a screen reader and reachable from the keyboard", () => {
    const source = read(CONSENT_FORM);
    // A <label htmlFor> on the control, so the sentence is the checkbox's
    // accessible name and clicking it toggles the box.
    expect(source).toContain("htmlFor={CHECKBOX_ID}");
    expect(source).toContain("id={CHECKBOX_ID}");
    // The failure message is linked to the control and announced when it
    // appears, rather than only being visible.
    expect(source).toContain("aria-describedby");
    expect(source).toContain('role="alert"');
    // Opening a document in a new tab is said out loud, not just implied by
    // an icon.
    expect(source).toContain("(opens in a new tab)");
    expect(source).toContain('rel="noopener noreferrer"');
  });
});

describe("The sign-up page", () => {
  it("still uses Clerk's own component", () => {
    const source = read(SIGN_UP_PAGE);
    expect(source).toContain("<SignUp");
    expect(source).toContain('from \'@clerk/nextjs\'');
  });

  it("sends a completed signup to the consent step", () => {
    expect(read(SIGN_UP_PAGE)).toContain('forceRedirectUrl="/welcome"');
  });

  it("shows both documents before anyone signs up", () => {
    const source = read(SIGN_UP_PAGE);
    expect(source).toContain("LEGAL_LINKS.terms");
    expect(source).toContain("LEGAL_LINKS.privacy");
  });
});

describe("Signing in", () => {
  it("is left alone: no consent checkbox, no redirect of its own", () => {
    // Existing users sign in and arrive. Phase 7 of the brief, and the reason
    // this file asserts it: a later change that gates sign-in on consent would
    // lock out every account that predates the feature.
    const source = read("app/(auth)/sign-in/[[...sign-in]]/page.jsx");
    expect(source).toContain("<SignIn />");
    expect(source).not.toMatch(/Checkbox|LEGAL|consent|welcome/i);
  });
});

describe("The consent route", () => {
  it("is protected by the middleware", () => {
    expect(read("middleware.js")).toContain('"/welcome(.*)"');
  });

  it("refuses to render for an anonymous visitor on its own account", () => {
    const source = read("app/(auth)/welcome/page.jsx");
    expect(source).toContain("redirect(\"/sign-in\")");
    // Already provisioned: nothing to accept, and never a second record.
    expect(source).toContain("redirect(\"/dashboard\")");
  });

  it("is where the app sends a session with no account", () => {
    expect(read("app/(main)/layout.js")).toContain('redirect("/welcome")');
  });
});
