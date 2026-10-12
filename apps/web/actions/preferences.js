"use server";

import { withCurrentTenant } from "@/lib/prisma";
import { runAction } from "@/lib/action-error";
import { enforceRateLimit } from "@/lib/arcjet";
import { requireClerkUserId } from "@/lib/session";
import { revalidatePath } from "next/cache";
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

// The one switch that decides whether this account's monthly totals are sent
// to an external model. Separate from the appearance preferences above: those
// are a normalised JSON blob, this is a column the monthly job reads, and
// conflating them would mean a bad appearance payload could silently turn a
// privacy setting back on.
export async function setMonthlyInsights(enabled) {
  return runAction(async () => {
    const clerkUserId = await requireClerkUserId();
    await enforceRateLimit("write", clerkUserId);

    const monthlyInsights = enabled === true;

    await withCurrentTenant((tx, userId) =>
      tx.user.update({ where: { id: userId }, data: { monthlyInsights } })
    );

    revalidatePath("/settings");
    return { success: true, data: { monthlyInsights } };
  });
}
