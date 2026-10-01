# Third-party licences

WHealthOS is licensed under Apache 2.0. **Third-party dependencies and
components are not.** Each retains its own licence, and those licences — along
with their attribution requirements — must be respected in anything
distributed.

Nothing here relicenses a third-party component, and no licence information is
asserted for any dependency that has not been inspected.

## Generating the inventory

Before a release:

```sh
pnpm licenses list --long > legal/THIRD-PARTY-LICENSES/inventory.txt
```

This is a release obligation rather than housekeeping: several common licences
require attribution to be carried in distributed software, and a few impose
further conditions worth knowing about before shipping.

The inventory has not yet been generated.
