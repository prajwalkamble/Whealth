# Mobile

**Status: PLANNED — not started.** Begins after the web MVP launches.

Android and iOS. No framework chosen; none installed.

## Offline-first

The local database is the source of truth for the UI. The network is a
background concern.

```
Mobile UI -> local SQLite -> sync engine -> API -> backend -> PostgreSQL
```

Someone checking a balance on a train should see their data immediately. Writes
land locally and queue for sync; the interface never blocks on the network.

This is a constraint on the *backend* too, which is why it is recorded now: the
API must be able to accept an operation that happened hours ago, identified by
a client-generated id, without double-applying it. Retro-fitting that is
considerably harder than allowing for it.

See [offline-first.md](offline-first.md) and [/mobile-sync](../../mobile-sync/README.md).
