# Licensing structure

> **Status: the root `LICENSE` is currently MIT and has not been changed.**
> See "Open question" below — this needs a decision.

## 1. Core WHealthOS application

`apps/web`, `services/`, `database/` and `ai/` are the commercial core.

The stated intent is **commercial / source-available**: the source may be
readable, but the licence should not grant the right to run WHealthOS as a
competing service or redistribute it as a product.

## 2. Future open-source components

Selected pieces may be released permissively — most plausibly client SDKs and
`packages/api-contracts`, where adoption is the point and there is nothing
proprietary to protect. Apache-2.0 is the likely choice there.

Any such package carries its own `LICENSE` file. A licence in a package
directory governs that package only.

## 3. Third-party dependencies

Inventoried under `legal/THIRD-PARTY-LICENSES/`. Generate with
`pnpm licenses list --long` before each release and record the result.

## 4. Contributor terms

See [CONTRIBUTOR-TERMS.md](CONTRIBUTOR-TERMS.md).

## 5. Contributor rewards

See [CONTRIBUTOR-REWARDS.md](CONTRIBUTOR-REWARDS.md).

## 6. Trademark

See [TRADEMARK.md](TRADEMARK.md). A source licence is not a trademark licence.

---

## Open question — requires a decision

The repository root currently carries the **MIT licence**. MIT is a permissive
open-source licence: it lets anyone use, modify, sell and redistribute this
code, including as a competing hosted product, with no obligation beyond
retaining the copyright notice.

That is inconsistent with the stated commercial intent above.

Options, with what each actually does:

| Option | Effect |
|---|---|
| **Keep MIT** | Anyone may run and sell WHealthOS. Choose only if that is genuinely intended. |
| **BUSL-1.1** | Source-available. Forbids competing hosted use for a set period, then converts to an open licence. Designed for exactly this situation. |
| **AGPL-3.0** | Still open source. Anyone may run it as a competing service; they must publish their modifications. Copyleft, not commercial protection. |
| **Proprietary / custom** | Maximum control, least contributor goodwill. |

A note on dual-licensing under **Apache-2.0 and AGPL-3.0 together**: offering
both as alternatives means any user may simply choose Apache-2.0, which
nullifies the copyleft AGPL exists to provide. The pattern that does work is
AGPL-3.0 *for the project* plus a separate commercial licence sold to those who
cannot accept AGPL terms — the two are not offered as a free choice.

**Changing a licence is not fully retroactive.** Anyone who received the code
under MIT keeps those rights for that version. The sooner this is settled, the
less code is affected.
