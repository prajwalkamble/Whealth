// The blog's index.
//
// A static list rather than a CMS or a database. Three articles do not justify
// a content platform, an editor, a build-time content pipeline or another
// service to keep running, and a post in this file is reviewable in a diff
// like the rest of the application.
//
// `status` is the only thing standing between a draft and the public. A draft
// has no date, does not appear on the index, and its route 404s --
// tests/company-pages.test.js asserts all three, because "it is only a draft"
// is a property that has to hold mechanically rather than by remembering.
//
// Rules for anything added here:
//   - Every factual claim in a post is checkable against the repository. No
//     invented incidents, benchmarks, user interviews or release history.
//   - A post that needs the operator's own words or recollection stays a
//     draft until they supply them. Writing a plausible version is the one
//     thing this file exists to prevent.
//   - `date` is the day it was actually published, and nothing else.

export const POSTS = [
  {
    slug: "an-import-that-refuses-to-guess",
    title: "An import that refuses to guess",
    description:
      "How WHealthOS reads a bank CSV: why it reports a row instead of interpreting it, and why the preview is not the thing that decides.",
    excerpt:
      "An import that quietly reinterprets a date or invents a category produces records you believe are yours. You will not question them until a total is wrong months later — so this one refuses rather than guesses, and shows you every row it could not read.",
    date: "2026-10-12",
    status: "published",
    topic: "Engineering",
  },
  {
    slug: "every-server-action-is-a-public-endpoint",
    title: "Every server action is a public endpoint",
    description:
      "A React server action looks like a function call and behaves like an open HTTP route. What that means for a finance application, and the three rules it left behind.",
    excerpt:
      "It reads as an import and a call, which is exactly the problem: the thing on the other side is reachable by anyone with curl. Here is how that shaped where reads live, what every write validates, and why one module exports nothing at all.",
    date: "2026-10-12",
    status: "published",
    topic: "Engineering",
  },
  {
    slug: "why-whealthos-exists",
    title: "Why WHealthOS exists",
    description:
      "The problem this product is being built against, in the words of the person building it.",
    excerpt: "",
    // No date: it has not been published, and a date on an unpublished post is
    // the first thing that turns into a false claim.
    date: null,
    status: "draft",
    topic: "Product",
    // What is missing, kept here rather than in a tracker so it is next to the
    // thing it blocks. The product argument is already on /about; what this
    // article needs and cannot have without the operator is the first-person
    // half -- what they were doing before this, what specifically went wrong
    // with it, and when. Writing that from the repository would be fiction.
    needs:
      "First-person account from the operator: what they used before WHealthOS, what failed about it, and when they started building. Not derivable from the code.",
  },
];

const byNewest = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);

export const publishedPosts = () =>
  POSTS.filter((post) => post.status === "published").sort(byNewest);

export const publishedPost = (slug) =>
  POSTS.find((post) => post.slug === slug && post.status === "published") ??
  null;

// "12 October 2026". Written out rather than localised: the site is served in
// one language and a <time> element carries the machine-readable value.
export const formatPostDate = (date) =>
  date
    ? new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;
