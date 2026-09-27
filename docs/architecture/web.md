# Web application

**Status: CURRENT.** This is the MVP and the only surface being built.

## Layout

```
apps/web/
├── app/
│   ├── (marketing)/     public: landing, pricing
│   ├── (auth)/          sign-in, sign-up
│   ├── (main)/          signed-in app shell
│   ├── demo/            guest mode, no account
│   └── api/             inngest, seed
├── actions/             server actions (writes)
├── lib/                 queries, prisma, time, format, inngest
├── components/          ui/ (shadcn-style) and shared components
├── data/                static catalogues: categories, pricing
└── tests/
```

## Reads and writes are separated

`apps/web/actions/*` is `"use server"`. **Every export of such a module is a
public HTTP endpoint**, so only writes live there, and each one re-validates
its payload and checks the session.

Reads live in `apps/web/lib/queries.js`, which is a plain module. Server
components import it directly. This is not stylistic: exporting a read as a
server action publishes an endpoint for no reason.

## Tenancy

Every query runs inside `withCurrentTenant`, which opens a transaction, sets
the tenant from the verified Clerk session, and lets Postgres RLS enforce
isolation. Application code cannot opt out.

## The `@/` alias

`@/*` maps to `apps/web/*` via `apps/web/jsconfig.json`, and identically in
`apps/web/vitest.config.mjs`. Both resolve relative to their own location, so
the alias survived the move into the monorepo untouched.

## Demo mode

`/demo` runs the real dashboard components against sample data held in the
browser. Nothing a guest enters reaches the database — there is no signed-in
user to own the row, and adding a second identity path would weaken the
guarantee that tenancy rests solely on a verified session.
