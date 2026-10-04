-- Goals, and the contributions made toward them.
--
-- Progress is deliberately not a column: it is SUM(goal_contributions.amount),
-- computed on read. A stored running total is a second source of truth that
-- drifts the first time a contribution is corrected.
BEGIN;

CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

CREATE TABLE public.goals (
    "id"           TEXT         NOT NULL,
    "name"         TEXT         NOT NULL,
    "description"  TEXT,
    "targetAmount" DECIMAL(65,30) NOT NULL,
    "targetDate"   TIMESTAMP(3),
    "status"       "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "userId"       TEXT         NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public.goal_contributions (
    "id"        TEXT         NOT NULL,
    "amount"    DECIMAL(65,30) NOT NULL,
    "date"      TIMESTAMP(3) NOT NULL,
    "note"      TEXT,
    "goalId"    TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_contributions_pkey" PRIMARY KEY ("id")
);

-- Enforced in the database as well as in zod, so a direct write cannot store a
-- target of zero or a contribution that moves progress backwards.
ALTER TABLE public.goals
  ADD CONSTRAINT goals_target_amount_check CHECK ("targetAmount" > 0);
ALTER TABLE public.goal_contributions
  ADD CONSTRAINT goal_contributions_amount_check CHECK ("amount" > 0);

ALTER TABLE public.goals
  ADD CONSTRAINT "goals_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES public.users("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.goal_contributions
  ADD CONSTRAINT "goal_contributions_goalId_fkey"
  FOREIGN KEY ("goalId") REFERENCES public.goals("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public.goal_contributions
  ADD CONSTRAINT "goal_contributions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES public.users("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "goals_userId_idx"           ON public.goals("userId");
CREATE INDEX "goals_user_status_idx"      ON public.goals("userId", "status");
CREATE INDEX "goal_contributions_goalId_idx" ON public.goal_contributions("goalId");
CREATE INDEX "goal_contributions_userId_idx" ON public.goal_contributions("userId");

-- Same isolation as every other tenant table.
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_contributions FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS goals_isolation ON public.goals;
CREATE POLICY goals_isolation ON public.goals
  USING      (app_is_job_runner() OR "userId" = app_current_tenant())
  WITH CHECK (app_is_job_runner() OR "userId" = app_current_tenant());

DROP POLICY IF EXISTS goal_contributions_isolation ON public.goal_contributions;
CREATE POLICY goal_contributions_isolation ON public.goal_contributions
  USING      (app_is_job_runner() OR "userId" = app_current_tenant())
  WITH CHECK (app_is_job_runner() OR "userId" = app_current_tenant());

COMMIT;
