# ADR-002: Defer the Spring Boot migration

**Status:** Accepted · 2026-09-27

## Context

The intended long-term backend is Spring Boot services behind a gateway. The
current backend is Next.js server actions with Prisma, and it works.

## Decision

Keep the Node.js backend. Record the target boundaries under `/services` as
documentation. Do not begin migration before the web MVP ships.

## Rationale

Rewriting a working backend produces no user-visible improvement while
consuming the entire runway to an October 2026 launch.

The current design is not an obstacle: reads and writes are already separated,
business logic sits in modules rather than components, and tenancy is enforced
by the database rather than by application code — so it does not have to be
reimplemented identically in each future service.

## What must be solved first

- **Atomicity.** `createTransaction` inserts a row and adjusts an account
  balance in one transaction. Split across services that becomes a saga or an
  outbox, with compensations and visible partial failure.
- **RLS.** Tenancy is a database guarantee today. A service owning its own
  tables must reproduce it, not assume it.
- **Session verification.** Currently Next middleware; would move to the
  gateway.

## Consequences

The monolith grows in the meantime. Acceptable, provided internal boundaries
stay aligned with `/services`.
