# Cloud platform

**Status: PLANNED — not started.** Not part of the October 2026 MVP.

A separate product for organisations: tenant and organisation management,
configurable RBAC, security policies, data isolation, custom workflows,
integrations, API management, webhooks, audit logs, compliance controls.

Recorded now only so the consumer app is not built in a way that forecloses it.
The single decision that matters today is keeping **tenancy explicit** — the
current RLS model already treats a tenant as a first-class concept rather than
assuming one user owns one dataset.
