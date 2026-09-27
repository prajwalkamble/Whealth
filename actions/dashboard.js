"use server";

import { enforceRateLimit } from "@/lib/arcjet";
import { runAction } from "@/lib/action-error";
import { requireClerkUserId } from "@/lib/session";
import { revalidatePath, revalidateTag } from "next/cache";
import { LANDING_STATS_TAG } from "@/lib/stats";
import { withCurrentTenant } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/queries";
import { accountInputSchema, parseOrThrow } from "@/app/lib/schema";

// Only the write lives here. The dashboard's reads moved to lib/queries.js:
// every export of a "use server" module is a public endpoint, and the pages
// that need those reads are server components which can call them directly.

export async function createAccount(rawData) {
  return runAction(async () => {
    const clerkUserId = await requireClerkUserId();

    // Re-validated server-side: the form schema only ever ran in the browser.
    // Parsing also drops unknown keys, so the create below cannot be fed extra
    // columns such as id or userId.
    const data = parseOrThrow(accountInputSchema, rawData);

    await enforceRateLimit("account", clerkUserId);

    const account = await withCurrentTenant(async (tx, userId) => {
      // Two first-account requests in flight at once both counted zero
      // accounts and both became the default. Holding the user's row lock
      // makes the second wait and see the first.
      await tx.$executeRaw`SELECT 1 FROM users WHERE id = ${userId} FOR UPDATE`;

      // Check if this is the user's first account
      const existingAccounts = await tx.account.count({ where: { userId } });

      const shouldBeDefault = existingAccounts === 0 ? true : data.isDefault;

      // If the account should be default, unset other default accounts
      if (shouldBeDefault) {
        await tx.account.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.account.create({
        data: {
          name: data.name,
          type: data.type,
          balance: data.balance,
          userId,
          isDefault: shouldBeDefault,
        },
      });
    });

    revalidatePath("/dashboard");
    // A first account turns a signed-up user into an active one.
    revalidateTag(LANDING_STATS_TAG);
    return { success: true, data: serializeDecimals(account) };
  });
}
