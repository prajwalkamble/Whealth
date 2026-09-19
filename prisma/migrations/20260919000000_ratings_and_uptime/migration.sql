-- Live landing-page stats: per-user app ratings and the uptime heartbeat.
-- Depends on 20250820000000_enable_rls for app_is_job_runner(),
-- app_current_tenant() and the whealth_app / whealth_jobs roles.

-- CreateTable
CREATE TABLE "ratings" (
    "id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id"),
    -- The server action validates this too; the constraint is what keeps a
    -- direct write from skewing the public average.
    CONSTRAINT "ratings_score_range" CHECK ("score" BETWEEN 1 AND 5)
);

-- CreateTable
CREATE TABLE "uptime_checks" (
    "slot" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uptime_checks_pkey" PRIMARY KEY ("slot")
);

-- CreateIndex
CREATE UNIQUE INDEX "ratings_userId_key" ON "ratings"("userId");

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row-level security, matching the other tenant tables. A user reads and
-- writes only their own rating; the landing-page average is computed by the
-- job-runner connection, which the policy lets through.
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings FORCE  ROW LEVEL SECURITY;

CREATE POLICY ratings_isolation ON public.ratings
  USING      (app_is_job_runner() OR "userId" = app_current_tenant())
  WITH CHECK (app_is_job_runner() OR "userId" = app_current_tenant());

-- The heartbeat belongs to no tenant. Only the job runner writes or reads it,
-- so the request-path role gets no access at all -- the default privileges
-- from the RLS migration would otherwise have granted it.
ALTER TABLE public.uptime_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uptime_checks FORCE  ROW LEVEL SECURITY;

CREATE POLICY uptime_checks_jobs_only ON public.uptime_checks
  USING      (app_is_job_runner())
  WITH CHECK (app_is_job_runner());

REVOKE ALL ON public.uptime_checks FROM whealth_app;
