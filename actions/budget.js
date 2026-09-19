"use server";

import { withCurrentTenant } from "@/lib/prisma";
import { budgetInputSchema, parseOrThrow } from "@/app/lib/schema";
import { revalidatePath } from "next/cache";
import { runAction } from "@/lib/action-error";
import { enforceRateLimit } from "@/lib/arcjet";
import { requireClerkUserId } from "@/lib/session";
import { monthBounds } from "@/lib/time";

export async function getCurrentBudget(accountId) {
  try {
    return await withCurrentTenant(async (tx, userId) => {
      // Scoped explicitly as well as by RLS: the query should still be correct
      // if it is ever run against a connection without a tenant context.
      const budget = await tx.budget.findUnique({ where: { userId } });

      // The month on the app's calendar, not the server's UTC one.
      const { startOfMonth, endOfMonth } = monthBounds();

      const expenses = await tx.transaction.aggregate({
        where: {
          userId,
          type: "EXPENSE",
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          accountId,
        },
        _sum: {
          amount: true,
        },
      });

      return {
        budget: budget ? { ...budget, amount: budget.amount.toNumber() } : null,
        currentExpenses: expenses._sum.amount
          ? expenses._sum.amount.toNumber()
          : 0,
      };
    });
  } catch (error) {
    console.error("Error fetching budget: ", error);
    throw error;
  }
}

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
