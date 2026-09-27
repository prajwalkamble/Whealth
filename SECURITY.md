# Security

## Reporting

Report suspected vulnerabilities privately — do not open a public issue.
Contact the maintainer directly; a dedicated address will be published before
launch.

Please include what you found, how to reproduce it, and what you believe the
impact is. You will get an acknowledgement.

## What matters most here

This application holds financial records. The properties we care about most:

- **Tenant isolation.** Enforced by Postgres row-level security, forced on
  every tenant table, keyed on the verified session inside the transaction —
  not by application code that could forget.
- **Endpoint surface.** Every export of a `"use server"` module is a public
  HTTP endpoint. Reads that no client needs are kept out of those modules.
- **No third-party AI processing.** Financial data will not be sent to hosted
  model APIs. See [ADR-004](docs/decisions/ADR-004-local-llm.md).

## Supported versions

Pre-launch: only `main`.
