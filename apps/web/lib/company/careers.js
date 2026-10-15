// Facts the Careers page is built from.
//
// There is nothing to hire for, and the page says so in the first sentence.
//
// What a careers page is tempted into, and what is deliberately not here: a
// list of roles "we are always looking for", salary bands, equity, benefits, a
// hiring process, interview stages, a timeline, employee profiles, a culture
// deck, or an application form that collects a CV nobody is reading. Every one
// of those would be invented. An application form is the worst of them: it
// takes someone's name, history and contact details into a flow with no
// recipient.

// Verified: no job openings exist. There is no careers or hiring material
// anywhere in the repository, no applicant tracking integration, and the
// project is operated by one person.
//
// When a real role exists, add it here with its actual title,
// responsibilities, requirements, location or work arrangement and how to
// apply, and the page renders it instead of the no-openings state.
// tests/company-pages.test.js checks that an opening carries all of those
// fields, so a half-written entry fails rather than publishing a vague advert.
export const OPENINGS = [];

export const HIRING_STATUS = {
  // Kept so the page can say when this was last true, rather than leaving a
  // reader to wonder whether the page was abandoned.
  asOf: "12 October 2026",
  // Verified from lib/legal/policy.js: WHealthOS is not an incorporated
  // company and is operated by one person. No individual is named, at the
  // operator's instruction.
  summary:
    "WHealthOS is pre-launch and is built by one person. There are no open roles, no hiring budget and no recruitment process to describe.",
};

// What someone would actually be working on, if that changes. Verified from
// README.md's stack section and the codebase itself -- not a wish list.
export const WHAT_THIS_IS = [
  {
    title: "The product",
    body: "A personal finance application: accounts, transactions, budgets, goals, cards, imports, exports and a monthly report. One Next.js app, one Postgres database, one person's worth of scope.",
  },
  {
    title: "The stack",
    body: "Next.js 15 on the App Router, React 19, Tailwind with shadcn-style components, Postgres with Prisma and row-level security, Clerk, Inngest, Resend, Arcjet and Vitest.",
  },
  {
    title: "How changes get made",
    body: "Lint, the test suites and a production build before anything lands. Server actions are treated as public endpoints and validated as such. Money is a decimal, never a float. Migrations are never deleted.",
  },
];
