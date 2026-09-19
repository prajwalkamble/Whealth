import { auth } from "@clerk/nextjs/server";
import { ActionError } from "./action-error";

// The signed-in Clerk user id, for work that must happen before the tenant
// transaction opens (rate limiting). withCurrentTenant checks again inside.
export async function requireClerkUserId() {
  const { userId } = await auth();
  if (!userId) throw new ActionError("Unauthorized");
  return userId;
}
