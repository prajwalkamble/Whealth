import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  COOKIE_AUDIT_DATE, COOKIE_POLICY_LINK, NOT_PRESENT, STORAGE_INVENTORY,
  THIRD_PARTY_HOSTS,
} from "@/lib/legal/cookies";
import { LEGAL_LINKS } from "@/lib/legal/versions";

// Guards on the Cookie Policy.
//
// The failure mode for this document is drift: someone adds an analytics
// script, a font from a CDN or an embedded widget, and the page keeps saying
// there is none. These tests cannot watch the browser, but they can watch the
// repository for the things whose arrival would make the page false -- and
// they can hold the page to the inventory rather than letting prose be edited
// independently of the evidence.

const WEB = path.resolve(import.meta.dirname, "..");
const read = (relative) => readFileSync(path.join(WEB, relative), "utf8");
const PAGE = "app/(marketing)/cookie-policy/page.jsx";
const page = read(PAGE);

const rendered = page
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/^\s*\/\/.*$/gm, " ")
  .replace(/\s+/g, " ");

describe("The Cookie Policy route", () => {
  it("exists and declares its canonical URL", () => {
    expect(existsSync(path.join(WEB, PAGE))).toBe(true);
    expect(page).toContain(`canonical: "${COOKIE_POLICY_LINK}"`);
    expect(COOKIE_POLICY_LINK).toBe("/cookie-policy");
    // The constant and the directory are two places the route is written.
    // Neither may move without the other.
    expect(PAGE).toBe(`app/(marketing)${COOKIE_POLICY_LINK}/page.jsx`);
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
    // The page went live only once the audit's consent finding had been
    // accepted by the owner. Before that it was deliberately unlinked, and
    // this test is what records that the decision was taken.
    const footer = read("components/footer.jsx");
    expect(footer).toContain('{ label: "Cookie Policy", href: COOKIE_POLICY_LINK }');
    expect(footer).toContain('from "@/lib/legal/cookies"');
  });

  it("links only to pages that exist", () => {
    for (const href of [...Object.values(LEGAL_LINKS), "/security"]) {
      const route = href.replace(/^\//, "");
      expect(
        existsSync(path.join(WEB, `app/(marketing)/${route}/page.jsx`))
      ).toBe(true);
    }
  });
});

describe("The inventory drives the page", () => {
  it("renders the table from the inventory rather than hardcoding rows", () => {
    expect(page).toContain("STORAGE_INVENTORY");
    expect(page).toContain("<DataTable columns={columns} rows={rows} />");
    // No identifier may be typed into the prose: the table is the one place
    // names live, so a renamed cookie cannot leave a stale name behind.
    // Scoped to names that actually look like identifiers -- one entry is
    // called "theme", which is also an ordinary English word the prose is
    // entitled to use ("remembers your theme").
    const identifiers = STORAGE_INVENTORY.map((e) => e.name).filter((name) =>
      /[-_:]/.test(name)
    );
    expect(identifiers.length).toBeGreaterThan(8);
    for (const name of identifiers) {
      expect(rendered, name).not.toContain(name);
    }
  });

  it("gives every entry a purpose, a duration and its evidence", () => {
    for (const entry of STORAGE_INVENTORY) {
      expect(entry.purpose, entry.name).toBeTruthy();
      expect(entry.duration, entry.name).toBeTruthy();
      expect(["observed", "source", "provider-docs"]).toContain(entry.evidence);
      expect(["cookie", "localStorage", "sessionStorage"]).toContain(entry.type);
      expect(["first", "third"]).toContain(entry.party);
    }
  });

  it("reads the audit date from the inventory rather than hardcoding one", () => {
    expect(page).toContain("{COOKIE_AUDIT_DATE}");
    expect(page).not.toContain(COOKIE_AUDIT_DATE);
    expect(COOKIE_AUDIT_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("renders the not-found list and the third-party hosts from data", () => {
    expect(page).toContain("NOT_PRESENT.map");
    expect(page).toContain("THIRD_PARTY_HOSTS.map");
    expect(NOT_PRESENT.length).toBeGreaterThan(0);
    expect(THIRD_PARTY_HOSTS.length).toBeGreaterThan(0);
  });
});

describe("The claim that there is no tracking", () => {
  // The page says there is no analytics, advertising or embedded third-party
  // content. That is true today. These tests fail the day it stops being
  // true, which is the only way a sentence like that stays honest.
  const manifest = JSON.parse(read("package.json"));
  const dependencies = Object.keys({
    ...manifest.dependencies,
    ...manifest.devDependencies,
  });

  it("depends on no analytics, advertising or session-replay package", () => {
    const tracking =
      /analytic|gtag|gtm|segment|posthog|mixpanel|amplitude|plausible|fathom|hotjar|clarity|heap|fullstory|logrocket|smartlook|pixel|doubleclick|adsense/i;
    expect(dependencies.filter((name) => tracking.test(name))).toEqual([]);
  });

  it("loads no third-party script and embeds no third-party frame", () => {
    const sources = ["app", "components"].flatMap((dir) => walk(path.join(WEB, dir)));
    const offenders = [];
    for (const file of sources) {
      const source = readFileSync(file, "utf8");
      // An external <script src>, an <iframe>, or a stylesheet from a CDN.
      if (/<script[^>]+src=["']https?:/i.test(source)) offenders.push(`${file}: external script`);
      if (/<iframe/i.test(source)) offenders.push(`${file}: iframe`);
      if (/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(source)) {
        offenders.push(`${file}: webfont from a third party`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("registers no service worker and opens no IndexedDB", () => {
    const sources = ["app", "components", "lib"].flatMap((dir) => walk(path.join(WEB, dir)));
    const offenders = sources.filter((file) =>
      /serviceWorker\.register|indexedDB\.open|caches\.open/.test(readFileSync(file, "utf8"))
    );
    expect(offenders).toEqual([]);
  });
});

describe("Honesty about what is missing", () => {
  it("does not claim a consent banner or a cookie-settings control exists", () => {
    const prose = rendered.toLowerCase();
    expect(prose).toContain("no cookie banner");
    for (const phrase of [
      "manage your cookie preferences",
      "cookie settings panel",
      "accept all",
      "reject all",
      "you consented",
      "by continuing to browse",
    ]) {
      expect(prose).not.toContain(phrase);
    }
  });

  it("does not claim compliance anywhere", () => {
    const prose = rendered.toLowerCase();
    for (const phrase of ["gdpr compliant", "pecr compliant", "fully compliant", "globally compliant", "dpdp compliant"]) {
      expect(prose).not.toContain(phrase);
    }
    expect(rendered).toContain("not a claim of compliance");
  });

  it("does not quietly drop the telemetry it used to disclose", () => {
    // It was removed, not hidden. Someone who read the old page and is
    // checking what happened to it has to find the answer on the new one.
    expect(rendered).toContain("Neither happens any more");
    expect(rendered).toContain("The telemetry is");

    // And the inventory must not still be listing it.
    const names = STORAGE_INVENTORY.map((e) => e.name);
    expect(names).not.toContain("clerk_telemetry_throttler");
    expect(THIRD_PARTY_HOSTS.map((h) => h.host)).not.toContain(
      "clerk-telemetry.com"
    );
  });

  it("keeps the telemetry switched off at the source", () => {
    // The page says it does not happen. That is only true while the provider
    // is mounted with telemetry disabled, and only in one place.
    expect(read("components/clerk.jsx")).toContain("telemetry={false}");
    expect(read("app/layout.js")).not.toMatch(/^import .*ClerkProvider/m);
  });

  it("keeps the sign-in software off the public pages", () => {
    // The other half of the claim: no provider on a marketing page unless
    // the visitor is already signed in.
    const marketing = read("app/(marketing)/layout.js");
    expect(marketing).toContain("userId ? <Clerk>");
    // And nothing public may reach for a Clerk hook, which would need one.
    expect(read("components/header.jsx")).not.toContain('from "@clerk/nextjs"');
    expect(read("components/theme-toggle.jsx")).not.toMatch(
      /^import .*@clerk/m
    );
  });

  it("states both limits on the browser sweep", () => {
    expect(rendered).toContain("ran signed out");
    expect(rendered).toContain("development configuration");
  });
});

// Every .js/.jsx file under a directory.
function walk(dir, found = []) {
  const { readdirSync, statSync } = require("node:fs");
  for (const entry of readdirSync(dir)) {
    if (["node_modules", ".next"].includes(entry)) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, found);
    else if (/\.(js|jsx)$/.test(entry)) found.push(full);
  }
  return found;
}
