"use server";

import { revalidatePath } from "next/cache";
import { withCurrentTenant } from "@/lib/prisma";
import { cardInputSchema, parseOrThrow } from "@/app/lib/schema";
import { ActionError, runAction } from "@/lib/action-error";
import { enforceRateLimit } from "@/lib/arcjet";
import { requireClerkUserId } from "@/lib/session";

// Reading cards lives in lib/queries.js (getUserCards), which is a plain
// module. Only the writes below are something the browser calls, and every
// export here is an async function because each one is a public endpoint.

// The only columns a card write is allowed to touch. Built from the validated
// object rather than from the caller's payload, so a field that is not on this
// list -- a card number, a CVV -- has nowhere to go even if one is sent.
const columnsFrom = (input) => ({
  name: input.name,
  issuer: input.issuer,
  network: input.network,
  type: input.type,
  last4: input.last4,
  expiryMonth: input.expiryMonth,
  expiryYear: input.expiryYear,
  creditLimit: input.creditLimit,
  billingDay: input.billingDay,
  dueDay: input.dueDay,
  accountId: input.accountId,
});

// A linked account must belong to the caller. RLS would already stop a write
// against someone else's row, but checking here turns a database error into a
// message the form can show.
async function assertOwnedAccount(tx, userId, accountId) {
  if (!accountId) return;
  const owned = await tx.account.findFirst({
    where: { id: accountId, userId },
    select: { id: true },
  });
  if (!owned) throw new ActionError("That account could not be found");
}

export async function createCard(raw) {
  return runAction(async () => {
    const clerkUserId = await requireClerkUserId();
    await enforceRateLimit("write", clerkUserId);

    const input = parseOrThrow(cardInputSchema, raw);

    const card = await withCurrentTenant(async (tx, userId) => {
      await assertOwnedAccount(tx, userId, input.accountId);
      return tx.card.create({ data: { ...columnsFrom(input), userId } });
    });

    revalidatePath("/cards");
    return { success: true, data: { id: card.id } };
  });
}

export async function updateCard(id, raw) {
  return runAction(async () => {
    const clerkUserId = await requireClerkUserId();
    await enforceRateLimit("write", clerkUserId);

    const input = parseOrThrow(cardInputSchema, raw);

    await withCurrentTenant(async (tx, userId) => {
      await assertOwnedAccount(tx, userId, input.accountId);
      // updateMany scoped by userId rather than update by id: an id alone
      // would be a lookup anyone could guess at, and a zero count tells us the
      // row was not the caller's.
      const { count } = await tx.card.updateMany({
        where: { id, userId },
        data: columnsFrom(input),
      });
      if (count === 0) throw new ActionError("That card could not be found");
    });

    revalidatePath("/cards");
    return { success: true, data: { id } };
  });
}

// Archive rather than delete by default: a card that has been replaced is
// still part of how the user recognises their own history.
export async function setCardStatus(id, status) {
  return runAction(async () => {
    const clerkUserId = await requireClerkUserId();
    await enforceRateLimit("write", clerkUserId);

    if (status !== "ACTIVE" && status !== "ARCHIVED") {
      throw new ActionError("Unknown card status");
    }

    await withCurrentTenant(async (tx, userId) => {
      const { count } = await tx.card.updateMany({
        where: { id, userId },
        data: { status },
      });
      if (count === 0) throw new ActionError("That card could not be found");
    });

    revalidatePath("/cards");
    return { success: true, data: { id, status } };
  });
}

export async function deleteCard(id) {
  return runAction(async () => {
    const clerkUserId = await requireClerkUserId();
    await enforceRateLimit("write", clerkUserId);

    await withCurrentTenant(async (tx, userId) => {
      const { count } = await tx.card.deleteMany({ where: { id, userId } });
      if (count === 0) throw new ActionError("That card could not be found");
    });

    revalidatePath("/cards");
    return { success: true, data: { id } };
  });
}
