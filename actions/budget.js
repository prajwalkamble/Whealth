"use server";

import { withCurrentTenant } from "@/lib/prisma";
import { budgetInputSchema, parseOrThrow } from "@/app/lib/schema";
import { revalidatePath } from "next/cache";
import { runAction } from "@/lib/action-error";
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

    const budget = await withCurrentTenant(async (tx, userId) =>
      tx.budget.upsert({
        where: {
          userId,
        },
        update: {
          amount,
        },
        create: {
          userId,
          amount,
        },
      })
    );

    revalidatePath("/dashboard");
    return {
      success: true,
      data: { ...budget, amount: budget.amount.toNumber() },
    };
  });
}
