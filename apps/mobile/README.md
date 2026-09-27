<!-- STATUS: PLANNED. Not implemented. -->

# Mobile

> **Status: PLANNED — not implemented.** This directory is intentionally empty.

Android and iOS, to begin after the web MVP launches and acquisition is under
way. No framework has been chosen and none is installed.

## Intended architecture: offline-first

Someone checking their finances on a train should not see a spinner. The local
database is the source of truth for the UI; the network is a background
concern.

```
Mobile UI
  -> local SQLite
  -> synchronisation engine   (see /mobile-sync)
  -> API
  -> backend
  -> PostgreSQL
```

Writes land locally and are queued. The UI never waits on the network.

See [docs/architecture/mobile.md](../../docs/architecture/mobile.md) and
[/mobile-sync](../../mobile-sync/README.md).
