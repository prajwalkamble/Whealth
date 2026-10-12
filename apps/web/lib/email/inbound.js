import { adminDb } from "@/lib/prisma";
import { sendEmail } from "./send";
import { inbox } from "./config";
import InboundForwardEmail from "@/emails/inbound-forward";

// Inbound email: validating a webhook payload and doing something safe with it.
//
// Everything here treats the payload as hostile. It arrives from the public
// internet, its From header is trivially forged, and its body is written by
// whoever sent the mail. Nothing in it decides who the message belongs to,
// nothing in it is executed, and nothing in it is stored unbounded.

// Storage limits. A mail server will happily deliver megabytes; a support
// inbox needs the first part of a message, not all of it.
const MAX_SUBJECT = 500;
const MAX_TEXT = 64_000;
const MAX_ADDRESS = 320; // RFC 5321 maximum

const clip = (value, limit) => {
  if (value === null || value === undefined) return null;
  const text = String(value);
  return text.length > limit ? `${text.slice(0, limit)}\n[truncated]` : text;
};

// An address out of a field that may be a string, an object, or a list of
// either. Only the address itself is kept.
const addressOf = (value) => {
  if (!value) return null;
  const first = Array.isArray(value) ? value[0] : value;
  if (!first) return null;
  const text =
    typeof first === "string" ? first : first.address ?? first.email ?? first.value ?? "";
  return clip(String(text).trim(), MAX_ADDRESS);
};

// Normalises the webhook body into the few fields that are stored.
//
// The exact shape of Resend's email.received payload is read tolerantly on
// purpose: several spellings are accepted for each field, and anything not
// recognised is left null rather than guessed at. A delivery whose shape is
// not understood is still recorded, with the keys it carried logged so the
// shape can be confirmed from a real message instead of from an assumption.
export function parseInboundEvent(event) {
  if (!event || typeof event !== "object") {
    return { ok: false, reason: "payload is not an object" };
  }

  const type = typeof event.type === "string" ? event.type : null;
  if (!type) return { ok: false, reason: "no event type" };

  const data = event.data && typeof event.data === "object" ? event.data : {};
  const headers = data.headers && typeof data.headers === "object" ? data.headers : {};

  const from = addressOf(data.from ?? data.sender ?? data.from_address);
  const to = addressOf(data.to ?? data.recipient ?? data.to_address);

  // Attachments are counted, never fetched. Downloading whatever a stranger
  // attached, from a URL in the same payload, is a request this server should
  // not make on anyone's say-so.
  const attachments = Array.isArray(data.attachments) ? data.attachments.length : 0;

  return {
    ok: true,
    type,
    data: {
      messageId: clip(
        data.message_id ?? data.messageId ?? headers["message-id"] ?? headers["Message-ID"],
        MAX_ADDRESS
      ),
      fromAddress: from,
      toAddress: to,
      subject: clip(data.subject, MAX_SUBJECT),
      // The plain-text part only. The HTML part is read but deliberately
      // discarded: storing a stranger's HTML creates something that could be
      // rendered into a page later, and there is no use for it today.
      text: clip(data.text ?? data.plain ?? data.body_plain, MAX_TEXT),
      attachments,
      receivedAt: toDate(event.created_at ?? data.created_at ?? data.received_at),
    },
    // Key names only, never values, so an unfamiliar shape can be recognised
    // from the log without the message contents being written to it.
    shape: Object.keys(data).sort(),
  };
}

const toDate = (value) => {
  if (!value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

export const INBOUND_EVENT = "email.received";

// Records the email and forwards a summary to the configured inbox.
//
// Idempotency comes from the unique eventId, not from a prior read: two
// retries arriving at once would both pass a "have I seen this?" check, and
// both forward. The database decides instead, and the loser is told it lost.
export async function processInboundEmail({ eventId, parsed }) {
  let created;
  try {
    created = await adminDb.inboundEmail.create({
      data: { eventId, ...parsed.data, status: "RECEIVED" },
    });
  } catch (error) {
    // P2002: this delivery has already been recorded, so it has already been
    // handled. Reporting success is correct -- Resend should stop retrying.
    if (error?.code === "P2002") return { duplicate: true };
    throw error;
  }

  const destination = inbox();
  if (!destination) {
    // Recorded but not forwarded, and it says so rather than claiming success.
    await adminDb.inboundEmail.update({
      where: { id: created.id },
      data: { status: "FAILED", error: "FEEDBACK_EMAIL is not set" },
    });
    return { stored: created.id, forwarded: false, reason: "no-inbox" };
  }

  const result = await sendEmail({
    type: "inbound-forward",
    to: destination,
    subject: `[WHealthOS inbound] ${parsed.data.subject ?? "(no subject)"}`,
    react: InboundForwardEmail({
      from: parsed.data.fromAddress,
      to: parsed.data.toAddress,
      subject: parsed.data.subject,
      text: parsed.data.text,
      attachments: parsed.data.attachments,
      receivedAt: parsed.data.receivedAt,
    }),
    // Replying to the forward reaches the person who wrote in. The address is
    // unverified -- anyone can claim any From -- so this is a convenience, not
    // an identity, and nothing is authorised on the strength of it.
    ...(parsed.data.fromAddress ? { replyTo: parsed.data.fromAddress } : {}),
  });

  await adminDb.inboundEmail.update({
    where: { id: created.id },
    data: result.success
      ? { status: "FORWARDED", forwardedAt: new Date() }
      : { status: "FAILED", error: String(result.reason ?? "send failed").slice(0, 300) },
  });

  return { stored: created.id, forwarded: result.success };
}
