import { Webhook } from "svix";
import { webhookSecret } from "@/lib/email/config";
import {
  INBOUND_EVENT,
  parseInboundEvent,
  processInboundEmail,
} from "@/lib/email/inbound";

// The Resend webhook.
//
// One endpoint for every Resend event. It is public -- Resend has no session
// here -- so the signature is the only thing that makes a request trustworthy,
// and it is checked before the body is parsed or anything is written.
//
// Deliveries are retried by Resend until it gets a 2xx, so this answers 2xx
// for anything it has genuinely handled, including a request it has already
// handled and one it understands but will not act on. A non-2xx is reserved
// for "try again" (an error on our side) and for "never send this again"
// (a bad signature).

// pdfkit-free, prisma-using: this needs the Node runtime, not edge.
export const runtime = "nodejs";

// A webhook body larger than this is not a support email, it is an attack or a
// misconfiguration. Checked before verification so a huge body is never hashed.
const MAX_BODY_BYTES = 1_000_000;

export async function POST(request) {
  const secret = webhookSecret();
  if (!secret) {
    // A missing secret must never be treated as "skip verification". 500 so
    // Resend retries once the deployment is configured.
    console.error("Resend webhook rejected: RESEND_WEBHOOK_SECRET is not set.");
    return Response.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // The RAW body, as sent. Parsing and re-serialising changes the bytes and
  // the signature no longer matches.
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) {
    return Response.json({ error: "Payload too large" }, { status: 413 });
  }

  const headers = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
  };

  try {
    // Svix checks the signature AND the timestamp, which is what makes a
    // captured request useless to replay later. In svix v2 verify() returns
    // nothing and signals failure by throwing, so the body is parsed below --
    // only once it has been proven to be the body that was signed.
    new Webhook(secret).verify(body, headers);
  } catch {
    // Deliberately no detail: an attacker probing this endpoint learns only
    // that it was rejected. 401 is final -- Resend should not retry a request
    // that will never verify.
    console.warn("Resend webhook rejected: signature verification failed.");
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    // Verified as genuinely from Resend, but not JSON. Retrying cannot help.
    console.warn("Resend webhook: verified body was not JSON.");
    return Response.json({ ignored: true }, { status: 200 });
  }

  const parsed = parseInboundEvent(event);
  if (!parsed.ok) {
    // Verified, so it really is from Resend, but not something this endpoint
    // can read. 200 because retrying will not improve it.
    console.warn("Resend webhook: unreadable payload", { reason: parsed.reason });
    return Response.json({ ignored: true }, { status: 200 });
  }

  // Delivery, bounce, complaint and the rest are legitimate events this
  // endpoint is simply not acting on yet. Acknowledged, not errored.
  if (parsed.type !== INBOUND_EVENT) {
    return Response.json({ ignored: parsed.type }, { status: 200 });
  }

  // svix-id is the delivery's identifier and is the same across retries of the
  // same event, which is exactly what idempotency needs.
  const eventId = headers["svix-id"];
  if (!eventId) {
    return Response.json({ error: "Missing event id" }, { status: 400 });
  }

  try {
    const result = await processInboundEmail({ eventId, parsed });
    if (result.duplicate) {
      // Already handled. 200 stops the retries.
      return Response.json({ duplicate: true }, { status: 200 });
    }
    return Response.json({ ok: true, forwarded: Boolean(result.forwarded) }, { status: 200 });
  } catch (error) {
    // 500 so Resend retries: the delivery was genuine and this end failed.
    // The message is logged, not returned.
    console.error("Resend webhook: processing failed", {
      errorType: error?.name ?? "exception",
      message: error?.message,
    });
    return Response.json({ error: "Processing failed" }, { status: 500 });
  }
}

// Resend sends POST. Anything else gets a plain refusal rather than a stack
// trace from an unhandled method.
export async function GET() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
