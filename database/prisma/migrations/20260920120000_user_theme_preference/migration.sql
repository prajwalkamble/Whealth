-- Theme preference (light / dark / system) kept on the account, so the choice
-- follows the user to another browser or device. Null means "never chosen",
-- and the browser falls back to the system setting.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "theme" TEXT;
