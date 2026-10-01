# WHealthOS

Personal financial management. Track accounts and transactions, set a budget,
and get a monthly read on where the money went.

> **Status: pre-launch.** The web application is the only surface being built.
> Mobile, the cloud platform and the service split are architectural
> boundaries, not implementations — every placeholder directory says so in its
> README.

## Quick start

```sh
pnpm install                       # installs and generates the Prisma client
cp apps/web/.env.example apps/web/.env
pnpm db:migrate                    # apply migrations
pnpm dev                           # http://localhost:3000
```

`pnpm test`, `pnpm lint`, `pnpm build` all run from the root.

You can also open `/demo` without an account — real dashboard, sample data,
nothing written to the database.

## Layout

```
apps/web/          the Next.js application            CURRENT
database/          Prisma schema, migrations, client  CURRENT

apps/mobile/       Android and iOS                    PLANNED
apps/cloud/        platform for organisations         PLANNED
services/          future service boundaries          PLANNED
ai/                self-hosted model + analysis       PLANNED
packages/          shared packages                    PLANNED (empty)
mobile-sync/       offline sync protocol              PLANNED
infrastructure/    docker, redis, kafka, k8s          PLANNED (empty)

docs/              architecture and decisions
legal/             licensing, contributor terms
scripts/           development and release helpers
assets/            branding, screenshots
```

A directory existing here does not mean it is implemented. See
[docs/architecture/overview.md](docs/architecture/overview.md), which separates
what runs from what is planned.

## Stack

Next.js 15 (App Router), React 19, Tailwind, shadcn-style components ·
PostgreSQL with Prisma and row-level security · Clerk · Inngest · Resend ·
Arcjet · Vitest.

## Documentation

| | |
|---|---|
| [Architecture overview](docs/architecture/overview.md) | What runs today vs what is planned |
| [Web](docs/architecture/web.md) | The application being built |
| [Backend](docs/architecture/backend.md) | Current Node.js, future services |
| [AI](docs/architecture/ai.md) | Why the model will be self-hosted |
| [Database](docs/database/README.md) | Schema, RLS, migrations |
| [Security](docs/security/README.md) | Tenancy, secrets, endpoint surface |
| [Decisions](docs/decisions/README.md) | ADRs |

## License

WHealthOS is licensed under the Apache License, Version 2.0.

Copyright © 2026 Prajwal Kamble (WHealthOS).

See the [LICENSE](./LICENSE) file for the complete license text.

Third-party dependencies and components may be subject to their respective
licenses and attribution requirements. See
[legal/THIRD-PARTY-LICENSES](./legal/THIRD-PARTY-LICENSES/) for applicable
information.

"WHealthOS" and the WHealthOS logo are trademarks of the copyright owner, and
trademark rights are separate from the software license — see
[legal/TRADEMARK.md](./legal/TRADEMARK.md).
