"use server";

import { getGoalContributions } from "@/lib/queries";
import { runAction } from "@/lib/action-error";
import { requireClerkUserId } from "@/lib/session";

// A read the browser calls, so it has to be a server action rather than live
// in lib/queries.js alone. Kept in its own module because every export of a
// "use server" file is a public endpoint, and the write actions should not
// have to carry a read alongside them.
export async function getGoalContributionsAction(goalId) {
  return runAction(async () => {
    await requireClerkUserId();
    // getGoalContributions scopes by the current tenant, so a goalId belonging
    // to someone else simply returns nothing.
    const data = await getGoalContributions(goalId);
    return { success: true, data };
  });
}
