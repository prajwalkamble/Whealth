// Email configuration, resolved from the environment in one place.
//
// Every value here is server-side only. None of these names begin with
// NEXT_PUBLIC_, so Next will not inline them into a client bundle, and nothing
// in this directory is imported from a client component.

// Sender used when RESEND_FROM_EMAIL is not set.
//
// This is a fallback for local development, not a configuration. It is a real
// address on the project's own verified domain rather than Resend's shared
// onboarding sender, so a developer running the app locally can send to
// themselves without configuring anything.
const FALLBACK_SENDER = "WHealthOS <hello@whealthos.com>";

// Whether the deployment has been told who it sends as.
//
// Keyed on the variable being SET, not on the value it holds. The previous
// version compared the resolved sender against the fallback string, so setting
// RESEND_FROM_EMAIL to that exact address -- the most natural value for this
// project, since it is the fallback -- silently disabled sending in
// production.
export const senderConfigured = () => Boolean(process.env.RESEND_FROM_EMAIL);

export const sender = () => process.env.RESEND_FROM_EMAIL || FALLBACK_SENDER;

// Where replies to an automated email should go. Optional: when it is not set
// no Reply-To header is added, and replies go to the From address.
export const replyToAddress = () => process.env.RESEND_REPLY_TO_EMAIL || null;

// Where in-app feedback is delivered, and where a verified inbound email is
// forwarded. One address, because they are the same inbox in practice.
export const inbox = () => process.env.FEEDBACK_EMAIL || null;

export const apiKey = () => process.env.RESEND_API_KEY || null;

export const webhookSecret = () => process.env.RESEND_WEBHOOK_SECRET || null;

export const inProduction = () => process.env.NODE_ENV === "production";

// The domain of an address, for logging. A log line that records who was
// emailed is a log line holding personal data; the domain is enough to tell a
// delivery problem with one provider from a broken configuration.
export const domainOf = (address) => {
  const match = /@([^>\s]+)>?\s*$/.exec(String(address ?? ""));
  return match ? match[1].toLowerCase() : "unknown";
};
