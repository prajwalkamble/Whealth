# Database

**Status: CURRENT.** PostgreSQL via Prisma. This is a workspace package
(`@whealthos/database`) that owns the schema, the migrations and the generated
client.

```
database/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/          six migrations — never reset, never deleted
│   └── rls-bootstrap.sql    run once per environment
├── generated/               prisma generate output (gitignored)
├── seeds/
├── fixtures/
└── index.js                 re-exports the client
```

## Why applications import `@whealthos/database`

Not `@prisma/client` directly. `prisma generate` resolves `@prisma/client`
upward from the schema, so with the schema here and the dependency declared in
an app, the client was generated into a package that never imported it. Owning
the schema and the dependency together leaves exactly one generated client.

## Why the client is generated outside `node_modules`

Under pnpm it otherwise lands inside a hashed `.pnpm/` path, and Next's
bundler cannot find the query engine binary that must sit beside it — the
production build fails while collecting page data. A fixed `output` avoids the
problem entirely.

## Commands

```sh
pnpm db:generate     # regenerate the client (also runs on install)
pnpm db:migrate      # apply migrations — deliberate, never on boot
pnpm db:studio
```

## Row-level security

Every tenant table has RLS **enabled and forced** — the table owner is subject
to it too, which is the usual reason RLS turns out to be decorative.

Two roles: the request path connects as an application role with no bypass;
background jobs connect through a role the policies admit explicitly, because
cron work legitimately spans tenants.

`prisma/rls-bootstrap.sql` sets the application role's password and must be run
once per environment.

## Rules

- **Never** reset the database or delete a migration. History is the record of
  what production has applied.
- Money is `Decimal`, never a float.
