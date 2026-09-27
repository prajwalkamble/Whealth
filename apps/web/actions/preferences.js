"use server";

import { withCurrentTenant } from "@/lib/prisma";
import { runAction } from "@/lib/action-error";
import { enforceRateLimit } from "@/lib/arcjet";
import { requireClerkUserId } from "@/lib/session";
import { normalise } from "@/lib/preferences";

// The whole appearance set, saved together. normalise drops anything that is
// not a known setting with a known value, so a crafted payload cannot put
// arbitrary JSON on the row or the page into a state the CSS cannot render.
export async function savePreferences(rawPreferences) {
  return runAction(async () => {
    const clerkUserId = await requireClerkUserId();
    await enforceRateLimit("write", clerkUserId);

    const preferences = normalise(rawPreferences);

    await withCurrentTenant((tx, userId) =>
      tx.user.update({ where: { id: userId }, data: { preferences } })
    );

    // No revalidate: the browser has already applied them, and every page
    // reads them from the attributes on <html>.
    return { success: true, data: preferences };
  });
}
