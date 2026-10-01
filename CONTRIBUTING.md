# Contributing

> WHealthOS is pre-launch. The project is licensed under Apache 2.0; see
> [legal/LICENSE-STRUCTURE.md](legal/LICENSE-STRUCTURE.md) and
> [legal/CONTRIBUTOR-TERMS.md](legal/CONTRIBUTOR-TERMS.md).
>
> Contributions are licensed under Apache 2.0 section 5. Contributors keep
> copyright in their own work.

## Setup

```sh
pnpm install
cp apps/web/.env.example apps/web/.env
pnpm dev
```

## Before opening a change

```sh
pnpm lint
pnpm test
pnpm build      # the dev server must be stopped first
```

The build catches things the dev server does not — missing Suspense
boundaries around `useSearchParams` being the recurring one.

## Conventions

- **Server actions are public endpoints.** Every export of a `"use server"`
  module is reachable over HTTP. Put reads in `apps/web/lib/queries.js`
  instead, and validate every action's payload.
- **Money is `Decimal`**, never a float. Serialise with `.toNumber()` at the
  boundary.
- **Never reset the database or delete a migration.**
- Comments explain *why*, not *what*.

## Tests

`pnpm test` runs the unit suites. The RLS and integration suites need a local
test database configured in `apps/web/.env.test`; they are skipped otherwise,
and refuse to run against a non-local host because they create and delete rows.
