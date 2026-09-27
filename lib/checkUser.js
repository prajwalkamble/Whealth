import { auth, currentUser } from "@clerk/nextjs/server";
import { adminDb } from "./prisma";

// How long a synced profile is trusted before Clerk is asked again. The layout
// runs this on every navigation, and it used to call Clerk's API every time.
const PROFILE_REFRESH_MS = 24 * 60 * 60 * 1000;

// Provisioning is the one request-path job that must look across users: a
// returning person may arrive with a new Clerk id but an email we already
// have. So it runs through adminDb, always keyed by the Clerk id from the
// verified session -- never by anything the browser sent.
//
// Failures are thrown, not swallowed. Returning null used to let the page
// carry on and crash later with "User not found", which hid the real cause.
// The app shell shows the person's own rating in the feedback widget. Pulled
// in with the row that is being fetched anyway, rather than as a second query
// per navigation: it is one join, not another round trip.
const WITH_RATING = { rating: { select: { score: true } } };

export const checkUser = async () => {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const existing = await adminDb.user.findUnique({
    where: { clerkUserId },
    include: WITH_RATING,
  });
  if (
    existing &&
    Date.now() - existing.updatedAt.getTime() < PROFILE_REFRESH_MS
  ) {
    return existing;
  }

  const user = await currentUser();
  if (!user) return existing;

  const primaryEmail =
    user.primaryEmailAddress ?? user.emailAddresses?.[0] ?? null;
  const email = primaryEmail?.emailAddress ?? null;
  const emailVerified = primaryEmail?.verification?.status === "verified";

  const profile = {
    name:
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.username ||
      email ||
      "Whealth user",
    email,
    imageUrl: user.imageUrl ?? "",
  };

  if (existing) return syncProfile(existing.id, profile);

  // A new Clerk id with an email we already hold: the person deleted their
  // Clerk account and signed up again. The unique email used to make the
  // create fail on every request, locking them out for good. Re-link their
  // data -- but only on a verified address, or anyone could claim another
  // person's data by signing up with their email.
  if (email) {
    const byEmail = await adminDb.user.findUnique({ where: { email } });
    if (byEmail) {
      if (!emailVerified) {
        throw new Error(
          "This email address is already registered. Verify it to continue."
        );
      }
      return adminDb.user.update({
        where: { id: byEmail.id },
        data: { clerkUserId, ...profile },
        include: WITH_RATING,
      });
    }
  }

  try {
    return await adminDb.user.create({
      data: { clerkUserId, ...profile },
      include: WITH_RATING,
    });
  } catch (error) {
    // Two first requests raced; the other one created the row.
    if (error.code === "P2002") {
      const created = await adminDb.user.findUnique({
        where: { clerkUserId },
        include: WITH_RATING,
      });
      if (created) return created;
    }
    throw error;
  }
};

// Copies the current Clerk profile onto the row. Always writes, so updatedAt
// moves and the next day's requests skip Clerk again.
async function syncProfile(id, profile) {
  try {
    return await adminDb.user.update({
      where: { id },
      data: profile,
      include: WITH_RATING,
    });
  } catch (error) {
    // The new email belongs to another row. Keep the old one rather than
    // failing the whole page; everything else still syncs.
    if (error.code === "P2002") {
      const { email: _conflicting, ...rest } = profile;
      return adminDb.user.update({
        where: { id },
        data: rest,
        include: WITH_RATING,
      });
    }
    throw error;
  }
}
