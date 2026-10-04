# Working in this repository

Notes for anyone — person or agent — making changes here.

## Shape

pnpm workspace. `apps/web` is the only application being built; `database` is
a workspace package owning Prisma. Everything else is a documented future
boundary with no implementation.

**A directory existing is not a claim that it is built.** Check the README:
every placeholder opens with its status.

## Commands (from the root)

```sh
pnpm dev · pnpm build · pnpm test · pnpm lint
pnpm db:migrate · pnpm db:generate · pnpm db:studio
```

**Stop the dev server before `pnpm build`.** Building while it runs corrupts
`.next` and produces confusing failures afterwards.

## Rules that are not negotiable

- **Never reset the database or delete a migration.** The migration history is
  the record of what production has applied.
- **Money is `Decimal`.** Never a float. Convert with `.toNumber()` only at
  the serialisation boundary.
- **No hosted LLM APIs.** Not OpenAI, Anthropic, Gemini or any other. The
  intelligence layer will be self-hosted — see
  [ADR-004](docs/decisions/ADR-004-local-llm.md). The existing Gemini call is
  temporary and is not a precedent.
- **Do not implement the future boundaries** (`services/`, `apps/mobile`,
  `apps/cloud`, `mobile-sync/`, Kafka, Kubernetes) without being asked. They
  are documentation.

## Things that bite

- **`pnpm db:migrate` does not regenerate the Prisma client.** It runs
  `prisma migrate deploy`, not `migrate dev`, so a new model exists in the
  database but not on the client and every call reads as
  `Cannot read properties of undefined`. Run `pnpm db:generate` after any
  schema change, and restart the dev server so it picks up the new client.

- **A new table needs its own RLS policy.** `ENABLE` + `FORCE ROW LEVEL
  SECURITY` plus an isolation policy on `app_current_tenant()`, in the same
  migration. Without it the table is readable across tenants.

- **A new route needs adding to `isProtectedRoute`** in `apps/web/middleware.js`,
  or it is reachable signed out.

- **Every export of a `"use server"` module is a public HTTP endpoint**, and
  it must be an async function — a `const` export fails the build. Reads
  belong in `apps/web/lib/queries.js`, which is a plain module.
- **The dev server does not catch everything.** `useSearchParams` without a
  Suspense boundary only fails a production build. Run `pnpm build` before
  claiming a change works.
- **Tailwind's `cn()` merges, it does not replace.** `space-y-*` survives
  alongside `grid`, and then applies a margin to every grid child but the
  first.
- **An animation on `transform` replaces a `rotate-*` class.** Put both in the
  keyframes.
- **`@/` maps to `apps/web/*`**, via `apps/web/jsconfig.json` and the matching
  alias in `apps/web/vitest.config.mjs`. Both resolve relative to their own
  location.

## Before saying a change works

```sh
pnpm lint && pnpm test && pnpm build
```

For anything visual, look at it. A screenshot at one viewport width is not
evidence it works at others — a `hidden xl:flex` that renders nothing on a
laptop looks identical to a component that was never added.
