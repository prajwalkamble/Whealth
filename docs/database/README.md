# Database documentation

**Status: CURRENT.**

Schema, migrations and RLS bootstrap live in [`/database`](../../database/README.md).

Key properties:

- **Row-level security** on every tenant table, forced (the owner is subject to
  it too), with policies keyed on a session variable set inside the
  transaction.
- **Two roles.** The request path connects as an application role with no
  bypass. Background jobs connect through a role that the policies admit
  explicitly, because cron work legitimately spans tenants.
- **Money is `Decimal`**, never a float.
