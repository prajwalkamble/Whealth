# Security

**Status: CURRENT.**

## Tenancy

Postgres row-level security, forced on every tenant table. The tenant is set
from the verified Clerk session inside the transaction, using a
transaction-local setting so it cannot leak to the next borrower of a pooled
connection. Application code cannot opt out.

## Server actions are public endpoints

Every export of a `"use server"` module is reachable over HTTP. Each one
therefore re-validates its payload with zod (which also strips unknown keys, so
a crafted body cannot smuggle `userId` into a create), checks the session, and
rate-limits before opening a transaction.

Reads that no client needs are kept out of those modules entirely.

## Secrets

`.env` is gitignored and lives in `apps/web`. `database/.env` is a symlink to
it, so credentials exist once.

## Reporting

See [SECURITY.md](../../SECURITY.md).
