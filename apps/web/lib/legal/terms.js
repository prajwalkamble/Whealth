// Facts the Terms are built from.
//
// Same rule as lib/legal/policy.js: everything here is either VERIFIED from the
// codebase or marked as needing a decision. A contract that describes a product
// which does not exist is worse than no contract -- it promises things nobody
// built and binds users to terms about them.

import { pendingDecision } from "./pending";
import { LEGAL_VERSIONS } from "./versions";

export const TERMS = {
  // Shown on the page and written into every consent record, from the one
  // place either is allowed to come from.
  version: LEGAL_VERSIONS.TERMS,

  // --- Commercial position, verified -------------------------------------
  //
  // data/pricing.js advertises Free (₹0), Pro (₹299/mo) and Intelligent
  // (₹599/mo). None of them can be bought: all three CTAs link to /sign-up,
  // there is no payment processor anywhere in the codebase, no subscription or
  // plan model in the Prisma schema, and no plan gating in application code.
  // The advertised per-day transaction limits are not enforced either -- the
  // only limit is Arcjet's, which is the same for everyone.
  //
  // So the Terms describe one free service and no billing. Writing renewal,
  // refund or cancellation clauses would be describing a product that does not
  // exist.
  paidPlansAvailable: false,
  paymentProcessor: null,

  // --- Acceptance, verified ----------------------------------------------
  //
  // app/(auth)/welcome/ + actions/legal.js. A new account cannot be created
  // without an explicit, unticked-by-default checkbox; the accepted version
  // strings and the timestamp are written by the server, never by the
  // browser. Accounts that predate the flow have no record and were not
  // backfilled one. So the Terms may describe recorded acceptance for new
  // accounts, and must not claim it for older ones.
  acceptanceRecorded: true,

  // --- Account closure, verified -----------------------------------------
  //
  // There is no in-app "delete my account". Separately, the app shell renders
  // Clerk's <UserButton /> (components/user-avatar.jsx) and this Clerk
  // instance has delete_self enabled, so a person can delete their Clerk
  // account from inside WHealthOS. That used to strand the data: no Clerk
  // event reached us, so the sign-in went and the financial records stayed,
  // belonging to someone who could no longer open them. A webhook now closes
  // that, which means the same click is irreversible rather than incomplete,
  // and both documents have to say so.
  // Still no delete button of our own inside WHealthOS -- but deleting the
  // Clerk account now reaches the data. app/api/webhooks/clerk/route.js
  // handles user.deleted and removes the row, and every child record goes
  // with it through the foreign keys. Added 2026-10-11.
  selfServiceDeletion: false,
  clerkDeletionOrphansData: false,
  clerkDeletionRemovesData: true,

  // --- AI, verified ------------------------------------------------------
  //
  // lib/ai/gemini.js, model gemini-3.8-flash. Two callers:
  //   actions/transaction.js   -- the uploaded receipt image, on request.
  //   lib/inngest/functions.js -- generateFinancialInsights sends the month's
  //     income, expenses and per-category totals, on a cron, to every user
  //     who has an email address and has not switched the commentary off.
  //     The switch is users.monthlyInsights, added 2026-10-11 and surfaced in
  //     Settings; it defaults to on, so the default behaviour is unchanged.
  aiProvider: "Google (Gemini)",
  monthlyInsightsAutomatic: true,
  monthlyInsightsCanBeSwitchedOff: true,

  // --- Decisions the operator has taken ----------------------------------
  //
  // Both were open until 2026-10-11, when the operator approved them against a
  // written recommendation. They are recorded here because the reasoning is
  // what makes them defensible later, and because neither is a fact about the
  // code that someone could re-derive by reading it.
  //
  // Governing law: India. The only jurisdiction with a verified connecting
  // factor -- it is where WHealthOS is operated from. Jurisdiction is stated
  // as non-exclusive on purpose. An Indian consumer may file where they live
  // under s.34(2)(d) of the Consumer Protection Act 2019, and consumers in the
  // EU and UK generally keep their home courts, so an exclusive clause would
  // be both unenforceable and a misrepresentation of what we could insist on.
  // No arbitration clause and no class action waiver.
  governingLaw: "India, with non-exclusive jurisdiction",

  // Liability: no monetary cap. WHealthOS is free, so the conventional cap --
  // the fees paid in some preceding period -- evaluates to zero, which is a
  // total exclusion wearing a cap's clothing and is the clause most likely to
  // be struck down as unfair. Non-excludable liability is preserved
  // explicitly. Revisit this if paid plans ever launch: a cap anchored to real
  // fees is a different proposition from one anchored to nothing.
  liabilityPosition: "no monetary cap; non-excludable liability preserved",

  // Still genuinely open. Neither blocks publication of the Terms.
  indemnification: pendingDecision(
    "whether any indemnity is warranted; none is written today"
  ),
};

// What the service actually does today, verified by reading the application.
// Each line is something a user can do right now.
export const FEATURES = [
  "Record accounts, transactions, budgets, goals and cards, and see them totalled and charted",
  "Import transactions from a CSV or XLSX file, and export them as CSV, Excel or PDF",
  "Scan a receipt photo into a draft transaction for you to confirm",
  "Receive a budget alert by email when you set one up, and a monthly summary of your figures",
  "Use the public financial tools without an account",
];
