"use server";

import { currentUser } from "@clerk/nextjs/server";
import { sendEmail } from "@/actions/send-email";
import FeedbackEmail from "@/emails/feedback";
import { ActionError, runAction } from "@/lib/action-error";
import { enforceRateLimit } from "@/lib/arcjet";
import { requireClerkUserId } from "@/lib/session";
import { FEEDBACK_TYPES, feedbackInputSchema, parseOrThrow } from "@/app/lib/schema";

// Where feedback is delivered. Kept in the environment rather than the source:
// it is the maintainer's personal address, and it changes per deployment.
const INBOX = process.env.FEEDBACK_EMAIL;

export async function submitFeedback(rawData) {
  return runAction(async () => {
    const clerkUserId = await requireClerkUserId();
    await enforceRateLimit("write", clerkUserId);

    // A server action is a public endpoint, so the payload is validated here
    // rather than trusted from the form.
    const { type, message } = parseOrThrow(feedbackInputSchema, rawData);

    if (!INBOX) {
      // Better than a generic failure: without this the send goes nowhere and
      // the person is told their feedback was received when it was not.
      console.error(
        "FEEDBACK_EMAIL is not set, so feedback has nowhere to go. Set it to " +
          "the address that should receive it."
      );
      throw new ActionError(
        "Feedback isn't set up yet. Please try again later."
      );
    }

    // Identity comes from the verified session, never from the payload, so a
    // crafted body cannot put someone else's name on a report.
    const user = await currentUser();
    const from =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
      user?.username ||
      "A Whealth user";
    const replyTo = user?.primaryEmailAddress?.emailAddress ?? null;

    const label = FEEDBACK_TYPES[type];

    const result = await sendEmail({
      to: INBOX,
      subject: `[Whealth] ${label} from ${from}`,
      react: FeedbackEmail({ label, message, from, replyTo }),
    });

    if (!result.success) {
      // sendEmail reports failure in its return value rather than throwing.
      // Saying so is the point: silently swallowing it would tell someone
      // their report had been sent when it had not.
      throw new ActionError(
        "Couldn't send that just now. Please try again in a moment."
      );
    }

    return { success: true, data: { type } };
  });
}
