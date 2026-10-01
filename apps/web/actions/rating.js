"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { withCurrentTenant } from "@/lib/prisma";
import { LANDING_STATS_TAG } from "@/lib/stats";
import { ratingInputSchema, parseOrThrow } from "@/app/lib/schema";
import { ActionError, runAction } from "@/lib/action-error";
import { enforceRateLimit } from "@/lib/arcjet";
import { requireClerkUserId } from "@/lib/session";

// Reading the rating moved to lib/queries.js (getMyRating), which is not a
// "use server" module: only the write below is something the browser calls.

export async function submitRating(rawScore) {
  return runAction(async () => {
    const clerkUserId = await requireClerkUserId();
    await enforceRateLimit("write", clerkUserId);

    const score = parseOrThrow(ratingInputSchema, rawScore);

    const rating = await withCurrentTenant(async (tx, userId) => {
      // The average is public, so only people who have actually used the app
      // get a say. A transaction cannot exist without an account, so having
      // an account covers both ways of "using" it.
      const accounts = await tx.account.count({ where: { userId } });
      if (accounts === 0) {
        throw new ActionError("Create an account before rating WHealthOS");
      }

      // One rating per user; rating again replaces it.
      return tx.rating.upsert({
        where: { userId },
        update: { score },
        create: { userId, score },
        select: { score: true },
      });
    });

    revalidateTag(LANDING_STATS_TAG);
    revalidatePath("/dashboard");
    return { success: true, data: rating };
  });
}
