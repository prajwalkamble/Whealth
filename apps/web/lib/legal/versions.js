// The published versions of the legal documents, and where they live.
//
// One authoritative place. A version string is written into a user's consent
// record as the answer to "what did this person actually agree to", so it must
// never be computed -- not from the current date, not from a file mtime, not
// from a build id. Two users accepting the same document must store the same
// string, forever, and a record written last year must still name the document
// as it read last year.
//
// Each value is therefore a literal, dated the day that version of the
// document was published. Bump it only when the document changes materially,
// and leave the old string alone: records naming it are the evidence that
// those users accepted that text.
//
// Both documents were published on 2026-10-08, so both start at that date.
// TERMS moved to 2026-10-11 when the Terms were rebuilt against a fresh audit:
// recorded acceptance, the account-closure gap and what the monthly summary
// sends to Google all changed materially, and a consent record is only worth
// anything if the string in it still names the text that was accepted.
// PRIVACY moved the same day: its deletion section said there was no way to
// delete an account from inside the app, which read as reassurance while
// Clerk's profile screen could in fact delete the sign-in and strand the data.
// Later the same day, section 10 of the Terms was corrected: it said there was
// no setting that turned the monthly AI commentary off, and by then there was
// one. The string was left at 2026-10-11 rather than suffixed, because the
// correction only names a control that did not exist when the sentence was
// written and takes nothing away from anyone. Whether that deserved its own
// version is a judgement for the operator; if it does, bump TERMS and leave
// the old string in place for the records that name it.
export const LEGAL_VERSIONS = Object.freeze({
  TERMS: "2026-10-11",
  PRIVACY: "2026-10-11",
});

// The canonical routes, so the consent checkbox, the footer and the tests all
// point at the same two pages and a move cannot leave one of them behind.
// tests/legal-consent.test.js asserts a page actually exists at each.
export const LEGAL_LINKS = Object.freeze({
  terms: "/terms",
  privacy: "/privacy",
});
