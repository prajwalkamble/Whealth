<!-- STATUS: PLANNED. Not implemented. -->

# Accounts

> **Status: PLANNED — not implemented.**
>
> Nothing in this directory runs. The MVP serves this responsibility from the
> Next.js application in `apps/web`. This file records the intended boundary so
> that the split, when it happens, is a move rather than a redesign.

## Responsibility

Financial accounts, balances and the default-account rule.

## Where this lives today

`apps/web` — as server actions and helpers under `apps/web/actions` and
`apps/web/lib`. See [docs/architecture/backend.md](../../docs/architecture/backend.md).

## Data ownership

`accounts`

Only this service may write these tables once the split happens. Everything
else reads through its API or via events.

## Dependencies

identity (tenant ownership)

## Events

Publishes `account.created`, `account.balance.changed`.

## Migration notes

The MVP is deliberately a single deployable. A service should only be extracted
when there is a concrete reason — independent scaling, a different runtime, or
an ownership boundary that the monolith cannot express. Extracting early buys
distributed-systems problems without buying anything else.

See [ADR-005](../../docs/decisions/ADR-005-microservices.md).
