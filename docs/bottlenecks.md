# Coworking Space — Bottlenecks and Risks

Critical assessment of MVP1 as currently designed (manifest schema + VS Code resolver, per `CONTEXT.md` and ADRs 0001–0004). Written to be revisited as targets/adopters increase — each item names the condition that would resolve it.

## 1. Unvalidated core bet: environment-agnostic manifest

ADR 0001 asserts the manifest "carries no knowledge of which target environments it may resolve into" — before a second resolver exists. Settings like `chat.instructionsFilesLocations` are VS Code-specific; a cloud sandbox or CLI target may have no analogous concept at all, forcing either a schema extension or an environment-specific conditional exactly of the kind ADR 0001 says to avoid.

**Resolves when:** a second resolver (CLI or cloud) is built against the same manifest schema with no target-specific bolt-ons.

## 2. Portability claim is narrower than the pitch

"Identical whether local, cloud, or container" excludes secrets/auth (Jira-style Context sources deferred past MVP1) and system requirements (Java/Node/`ggshield` — "entirely the engineer's own responsibility," CONTEXT.md). A devcontainer already solves requirements-parity; teams already on devcontainers get less incremental value here.

**Resolves when:** the team decides whether "coworking space" ever intends to cover requirements/secret parity, or explicitly commits to leaving that to devcontainers/other tooling permanently.

## 3. Persona is speculative and unresolved

Scope narrowed to Context-only, with three flagged ambiguities still open (tag-based vs. persona-owned content; opt-in vs. opt-out visibility). A fully-named concept with its own glossary entry and example dialogue sits on a foundation not yet decided.

**Resolves when:** the domain expert resolves the three flagged ambiguities in CONTEXT.md, ideally against a second real Persona use case beyond the BA/frontend-repo example.

## 4. New vocabulary tax

Avoiding VS Code's own terms ("Workspace," "Hook") to prevent collision is reasonable, but the glossary needed multiple "Avoid:" callouts and a "supersedes earlier framing" note during design — a sign the naming space was already tangled. Every engineer onboarding to a CWS team now learns two overlapping vocabularies that sound alike and aren't the same thing.

**Resolves when:** a new engineer unfamiliar with CWS onboards and the terms are tested for confusion in practice, not just internal consistency.

## 5. Silent-failure mode not fully covered

The ADR 0004 synthetic-folder mechanism depends on the engineer always opening the generated `.code-workspace` rather than a raw folder — a very natural VS Code action. Git Hooks correctly fail loudly if their Bundle is missing; there is no equivalent story for "engineer opened the wrong thing and all customizations just silently don't apply."

**Resolves when:** the resolver or a Session Hook detects "opened outside the generated workspace" and surfaces it, rather than degrading silently.

## 6. No documented comparison to nearest alternatives

The ADRs justify "why not manifest-branches-by-target" (0001) but don't address "why not devcontainer.json" or "why not a checked-in `.code-workspace` template per repo" — the two most obvious competing answers to "why does this need to exist." This is a gap in the ADR record itself.

**Resolves when:** an ADR is added that explicitly weighs devcontainer.json and a hand-rolled `.code-workspace` template as considered-and-rejected options, the way ADR 0001 already does for target-branching.

## The underlying test

None of the above are fatal on their own — they're the cost of building the manifest/schema/Bundle/Lockfile machinery ahead of its second proof point. The single test that would retire most of this list at once: **does the schema survive a second resolver (cloud or CLI) without special-casing?** Until that's built, items 1–3 stay open, and further investment in Persona, Lockfile drift-notification, or Bundle-discovery polish is second-order spend on an unvalidated foundation.
