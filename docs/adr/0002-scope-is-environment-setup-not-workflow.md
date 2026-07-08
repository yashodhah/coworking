---
status: accepted
---

# Coworking Space owns environment setup, not workflow orchestration

Coworking Space's scope is: (1) agent customizations (Skills, Settings, Instructions), (2) Context — declared pointers to external information/tool sources (MCP servers, datasets, docs) that the resolver wires up so agents/engineers connect to them directly, and (3) Git hooks, registered in the manifest globally or per-Root, and materialized identically local and cloud (e.g. via `core.hooksPath`) rather than assumed to already exist in `.git/hooks`.

It explicitly does **not** own Workflow — how an engineer or agent sequences and executes work across the Roots/Context/Skills the manifest makes available (e.g. whether a cross-repo change becomes one task or two coordinated PRs). That decision belongs to the engineer or the agent runtime, not to Coworking Space.

We considered having Coworking Space also coordinate cross-repo task execution, since multi-root setups (e.g. a team with a separate FE and BFF repo) can involve work that spans both. We rejected this: Coworking Space's job is to make the right Roots, Context, and Skills available in the environment — what an engineer or agent chooses to do with that availability is a separate concern, and folding it in would turn a portable environment-config tool into a workflow/orchestration engine.

## Consequences

- Multi-root support only needs to guarantee that all declared Roots are present and correctly resolved in the environment — it never needs to reason about whether or how a task spans them.
- If cross-repo orchestration is wanted later, it should be built as a separate layer that *consumes* a Resolved Coworking Space, not as a feature of Coworking Space itself.
