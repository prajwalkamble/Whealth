<!-- STATUS: PLANNED. Not implemented. -->

# Local LLM

> **Status: PLANNED — not implemented.** No model exists yet.

WHealthOS's intelligence will run on a self-hosted model that we develop and
operate. It will not call a hosted LLM API.

## Why self-hosted

This product holds people's complete financial history. Sending that to a
third-party inference API means their bank balances, spending habits and
income leave our control and enter someone else's logs and retention policy.
For a finance product that is the wrong default, whatever the provider's terms
say.

Self-hosting also keeps per-insight cost predictable and removes a hard
dependency on an external vendor's pricing, availability and deprecations.

## What exists today

`apps/web/lib/ai/gemini.js` calls a hosted API. It powers receipt scanning and
the monthly insight email. It is **live MVP functionality** and stays until
there is a local replacement — removing it now would delete working features
and give users nothing back.

That file is not the future architecture. It is a temporary implementation
behind a boundary we are now naming.

## Boundary

The model never touches the database. It receives a structured financial
context assembled by deterministic code, and returns text.

```
PostgreSQL
  -> deterministic financial analysis   (ai/financial-analysis)
  -> structured financial context       (plain, inspectable data)
  -> local LLM                          (ai/local-llm/inference)
  -> insight generation
  -> notification intelligence          (ai/notification-intelligence)
  -> email
```

Two properties follow from this shape:

- **The figures are never generated.** Every number in an insight is computed
  by ordinary arithmetic before the model is involved. The model phrases them;
  it does not produce them. A model that hallucinates a balance is a defect we
  refuse to make possible.
- **A model failure degrades to silence, not to nonsense.** If inference is
  unavailable, the deterministic summary still exists and can be sent plainly.

See [docs/architecture/ai.md](../../docs/architecture/ai.md) and
[ADR-004](../../docs/decisions/ADR-004-local-llm.md).
