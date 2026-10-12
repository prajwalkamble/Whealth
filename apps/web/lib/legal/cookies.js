// What WHealthOS stores on a visitor's device, and the evidence for each entry.
//
// Same rule as policy.js, terms.js and security.js, with one extra discipline
// that matters here: a cookie's NAME proves nothing about its purpose or its
// lifetime. Every row below was either read out of a real browser against the
// running application, or read out of the source that writes it. Where a row
// rests on a provider's documentation rather than on something observed, it
// says so, because the two are not the same kind of fact.
//
// HOW THE OBSERVED ROWS WERE ESTABLISHED (2026-10-11)
// A clean browser profile, no account, visiting /, /tools,
// /tools/net-worth-calculator, /terms, /privacy, /security, /pricing, /demo,
// /sign-in and /sign-up in turn, with every cookie, storage area and outbound
// request recorded. The same sweep found NO IndexedDB database, NO service
// worker, NO Cache Storage entry, NO sessionStorage key, and no analytics,
// advertising or tracking request of any kind.
//
// THE TWO LIMITS ON THAT SWEEP, which the page does not paper over:
//   1. It ran against a Clerk DEVELOPMENT instance. Clerk's documentation is
//      explicit that development instances sync sessions differently from
//      production ones, so the __clerk_db_jwt rows below are development
//      artefacts and production's cookie set will differ.
//   2. It ran signed out. Signing in would have required creating an account
//      on a hosted third-party identity service, which is not something to do
//      in an audit, so the signed-in cookie set is taken from source and from
//      Clerk's documentation rather than from observation.

export const COOKIE_AUDIT_DATE = "2026-10-11";

// type: "cookie" | "localStorage" | "sessionStorage"
// evidence: "observed" | "source" | "provider-docs"
export const STORAGE_INVENTORY = [
  {
    name: "sidebar_state",
    type: "cookie",
    provider: "WHealthOS",
    party: "first",
    purpose: "Remembers whether you left the sidebar open or collapsed, so the page renders it that way instead of flicking open on first paint.",
    duration: "7 days",
    where: "The signed-in application",
    evidence: "source",
    note: "components/ui/sidebar.jsx writes it with document.cookie; app/(main)/layout.js reads it server-side. Written only when you actually move the sidebar.",
  },
  {
    name: "__client_uat",
    type: "cookie",
    provider: "Clerk",
    party: "first",
    purpose: "Tells the application whether a signed-in session exists, without exposing the session itself.",
    duration: "Observed as roughly one year",
    where: "Every page",
    evidence: "observed",
    note: "Also observed with an instance suffix (__client_uat_<id>). Value was a single character while signed out.",
  },
  {
    name: "__clerk_db_jwt",
    type: "cookie",
    provider: "Clerk",
    party: "first",
    purpose: "Development only. Keeps the sign-in state in step between the local application and Clerk's own domain.",
    duration: "Observed as roughly one year",
    where: "Every page, on a development instance",
    evidence: "observed",
    note: "Clerk's documentation says development instances sync sessions this way because the two domains are cross-site, and that production does not. Not expected in production.",
  },
  {
    name: "__session",
    type: "cookie",
    provider: "Clerk",
    party: "first",
    purpose: "Carries the short-lived token that proves a request comes from your signed-in session.",
    duration: "Clerk documents the session token as short-lived",
    where: "Production, once signed in",
    evidence: "provider-docs",
    note: "Not observed in this audit: production could not be inspected from the audit machine, and the local instance is a development one.",
  },
  {
    name: "__cf_bm",
    type: "cookie",
    provider: "Cloudflare, via Clerk",
    party: "third",
    purpose: "Cloudflare's bot management for Clerk's own service.",
    duration: "Observed as under an hour",
    where: "Set on Clerk's domain whenever Clerk's script runs",
    evidence: "observed",
    note: "Set on Clerk's domain, not on ours. We do not read it and cannot delete it.",
  },
  {
    name: "_cfuvid",
    type: "cookie",
    provider: "Cloudflare, via Clerk",
    party: "third",
    purpose: "Lets Cloudflare apply rate limits per visitor to Clerk's service.",
    duration: "Until the browser is closed",
    where: "Set on Clerk's domain whenever Clerk's script runs",
    evidence: "observed",
    note: "Named in Clerk's own cookie documentation.",
  },
  {
    name: "__clerk_environment",
    type: "localStorage",
    provider: "Clerk",
    party: "first",
    purpose: "Caches Clerk's configuration so it is not re-fetched on every page.",
    duration: "Until cleared",
    where: "Signed-in pages, and the sign-in and sign-up pages",
    // Downgraded from "observed" deliberately. The sweep observed that this is
    // no longer written on any public page, which is the absence of a thing.
    // That it is still written where Clerk does load follows from the source
    // -- those are the layouts that still mount the provider -- and was not
    // watched in a browser, because doing so needs a signed-in session.
    evidence: "source",
    note: "It used to be written on every page, including ones with nothing to sign in to. The sign-in software is no longer loaded on the public pages, so it is not written there at all.",
  },
  {
    name: "theme",
    type: "localStorage",
    provider: "WHealthOS",
    party: "first",
    purpose: "Remembers whether you chose light or dark.",
    duration: "Until cleared",
    where: "Any page, once you choose",
    evidence: "source",
    note: "next-themes writes it; the key is that library's documented default, confirmed in the installed package source. Written only when you pick a theme.",
  },
  {
    name: "whealth-preferences",
    type: "localStorage",
    provider: "WHealthOS",
    party: "first",
    purpose: "Remembers your appearance settings: colours, fonts, scale, corner radius and layout.",
    duration: "Until cleared",
    where: "Any page, once you change a setting",
    evidence: "source",
    note: "lib/preferences.js. For a signed-in account these are also saved on the account, so they follow you to another browser.",
  },
  {
    name: "whealth-notifications-seen",
    type: "localStorage",
    provider: "WHealthOS",
    party: "first",
    purpose: "Records the moment you last opened the notifications panel, so the unread dot is accurate.",
    duration: "Until cleared",
    where: "The signed-in application",
    evidence: "source",
  },
  {
    name: "whealth-demo-transactions",
    type: "localStorage",
    provider: "WHealthOS",
    party: "first",
    purpose: "Holds the figures you type into the signed-out demo, so the page can total them.",
    duration: "Until cleared",
    where: "The demo page only",
    evidence: "source",
    note: "These are the visitor's own invented figures. They are never sent to us and no account is involved.",
  },
  {
    name: "whealthos:stale-build-reload",
    type: "sessionStorage",
    provider: "WHealthOS",
    party: "first",
    purpose: "A one-shot marker so that a page which failed to load a file after a new version was deployed reloads once, and does not loop.",
    duration: "Until the tab is closed",
    where: "Only after that specific failure",
    evidence: "source",
  },
];

// Technologies searched for and NOT found. Worth stating: "we do not track
// you" means nothing without saying what was looked for.
export const NOT_PRESENT = [
  "Analytics of any kind, first-party or third-party",
  "Advertising or marketing tags, and tracking pixels",
  "Embedded third-party content such as social widgets, maps or video players",
  "Service workers, Cache Storage and IndexedDB",
  "Any cookie or browser storage set by our hosting or security providers",
  "Webfonts fetched from a third party — the fonts are served from our own domain",
];

// Third-party hosts the browser actually contacted during the sweep, signed
// out. Named because a policy that lists cookies but not the connections that
// set them tells only half the story.
export const THIRD_PARTY_HOSTS = [
  { host: "Clerk (its own domain)", why: "Checks whether you have a session. This happens on every page, including ones with nothing to sign in to, because the check runs on every route -- but signed out it is the only thing that reaches Clerk: the sign-in software itself is no longer loaded on the public pages." },
  { host: "img.clerk.com", why: "Serves images used by the sign-in interface, such as the Google logo. Only on the pages that show that interface." },
];

// The route this page lives at. Beside the inventory rather than in
// versions.js for the same reason SECURITY_LINK sits beside the security
// facts: /terms and /privacy are the two documents a consent record names,
// and this is not one of them.
export const COOKIE_POLICY_LINK = "/cookie-policy";
