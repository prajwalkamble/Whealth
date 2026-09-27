<!-- STATUS: PLANNED. Not implemented. -->

# AI

> **Status: PLANNED.** The only AI code running today is
> `apps/web/lib/ai/gemini.js`, which is temporary — see `local-llm/README.md`.

| Directory | Purpose |
|---|---|
| `local-llm/` | The self-hosted model: training, evaluation, inference. |
| `financial-analysis/` | Deterministic analysis producing structured context. No model. |
| `notification-intelligence/` | Whether, when and how to tell someone. |
| `ai-service/` | The serving boundary between the app and the model. |

## Explicitly excluded

No hosted LLM APIs — not OpenAI, Anthropic, Gemini, or any other. See
`local-llm/README.md` for why, and [ADR-004](../docs/decisions/ADR-004-local-llm.md).
