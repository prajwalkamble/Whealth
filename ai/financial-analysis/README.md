<!-- STATUS: PLANNED. Not implemented. -->

# Financial analysis

> **Status: PLANNED — not implemented.**

Deterministic analysis over a tenant's own data. No model involved.

This layer exists so that the numbers in any insight are *computed*, never
generated. It produces a structured financial context — a plain object of
totals, deltas, categories and flags — which is the only thing the model is
ever given.

Some of this already exists in `apps/web/lib/queries.js` (monthly summaries,
cash flow, category breakdowns). That code is the natural seed for this
package.
