# ADR-005: No microservices, Kafka or Kubernetes yet

**Status:** Accepted · 2026-09-27

## Context

The target architecture is services. The directory tree now names them. The
temptation is to start.

## Decision

Ship the MVP as one deployable. No service extraction, no message broker, no
orchestrator. `/services` and `infrastructure/{kafka,kubernetes}` stay
documentation.

## Rationale

Distributed systems trade in-process calls for network calls and buy: partial
failure, eventual consistency, distributed transactions, cross-service
debugging, and a much larger operational surface.

Those costs pay off against a real force — independent scaling, a different
runtime, a team boundary the monolith cannot express, an availability
requirement one deployable cannot meet. A pre-launch MVP with one team has
none of them.

A broker between components in the same process solves nothing. Orchestration
for one deployable is load with no return.

## Consequences

The monolith grows before it splits. Accepted, on the condition that internal
structure tracks the boundaries in `/services` — which it already does:
`apps/web/lib/queries.js` and `apps/web/actions/*` are grouped along them.

## Trigger to revisit

A specific, measured constraint — not a milestone, a headcount, or an
aesthetic preference for services.
