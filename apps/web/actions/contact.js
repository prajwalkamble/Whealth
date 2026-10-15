"use server";

import { createHash } from "node:crypto";
import { sendEmail } from "@/lib/email/send";
import ContactEmail from "@/emails/contact";
import { runAction } from "@/lib/action-error";
import { checkAnonymousRateLimit } from "@/lib/arcjet";
import { CONTACT_TOPIC_LABELS } from "@/lib/company/contact";
import { contactInputSchema, firstFieldError } from "@/app/lib/schema";

// The public enquiry form on /contact.
//
// This is the only write path in the application an anonymous visitor can
// reach, so it is written as what it is: an endpoint on the public internet
// that causes an email to be sent. Four things guard it, in this order --
//
//   1. The Arcjet middleware's shield and bot detection, which run on every
//      request before this module is entered at all.
//   2. A token bucket keyed on source IP, which fails closed.
//   3. A honeypot field, which a person never sees and a form-filling script
//      fills in.
//   4. Schema validation, which bounds every field, normalises the address and
//      strips anything from the subject that could break out of a header.
//
// -- and two things are deliberately absent. Nothing is stored: an inbox of
// unsolicited text inside a finance product's own database is a liability with
// no use the mailbox does not already serve. And the recipient is fixed. The
// visitor supplies the Reply-To address and nothing else; a form that let a
// caller choose where the mail goes is an open relay with a nice typeface.
//
// Failures come back as a shape the form can render -- a field to mark, a rate
// limit to explain, a send that did not happen -- rather than as one string
// for every case.

const INBOX = process.env.FEEDBACK_EMAIL;

const fail = (code, error, field = null) => ({ success: false, code, error, field });

// Accidental duplicates.
//
// The form disables its button while a request is in flight, which covers the
// double click. This covers the rest: a retry after a timeout, a resubmitted
// page, two tabs. The same message from the same address inside the window is
// answered as though it had been sent, because from the sender's point of view
// it was -- and the operator does not get it twice.
//
// In memory, so it holds per server instance and does not survive a restart.
// That is the right trade here: the cost of a missed duplicate is one extra
// email, and the alternative is a database table of other people's messages.
const RECENT = new Map();
const DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

const fingerprint = ({ email, subject, message }) =>
  createHash("sha256").update(`${email}\n${subject}\n${message}`).digest("hex");

const seenRecently = (key) => {
  const now = Date.now();
  for (const [seen, at] of RECENT) {
    if (now - at > DUPLICATE_WINDOW_MS) RECENT.delete(seen);
  }
  return RECENT.has(key);
};

export async function submitContactEnquiry(rawData) {
  return runAction(async () => {
    // Before validation: a flood does not get to spend CPU on parsing, and a
    // scripted submitter learns nothing from the shape of the response.
    const limit = await checkAnonymousRateLimit("contact");
    if (!limit.allowed) {
      if (!limit.limited) {
        return fail(
          "unavailable",
          "We can't accept messages right now. Please email us instead."
        );
      }
      // A time to come back at, only when Arcjet gave one.
      const minutes = limit.retryAfterSeconds
        ? Math.max(1, Math.ceil(limit.retryAfterSeconds / 60))
        : null;
      return fail(
        "rate-limited",
        minutes
          ? `That is a few too many messages in a short time. Please try again in about ${minutes} minute${minutes === 1 ? "" : "s"}, or email us instead.`
          : "That is a few too many messages in a short time. Please try again later, or email us instead."
      );
    }

    const parsed = contactInputSchema.safeParse(rawData);
    if (!parsed.success) {
      const { field, message } = firstFieldError(parsed.error);
      return fail("validation", message, field);
    }

    const { topic, name, email, subject, message, website } = parsed.data;

    // The honeypot. Answered with the same wording a delivery failure gives,
    // and logged without the payload, so a bot cannot tell which field gave it
    // away.
    if (website) {
      console.error({ code: "CONTACT_HONEYPOT", details: { topic } });
      return fail(
        "delivery",
        "Couldn't send that just now. Please try again in a moment."
      );
    }

    if (!INBOX) {
      // The alternative is telling someone their message was received when it
      // went nowhere. On a page whose whole purpose is to be reachable, that
      // is the worst failure available.
      console.error(
        "FEEDBACK_EMAIL is not set, so a contact enquiry has nowhere to go. " +
          "Set it to the address that should receive enquiries."
      );
      return fail(
        "unavailable",
        "The form isn't available right now. Please email us instead."
      );
    }

    const key = fingerprint({ email, subject, message });
    if (seenRecently(key)) {
      // Treated as sent, because it was. Returning an error here would invite
      // the sender to try a third time.
      return { success: true, code: "duplicate", data: { topic } };
    }

    const label = CONTACT_TOPIC_LABELS[topic] ?? "Enquiry";

    const result = await sendEmail({
      type: "contact",
      to: INBOX,
      // Both halves are bounded and stripped of control characters by the
      // schema, so nothing here can start a second header.
      subject: `[WHealthOS] ${label}: ${subject}`,
      // react-email escapes the values it renders, and nothing in this path
      // builds HTML by concatenation, so the message is delivered as text
      // rather than as markup.
      react: ContactEmail({ topic: label, subject, message, name, email }),
      // Replying should reach whoever wrote in. The address is unverified --
      // there is no session here and no confirmation step -- and the email
      // body says so, so a reply is a considered act rather than an assumption
      // about who sent it.
      replyTo: email,
    });

    if (!result.success) {
      // sendEmail reports failure in its return value rather than throwing,
      // and the reason never carries the body or the key. A swallowed failure
      // here is a person who believes they have been in touch and has not.
      console.error({ code: "CONTACT_SEND_FAILED", details: { reason: result.reason } });
      return fail(
        "delivery",
        "Couldn't send that just now. Please try again in a moment, or email us directly."
      );
    }

    RECENT.set(key, Date.now());

    // No delivery claim: Resend accepting a message for delivery is not proof
    // it arrived, and the page's wording matches that.
    return { success: true, data: { topic } };
  });
}
