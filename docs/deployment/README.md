# Deployment

**Status: CURRENT.**

The MVP is a single Next.js application plus managed PostgreSQL.

```sh
pnpm install      # also generates the Prisma client
pnpm build
pnpm start
```

Migrations are applied deliberately, never automatically on boot:

```sh
pnpm db:migrate
```

Required environment variables are listed in `apps/web/.env.example`.
