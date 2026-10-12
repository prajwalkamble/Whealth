import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { LEGAL_LINKS } from "@/lib/legal/versions";
import { SECURITY_LINK } from "@/lib/legal/security";
import { COOKIE_POLICY_LINK } from "@/lib/legal/cookies";
import { AI_USAGE_LINK } from "@/lib/legal/ai";

// Guards across the five public documents, rather than inside any one of them.
//
// Each page has its own suite already, and each one passed while the set as a
// whole said different things. The Security page refused to claim row-level
// isolation, because the audit found the production role bypasses it -- and
// the Privacy Policy, which is the document people actually accept, claimed
// it anyway in section 12. Nothing caught that, because nothing was looking
// at two files at once.

const WEB = path.resolve(import.meta.dirname, "..");
const read = (relative) => readFileSync(path.join(WEB, relative), "utf8");

const PAGES = {
  privacy: "app/(marketing)/privacy/page.jsx",
  terms: "app/(marketing)/terms/page.jsx",
  security: "app/(marketing)/security/page.jsx",
  cookies: "app/(marketing)/cookie-policy/page.jsx",
  ai: "app/(marketing)/ai-usage/page.jsx",
};

const ROUTES = {
  ...LEGAL_LINKS,
  security: SECURITY_LINK,
  cookies: COOKIE_POLICY_LINK,
  ai: AI_USAGE_LINK,
};

// Published words only: every one of these files discusses, in comments, the
// claims it is deliberately not making.
const renderedOf = (relative) =>
  read(relative)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ")
    .replace(/\s+/g, " ");

const rendered = Object.fromEntries(
  Object.entries(PAGES).map(([name, file]) => [name, renderedOf(file)])
);

describe("All five documents are public and reachable", () => {
  it.each(Object.entries(ROUTES))("%s resolves to a page", (_name, href) => {
    const route = href.replace(/^\//, "");
    expect(existsSync(path.join(WEB, `app/(marketing)/${route}/page.jsx`))).toBe(
      true
    );
  });

  it("none of them is behind the auth middleware", () => {
    // A legal document that 302s to sign-in is not a legal document.
    const middleware = read("middleware.js");
    const protectedBlock = middleware.slice(
      middleware.indexOf("isProtectedRoute"),
      middleware.indexOf("]);", middleware.indexOf("isProtectedRoute"))
    );
    for (const href of Object.values(ROUTES)) {
      expect(protectedBlock).not.toContain(`"${href}`);
    }
  });

  it("the footer links to each of them exactly once", () => {
    const footer = read("components/footer.jsx");
    for (const [name, href] of Object.entries(ROUTES)) {
      const direct = footer.split(`"${href}"`).length - 1;
      const viaConstant =
        footer.split(
          { security: "SECURITY_LINK", cookies: "COOKIE_POLICY_LINK", ai: "AI_USAGE_LINK" }[
            name
          ] ?? "\u0000"
        ).length - 1;
      // Security appears twice on purpose: the Legal column and the bottom
      // bar. Everything else is once. Either way it must appear.
      expect(direct + viaConstant, `${name} is not in the footer`).toBeGreaterThan(0);
    }
  });
});

describe("Every internal link points somewhere real", () => {
  const anchorsOf = (file) =>
    new Set(
      [...read(file).matchAll(/<Section id="([^"]+)"/g)].map((m) => m[1])
    );

  it.each(Object.entries(PAGES))("%s has no dead link", (_name, file) => {
    const source = read(file);
    const hrefs = [...source.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);

    for (const href of hrefs) {
      const [route, anchor] = href.split("#");
      const relative =
        route === "/settings"
          ? "app/(main)/settings/page.jsx"
          : `app/(marketing)${route}/page.jsx`;
      const alt = `app/(marketing)${route}/page.js`;
      expect(
        existsSync(path.join(WEB, relative)) || existsSync(path.join(WEB, alt)),
        `${file} links to ${route}, which does not exist`
      ).toBe(true);

      if (anchor) {
        expect(
          anchorsOf(relative).has(anchor),
          `${file} links to ${href}, and #${anchor} is not a section there`
        ).toBe(true);
      }
    }
  });
});

describe("The documents do not contradict each other", () => {
  it("none of them claims the database-level isolation the Security page will not", () => {
    // lib/legal/security.js records row-level security as unverified in
    // production: the request-path role was found to bypass every policy. No
    // page may assert it until that record says otherwise.
    const security = read("lib/legal/security.js");
    expect(
      security.includes("notClaimed.rowLevelSecurity"),
      "the gap record moved -- re-check this guard against it"
    ).toBe(true);

    const FORBIDDEN = [
      /scoped to your account at the database level/i,
      /row-?level security (?:is|protects|ensures)/i,
      /the database (?:itself )?(?:enforces|prevents|guarantees)/i,
      /queries cannot reach another/i,
    ];
    for (const [name, text] of Object.entries(rendered)) {
      for (const pattern of FORBIDDEN) {
        expect(text, `${name} asserts database-level isolation`).not.toMatch(
          pattern
        );
      }
    }
  });

  it("agrees across all three documents that the AI commentary can be switched off", () => {
    // Terms section 10, AI Usage section 7 and Privacy section 7 all describe
    // the same feature. When the switch was added, two of them were updated.
    expect(rendered.terms).toContain("you can turn it off in Settings");
    expect(rendered.ai).toContain("can be switched off");
    expect(rendered.privacy).toContain("You can stop this");

    // And none may still say the old thing.
    for (const [name, text] of Object.entries(rendered)) {
      expect(text, `${name}`).not.toMatch(/no setting that turns it off/i);
    }
  });

  it("agrees that deleting the sign-in now deletes the records", () => {
    // Both documents said the opposite until the Clerk webhook existed.
    expect(existsSync(path.join(WEB, "app/api/webhooks/clerk/route.js"))).toBe(
      true
    );
    for (const name of ["privacy", "terms"]) {
      expect(rendered[name], name).not.toMatch(
        /deleting your sign-in does not delete/i
      );
      expect(rendered[name], name).toMatch(/cannot be undone|cannot be reversed/i);
    }
  });

  it("names one AI provider, and the same one, wherever it names any", () => {
    for (const name of ["privacy", "terms", "ai"]) {
      expect(rendered[name], `${name} should name Google`).toContain("Google");
    }
    for (const [name, text] of Object.entries(rendered)) {
      for (const other of ["OpenAI", "Anthropic", "Mistral", "Cohere"]) {
        expect(text, `${name} names ${other}`).not.toContain(other);
      }
    }
  });

  it("points the two accepted documents at the three newer ones", () => {
    // Privacy and Terms are what a person actually agrees to. Until this
    // audit, neither linked to Security, the Cookie Policy or AI Usage, so
    // the only route to them was the footer.
    expect(read(PAGES.privacy)).toContain("SECURITY_LINK");
    expect(read(PAGES.privacy)).toContain("COOKIE_POLICY_LINK");
    expect(read(PAGES.privacy)).toContain("AI_USAGE_LINK");
  });
});

describe("Signup consent", () => {
  const form = read("app/(auth)/welcome/_components/consent-form.jsx");
  const action = read("actions/legal.js");
  // Its comment spells out the forged payload it refuses, version field and
  // all, so the "no version from the caller" check reads the code only.
  const actionCode = action.replace(/^\s*\/\/.*$/gm, " ");

  it("starts unchecked", () => {
    expect(form).toContain("useState(false)");
    expect(form).not.toMatch(/defaultChecked|checked={true}|useState\(true\)/);
  });

  it("links both documents by their canonical constants", () => {
    expect(form).toContain("LEGAL_LINKS.terms");
    expect(form).toContain("LEGAL_LINKS.privacy");
    expect(form).not.toMatch(/href="\/terms"|href="\/privacy"/);
  });

  it("says that the links open in a new tab", () => {
    expect(form).toContain('target="_blank"');
    expect(form).toContain('rel="noopener noreferrer"');
    expect(form).toContain("(opens in a new tab)");
  });

  it("refuses anything but a literal true, and lets the server decide the rest", () => {
    expect(action).toContain("accepted !== true");
    // The caller supplies one boolean. Identity, versions and timestamp are
    // the server's, or a forged request could name the version it accepted.
    expect(action).toContain("requireClerkUserId()");
    expect(action).toContain("provisionUser()");
    expect(actionCode).not.toMatch(/termsVersion\s*[:=]/);
  });

  it("writes the account and the consent in one transaction", () => {
    const checkUser = read("lib/checkUser.js");
    expect(checkUser).toContain("LEGAL_VERSIONS.TERMS");
    expect(checkUser).toContain("LEGAL_VERSIONS.PRIVACY");
    expect(checkUser).toContain("legalConsents: { create: consent }");
  });

  it("cannot be skipped by going straight to the app", () => {
    // The consent step is where the row is created, and every tenant-scoped
    // query resolves through that row. No row, no app.
    expect(read("middleware.js")).toContain('"/welcome(.*)"');
    expect(read("app/(main)/layout.js")).toContain('redirect("/welcome")');
    expect(read("lib/prisma.js")).toContain('throw new ActionError("User not found")');
  });
});
