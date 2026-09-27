<!-- STATUS: PLANNED. Not implemented. -->

# @whealthos/date-time

> **Status: PLANNED — not implemented.** No code has been moved here.

Calendar handling in the application's timezone. `apps/web/lib/time.js` is the natural seed — month boundaries are subtle and already centralised there.

## Why it is still empty

Extracting a package has a cost: a build step, a version, and a second place to
look. It pays for itself when there is a *second consumer*. Today there is one
client — `apps/web` — so moving code here now would add indirection and buy
nothing.

The natural time to fill this is when the mobile app or a service needs the
same logic.
