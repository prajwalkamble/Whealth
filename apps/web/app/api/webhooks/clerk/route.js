import { Webhook } from "svix";
import { adminDb } from "@/lib/prisma";

// The Clerk webhook.
//
// It exists for one event. Clerk's own profile screen, which WHealthOS embeds
// in the avatar menu, can delete a person's Clerk account. Until this endpoint
// existed, nothing connected that to our database: the sign-in disappeared and
// every transaction, account, budget, goal and card stayed behind, belonging
// to someone who could no longer reach them and had every reason to believe
// they were gone. The Privacy Policy had to say so.
//
// What it does is therefore deliberately narrow and deliberately final. On
// user.deleted it deletes that person's row, and every record hanging off it
// goes with it through the foreign keys. There is no soft delete and nothing
// is kept: a deletion that leaves the data in place is the problem this fixes.
//
// Every other Clerk event is acknowledged and ignored. Adding a case here
// means thinking about what it writes; defaulting to "handle everything" is
// how a webhook quietly becomes a second, unauthenticated write path into the
// database.
//
// Excluded from the Arcjet middleware by the matcher in middleware.js, like
// the Resend endpoint: detectBot runs LIVE on API routes and does not allow
// Clerk, which would block every delivery. The signature below is what makes
// a request trustworthy instead.

// Prisma, so Node rather than edge.
export const runtime = "nodejs";

// Anything larger is not a Clerk event. Checked before verification so an
// oversized body is never hashed.
const MAX_BODY_BYTES = 1_000_000;

const DELETED = "user.deleted";

export async function POST(request) {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    // Never treat a missing secret as "skip verification". 500 so Clerk
    // retries once the deployment is configured, rather than dropping a
    // deletion on the floor.
    console.error(
      "Clerk webhook rejected: CLERK_WEBHOOK_SIGNING_SECRET is not set."
    );
    return Response.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // The raw body as sent. Re-serialising JSON changes the bytes and the
  // signature stops matching.
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
    // Svix checks the signature and the timestamp, which is what stops a
    // captured delivery being replayed later. verify() returns nothing and
    // signals failure by throwing, so the body is parsed only after it has
    // been proven to be the body that was signed. This matters more here
    // than anywhere else in the app: a forged request to this endpoint
    // deletes someone's financial history.
    new Webhook(secret).verify(body, headers);
  } catch {
    console.warn("Clerk webhook rejected: signature verification failed.");
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    console.warn("Clerk webhook: verified body was not JSON.");
    return Response.json({ ignored: true }, { status: 200 });
  }

  if (event?.type !== DELETED) {
    return Response.json({ ignored: event?.type ?? "unknown" }, { status: 200 });
  }

  const clerkUserId = event?.data?.id;
  if (typeof clerkUserId !== "string" || !clerkUserId) {
    console.warn("Clerk webhook: user.deleted carried no user id.");
    return Response.json({ ignored: "no id" }, { status: 200 });
  }

  try {
    // deleteMany, not delete: Clerk retries until it gets a 2xx, and a second
    // delivery for an account already gone must be a no-op rather than a
    // "record not found" that looks like a failure and is retried forever.
    const { count } = await adminDb.user.deleteMany({ where: { clerkUserId } });

    // The id is Clerk's, not an email or a name, and this line is the only
    // record that the deletion happened at all.
    console.info(
      `Clerk webhook: user.deleted for ${clerkUserId} removed ${count} account(s).`
    );
    return Response.json({ deleted: count }, { status: 200 });
  } catch (error) {
    // Our problem, not Clerk's. 500 so it retries: the alternative is a
    // person who asked to be deleted silently not being.
    console.error(
      `Clerk webhook: deleting the account for ${clerkUserId} failed.`,
      error
    );
    return Response.json({ error: "Deletion failed" }, { status: 500 });
  }
}
