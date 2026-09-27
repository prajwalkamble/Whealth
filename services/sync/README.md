<!-- STATUS: PLANNED. Not implemented. -->

# Synchronisation

> **Status: PLANNED — not implemented.**
>
> Nothing in this directory runs. The MVP serves this responsibility from the
> Next.js application in `apps/web`. This file records the intended boundary so
> that the split, when it happens, is a move rather than a redesign.

## Responsibility

Serving the mobile offline-first sync protocol: cursors, acknowledgements, conflict detection.

## Where this lives today

`apps/web` — as server actions and helpers under `apps/web/actions` and
`apps/web/lib`. See [docs/architecture/backend.md](../../docs/architecture/backend.md).

## Data ownership

`sync_cursors`, `sync_operations` (not yet created)

Only this service may write these tables once the split happens. Everything
else reads through its API or via events.

## Dependencies

transaction, account

## Events

Consumes domain events to advance cursors.

## Migration notes

The MVP is deliberately a single deployable. A service should only be extracted
when there is a concrete reason — independent scaling, a different runtime, or
an ownership boundary that the monolith cannot express. Extracting early buys
distributed-systems problems without buying anything else.

See [ADR-005](../../docs/decisions/ADR-005-microservices.md).
