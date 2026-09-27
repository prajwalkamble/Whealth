-- Appearance settings (theme colour, chart colours, fonts, scale, radius,
-- colour schema, content layout, sidebar) kept on the account so they follow
-- the user to another browser.
--
-- One JSON column rather than a column per setting: they are only ever read
-- and written as a set, and the server validates every key and value against
-- lib/preferences.js before storing them. The existing theme column moves in
-- as the colour schema.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "preferences" JSONB;

UPDATE "users"
SET "preferences" = jsonb_build_object('colorSchema', "theme")
WHERE "theme" IS NOT NULL;

ALTER TABLE "users" DROP COLUMN "theme";
