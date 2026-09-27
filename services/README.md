<!-- STATUS: PLANNED. Not implemented. -->

# Services

> **Status: PLANNED — none of these are implemented.**

Each directory records a future service boundary: what it would own, what it
would depend on, and which events it would publish or consume.

Today all of this behaviour lives in `apps/web` as Next.js server actions
backed by Prisma. That is deliberate and appropriate for the MVP.

| Directory | Responsibility | Today |
|---|---|---|
| `api/` | API Gateway | `apps/web` |
| `core/` | Shared service runtime | `apps/web` |
| `transaction/` | Transactions | `apps/web` |
| `account/` | Accounts | `apps/web` |
| `budget/` | Budgets | `apps/web` |
| `goal/` | Goals | `apps/web` |
| `analytics/` | Analytics | `apps/web` |
| `notification/` | Notifications | `apps/web` |
| `sync/` | Synchronisation | `apps/web` |
| `billing/` | Billing | `apps/web` |
| `identity/` | Identity | `apps/web` |

See [docs/architecture/microservices.md](../docs/architecture/microservices.md)
and [ADR-005](../docs/decisions/ADR-005-microservices.md).
