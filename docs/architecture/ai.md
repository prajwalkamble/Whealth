# AI architecture

## CURRENT

`apps/web/lib/ai/gemini.js` calls a hosted model API. It powers receipt
scanning and the monthly insight email, and it works.

It is **temporary**. It is not the intended architecture.

## FUTURE

A self-hosted model developed in [`/ai/local-llm`](../../ai/local-llm/README.md).
No hosted LLM API — not OpenAI, Anthropic, Gemini, or any other.

### Why

The product holds complete financial histories. Sending that to a third-party
inference API puts balances, income and spending into someone else's
infrastructure, logs and retention policy. For a finance product that is the
wrong default regardless of the provider's terms.

Secondary: predictable cost per insight, and no dependency on an external
vendor's pricing, availability or deprecation schedule — the current hosted
dependency has already broken once when a model was retired.

### The pipeline

```
PostgreSQL
  -> deterministic financial analysis     ai/financial-analysis
  -> structured financial context         plain, inspectable data
  -> local LLM                            ai/local-llm/inference
  -> insight generation
  -> notification intelligence            ai/notification-intelligence
  -> email
```

### Two rules that follow from it

**The model never reaches the database.** It receives a structured context and
returns text. It has no query access, so it cannot read across tenants, and a
prompt injection in a transaction description cannot become a data-exfiltration
path.

**Figures are computed, never generated.** Every number in an insight comes
from deterministic arithmetic before the model is involved. The model phrases
the analysis; it does not produce the analysis. A model that invents a balance
is a class of defect we decline to make possible.

A consequence worth stating: if inference is unavailable, the deterministic
summary still exists and can be sent plainly. Degradation is silence, not
fabrication — which is exactly what went wrong when the hosted model was
retired and the monthly email quietly shipped canned text.

See [ADR-004](../decisions/ADR-004-local-llm.md).
