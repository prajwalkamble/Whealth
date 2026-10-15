// The Company section's routes, in one place.
//
// Same reason as LEGAL_LINKS in lib/legal/versions.js: the navigation, the
// pages themselves and the tests that check for dead links all read from here,
// so a route cannot be renamed in one place and left stale in another.
//
// Every entry has a page under app/(marketing); tests/company-pages.test.js
// asserts that, so adding a key here without the page fails rather than
// shipping a link to nothing. Which of them appear in navigation, and where,
// is the two lists below.
export const COMPANY_LINKS = {
  about: "/about",
  contact: "/contact",
  careers: "/careers",
  openSource: "/open-source",
  blog: "/blog",
};

// Where these routes appear in the site chrome. Neither list is the whole
// set: a page existing is not a reason to advertise it.

// About and Contact: the two company pages a visitor goes looking for. They
// head the footer's Company group and appear nowhere else -- the top bar
// carries what someone is choosing between, and these two are read once.
// About before Contact -- the question is usually what this is before it is
// how to reach whoever built it.
export const COMPANY_NAV = [
  { label: "About", href: COMPANY_LINKS.about },
  { label: "Contact", href: COMPANY_LINKS.contact },
];

// What WHealthOS publishes, in the footer's Company group under About and
// Contact. Blog is the only one that exists: the documentation, help centre,
// getting-started guide and changelog that would sit beside it have no pages,
// and a label with nothing behind it is a claim the product cannot keep.
export const COMPANY_CONTENT_LINKS = [
  { label: "Blog", href: COMPANY_LINKS.blog },
];

// Careers and Open Source are deliberately in neither list, both by
// instruction. The pages still exist and still say what they say -- Careers
// that there is no role open, Open Source that the repository is public --
// but the footer presents WHealthOS as the commercial product it is, and
// there is no hiring to advertise. Add an entry above when that changes.
