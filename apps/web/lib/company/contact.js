// Facts the Contact page is built from.
//
// Same discipline as lib/legal/policy.js: an address or a channel on this page
// is either established, with a note saying where, or it is not on the page.
// A plausible-looking support address that nobody monitors is worse than no
// address at all -- someone with a real problem writes to it and hears
// nothing.
//
// Deliberately absent: a phone number, a postal address, a response-time
// commitment, a support portal, a live chat, office hours and a status page.
// None of those exists, and none of them can be implied by a page that is
// otherwise accurate.

// The published address.
//
// Verified: it is the contact already published on the Privacy Policy
// (lib/legal/policy.js privacyContact / grievanceOfficer), on the domain
// verified as a sender in Resend. It is the same address the DPDP grievance
// route points at, so it is the one address the project has committed to
// reading.
//
// Whether inbound mail to it is routed into the Resend webhook is a setting in
// the Resend dashboard rather than something this repository can establish --
// app/api/webhooks/resend/route.js handles a delivery when one arrives. The
// page therefore says the address reaches us, which the operator has committed
// to by publishing it in the Privacy Policy, and claims nothing about
// automation on top of it.
export const CONTACT_EMAIL = "hello@whealthos.com";

// Why someone writes.
//
// These are the options the enquiry form offers, and the same list is what the
// page shows beside it, so the two cannot drift. Everything here reaches the
// same inbox: the category tells the reader what the message is about, it does
// not route it somewhere that does not exist.
//
// No billing or subscription category. data/pricing.js advertises paid plans,
// but none of them can be bought -- there is no payment processor anywhere in
// the codebase and no subscription model in the schema -- so a billing queue
// would be a queue for a problem nobody can have yet. When billing exists, add
// it here and the form, the page and the tests pick it up together.
export const CONTACT_TOPICS = [
  {
    id: "support",
    label: "Product support",
    description:
      "Something is not working, or is not behaving the way the product says it should.",
  },
  {
    id: "account",
    label: "Account help",
    description:
      "Signing in, your details, your data, or closing your account.",
  },
  {
    id: "feedback",
    label: "Feedback or a feature idea",
    description:
      "What is missing, what is awkward, and what you expected to find.",
  },
  {
    id: "security",
    label: "Security concern",
    description:
      "Please report anything security-related privately, through this form or by email, rather than anywhere public.",
  },
  {
    id: "other",
    label: "Something else",
    description: "Anything that does not fit the four above.",
  },
];

export const CONTACT_TOPIC_LABELS = Object.fromEntries(
  CONTACT_TOPICS.map((topic) => [topic.id, topic.label])
);

export const DEFAULT_TOPIC = CONTACT_TOPICS[0].id;

// What not to put in a message to us.
//
// Stated on the page rather than assumed. An enquiry form on a finance product
// invites exactly the information it should never carry, and this one is a
// plain email relay: no encryption beyond transport, and nothing in it that
// needs a credential to answer.
export const DO_NOT_SEND = [
  "Your password, a one-time code, or anything else you sign in with",
  "Card numbers, CVVs, PINs or full bank account numbers",
  "Statement screenshots, where the figures identify an account you would rather not share",
];

// The other way to reach us, for someone who already has an account.
//
// components/feedback-widget.jsx, delivered by actions/feedback.js: the same
// inbox as this form, with the sender's identity taken from their verified
// session instead of typed in.
export const IN_APP_CHANNEL = {
  label: "Already signed in?",
  description:
    "The feedback button in the corner of every page sends the same kind of message with your account attached, so there is nothing to describe twice.",
  evidence: "components/feedback-widget.jsx, actions/feedback.js",
};
