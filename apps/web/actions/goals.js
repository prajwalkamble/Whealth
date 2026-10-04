"use server";

import { revalidatePath } from "next/cache";
import { withCurrentTenant } from "@/lib/prisma";
import {
  goalContributionSchema,
  goalInputSchema,
  GOAL_STATUSES,
  parseOrThrow,
} from "@/app/lib/schema";
import { ActionError, runAction } from "@/lib/action-error";
import { enforceRateLimit } from "@/lib/arcjet";
import { requireClerkUserId } from "@/lib/session";

// Reading goals lives in lib/queries.js (getGoals, getGoalContributions),
// which is a plain module. Only the writes below are something the browser
// calls, and every export here is an async function because each one is a
// public endpoint.

// Every write is scoped by userId as well as id. RLS would already refuse a
// row belonging to someone else, but a count of zero turns that into a message
// the UI can show rather than a database error.
async function assertOwnedGoal(tx, userId, goalId) {
  const owned = await tx.goal.findFirst({
    where: { id: goalId, userId },
    select: { id: true },
  });
  if (!owned) throw new ActionError("That goal could not be found");
}

export async function createGoal(raw) {
  return runAction(async () => {
    const clerkUserId = await requireClerkUserId();
    await enforceRateLimit("write", clerkUserId);

    const input = parseOrThrow(goalInputSchema, raw);

    const goal = await withCurrentTenant((tx, userId) =>
      tx.goal.create({ data: { ...input, userId } })
    );

    revalidatePath("/goals");
    return { success: true, data: { id: goal.id } };
  });
}

export async function updateGoal(id, raw) {
  return runAction(async () => {
    const clerkUserId = await requireClerkUserId();
    await enforceRateLimit("write", clerkUserId);

    const input = parseOrThrow(goalInputSchema, raw);

    await withCurrentTenant(async (tx, userId) => {
      const { count } = await tx.goal.updateMany({
        where: { id, userId },
        data: input,
      });
      if (count === 0) throw new ActionError("That goal could not be found");
    });

    revalidatePath("/goals");
    return { success: true, data: { id } };
  });
}

export async function setGoalStatus(id, status) {
  return runAction(async () => {
    const clerkUserId = await requireClerkUserId();
    await enforceRateLimit("write", clerkUserId);

    if (!GOAL_STATUSES.includes(status)) {
      throw new ActionError("Unknown goal status");
    }

    await withCurrentTenant(async (tx, userId) => {
      const { count } = await tx.goal.updateMany({
        where: { id, userId },
        data: { status },
      });
      if (count === 0) throw new ActionError("That goal could not be found");
    });

    revalidatePath("/goals");
    return { success: true, data: { id, status } };
  });
}

export async function deleteGoal(id) {
  return runAction(async () => {
    const clerkUserId = await requireClerkUserId();
    await enforceRateLimit("write", clerkUserId);

    await withCurrentTenant(async (tx, userId) => {
      // Contributions go with it: the schema cascades on goalId, so there is
      // no orphaned money left behind.
      const { count } = await tx.goal.deleteMany({ where: { id, userId } });
      if (count === 0) throw new ActionError("That goal could not be found");
    });

    revalidatePath("/goals");
    return { success: true, data: { id } };
  });
}

export async function addContribution(goalId, raw) {
  return runAction(async () => {
    const clerkUserId = await requireClerkUserId();
    await enforceRateLimit("write", clerkUserId);

    const input = parseOrThrow(goalContributionSchema, raw);

    const contribution = await withCurrentTenant(async (tx, userId) => {
      await assertOwnedGoal(tx, userId, goalId);
      // userId is stored on the row as well so the RLS predicate is a column
      // check rather than a join back through the goal.
      return tx.goalContribution.create({ data: { ...input, goalId, userId } });
    });

    revalidatePath("/goals");
    return { success: true, data: { id: contribution.id } };
  });
}

// Corrections happen: a contribution entered twice, or for the wrong amount.
export async function deleteContribution(id) {
  return runAction(async () => {
    const clerkUserId = await requireClerkUserId();
    await enforceRateLimit("write", clerkUserId);

    await withCurrentTenant(async (tx, userId) => {
      const { count } = await tx.goalContribution.deleteMany({
        where: { id, userId },
      });
      if (count === 0) throw new ActionError("That contribution could not be found");
    });

    revalidatePath("/goals");
    return { success: true, data: { id } };
  });
}
