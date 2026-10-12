-- A switch for the AI commentary in the monthly summary email.
--
-- Until now there was none: the commentary was written for every account with
-- an email address, which meant that account's monthly totals were sent to an
-- external model whether or not anyone wanted that. The public AI Usage page
-- had to say so.
--
-- Additive and defaulted to true, so no existing account changes behaviour on
-- deploy. Turning it off stops the model call; the report still sends, with
-- the same real figures and no commentary section -- a path the job already
-- had, because it is what happens when the model fails.
--
-- No new RLS policy: the column lives on public.users, which is already
-- covered by the existing isolation policy on that table.
BEGIN;

ALTER TABLE public.users
  ADD COLUMN "monthlyInsights" BOOLEAN NOT NULL DEFAULT true;

COMMIT;
