"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { withCurrentTenant } from "@/lib/prisma";
import { LANDING_STATS_TAG } from "@/lib/stats";
import { ratingInputSchema, parseOrThrow } from "@/app/lib/schema";

export async function getMyRating() {
  return withCurrentTenant(async (tx, userId) => {
    const rating = await tx.rating.findUnique({
      where: { userId },
      select: { score: true },
    });
    return rating?.score ?? null;
  });
}

export async function submitRating(rawScore) {
  try {
    const score = parseOrThrow(ratingInputSchema, rawScore);

    const rating = await withCurrentTenant(async (tx, userId) => {
      // The average is public, so only people who have actually used the app
      // get a say. A transaction cannot exist without an account, so having
      // an account covers both ways of "using" it.
      const accounts = await tx.account.count({ where: { userId } });
      if (accounts === 0) {
        throw new Error("Create an account before rating Whealth");
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
  } catch (error) {
    throw new Error(error.message);
  }
}
