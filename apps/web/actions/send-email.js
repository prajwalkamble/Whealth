import { Resend } from "resend";

// Resend's shared test sender only delivers to the address that owns the
// Resend account; every other recipient is rejected. Real users need a sender
// on a domain verified in Resend, set as RESEND_FROM_EMAIL, e.g.
// "Whealth <reports@yourdomain.com>".
const TEST_SENDER = "WHealthOS <hello@whealthos.com>";
const FROM = process.env.RESEND_FROM_EMAIL || TEST_SENDER;

const usingTestSender = FROM === TEST_SENDER;
const inProduction = process.env.NODE_ENV === "production";

// Warned about at import time as well as per send, so the problem is visible
// in the boot log and not only once a month when a report goes out.
if (usingTestSender && inProduction) {
  console.warn(
    "RESEND_FROM_EMAIL is not set: no mail can be delivered. Set it to a " +
      "sender on a domain verified in Resend."
  );
}

const MISSING_SENDER =
  "RESEND_FROM_EMAIL is not set, so this mail would be rejected for every " +
  "recipient except the Resend account owner. Set it to a sender on a " +
  "domain verified in Resend.";

export async function sendEmail({ to, subject, react }) {
  // Refusing here rather than letting Resend reject it: the callers treat a
  // failure as something to retry, and a misconfigured sender never becomes
  // deliverable by trying again. Failing with the reason puts it in the
  // Inngest run instead of leaving a silent gap where a report should be.
  if (usingTestSender && inProduction) {
    console.error(MISSING_SENDER);
    return { success: false, error: new Error(MISSING_SENDER) };
  }

  const resend = new Resend(process.env.RESEND_API_KEY || "");

  try {
    // Resend v4 reports API failures in the response body rather than by
    // throwing, so a rejected send used to come back as {success:true} and the
    // budget-alert and monthly-report jobs never knew the mail was dropped.
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      react,
    });

    if (error) {
      console.error("Failed to send email: ", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Failed to send email: ", error);
    return { success: false, error };
  }
}
