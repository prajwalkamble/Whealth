import { Resend } from "resend";

export async function sendEmail({ to, subject, react }) {
  const resend = new Resend(process.env.RESEND_API_KEY || "");

  try {
    // Resend v4 reports API failures in the response body rather than by
    // throwing, so a rejected send used to come back as {success:true} and the
    // budget-alert and monthly-report jobs never knew the mail was dropped.
    const { data, error } = await resend.emails.send({
      from: "Whealth <onboarding@resend.dev>",
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
