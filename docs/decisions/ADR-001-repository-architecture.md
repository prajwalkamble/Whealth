# ADR-001: Monorepo with reserved future boundaries

**Status:** Accepted · 2026-09-27

## Context

A single-package Next.js app, with three future surfaces planned (web, mobile,
cloud) and an intended move toward services. Only web is being built now.

## Decision

Reorganise as a pnpm workspace. `apps/web` holds the application; `database`
is a workspace package owning Prisma. Future boundaries — `services/`, `ai/`,
`packages/`, `infrastructure/`, `mobile-sync/`, `apps/mobile`, `apps/cloud` —
exist as **documentation only**.

A directory existing is not a claim that anything is implemented. Every
placeholder README opens with its status.

## Consequences

**Good.** Boundaries are visible before the code grows into them. Adding a
real package needs no configuration change. The MVP stays one deployable.

**Bad.** The tree looks larger than the system is, which can mislead a reader
into thinking more is built than is. Mitigated by the status banners, and by
keeping placeholders free of stub code — an empty directory with an honest
README is clearer than a fake implementation.

## Notes

The `@/` alias survived the move untouched: `jsconfig.json` and
`vitest.config.mjs` both resolve it relative to their own location, so moving
them into `apps/web` repointed it. None of the 101 files importing through it
changed.

Two things the move did force, both recorded in the commit: applications now
depend on `@whealthos/database` rather than `@prisma/client` directly, and the
Prisma client is generated to a fixed path rather than into `node_modules`.
Both exist because `prisma generate` resolves `@prisma/client` upward from the
schema, and because Next's bundler cannot locate the query engine inside
pnpm's hashed store.
