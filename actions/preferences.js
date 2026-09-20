"use server";

import { withCurrentTenant } from "@/lib/prisma";
import { runAction } from "@/lib/action-error";
import { enforceRateLimit } from "@/lib/arcjet";
import { requireClerkUserId } from "@/lib/session";
import { themeInputSchema, parseOrThrow } from "@/app/lib/schema";

export async function saveThemePreference(rawTheme) {
  return runAction(async () => {
    const clerkUserId = await requireClerkUserId();
    await enforceRateLimit("write", clerkUserId);

    const theme = parseOrThrow(themeInputSchema, rawTheme);

    await withCurrentTenant((tx, userId) =>
      tx.user.update({ where: { id: userId }, data: { theme } })
    );

    // No revalidate: the browser has already applied the theme, and every
    // page reads it through next-themes rather than from the server.
    return { success: true, data: { theme } };
  });
}
