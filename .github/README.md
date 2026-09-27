# GitHub configuration

Reserved for workflows, issue templates and PR templates.

No CI is configured yet. The first workflow should run, on every pull request:

```sh
pnpm lint && pnpm test && pnpm build
```

The build step matters most — it catches failures the dev server does not.
