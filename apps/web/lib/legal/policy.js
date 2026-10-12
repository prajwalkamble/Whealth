// Facts the legal pages are built from.
//
// Everything here is either VERIFIED from the codebase or marked as needing
// confirmation. A privacy notice is a statement of fact about processing: a
// plausible-sounding guess in one of these fields is a false statement to
// users and to a regulator, so anything that could not be established by
// reading the code is a PENDING placeholder rather than a best guess.
//
// Verified facts carry a note saying where they were established, so the next
// person can re-check them rather than trusting this file.

// Every fact below is established. Nothing is left as a placeholder, so the
// page states only things that can be checked -- against the code, against the
// production site's own headers, or against a decision recorded here.

export const POLICY = {
  // Kept as the record of when the substance last changed. Not currently
  // surfaced on the page.
  lastUpdated: "2026-10-06",

  // --- Identity -----------------------------------------------------------
  // WHealthOS is not an incorporated company. It is run by one person, and the
  // policy says so.
  //
  // Naming a "Pvt. Ltd." that has not been registered would be a false
  // statement in the one document whose purpose is accuracy, and would leave a
  // reader with no real person to hold responsible. When WHealthOS is
  // incorporated, replace this with the company name, its CIN and its
  // registered office -- and nothing else on the page needs touching.
  // No individual is named, at the operator's instruction.
  //
  // This is a real trade-off rather than a neutral choice: GDPR Article 13
  // expects a controller a reader can identify, and the DPDP Act expects a
  // Data Fiduciary with a contactable grievance route. Naming the trading name
  // and giving a working email is the most that can be said truthfully today;
  // when WHealthOS is incorporated, put the company name, its CIN and its
  // registered office here and the whole page picks it up.
  entity: { value: "WHealthOS is operated from India" },

  // No postal address is published. An individual running a small service is
  // not obliged to put a home address on the internet, and the contact below
  // is the route for privacy requests. Whether an address is required for the
  // markets WHealthOS is offered in is a question for an adviser.
  privacyContact: { value: "hello@whealthos.com", verified: "verified sender domain in Resend" },

  // India's DPDP Act requires a Data Fiduciary to publish a contact for
  // grievances. With one operator, that is the same person and address.
  grievanceOfficer: { value: "hello@whealthos.com" },

  // --- Verified infrastructure -------------------------------------------
  // DATABASE_URL and DIRECT_URL both resolve to aws-0-ap-south-1.pooler.
  // supabase.com, so application data is held in AWS's Mumbai region.
  databaseRegion: { value: "India (AWS ap-south-1, Mumbai)", verified: "DATABASE_URL host" },

  // Read from the production site's own response headers: `server: Vercel`
  // and `x-vercel-id: bom1::...`, bom1 being Vercel's Mumbai region. With the
  // database in ap-south-1, both halves of the service sit in India.
  appHosting: { value: "Vercel, served from its Mumbai region", verified: "response headers on www.whealthos.com" },
};

// Processors and recipients.
//
// Every entry was confirmed by finding the integration in application code --
// not in package.json, not in documentation. A dependency that is installed
// but never called is not a recipient of anyone's data.
export const PROCESSORS = [
  {
    name: "Clerk",
    purpose: "Account creation, sign-in and session management",
    data: "Name, email address, profile image, authentication credentials and session records",
    evidence: "@clerk/nextjs in app/layout.js, middleware.js and the sign-in/sign-up routes",
  },
  {
    name: "Supabase (PostgreSQL on AWS)",
    purpose: "The database holding your WHealthOS records",
    data: "Everything you enter into WHealthOS: accounts, transactions, budgets, goals, cards and preferences",
    evidence: "DATABASE_URL / DIRECT_URL, Prisma client in lib/prisma.js",
  },
  {
    name: "Resend",
    purpose: "Sending service email, and receiving mail sent to our address",
    data: "Your email address, and the content of the message being sent or received",
    evidence: "lib/email/send.js and app/api/webhooks/resend/route.js",
  },
  {
    name: "Google (Gemini API)",
    purpose: "Reading a receipt photo you upload, and writing the commentary in the monthly summary email",
    data: "The receipt image you submit; separately, your monthly totals by category. See section 7.",
    evidence: "lib/ai/gemini.js, called from actions/transaction.js and lib/inngest/functions.js",
  },
  {
    name: "Arcjet",
    purpose: "Rate limiting, bot detection and request filtering",
    data: "Request metadata, including IP address where available, and your account identifier",
    evidence: "middleware.js and lib/arcjet.js",
  },
  {
    name: "Inngest",
    purpose: "Running scheduled work such as budget alerts and the monthly summary",
    data: "Account identifiers and the job data needed to run the task",
    evidence: "lib/inngest/client.js, lib/inngest/functions.js, app/api/inngest/route.js",
  },
];

// What is held, why, and for how long.
//
// Retention is deliberately described as behaviour rather than as a number of
// days: no retention schedule is implemented in the code, and inventing "90
// days" would be a commitment nothing enforces.
export const DATA_TABLE = [
  {
    category: "Identity and account",
    examples: "Name, email address, profile image, your WHealthOS account identifier",
    source: "You, through Clerk when you sign up",
    purpose: "To create your account, sign you in, and address service email to you",
    basis: "Performance of a contract",
    retention: "For as long as your account exists",
  },
  {
    category: "Financial records you enter",
    examples:
      "Accounts and balances, transactions with their amounts, dates, descriptions and categories, budgets, goals and contributions",
    source: "You — typed in, imported from a file, or drafted from a receipt photo",
    purpose: "To provide the product: to store, categorise, total and display your own records back to you",
    basis: "Performance of a contract",
    retention: "Until you delete the record, or for as long as your account exists",
  },
  {
    category: "Card records",
    examples:
      "A card's name, issuer, network, type, expiry month and year, credit limit, billing and due day, and the last four digits",
    source: "You",
    purpose: "To let you track which card an expense settles from",
    // The single most important line in this table.
    note: "We do not ask for, and have no field to store, a full card number, CVV, PIN or online banking credential.",
    basis: "Performance of a contract",
    retention: "Until you delete the card, or for as long as your account exists",
  },
  {
    category: "Derived figures",
    examples:
      "Monthly totals, savings rate, category breakdowns, budget pace, cash-flow trends and net worth",
    source: "Calculated by WHealthOS from the records you entered",
    purpose: "To show you the summaries and charts the product exists to provide",
    basis: "Performance of a contract",
    retention: "Not stored as such — recalculated from your records when a page loads",
  },
  {
    category: "Preferences",
    examples: "Theme, colour scheme, font, layout and similar display settings",
    source: "You",
    purpose: "To keep the product looking the way you set it, across your devices",
    basis: "Performance of a contract",
    retention: "For as long as your account exists",
  },
  {
    category: "Feedback and messages",
    examples:
      "A rating you submit, a message sent through the feedback widget, and email you send to our address",
    source: "You",
    purpose: "To respond to you and to improve WHealthOS",
    basis: "Legitimate interests — running and improving the service",
    retention: "Kept while it remains useful for support and product work",
  },
  {
    category: "Technical and security",
    examples: "IP address where available, request metadata, and server logs",
    source: "Your browser, automatically, when you use WHealthOS",
    purpose: "To keep the service available: rate limiting, blocking automated abuse, and diagnosing faults",
    basis: "Legitimate interests — securing the service",
    retention: "Short-lived, and determined by our hosting and security providers",
  },
];
