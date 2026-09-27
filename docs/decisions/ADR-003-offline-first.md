# ADR-003: Offline-first mobile, prepared but not built

**Status:** Accepted · 2026-09-27

## Context

Mobile begins after the web launch. Offline-first is a backend constraint as
much as a client one.

## Decision

Build no sync engine now. Document the protocol in `/mobile-sync` and record
the backend properties it will require.

## Rationale

Four properties must exist on the server for offline sync to work:
client-generated operation ids with idempotent application, per-record
versions, tombstones for deletes, and resumable cursors.

Adding those to an API that a shipped mobile app already depends on means a
coordinated migration across clients you do not control. Allowing for them
before the API is public costs almost nothing.

Nothing is implemented, because the client that would exercise it does not
exist, and a sync engine with no client is untestable speculation.

## Open

Conflict resolution. Last-write-wins is simple and wrong for money — it
silently discards an edit. Likely per-field merge with genuine conflicts
surfaced to the user. Not decided.
