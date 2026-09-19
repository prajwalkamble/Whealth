import { Resend } from "resend";

// Resend's shared test sender only delivers to the address that owns the
// Resend account; every other recipient is rejected. Real users need a sender
// on a domain verified in Resend, e.g. "WHealthOS <reports@yourdomain.com>".
const TEST_SENDER = "WHealthOS <hello@whealthos.com>";
const FROM = process.env.RESEND_FROM_EMAIL || TEST_SENDER;

if (FROM === TEST_SENDER && process.env.NODE_ENV === "production") {
  console.warn(
    "RESEND_FROM_EMAIL is not set: emails will only reach the Resend account owner."
  );
}

export async function sendEmail({ to, subject, react }) {
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
