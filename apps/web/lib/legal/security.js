// Facts the Security page is built from.
//
// Same rule as lib/legal/policy.js and lib/legal/terms.js: everything here was
// established by reading the application, querying the database, or reading the
// provider's own documentation -- and the note on each entry says which, so the
// next person can re-check it instead of trusting this file.
//
// A security page is the one document where an unsupported claim is actively
// dangerous: it tells a person it is safe to put their bank balances in, and a
// reader has no way to audit it. So the rule here is stricter than elsewhere.
// Anything that could not be verified is absent from the page entirely rather
// than softened into a hedge, and the gaps are recorded below so that nobody
// mistakes "not mentioned" for "not checked".

export const SECURITY = {
  // The date this page's claims were last checked against the application.
  // A real review happened on this date: the server actions, the RLS
  // migrations, the live database roles, the Arcjet rules, the Clerk instance
  // settings and the production response headers were all examined. Move this
  // only after doing that again.
  lastReviewed: "2026-10-11",

  // --- Verified: authentication ------------------------------------------
  // Clerk holds the credentials. schema.prisma has no password, no password
  // hash, and no field that could hold one; the only identity columns on the
  // users table are clerkUserId, email, name and imageUrl. So "WHealthOS never
  // receives or stores your password" is a statement about the schema, not a
  // promise about a provider.
  passwordsNeverStored: true,

  // --- Verified: server-side authorization -------------------------------
  // lib/prisma.js withCurrentTenant resolves the Clerk session to the internal
  // user id inside the transaction, and every action and query scopes its reads
  // and writes to that id. Audited across all 32 exported server actions, both
  // API route handlers and lib/queries.js: every lookup that takes an id from
  // the browser is matched against the caller's own userId before anything is
  // read or written, and lib/validation re-parses each payload so a crafted
  // body cannot smuggle a userId in.
  serverSideOwnershipChecks: true,

  // tests/actions-integration.test.js contains dedicated cross-account cases
  // ("refuses to post into another tenant's account", "refuses to read another
  // tenant's transaction", "strips unknown keys so a payload cannot reassign
  // ownership", and others) which run against a real Postgres database.
  crossAccountTests: true,

  // --- Verified: abuse protection ----------------------------------------
  // middleware.js runs Arcjet shield in LIVE mode and detectBot in LIVE mode
  // in production. Confirmed from outside: every request this audit made to
  // www.whealthos.com that passed through the middleware was answered with
  // Arcjet's own {"code":403,"message":"Forbidden"}, while /favicon.ico -- the
  // one path the matcher skips -- returned 200. The rules are live and
  // enforcing, not in dry-run.
  //
  // lib/arcjet.js adds per-action token buckets for writes, receipt scans and
  // account creation. Thresholds are deliberately not published.
  abuseProtectionLive: true,

  // --- Verified: transport ------------------------------------------------
  // Response headers from www.whealthos.com carry
  // strict-transport-security: max-age=63072000 on both a 200 and a 403, and
  // the apex domain 308-redirects to https://www.
  httpsEnforced: true,

  // --- Verified: where the data sits -------------------------------------
  // Same evidence as POLICY.databaseRegion / POLICY.appHosting: DATABASE_URL
  // resolves to aws-0-ap-south-1.pooler.supabase.com and production responses
  // carry x-vercel-id: bom1::..., Vercel's Mumbai region.
  dataRegion: "India (AWS ap-south-1 and Vercel's Mumbai region)",

  // --- Verified from the provider's documentation, not from our code -----
  // Supabase's Data Processing Addendum states that all hard disks are
  // encrypted at rest with AES-256, and its data-residency FAQ states that
  // encryption keys are generated per project and held in FIPS 140-2 hardware
  // security modules. That is a provider statement, and the page attributes it
  // as one rather than presenting it as something WHealthOS implemented.
  encryptionAtRestProvider: "Supabase",

  // --- Verified: what is deliberately not collected ----------------------
  // The Card model stores name, issuer, network, type, last4, expiry month and
  // year, credit limit, billing and due day. There is no column for a full
  // card number, a CVV, a PIN or an online banking credential, and no bank
  // aggregator integration anywhere in the codebase.
  noCardNumbersOrBankCredentials: true,

  // Receipt images are base64-encoded in actions/transaction.js, sent to the
  // model, and dropped. There is no object store, no Supabase Storage client,
  // no S3 client, and no attachment table in the schema.
  receiptsNotStored: true,

  // Only display preferences and a "notifications seen" timestamp go into
  // localStorage. The only financial rows kept in a browser belong to the
  // signed-out /demo page, and they are the visitor's own invented figures.
  noRecordsInBrowserStorage: true,

  // --- Verified: response headers ----------------------------------------
  // Added 2026-10-11 in next.config.mjs headers(), and checked against a
  // production build rather than the dev server: nosniff, X-Frame-Options
  // DENY, Referrer-Policy strict-origin-when-cross-origin, a Permissions-
  // Policy denying microphone, geolocation, payment and usb, and HSTS for two
  // years in production only. Not a CSP -- see notClaimed.contentSecurityPolicy.
  responseHeaders: true,

  // lib/action-error.js: only an ActionError's message reaches the browser.
  // Anything else is logged server-side and returned as a fixed generic
  // string, so a Prisma or infrastructure error cannot leak a query or a host.
  internalErrorsNotDisclosed: true,

  // --- NOT claimed on the page, and why ----------------------------------
  //
  // Each of these was checked and found absent or unverifiable. They are
  // listed so that a later reader can tell the difference between a safeguard
  // that was considered and rejected and one nobody thought about.
  //
  // notClaimed.rowLevelSecurity
  //   RLS is ENABLED and FORCED on all eleven tables with policies in place --
  //   but the live DATABASE_URL connects as the `postgres` role, which this
  //   audit confirmed has rolbypassrls = true and is a member of whealth_jobs.
  //   Both independently defeat every policy on the request path. Isolation in
  //   production therefore rests on the application-layer scoping above, which
  //   is real and tested; the database layer is not currently a second line of
  //   defence, so the page does not say it is.
  //
  // notClaimed.multiFactorAuthentication
  //   The Clerk instance this checkout points at is a development instance
  //   with second_factors: [] and no passkey attribute -- no MFA at all. The
  //   production instance's settings could not be read from here, so the page
  //   says nothing about two-step verification in either direction.
  //
  // notClaimed.contentSecurityPolicy
  //   Still none. The other response headers were added on 2026-10-11 (see
  //   responseHeaders below), but a CSP has to allow Clerk's script, frames
  //   and XHR hosts, the Inngest endpoint and Next's inline bootstrap, and a
  //   wrong one blanks the application rather than degrading. It is worth a
  //   report-only rollout of its own and has not had one, so the page does
  //   not mention it.
  //
  // notClaimed.backups
  //   Supabase does not include automatic backups on its Free plan. Which plan
  //   this project is on could not be determined from the repository, so no
  //   backup or recovery statement appears on the page.
  //
  // notClaimed.monitoringAndAlerting
  //   No Sentry, no log drain, no alerting, no uptime paging. Errors go to
  //   console and are read when someone looks.
  //
  // notClaimed.incidentResponse
  //   No written procedure, no assessment step for notification duties, no
  //   tested recovery path.
  //
  // notClaimed.dependencyScanning
  //   .github holds a README and nothing else: no CI, so nothing runs lint,
  //   the test suite or an audit automatically.
  //
  // notClaimed.penetrationTesting
  //   None has been commissioned.
  //
  // notClaimed.certification
  //   No SOC 2, no ISO 27001, no assessment against either.
};

// The route this page lives at. Kept beside the other legal routes' contract
// in versions.js rather than inside it: /terms and /privacy are the two
// documents a consent record names, and the Security page is not one of them.
export const SECURITY_LINK = "/security";
