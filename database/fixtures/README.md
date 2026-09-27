# Fixtures

Fixed datasets for tests.

The integration and RLS suites build their own fixtures and run only against a
local database — `apps/web/vitest.config.mjs` refuses a non-local host unless
explicitly overridden, because those suites create and delete rows.
