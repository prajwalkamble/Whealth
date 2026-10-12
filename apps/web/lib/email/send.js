import { Resend } from "resend";
import {
  apiKey,
  domainOf,
  inProduction,
  replyToAddress,
  sender,
  senderConfigured,
} from "./config";

// The one place WHealthOS sends mail.
//
// Everything that emails -- the feedback widget, the budget alert, the monthly
// report -- goes through here, so the sender, the API key, the error handling
// and the logging are decided once. There is deliberately no second Resend
// client anywhere in the application.
//
// This is a plain module, not a "use server" one: every export of a server
// action module is a public HTTP endpoint, and an endpoint that sends mail to
// an arbitrary address is a spam relay. Callers are server actions and Inngest
// functions, which do their own authentication.

// Built once per process rather than per send. The key is read at call time so
// a missing one is reported as a configuration failure instead of constructing
// a client that cannot work.
let client = null;
const resend = () => {
  const key = apiKey();
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
};

const MISSING_KEY =
  "RESEND_API_KEY is not set, so no mail can be sent.";

const MISSING_SENDER =
  "RESEND_FROM_EMAIL is not set. Set it to a sender on a domain verified in " +
  "Resend, e.g. \"WHealthOS <hello@whealthos.com>\".";

// A failure that names itself, so a caller can tell a misconfiguration (retrying
// will never help) from a delivery error (retrying might).
const failure = (reason, error) => ({ success: false, reason, error });

// Safe diagnostics. Never the API key, never the recipient's full address,
// never the message body -- a budget alert body contains the user's spending.
const logFailure = (context, detail) => {
  console.error("Email send failed", {
    type: context.type ?? "unknown",
    recipientDomain: domainOf(context.to),
    ...detail,
  });
};

export async function sendEmail({
  to,
  subject,
  react,
  // A plain-text or HTML body, for mail that has no React template. Resend
  // rejects a send carrying none of the three, so at least one is required
  // here rather than discovered at the API.
  text,
  html,
  replyTo,
  type = "unknown",
}) {
  if (!to) return failure("no-recipient");
  if (!react && !text && !html) return failure("no-body");

  // Refused rather than attempted: the callers treat a failure as something to
  // retry, and a misconfigured sender never becomes deliverable by trying
  // again. Only in production -- locally the fallback is a real address on the
  // verified domain, so a developer can send to themselves.
  if (!senderConfigured() && inProduction()) {
    logFailure({ type, to }, { errorType: "configuration", detail: "sender" });
    return failure("sender-not-configured", new Error(MISSING_SENDER));
  }

  const resendClient = resend();
  if (!resendClient) {
    logFailure({ type, to }, { errorType: "configuration", detail: "api-key" });
    return failure("api-key-missing", new Error(MISSING_KEY));
  }

  // Reply-To is added only when configured, and only from the environment: a
  // caller-supplied one would let a crafted payload decide where replies to a
  // WHealthOS email go. The feedback flow passes its own, which is the address
  // of the authenticated user resolved server-side.
  const configuredReplyTo = replyTo ?? replyToAddress();

  try {
    // Resend v4 reports API failures in the response body rather than by
    // throwing, so a rejected send comes back as a value. Treating that as
    // success is how the budget-alert and monthly-report jobs used to lose
    // mail silently.
    const { data, error } = await resendClient.emails.send({
      from: sender(),
      to,
      subject,
      ...(react ? { react } : {}),
      ...(text ? { text } : {}),
      ...(html ? { html } : {}),
      ...(configuredReplyTo ? { replyTo: configuredReplyTo } : {}),
    });

    if (error) {
      logFailure({ type, to }, {
        errorType: error.name ?? "resend_error",
        // Resend's message names the field or the domain at fault; it carries
        // no credential.
        message: error.message,
      });
      return failure("rejected", error);
    }

    // An id means Resend accepted it for delivery. It is NOT proof the message
    // arrived: delivery, bounce and complaint are separate webhook events.
    return { success: true, data, id: data?.id ?? null };
  } catch (error) {
    logFailure({ type, to }, { errorType: error?.name ?? "exception", message: error?.message });
    return failure("exception", error);
  }
}
