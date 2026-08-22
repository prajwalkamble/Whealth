-- One-time, per-environment credential setup for the application role.
-- Kept out of prisma/migrations because migrations are committed to git.
--
--   psql "$DIRECT_URL" -v app_password="$(openssl rand -base64 24)" \
--     -f prisma/rls-bootstrap.sql
--
-- Then put the same password in DATABASE_URL. The role itself is created by
-- the 20250820000000_enable_rls migration; this only sets its password.

ALTER ROLE whealth_app WITH LOGIN PASSWORD :'app_password';
