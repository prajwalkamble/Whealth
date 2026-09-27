# Synchronisation protocol

**Status: PLANNED — not implemented.** Sketch, not a specification.

## Shape

```
Device                                  Server
  |-- push(operations[], cursor) ------->|
  |                                      |  dedupe by operation id
  |                                      |  apply, bump version
  |<-- acknowledged[], conflicts[] ------|
  |-- pull(cursor) --------------------->|
  |<-- changes[], tombstones[], cursor --|
```

## Elements

| Element | Purpose |
|---|---|
| Operation id | Client-generated. Makes a retry a no-op. |
| Pending queue | Durable on-device; survives a crash. |
| Acknowledgement | Only an acked operation is retired locally. |
| Record version | Monotonic; how divergence is detected. |
| Tombstone | A delete is a record, not an absence. |
| Cursor | Resume point for pulls. |
| Backoff | Flaky connectivity is the normal case. |

## Idempotency matters more here than elsewhere

A duplicated retry in most products is an annoyance. Here it is a wrong
balance, and the user has no way to know it came from a retry rather than
their own double entry. The operation id is not an optimisation.
