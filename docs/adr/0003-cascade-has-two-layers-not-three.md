# Cascade is two layers (global, per-repo), not three

The Coworking Space Manifest cascade is `global < roots.<id>` only. There is no third `local` (per-engineer) layer. Once an engineer's environment is set up from a Resolved Coworking Space, whatever they change on their own machine afterward is their own business — not tracked, versioned, or resolved by Coworking Space.

We originally planned a three-layer cascade (`global < roots.<id> < local`), mirroring VS Code's user/workspace/folder settings split. We dropped the `local` layer: the per-repo layer is justified by a real case (the FE repo uses a pre-push Hook, the BFF repo uses pre-commit), but per-engineer divergence isn't something Coworking Space needs to manage — it happens after setup is complete, outside the manifest entirely.

## Consequences

- The resolver only ever merges two sources per Root: the global config and that Root's override.
- Any personal tweaks an engineer makes locally are invisible to Coworking Space and never flow back into the manifest.
