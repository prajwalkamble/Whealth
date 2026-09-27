# Offline-first

**Status: PLANNED — not implemented.**

## The stance

The device's local database is authoritative for the UI. Synchronisation is a
background reconciliation, not a precondition for use.

## What that demands of the backend

- Accept operations carrying **client-generated ids** and treat repeats as
  no-ops.
- Return **versions** on every record so divergence is detectable.
- Represent deletes as **tombstones**, so a device can tell "deleted" from
  "not yet seen".
- Expose **cursors** so a device can resume rather than re-download.

## Why this is written down before any mobile code exists

Every one of those is a backend property. Adding them after the API is in use
by a shipped mobile app means a migration across clients you do not control.
Allowing for them now costs little.

## Unresolved

Conflict resolution policy. Last-write-wins is simple and wrong for financial
records — it silently discards someone's edit. The likely answer is per-field
merge with genuine conflicts surfaced to the user, but this is not decided.

See [ADR-003](../decisions/ADR-003-offline-first.md).
