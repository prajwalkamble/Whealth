# Backend

## CURRENT

Next.js server actions and route handlers, with Prisma against PostgreSQL.
Business logic lives in `apps/web/actions` and `apps/web/lib`.

This is a monolith, and that is the correct shape for the MVP: one deployable,
one transaction boundary, no network between a read and the write that follows
it.

## FUTURE

An API gateway in front of Spring Boot services, per the boundaries recorded
under [`/services`](../../services/README.md).

**No migration work has started, and none is planned before the web MVP ships.**

### How a migration would proceed

1. Keep the monolith serving traffic.
2. Extract one service where there is a concrete reason — not for tidiness.
3. Route that capability through the gateway; the monolith calls the service.
4. Move data ownership only when the service is proven.
5. Repeat only as far as is justified.

### What has to be solved before the first extraction

- **Transactions.** `createTransaction` writes a transaction and adjusts an
  account balance atomically. Split across services, that needs a saga or an
  outbox, and every failure mode becomes visible. This alone is a good reason
  to delay.
- **Row-level security.** Tenancy is enforced by Postgres today. A service
  owning its own tables must reproduce that guarantee, not assume it.
- **Authentication.** Clerk sessions are verified in Next middleware. The
  gateway would take that over and pass a verified principal downstream.

See [ADR-002](../decisions/ADR-002-backend-migration.md).
