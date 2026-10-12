import { PrismaClient } from "@whealthos/database";
import { auth } from "@clerk/nextjs/server";
import { ActionError } from "./action-error";

// Caps the connection pool unless the URL already says otherwise.
//
// Prisma's default is num_cpus * 2 + 1 -- nine on a four-core machine -- per
// client. These run against Supabase's session pooler, where connections are
// scarce and held for the length of a session, and every page here opens an
// interactive transaction. Two or three clients at that default (a dev server
// left running beside another, dev beside production) exhaust the pooler, and
// the symptom is not a clear error: transactions intermittently fail to get a
// connection and pages return 500 at random.
//
// Set it in the URL to override; this only fills in a default.
const pooled = (url) => {
  if (!url || url.includes("connection_limit")) return url;
  const join = url.includes("?") ? "&" : "?";
  return `${url}${join}connection_limit=5&pool_timeout=20`;
};

// Request-scoped client. Connects as the application role, which is subject to
// the row-level security policies in prisma/migrations/*_enable_rls. Every
// query through this client MUST run inside withTenant/withCurrentTenant so the
// policies have a tenant to match against; without one they match nothing.
export const db =
  globalThis.prisma ||
  new PrismaClient({ datasourceUrl: pooled(process.env.DATABASE_URL) });

// Background jobs (cron, webhooks) have no Clerk session and legitimately need
// to enumerate every tenant. They connect through DIRECT_URL, whose role is a
// member of whealth_jobs -- the role the RLS policies name explicitly, so this
// works without SUPERUSER on managed Postgres. That makes them responsible for
// scoping their own queries: enumerate here, then do per-tenant work inside
// withTenant(). tests/rls-isolation.test.js asserts the membership holds.
export const adminDb =
  globalThis.prismaAdmin ||
  new PrismaClient({ datasourceUrl: pooled(process.env.DIRECT_URL) });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = db;
  globalThis.prismaAdmin = adminDb;
}

// Does the request path's role actually obey the policies?
//
// Every RLS policy in this repository is correct, enabled and forced -- and
// all of it is worth nothing if DATABASE_URL happens to name a role that
// bypasses it. Two things defeat the lot, silently and with no failing test:
// a role with rolbypassrls (the `postgres` superuser on a managed instance
// has it), and membership of whealth_jobs, which the policies name as an
// escape hatch for the cron. Either one turns withTenant() into a decorative
// SELECT and leaves application-layer scoping as the only thing standing
// between two users' records.
//
// Nothing in the app can detect that by behaving differently, because the
// queries all still work. So it is asked directly, once per process, and the
// answer goes to the log.
//
// Deliberately not fatal. Refusing to boot over this would take the whole
// service down for a misconfiguration that is survivable -- the application
// layer does scope every query -- and the person who needs to know is reading
// logs, not a stack trace from a dead container. It is written at error level
// and says what to change.
let rlsChecked = false;

export async function checkAppRoleObeysRls(client = db) {
  const [row] = await client.$queryRaw`
    SELECT current_user::text                                  AS role,
           pg_catalog.pg_has_role(current_user, 'whealth_jobs', 'member') AS in_jobs,
           (SELECT rolbypassrls FROM pg_catalog.pg_roles
             WHERE rolname = current_user)                     AS bypasses
  `;

  const defeated = Boolean(row?.bypasses) || Boolean(row?.in_jobs);
  return { role: row?.role ?? "unknown", bypasses: Boolean(row?.bypasses), inJobs: Boolean(row?.in_jobs), defeated };
}

export async function warnIfRlsIsDefeated() {
  if (rlsChecked) return;
  rlsChecked = true;

  try {
    const result = await checkAppRoleObeysRls();
    if (!result.defeated) return;

    const why = [
      result.bypasses && "it has BYPASSRLS",
      result.inJobs && "it is a member of whealth_jobs, which every policy exempts",
    ]
      .filter(Boolean)
      .join(", and ");

    console.error(
      `ROW-LEVEL SECURITY IS NOT IN EFFECT. DATABASE_URL connects as "${result.role}" and ${why}. ` +
        "Every isolation policy on every table is being skipped for ordinary requests. " +
        "Point DATABASE_URL at the whealth_app role from database/prisma/rls-bootstrap.sql; " +
        "DIRECT_URL keeps the privileged role for migrations and jobs."
    );
  } catch (error) {
    // A failure here must never be the reason a request fails.
    console.warn("Could not check whether the database role obeys RLS.", error);
  }
}

// Runs fn inside a transaction with the tenant context set, so RLS scopes every
// query to this user. The setting is transaction-local (the `true` argument to
// set_config), so it cannot leak to the next borrower of a pooled connection.
export async function withTenant(userId, fn) {
  if (!userId) throw new ActionError("Unauthorized");

  // Not awaited: the check is a log line, not a precondition, and a request
  // should not wait on it. Runs once per process, on the first query that
  // RLS was supposed to protect.
  void warnIfRlsIsDefeated();

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
