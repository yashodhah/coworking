# Provisioning runs out-of-band from activation

`activate()` returns immediately without waiting for Provisioning; it runs as a background task, and any command needing `apm` awaits a shared readiness promise instead. This avoids VS Code's slow-activation warning on a first-run install, which is network-bound (pip fetching `apm-cli`) and can't be guaranteed fast.

Because the Managed Environment lives in `globalStorageUri` (shared across all VS Code windows on the machine, not per-workspace), two windows activating at once on a fresh machine could race to build it simultaneously. A simple on-disk lock file in that folder serializes this: the second window waits and reuses the first window's result. Recovering from a lock left behind by a crashed process is deliberately out of scope for MVP — the risk is narrow (fresh machine + 2+ windows opened at once) and can be revisited if it proves to be a real problem.
