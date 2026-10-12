"use server";

import { provisionUser } from "@/lib/checkUser";
import { ActionError, runAction } from "@/lib/action-error";
import { enforceRateLimit } from "@/lib/arcjet";
import { requireClerkUserId } from "@/lib/session";

// Records that the signed-in person accepted the Terms of Service and the
// Privacy Policy, and creates their WHealthOS account.
//
// Every export of a "use server" module is a public HTTP endpoint, so this is
// written as though it will be called directly, because it can be. The only
// thing the caller is allowed to say is that the box was checked; the identity
// comes from the verified Clerk session, and the versions and the timestamp
// are the server's to decide (see provisionUser).
//
// `accepted !== true` rather than a truthiness check on purpose: a forged
// request carrying { accepted: true, userId: "...", termsVersion: "99.0" }, or
// the string "true", or 1, is not a checked box and is refused. There is
// nowhere for extra fields to go even if they were sent.
export async function acceptLegalTerms(accepted) {
  return runAction(async () => {
    const clerkUserId = await requireClerkUserId();
    await enforceRateLimit("write", clerkUserId);

    if (accepted !== true) {
      throw new ActionError(
        "Please accept the Terms of Service and Privacy Policy to continue."
      );
    }

    await provisionUser();

    // Deliberately nothing about the record comes back. The browser has no use
    // for the row id or the stored versions, and an endpoint that reports what
    // it wrote is an endpoint someone will one day let the browser choose.
    return { success: true };
  });
}
