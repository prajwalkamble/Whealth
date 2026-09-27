# Microservices

**Status: PLANNED — nothing extracted.**

The boundaries in [`/services`](../../services/README.md) are documentation.
Today every one of those responsibilities is served by `apps/web`.

## Why not now

A distributed system trades in-process calls for network calls, and buys:
partial failure, eventual consistency, distributed transactions, cross-service
debugging, and an operational surface far larger than one deployable.

Those costs are worth paying when a real force demands it: a component that
must scale independently, a different runtime, a team ownership boundary the
monolith cannot express, or an availability requirement one deployable cannot
meet.

None of those apply to a pre-launch MVP with a single team.

## Recording boundaries anyway

Naming the boundaries early is cheap and useful: it keeps the monolith's
internal structure aligned with where the seams would be, so extraction is a
move rather than an untangling. `apps/web/lib/queries.js` and
`apps/web/actions/*` are already grouped along these lines.

## Specifically not adopted

**Kafka.** A broker between components in the same process solves nothing.

**Kubernetes.** Orchestration for one deployable is operational load with no
return.

Both have directories under `infrastructure/`. Both are empty, deliberately.

See [ADR-005](../decisions/ADR-005-microservices.md).
