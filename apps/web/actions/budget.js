"use server";

import { withCurrentTenant } from "@/lib/prisma";
import { budgetEntrySchema, budgetInputSchema, parseOrThrow } from "@/app/lib/schema";
import { revalidatePath } from "next/cache";
import { ActionError, runAction } from "@/lib/action-error";
import { enforceRateLimit } from "@/lib/arcjet";
import { requireClerkUserId } from "@/lib/session";

// Reading the budget moved to lib/queries.js (getCurrentBudget), which is not
// a "use server" module: only the write below is something the browser calls.

export async function updateBudget(rawAmount) {
  return runAction(async () => {
    const clerkUserId = await requireClerkUserId();
    await enforceRateLimit("write", clerkUserId);

    // Validated server-side: nothing stopped a direct call from storing 0 or a
    // negative budget, which rendered as "Infinity% used" on the dashboard.
    const amount = parseOrThrow(budgetInputSchema, rawAmount);

    // Explicit find-then-write rather than upsert: upsert needs a unique
    // selector, and userId stopped being unique when per-category budgets
    // arrived. The overall budget is the row whose category is null, and the
    // partial unique index in the migration keeps there being only one.
    const budget = await withCurrentTenant(async (tx, userId) => {
      const existing = await tx.budget.findFirst({
        where: { userId, category: null },
        select: { id: true },
      });

      return existing
        ? tx.budget.update({ where: { id: existing.id }, data: { amount } })
        : tx.budget.create({ data: { userId, amount, category: null } });
    });

    revalidatePath("/dashboard");
    return {
      success: true,
      data: { ...budget, amount: budget.amount.toNumber() },
    };
  });
}

// Per-category budgets. The overall monthly budget keeps its own action above,
// because the dashboard and the alert cron both address it specifically.

export async function saveBudgetEntry(raw) {
  return runAction(async () => {
    const clerkUserId = await requireClerkUserId();
    await enforceRateLimit("write", clerkUserId);

    const { amount, category } = parseOrThrow(budgetEntrySchema, raw);

    const budget = await withCurrentTenant(async (tx, userId) => {
      const existing = await tx.budget.findFirst({
        where: { userId, category },
        select: { id: true },
      });

      return existing
        ? tx.budget.update({ where: { id: existing.id }, data: { amount } })
        : tx.budget.create({ data: { userId, amount, category } });
    });

    revalidatePath("/budgets");
    revalidatePath("/dashboard");
    return { success: true, data: { id: budget.id } };
  });
}

export async function deleteBudgetEntry(id) {
  return runAction(async () => {
    const clerkUserId = await requireClerkUserId();
    await enforceRateLimit("write", clerkUserId);

    await withCurrentTenant(async (tx, userId) => {
      // Scoped by userId as well as id: an id alone would be a lookup anyone
      // could guess at, and a zero count means the row was not the caller's.
      const { count } = await tx.budget.deleteMany({ where: { id, userId } });
      if (count === 0) throw new ActionError("That budget could not be found");
    });

    revalidatePath("/budgets");
    revalidatePath("/dashboard");
    return { success: true, data: { id } };
  });
}
