# ADR-004: A self-hosted model, not a hosted LLM API

**Status:** Accepted · 2026-09-27

## Context

The app currently calls a hosted model API for receipt scanning and monthly
insights.

## Decision

The intelligence layer will run on a model we host. **No hosted LLM API** —
not OpenAI, Anthropic, Gemini, or any other. The current integration stays
until a local replacement exists, then is removed.

## Rationale

**Data.** This product holds complete financial histories. Calling a hosted
inference API puts balances, income and spending patterns into a third party's
infrastructure, logs and retention policy. For a finance product that is the
wrong default whatever the terms say.

**Continuity.** The hosted dependency has already broken once: a model was
retired, and the monthly insight email silently degraded to canned text that
looked like real output. That failure mode — quiet, plausible, wrong — is
exactly what should not happen to financial advice.

**Cost.** Per-insight cost becomes predictable rather than tied to another
company's pricing.

## Architecture

```
PostgreSQL -> deterministic analysis -> structured context
           -> local LLM -> insight -> notification -> email
```

Two rules:

1. **The model never reaches the database.** It receives a structured context
   and returns text. It cannot read across tenants, and a prompt injected into
   a transaction description cannot become an exfiltration path.
2. **Figures are computed, never generated.** Every number is produced by
   arithmetic before the model is involved. The model phrases the analysis; it
   does not produce it.

## Consequences

**Good.** Financial data stays in our infrastructure. Failure degrades to a
plain deterministic summary rather than to fabrication.

**Bad.** Training, evaluating and serving a model is real work, and a
self-hosted model will initially be worse at prose than a frontier API. That is
an acceptable trade for a product whose value is accuracy, not eloquence.

**Interim.** The hosted call remains live. Removing it now would delete working
features and return nothing to users.
