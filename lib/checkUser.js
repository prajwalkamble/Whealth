import { currentUser } from "@clerk/nextjs/server";
import { db } from "./prisma";

export const checkUser = async () => {
  const user = await currentUser();
  if (!user) return null;

  const email = user.emailAddresses?.[0]?.emailAddress;
  if (!email) return null;

  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    email;

  try {
    // Runs before the internal user id exists, so it sets the clerk branch of
    // the users policy rather than going through withCurrentTenant.
    return await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.clerk_user_id', ${user.id}, true)`;

      // upsert, not find-then-create: two first-login requests in flight at
      // once both saw no row and both tried to insert, and the loser hit the
      // unique constraint on clerkUserId and returned null.
      return tx.user.upsert({
        where: { clerkUserId: user.id },
        update: {},
        create: {
          clerkUserId: user.id,
          name,
          imageUrl: user.imageUrl,
          email,
        },
      });
    });
  } catch (error) {
    console.error("Failed to sync Clerk user:", error);
    return null;
  }
};
