-- Budgets gain a category, additively.
--
-- Until now there was exactly one budget row per user: an overall monthly
-- spending limit, enforced by a UNIQUE on "userId". That row keeps working
-- untouched -- it is simply the row whose category is NULL -- and per-category
-- budgets are new rows alongside it.
--
-- Nothing is deleted and no existing row is rewritten.
BEGIN;

ALTER TABLE public.budgets ADD COLUMN "category" TEXT;

-- The old constraint allowed one budget per user, which is now too strict.
ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS "budgets_userId_key";
DROP INDEX IF EXISTS "budgets_userId_key";

-- One budget per category. NULLs are distinct in a UNIQUE index, so this
-- constraint does not constrain the overall budget at all...
ALTER TABLE public.budgets
  ADD CONSTRAINT budgets_user_category_key UNIQUE ("userId", "category");

-- ...which is what the partial index below is for: at most one row per user
-- with no category. Expressed in SQL because Prisma cannot declare a partial
-- unique index in the schema.
CREATE UNIQUE INDEX IF NOT EXISTS budgets_user_overall_key
  ON public.budgets ("userId")
  WHERE "category" IS NULL;

-- A budget of zero or less is not a limit, and a negative one rendered as
-- "Infinity% used" on the dashboard before the server-side check existed.
ALTER TABLE public.budgets
  ADD CONSTRAINT budgets_amount_check CHECK ("amount" > 0);

COMMIT;
