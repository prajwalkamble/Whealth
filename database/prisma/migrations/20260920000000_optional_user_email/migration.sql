-- Clerk allows sign-in without an email address. The NOT NULL column made the
-- first-login insert fail for those users on every request, locking them out.
-- The unique index stays: Postgres treats NULLs as distinct, so any number of
-- users may have no email while real addresses remain unique.

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
