import { auth, currentUser } from "@clerk/nextjs/server";
import { adminDb } from "./prisma";
import { ActionError } from "./action-error";
import { LEGAL_VERSIONS } from "./legal/versions";

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

// Reading the Clerk session and resolving it to a WHealthOS row is split from
// creating one, because creating one is no longer something a page may do on
// its own: a WHealthOS account comes into existence only when the person has
// accepted the Terms and the Privacy Policy, which is provisionUser() below.
//
// Returns { user } once there is a row, and { user: null, profile } when the
// Clerk session is valid but no WHealthOS account exists yet -- carrying the
// profile that provisioning will need, so it is not fetched from Clerk twice.
async function resolve(clerkUserId) {
  const existing = await adminDb.user.findUnique({
    where: { clerkUserId },
    include: WITH_RATING,
  });
  if (
    existing &&
    Date.now() - existing.updatedAt.getTime() < PROFILE_REFRESH_MS
  ) {
    return { user: existing };
  }

  const user = await currentUser();
  // Clerk is unreachable or the session has gone. Keep the row we have rather
  // than reporting the account as missing, which would send an existing user
  // round the consent step they already completed.
  if (!user) return { user: existing };

  const primaryEmail =
    user.primaryEmailAddress ?? user.emailAddresses?.[0] ?? null;
  const email = primaryEmail?.emailAddress ?? null;
  const emailVerified = primaryEmail?.verification?.status === "verified";

  const profile = {
    name:
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.username ||
      email ||
      "WHealthOS user",
    email,
    imageUrl: user.imageUrl ?? "",
  };

  if (existing) return { user: await syncProfile(existing.id, profile) };

  // A new Clerk id with an email we already hold: the person deleted their
  // Clerk account and signed up again. The unique email used to make the
  // create fail on every request, locking them out for good. Re-link their
  // data -- but only on a verified address, or anyone could claim another
  // person's data by signing up with their email.
  //
  // This is an existing WHealthOS account, so it is resolved here rather than
  // in provisioning, and the person is not asked to accept anything again.
  if (email) {
    const byEmail = await adminDb.user.findUnique({ where: { email } });
    if (byEmail) {
      if (!emailVerified) {
        throw new Error(
          "This email address is already registered. Verify it to continue."
        );
      }
      return {
        user: await adminDb.user.update({
          where: { id: byEmail.id },
          data: { clerkUserId, ...profile },
          include: WITH_RATING,
        }),
      };
    }
  }

  return { user: null, profile };
}

// The WHealthOS row for the signed-in person, or null if they have a Clerk
// session but no WHealthOS account yet -- which is what the (main) layout
// turns into a redirect to the consent step.
export const checkUser = async () => {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const { user } = await resolve(clerkUserId);
  return user;
};

// Creates the WHealthOS account, recording the acceptance that allowed it.
//
// The only path that creates a user row. The account and the consent record
// are written in one transaction, so neither can exist without the other:
// there is no account whose owner never agreed to anything, and no consent
// record pointing at an account that was never created.
//
// Everything written here is decided by the server. The caller passes nothing:
// the identity comes from the verified Clerk session, the versions from
// LEGAL_VERSIONS, and the timestamp from the database.
export async function provisionUser() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new ActionError("Unauthorized");

  const { user, profile } = await resolve(clerkUserId);
  // Already provisioned -- a refresh, a second tab, or a retried request.
  // Returned as a success rather than an error: the account exists, which is
  // what the caller wanted, and nothing further should be written.
  if (user) return user;

  if (!profile) {
    throw new ActionError(
      "Could not read your profile from Clerk. Please try again."
    );
  }

  const consent = {
    termsVersion: LEGAL_VERSIONS.TERMS,
    privacyVersion: LEGAL_VERSIONS.PRIVACY,
  };

  try {
    return await adminDb.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          clerkUserId,
          ...profile,
          legalConsents: { create: consent },
        },
        include: WITH_RATING,
      });
      return created;
    });
  } catch (error) {
    // Two requests raced; the other one created the row, with its own consent
    // record. Return that one rather than failing a signup that succeeded.
    if (error.code === "P2002") {
      const created = await adminDb.user.findUnique({
        where: { clerkUserId },
        include: WITH_RATING,
      });
      if (created) return created;
    }
    throw error;
  }
}

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
