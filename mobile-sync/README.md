<!-- STATUS: PLANNED. Not implemented. -->

# Mobile synchronisation

> **Status: PLANNED — not implemented.** Documentation only.

The protocol between an offline-first mobile client and the backend.

## The problems it has to solve

- **Operation IDs.** Every local mutation gets a client-generated id, so the
  server can recognise a replay.
- **Idempotency.** A retried operation must not apply twice. This matters more
  here than almost anywhere else in the product: a duplicated transaction is a
  wrong balance, and the user has no way to know it came from a retry.
- **Pending queue.** Local operations are durable and survive a crash or a
  force-quit.
- **Acknowledgement.** The server confirms what it accepted; only then is the
  local operation retired.
- **Retries with backoff.** Flaky connections are the normal case.
- **Conflict detection.** Two devices edit the same record offline. Detect via
  per-record versions; do not silently pick a winner.
- **Versioning.** Each record carries a monotonic version.
- **Tombstones.** Deletes replicate as records, not absences — otherwise a
  delete on one device is indistinguishable from a row the other has not seen.
- **Cursors.** Each device tracks how far it has pulled.
- **Eventual consistency.** Devices converge; they are not consistent at every
  instant. The UI must be honest about what is not yet synced.

## Not decided

Conflict resolution policy. Last-write-wins is simple and wrong for money.
Likely: per-field merge for edits, with genuine conflicts surfaced to the user
rather than resolved silently.

See [docs/architecture/synchronization.md](../docs/architecture/synchronization.md)
and [ADR-003](../docs/decisions/ADR-003-offline-first.md).
