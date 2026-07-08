# Coworking Space Manifest is environment-agnostic

The Coworking Space Manifest declares Roots, Context, Personas, Skills, Hooks, and Conventions only — it carries no knowledge of which target environments (VS Code, CLI, cloud sandbox, Docker) it may resolve into. All target-specific projection logic (turning the manifest into a `.code-workspace` file, `AGENTS.md`, a cloud bootstrap step, an `effective-config.json`, etc.) lives exclusively in the resolver that produces a Resolved Coworking Space.

We considered letting the manifest branch on target environment directly (the way `devcontainer.json` features or CI matrix configs do), which would be more flexible for one-off environment-specific tweaks. We rejected it: a manifest that special-cases its own consumers reintroduces the exact divergence-per-place-it-runs problem this project exists to solve.

## Consequences

- Supporting a new target environment (a new IDE, a new cloud agent) means writing a new resolver output, not touching the manifest schema.
- An environment-specific override that seems unavoidable later must be modeled as a genuine new manifest concept (e.g. a new axis), not a `target: cloud` conditional bolted onto existing fields.
