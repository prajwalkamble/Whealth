import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { ActionError } from "./action-error";

// Request-scoped client. Connects as the application role, which is subject to
// the row-level security policies in prisma/migrations/*_enable_rls. Every
// query through this client MUST run inside withTenant/withCurrentTenant so the
// policies have a tenant to match against; without one they match nothing.
export const db = globalThis.prisma || new PrismaClient();

// Background jobs (cron, webhooks) have no Clerk session and legitimately need
// to enumerate every tenant. They connect through DIRECT_URL, whose role is a
// member of whealth_jobs -- the role the RLS policies name explicitly, so this
// works without SUPERUSER on managed Postgres. That makes them responsible for
// scoping their own queries: enumerate here, then do per-tenant work inside
// withTenant(). tests/rls-isolation.test.js asserts the membership holds.
export const adminDb =
  globalThis.prismaAdmin ||
  new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = db;
  globalThis.prismaAdmin = adminDb;
}

// Runs fn inside a transaction with the tenant context set, so RLS scopes every
// query to this user. The setting is transaction-local (the `true` argument to
// set_config), so it cannot leak to the next borrower of a pooled connection.
export async function withTenant(userId, fn) {
  if (!userId) throw new ActionError("Unauthorized");

  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${userId}, true)`;
      return fn(tx, userId);
    },
    // maxWait: how long to wait for a pool connection before giving up with
    // "Unable to start a transaction in the given time". The 2s default is
    // tight for a database in another region under a burst of requests.
    { maxWait: 10000, timeout: 15000 }
  );
}

// Resolves the signed-in Clerk user to an internal id and runs fn under that
// tenant, all in one transaction. The users policy has a clerkUserId branch
// precisely so this bootstrap lookup works before the internal id is known.
export async function withCurrentTenant(fn) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new ActionError("Unauthorized");

  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.clerk_user_id', ${clerkUserId}, true)`;
      const user = await tx.user.findUnique({
        where: { clerkUserId },
        select: { id: true },
      });
      if (!user) throw new ActionError("User not found");

      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${user.id}, true)`;
      return fn(tx, user.id);
    },
    // maxWait: how long to wait for a pool connection before giving up with
    // "Unable to start a transaction in the given time". The 2s default is
    // tight for a database in another region under a burst of requests.
    { maxWait: 10000, timeout: 15000 }
  );
}

export async function getCurrentUserId() {
  return withCurrentTenant(async (_tx, userId) => userId);
}
