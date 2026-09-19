-- WHealth — Row-Level Security (ADR-003)
-- NOTE: Prisma String @id @default(uuid()) => TEXT column, NOT uuid.
--       Comparisons are text-to-text. Do NOT add ::uuid casts.
--       Prisma keeps camelCase, so "userId"/"clerkUserId" MUST be quoted.
-- RUN AS: database owner (DIRECT_URL role), which is what Prisma uses.
--
-- Two roles come out of this file: whealth_app, which the request path uses and
-- which can only ever see one tenant, and whealth_jobs, a NOLOGIN marker role
-- whose members the policies let through so the cron jobs can enumerate tenants
-- without needing SUPERUSER.
--
-- The application role's PASSWORD is deliberately not set here — migrations are
-- committed to source control. Run prisma/rls-bootstrap.sql once per
-- environment to set it. Until then the role exists but cannot log in.

BEGIN;

-- 1. Application role (no BYPASSRLS, not owner, not superuser)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'whealth_app') THEN
    CREATE ROLE whealth_app WITH LOGIN;
  END IF;
END$$;

GRANT USAGE ON SCHEMA public TO whealth_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO whealth_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO whealth_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO whealth_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO whealth_app;
-- Only a superuser may name SUPERUSER or BYPASSRLS in ALTER ROLE -- even to
-- switch them off -- and managed Postgres (Supabase, Neon, RDS) runs
-- migrations as a non-superuser owner, so the unconditional ALTER that used to
-- be here aborted the whole migration there. A role created just above already
-- has all four attributes off, so act only when one is on: refuse outright for
-- the two only a superuser can clear, and clear the other two.
DO $$
DECLARE
  app_role pg_roles%ROWTYPE;
BEGIN
  SELECT * INTO app_role FROM pg_roles WHERE rolname = 'whealth_app';

  IF app_role.rolsuper OR app_role.rolbypassrls THEN
    RAISE EXCEPTION 'whealth_app is SUPERUSER or BYPASSRLS, which defeats row-level security. A superuser must run: ALTER ROLE whealth_app NOSUPERUSER NOBYPASSRLS;';
  END IF;

  IF app_role.rolcreatedb OR app_role.rolcreaterole THEN
    ALTER ROLE whealth_app NOCREATEDB NOCREATEROLE;
  END IF;
END$$;

-- 1b. Job-runner role. The cron functions in lib/inngest/functions.js must
--     enumerate every tenant. Relying on the connecting role happening to be a
--     SUPERUSER is not portable -- managed Postgres (Neon, Supabase, RDS) hands
--     you the database owner and nothing more, and FORCE ROW LEVEL SECURITY
--     subjects the owner to the policies like anyone else. So the cross-tenant
--     grant is named explicitly by the policies below instead of being inferred
--     from a privilege we cannot count on having.
--
--     NOLOGIN: nothing connects as whealth_jobs. It is a membership marker.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'whealth_jobs') THEN
    CREATE ROLE whealth_jobs NOLOGIN;
  END IF;
END$$;

GRANT USAGE ON SCHEMA public TO whealth_jobs;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO whealth_jobs;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO whealth_jobs;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO whealth_jobs;

-- The role running this migration is the DIRECT_URL role, which is also the
-- role the background jobs connect as. Granting it membership is not an
-- escalation: it already owns these tables and could drop the policies outright.
GRANT whealth_jobs TO CURRENT_USER;

-- The application role must never be a member. This is the boundary that
-- actually matters, so assert it rather than assume it.
REVOKE whealth_jobs FROM whealth_app;

-- 2. Context helpers. NULLIF collapses unset and empty to NULL so
--    policies fail closed rather than erroring on a bad cast.
CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS text
  LANGUAGE sql STABLE AS
$$ SELECT NULLIF(current_setting('app.tenant_id', true), '') $$;

CREATE OR REPLACE FUNCTION app_current_clerk_id() RETURNS text
  LANGUAGE sql STABLE AS
$$ SELECT NULLIF(current_setting('app.clerk_user_id', true), '') $$;

-- True only for roles that inherit whealth_jobs. current_user is set by the
-- connection's credentials, so unlike a session GUC this cannot be flipped on
-- by anything the application role is able to execute.
CREATE OR REPLACE FUNCTION app_is_job_runner() RETURNS boolean
  LANGUAGE sql STABLE AS
$$ SELECT pg_has_role(current_user, 'whealth_jobs', 'USAGE') $$;

-- 3. Enable + FORCE. Without FORCE the table OWNER bypasses every policy,
--    and your migration role is the owner — the usual reason RLS turns out
--    to be decorative. Superusers still bypass; that is what the background
--    jobs rely on via DIRECT_URL.
ALTER TABLE public.users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users        FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts     FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.budgets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets      FORCE  ROW LEVEL SECURITY;

-- 4. Policies. The users table needs a clerkUserId branch because the
--    session bootstrap runs before the internal id is known.
DROP POLICY IF EXISTS users_isolation ON public.users;
CREATE POLICY users_isolation ON public.users
  USING      (app_is_job_runner() OR id = app_current_tenant()
              OR "clerkUserId" = app_current_clerk_id())
  WITH CHECK (app_is_job_runner() OR id = app_current_tenant()
              OR "clerkUserId" = app_current_clerk_id());

DROP POLICY IF EXISTS accounts_isolation ON public.accounts;
CREATE POLICY accounts_isolation ON public.accounts
  USING      (app_is_job_runner() OR "userId" = app_current_tenant())
  WITH CHECK (app_is_job_runner() OR "userId" = app_current_tenant());

DROP POLICY IF EXISTS transactions_isolation ON public.transactions;
CREATE POLICY transactions_isolation ON public.transactions
  USING      (app_is_job_runner() OR "userId" = app_current_tenant())
  WITH CHECK (app_is_job_runner() OR "userId" = app_current_tenant());

DROP POLICY IF EXISTS budgets_isolation ON public.budgets;
CREATE POLICY budgets_isolation ON public.budgets
  USING      (app_is_job_runner() OR "userId" = app_current_tenant())
  WITH CHECK (app_is_job_runner() OR "userId" = app_current_tenant());

-- 5. Indexes so the policy predicate stays cheap. These are declared in
--    schema.prisma too, so `prisma migrate dev` does not report drift.
CREATE INDEX IF NOT EXISTS transactions_user_date_idx
  ON public.transactions ("userId", date DESC);
CREATE INDEX IF NOT EXISTS transactions_user_account_idx
  ON public.transactions ("userId", "accountId");
CREATE INDEX IF NOT EXISTS accounts_user_default_idx
  ON public.accounts ("userId", "isDefault");

COMMIT;
