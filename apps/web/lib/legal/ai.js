// What WHealthOS actually does with AI, established by reading the code on
// 2026-10-11 rather than by reading the roadmap.
//
// Two features call a model. Both were traced end to end: the request-building
// code, what the payload contains, what comes back, whether anyone looks at it
// before it is used, and where it ends up. The page at /ai-usage renders these
// entries instead of restating them, so the document cannot drift from the
// implementation.
//
// Everything here is verifiable from the repository. The one thing that is NOT
// -- which of Google's two sets of data terms applies to our API key -- is
// recorded as unconfirmed below and is deliberately left as a question on the
// page, because answering it requires looking at a billing account rather than
// at code.

export const AI_AUDIT_DATE = "2026-10-11";

// The route the public page lives at.
export const AI_USAGE_LINK = "/ai-usage";

// lib/ai/gemini.js. The model name is duplicated here on purpose: importing
// that module would construct the Google client, and its API key, inside a
// marketing page's render. tests/ai-usage.test.js reads the real constant out
// of the source and fails if these two ever disagree.
//
// `model` is an audit record and is NOT published. The page names the
// provider and stops there, because a model version is true for as long as
// Google keeps serving it -- this one replaced a predecessor that was retired
// -- and a public page that has to be edited on someone else's deprecation
// schedule will instead quietly go wrong. A test keeps it off the page.
export const AI_PROVIDER = Object.freeze({
  name: "Google",
  service: "Gemini API",
  model: "gemini-3.8-flash",
  sdk: "@google/generative-ai",
  // Verified: a Gemini Developer API key (process.env.GEMINI_API_KEY) through
  // the @google/generative-ai SDK. Not Vertex AI, which is a different service
  // with different terms.
  surface: "developer-api",
});

// Both features, as the code has them. `where` is the authority for each row.
// `where` and `status` are provenance, not copy: they record which code each
// entry was traced from, and a test checks the files still exist. The page
// does not print them.
export const AI_FEATURES = Object.freeze([
  Object.freeze({
    id: "receipt-scanner",
    name: "Receipt scanner",
    where: "actions/transaction.js — scanReceipt",
    status: "Working. You start it.",
    trigger:
      "Only when you choose a photo and press Scan Receipt. It is the one AI feature you control completely: upload nothing and no image ever leaves WHealthOS.",
    sends:
      "The image you picked, and the list of our own expense category names so the model has a fixed set to choose from.",
    excludes:
      "Not your name, your email address, your account identifier, or any other transaction. The request contains the picture and the instruction, and nothing else about you.",
    returns:
      "An amount, a date, a short description, a merchant name, and one suggested category.",
    review:
      "Required. The values are written into the Add Transaction form for you to check, change or discard. Nothing is saved until you press the button yourself.",
    retention:
      "The image is held in memory for the length of the request. WHealthOS has no file storage, so there is nowhere for it to be kept and it is not kept.",
    limits:
      "It misreads things. A creased receipt, a dim photo, a total next to a subtotal, a date in an unfamiliar format — all of them produce a confident wrong answer rather than an error. The amount is checked only for being a positive number, and a date it cannot parse is silently replaced with today.",
  }),
  Object.freeze({
    id: "monthly-summary",
    name: "Commentary in the monthly summary email",
    where: "lib/inngest/functions.js — generateFinancialInsights",
    status: "Working, and on by default.",
    trigger:
      "A scheduled job on the first of each month, for every account that has an email address, had at least one transaction in the month being reported on, and has not switched the commentary off in Settings.",
    sends:
      "That month's total income, total expenses, the net figure, and the total for each spending category.",
    excludes:
      "Not a single individual transaction, description, merchant or account name, and not your name, email address or identifier. Totals only.",
    returns: "Three short written observations about the figures.",
    review:
      "None. They are checked for being three non-empty pieces of text and then go into the email exactly as the model wrote them. Nobody reads them first.",
    retention:
      "Not written to our database. They exist in the job for as long as it runs, and then in the email in your inbox.",
    limits:
      "Commentary on a number can be wrong about what the number means. It sees one month of totals with no idea why any of them look the way they do — a deposit that was a transfer, a one-off expense, a month you were away. Treat it as a remark, not a finding.",
  }),
]);

// What Google says it does with what we send. Taken from the Gemini API
// Additional Terms of Service, which draws the line at whether the project
// behind the API key has active Cloud billing -- not at how much you spend.
//
// This is the single most important unresolved fact in this audit. Which
// column applies to WHealthOS has not been confirmed, because it cannot be
// read out of the repository: it depends on the billing state of the Cloud
// project behind GEMINI_API_KEY. lib/ai/gemini.js contains a comment reasoning
// about "the free tier allows 20 requests a day per model", which suggests the
// unpaid terms, but a code comment is not a billing record and is not treated
// here as one.
export const PROVIDER_TERMS = Object.freeze({
  tierConfirmed: false,
  evidenceForUnpaid:
    "A comment in lib/ai/gemini.js reasons about free-tier daily quota. Suggestive, not conclusive.",
  paid: Object.freeze([
    "Google states it does not use prompts or responses to improve its products.",
    "Prompts and responses are logged for a limited period, to detect abuse of its policies.",
    "Processing is under Google's data processing addendum for products where it acts as a processor.",
  ]),
  unpaid: Object.freeze([
    "Google states that content submitted, and the responses, are used to provide, improve and develop its products.",
    "Human reviewers may read, annotate and process API input and output. Google says it disconnects that data from the account, API key and Cloud project first.",
    "Google's own advice is not to submit sensitive, confidential or personal information to the unpaid services.",
  ]),
  // Also verified in the same terms, and relevant to anyone in Europe:
  // "You may use only Paid Services when making API Clients available to users
  // in the European Economic Area", Switzerland and the UK.
  eeaRequiresPaid: true,
});

// Facts the page is allowed to assert, each one traced.
export const AI_FACTS = Object.freeze({
  // No AI call anywhere else. Verified: generateContent has exactly two
  // callers in the repository.
  featureCount: 2,

  // The model is never given database access and cannot write to it. Verified:
  // both call sites pass a string or an image in and get text back; neither
  // hands the model a query, a tool or a connection.
  modelHasNoDatabaseAccess: true,

  // Totals shown in the app are computed in SQL and in lib/, not by a model.
  // Verified: lib/queries.js and getMonthlyStats do the arithmetic; the model
  // is given the result.
  figuresAreCalculatedNotGenerated: true,

  // Nothing the model returns is saved without a person pressing a button --
  // for receipts. The monthly commentary is the exception and is emailed
  // unreviewed. Both are stated separately on the page; this flag covers the
  // database only.
  nothingWrittenToRecordsWithoutConfirmation: true,

  // No scoring, no creditworthiness assessment, no approving or refusing
  // anything. Verified by absence across the whole repository.
  noAutomatedDecisions: true,

  // The monthly commentary can be switched off, in Settings. Verified:
  // users.monthlyInsights, read by sendMonthlyReport before it calls the
  // model and written by setMonthlyInsights. Off means the report still
  // sends, with the same figures and no commentary.
  //
  // It defaults to on, which is what every account had before the column
  // existed. Whether a feature that sends figures to a third party should
  // default to off instead is a decision for the operator, not a fact about
  // the code, so it is not asserted here either way.
  monthlySummaryCanBeSwitchedOff: true,
  monthlySummaryDefaultsOn: true,

  // There is still no switch for the receipt scanner, and none is needed:
  // it runs only when someone uploads a photo.
  receiptScannerIsOptIn: true,

  // The email prints the commentary under the heading "WHealthOS Insights"
  // with nothing marking it as machine-written. Verified in emails/template.jsx.
  commentaryNotLabelledInEmail: true,

  // Receipt scanning is rate limited per signed-in user, and locked entirely
  // in the demo. Verified: lib/arcjet.js receiptScan, and LockedReceiptScanner
  // in the transaction form.
  scanningRateLimited: true,
});

// NOT claimed on the page, and why.
//
//   trainingExclusion -- "your data is not used to train Google's models".
//     True on the paid terms, false on the unpaid ones, and which applies is
//     unconfirmed. This is exactly the sentence a finance product most wants
//     to write and least deserves to.
//
//   deletion -- "AI inputs are deleted immediately". Nothing establishes it.
//     Google's documentation describes logging for abuse detection, retention
//     windows for specific features, and no general deletion promise for what
//     we use.
//
//   noHumanReview -- "no human can read your receipt". Contradicted outright
//     by the unpaid terms, and not promised by the paid ones either, which
//     allow logging for abuse detection.
//
//   dataResidency -- "AI processing stays in India". No evidence. The terms
//     contemplate processing in any country where Google has facilities.
//
//   deIdentified -- "the figures we send are anonymous". They are aggregate,
//     which is not the same thing. No identifier travels with them, and that
//     is the claim the page makes instead.
//
//   localModel -- the self-hosted model in ai/local-llm and ADR-004 is a
//     decision and a set of empty directories. It is described on the page as
//     an intention, in the future tense, and nothing more.
//
//   accuracyRate -- no measurement of how often extraction is right has been
//     made, so no figure is given.
//
//   dpa -- no data processing agreement with Google has been verified as
//     executed for this project.
