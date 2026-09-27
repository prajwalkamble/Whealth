# Architecture overview

This document distinguishes what **runs today** from what is **planned**. The
directory tree deliberately contains more structure than implementation; a
directory existing is not a claim that anything is built.

## Today (MVP)

One deployable: a Next.js application talking to managed PostgreSQL.

```
Browser
  -> Next.js (apps/web)            App Router, React 19, server actions
  -> Prisma (database/)            with row-level security
  -> PostgreSQL (Supabase)
```

Supporting services: Clerk (authentication), Inngest (scheduled jobs), Resend
(email), Arcjet (rate limiting and bot protection).

| Concern | Implementation |
|---|---|
| Routing, rendering | Next.js App Router |
| Business logic | Server actions in `apps/web/actions` |
| Reads | `apps/web/lib/queries.js` — plain functions, not endpoints |
| Tenancy | Postgres RLS, keyed on the verified Clerk session |
| Background jobs | Inngest (`apps/web/lib/inngest`) |
| AI | Hosted API — temporary, see [ai.md](ai.md) |

## Planned

| Surface | Status |
|---|---|
| Mobile (Android/iOS) | Not started. After web launch. |
| Cloud platform | Not started. Separate product. |
| Spring Boot services | Not started. See [backend.md](backend.md). |
| Local LLM | Not started. See [ai.md](ai.md). |
| Offline sync | Not started. See [offline-first.md](offline-first.md). |
| Kafka, Kubernetes | Not started, and not wanted yet. See [ADR-005](../decisions/ADR-005-microservices.md). |

## The principle

Architectural readiness is not implementation. The boundaries are named now so
that future extraction is a move rather than a rewrite — but each is extracted
only when something concrete demands it.
