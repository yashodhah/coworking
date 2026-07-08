# Coworking Space (Agent Workspace)

A portable contract — roots, context, and agent customizations — that resolves to an identical agent environment whether run directly on a developer's OS (Windows/Mac), in a container, or in a cloud agent sandbox. Local and cloud setup do not require a devcontainer — they can run straight on the host, with declared system requirements instead of a devcontainer.json.

## Language

**Coworking Space Manifest**:
The authored, versioned source of truth declaring Roots, Context, Personas, agent customizations (Skills, Plugins, Agents, Instructions, Commands, Settings), Git Hooks, Session Hooks, and Conventions for a team's work. The Manifest itself is the `manifest.json` file specifically — the single declarative document — distinct from the Coworking Space Bundle it lives in (see below), which may carry supporting files alongside it.
_Avoid_: Workspace, workspace file, manifest (alone) — the full term avoids collision with VS Code's own "workspace."

**Coworking Space Bundle**:
The folder a team's Coworking Space is distributed as — `manifest.json` plus zero or more supporting artifact files it references (e.g. a `git-hooks/` folder holding Git Hook script files, as opposed to inline literal commands declared directly in the manifest). Modeled after how a Plugin is a bundle of multiple files (e.g. Helix's Skill markdown files) rather than a single file, so the Coworking Space format isn't locked to "exactly one JSON file" as more artifact types are added later. Coworking Space Bundles are co-located inside the same repo a team's Plugin Marketplace already lives in, rather than a separate dedicated repo — one less repo for a team to know about, and the VS Code extension already talks to that repo to install Plugins. Supersedes the earlier "dedicated `coworkspaces/` repo" framing under Discovery, below.

**Resolved Coworking Space**:
The environment-specific projection produced by resolving a Coworking Space Manifest for one target (e.g. a `.code-workspace` file for VS Code, `AGENTS.md` + `mcp.json` for a local CLI agent, a cloud bootstrap step, `effective-config.json`).
_Avoid_: Workspace, resolved workspace (ambiguous with VS Code)

**Persona**:
A named, role-based default view over the Coworking Space Manifest (e.g. Delivery Lead, BA, FE, BE, QA, Architect, SRE, FSE) that determines which Context entries are surfaced by default for that party.
_Avoid_: Role, profile, view — use Persona when precision matters.

**Context**:
A declared pointer to an external information or tool source that the resolver wires up directly for the agent/engineer to reach — not an aggregation point CWS itself operates. MCP servers are one mechanism for this, not the only one (e.g. a plain doc link or a REST-based integration can also be Context); the manifest should not assume MCP is the only wiring format. There is no separate broker or fan-out service either way; the agent connects straight to each configured source.
_Avoid_: Gateway — "gateway" was considered and rejected as a distinct concept; it's the same thing as Context, just describing the on-demand-access effect rather than the mechanism.

**Lockfile**:
A generated, per-environment file that pins the exact Coworking Space Manifest version that environment last resolved against — mirrors `package.json` (manifest) vs `package-lock.json` (lockfile). Updating is manual (an engineer runs an explicit update command); Coworking Space does not run any service that watches for new versions and notifies people, consistent with it never operating live infrastructure.
_Avoid_: Version pin (alone)

**Plugin**:
A named, reusable bundle of one or more customizations (Skills, Settings, Instructions) grouped as a single unit — e.g. the org's Helix methodology packages multiple Skills (like `/ship`, `/verify`) together. A Plugin resolves through the same `global < roots.<id>` cascade as an individual customization; grouping them into a Plugin doesn't require a separate mechanism.
_Avoid_: Extension (VS Code term, not this project's)

**Plugin Marketplace**:
A published, versioned source that one or more Plugins are pulled from (e.g. the org's own repo hosting Helix). The Coworking Space Manifest points at a Plugin Marketplace and names which Plugins to pull in — it does not embed Plugin content directly. Using a given Plugin (e.g. Helix) is opt-in per team; a team can point at the marketplace and choose not to pull it in.
_Avoid_: Registry (when this specific concept is meant)

A Plugin is `global`-only — installed for the whole workspace or not, never scoped to one Root (it's a whole bundle, not something that makes sense to partially apply). The finer-grained customization types it bundles — Skills, Agents, Instructions, Commands — are what can individually be declared either `global` or per-`roots.<id>`, accumulating across the cascade.

A declared Plugin is version-pinned in the manifest itself (e.g. `helix@2.1`), same as `package.json` pins a dependency version — the Lockfile separately records the exact version each environment actually resolved, for drift detection, not as the only place a version is specified.

Declaring a Plugin in the manifest means: on resolve, the resolver ensures that Plugin is installed in the target environment if it isn't already (idempotent install-if-missing), using the target's own native install mechanism (e.g. Copilot CLI's plugin install, or IDE-style extension-ID resolution) — Coworking Space does not implement its own installer.

**Git Hook**:
A binding from a git lifecycle event (pre-commit, pre-push, etc.) to a cheap, deterministic command — declared in the Coworking Space Manifest either globally or per-Root, and materialized identically local and cloud (e.g. via `core.hooksPath`) rather than assumed to already exist in `.git/hooks`. A Git Hook never invokes a coding agent/LLM — that's not feasible synchronously inside a git lifecycle event. Coworking Space is unopinionated about which checks belong at which lifecycle event or how heavy they are; that trade-off (fast feedback vs. thoroughness) is each team's own to make.
_Avoid_: Hook (alone — always say Git Hook or Session Hook, "Hook" alone is ambiguous between the two)

A Git Hook's declared value is either an inline literal command, or a reference to a script file that lives in the Coworking Space Bundle itself (conventionally under a `git-hooks/` folder — never a bare `hooks/`, to avoid the ambiguity noted above). For MVP1, that script file is never copied into, or committed to, the target Root repo — it stays only in the Bundle, never version-controlled inside the Root repo. The resolver's work in the target repo is purely local, uncommitted git plumbing (`.git/hooks/<name>` and/or `core.hooksPath`, both already outside a repo's tracked content by default) that points at and invokes the script wherever it lives in the locally-resolved Bundle. Nothing is committed to the target repo as part of Git Hook setup, either way.

If the Bundle's local copy is missing when the Git Hook fires (deleted, or a fresh machine that never resolved the Bundle for this Root), the hook fails loudly and blocks the commit/push rather than silently no-op'ing — same "explicit and precise on failure" convention as Session Hooks. Consistent with Coworking Space's purpose (making agentic coding more reliable): a hook that silently does nothing is worse than one that's missing entirely, since it looks like the check ran.

**Session Hook**:
A binding from an agent runtime lifecycle event (session-start, pre-tool-use, post-tool-use, stop, etc. — the same shape as GitHub Copilot's or Claude Code's own hook system) to a cheap, deterministic check, declared in the manifest and resolved identically local and cloud. Convention: silent on success, explicit and precise on failure — a coding agent has a limited context window, so a Session Hook must not emit noise when everything is fine, and must be unambiguous about what broke when it isn't, so the agent can fix it on the next iteration.
_Avoid_: Hook (alone)

Plugins (agent-level, e.g. Helix's `/ship`, `/verify`) and Git Hooks (git-level, cheap, deterministic) are two separate mechanisms, not one wired into the other. A Plugin's own instructions may tell a coding agent to go configure Git Hooks or Session Hooks as part of a task — that's agent behavior guided by Plugin content, not a manifest-level reference from a Hook to a Plugin command.

**Command**:
A named, on-demand agent action — invoked explicitly by the engineer (e.g. a slash command), never automatically — declared in the Coworking Space Manifest either globally or per-Root, and resolved into whichever native invocation mechanism the target environment supports (e.g. a workspace-scoped custom prompt file for VS Code + Copilot/Claude). A Command's content is agent-guided instructions; Coworking Space's own resolver never executes it — the agent performs whatever the Command says only when the engineer explicitly invokes it, the same pattern already established for a Plugin's instructions telling the agent to configure Git Hooks (see Git Hook, above).
_Avoid_: Slash command (alone — tie it back to the manifest-declared concept, not just the IDE surface)

A Command's declared value is a reference to a markdown file that lives in the Coworking Space Bundle (conventionally under a `commands/` folder), never inlined into `manifest.json` — same file-in-Bundle pattern as a Git Hook's script reference, chosen because Command content is naturally long-form prose, not a one-liner.

**Setup**:
A single, optional, global-only pointer (`global.setup`) to one markdown file in the Coworking Space Bundle (conventionally `setup.md`) covering whatever system requirements the workspace's Roots need (e.g. Java and Maven for a backend Root, Node for a frontend Root) in one doc. Deliberately not an instance of the general **Command** concept — there is exactly one Setup per workspace, never per-Root, never multiple. Resolved and invoked the same way as a Command (materialized into the target's native invocation mechanism, run only on explicit engineer action, executed by the agent rather than by Coworking Space's own resolver), but kept as its own distinct, singular concept rather than folded into the general Commands map, to keep the "how do I set this workspace up" entry point unambiguous and undiscoverable-proof — an engineer or agent should never have to guess which of several declared Commands is "the" setup one.
_Avoid_: Setup command, setup markdown (alone — say Setup, capitalized, as the manifest-level term)

**Workflow**:
How an engineer or agent actually sequences and executes work across the Roots/Context/Skills a Coworking Space Manifest makes available (e.g. splitting a cross-repo change into two separate PRs). Explicitly out of scope for Coworking Space — it sets up the environment, it does not orchestrate work within it.
_Avoid_: Task, orchestration (when referring to this out-of-scope concern, say Workflow)

## Relationships

- A **Coworking Space Manifest** resolves into one **Resolved Coworking Space** per target environment.
- A **Persona** selects a subset of **Context** entries from the full Coworking Space Manifest. (Whether Persona also filters **Roots** or **Skills** is explicitly deferred — not decided either way yet.)
- A **Persona** does not grant or restrict access — the full Coworking Space Manifest is always reachable regardless of active Persona. Omission is about reducing noise, not enforcing a boundary.
- A **Coworking Space Manifest** carries no knowledge of which target environments it may resolve into (VS Code, CLI, cloud, Docker). It only describes what exists (Roots, Context, Skills, Hooks, Conventions). All "how do I turn this into a target-specific artifact" logic lives exclusively in the resolver that produces a **Resolved Coworking Space**.

- Per-Root override of the cascade is confirmed by a real case, not speculative: in the CWS team, the Angular FE repo uses a pre-push **Hook** while the BFF repo uses a pre-commit **Hook** — genuinely different per Root.
- The cascade is two layers only: `global < roots.<id>`. There is no per-engineer `local` layer — once set up, what an engineer does on their own machine is outside Coworking Space entirely (see ADR 0003).

## Example dialogue

> **Dev:** "Should the BA persona even get the `frontend-repo` root, since they're never touching code?"
> **Domain expert:** "They can still see it if they want. Leaving it out of the BA default view is about not cluttering what they see day-to-day, not locking them out. If a BA needs to peek at an implementation to write a sharper story, they just switch to the full workspace — nothing stops them."

- Coworking Space is built to be reused across many teams, not just for the CWS engineering team. CWS is the pilot/first adopter — the schema should stay general, not shaped around CWS-specific quirks.

- Agent customization is not just **Skills** — Settings and Hooks are already separate customization types, and there may be others (e.g. instructions/system prompts, permission profiles) not yet named. Skills is one type among several, not a stand-in for the whole category.

- "Agent orchestration" (a term used once, ambiguously) was clarified to mean Helix's Skill/slash-command framework (`/ship`, `/verify` — agent customization, i.e. **Plugins**/**Skills**), not cross-repo task sequencing. ADR 0002 (Workflow is out of scope) stands unchanged.

- MVP1 scope for the CWS engineering workspace is the software engineering build phase only: Roots, Skills/Plugins (Helix), Git Hooks. It explicitly excludes any Context source that requires secrets/auth (e.g. Jira) — local-vs-cloud secret parity is a known real gap, deliberately deferred past MVP1.
- MVP1 hard requirement: agent customization — Skills, Agents, Instructions, Commands — must be definable both `global` (whole workspace) and per-Root. Plugins are the one exception: `global`-only, never per-Root (see Plugin definition). Not deferrable, must-have from the start.
- The near-term goal is the Coworking Space Manifest contract (`manifest.json`/schema) itself, to get quick feedback on whether the idea holds up — not a fully working resolver yet.
- MVP1 resolver scope is VS Code only. The resolver for turning a Coworking Space Manifest into a Resolved Coworking Space is built as a new command inside the existing VS Code marketplace extension (the one that already browses/installs individual Skills/Agents/Instructions/Commands/Plugins) — it reuses that extension's own per-item install logic internally, rather than a new cross-extension API. Non-VS-Code targets (CLI agent, cloud sandbox) are deliberately out of scope for MVP1; whether the manifest-parsing/cascade-merge logic ends up shared with those targets' resolvers or reimplemented separately is an open question, explicitly deferred until a second target is actually built.
- Resolving in VS Code clones each Root's repo (true one-command day-one setup), rather than assuming repos are already checked out. Default behavior, overridable: clones land at `<chosen-parent>/<root-id>` (one parent folder picked once, subfolder named by Root id) unless the manifest pins an explicit local path for that Root; if the destination folder already exists, resolving fails loudly and stops rather than silently trusting whatever is there, unless the engineer explicitly opts to reuse the existing folder as-is. Git auth for private repos is the engineer's own existing setup (consistent with Coworking Space never owning environment/auth provisioning).
- VS Code's own agent-customization discovery (Copilot/Claude reading `.github/...`) is scoped per opened workspace folder by default, not workspace-wide — confirmed against current VS Code docs, since there's no built-in "applies to every folder in this multi-root workspace" location. The resolver's answer: add one extra, non-repo folder to the `.code-workspace`'s `folders` list (a sibling of the cloned Roots at `<chosen-parent>/<workspace-name>`) purely to hold every materialized artifact — both `global` and per-Root. This folder is never cloned from anywhere and carries no source repo of its own.
- Confirmed further: VS Code exposes workspace-level settings (`chat.instructionsFilesLocations`, `chat.promptFilesLocations`, `chat.agentFilesLocations`, `chat.agentSkillsLocations`, `chat.hookFilesLocations`) that add extra, additional search locations for each customization type, settable directly in the `.code-workspace` file's `settings` block. This means **per-Root** customizations (including **Setup**) never need to be written into a cloned repo's own `.github/` either — they can live in the same non-repo folder alongside the global ones, scoped to their own Root via each type's native scoping mechanism (e.g. an `.instructions.md` file's `applyTo` glob, such as `applyTo: "backend/**"`). Consequence: nothing the resolver materializes is ever written into a cloned Root repo, for any customization type — fully consistent with the Git Hook precedent, with no carve-out needed for the "commit vs. stay untracked" question raised earlier (there's no repo backing this folder, so the question doesn't apply).

- System requirements (e.g. Java, Node, `ggshield` needed by declared Git Hooks) are entirely the engineer's own responsibility to have set up — Coworking Space does not install or verify them, consistent with it never owning environment provisioning or auth/secrets either.
- A team may still choose to declare **Setup** (`global.setup`, pointing at a single `setup.md` in the Bundle) whose content walks the agent through installing every Root's system requirements. This does not contradict the point above: Coworking Space's own resolver still never installs or verifies anything — it only ever materializes Setup into the target's native invocation mechanism, same as a Command. The engineer must explicitly invoke it (nothing runs automatically on resolve/open), and it's the agent, not Coworking Space, that performs the install steps — same precedent as a Plugin's instructions telling the agent to configure Git Hooks. Adopting Setup is entirely opt-in per team, same as adopting Coworking Space itself.
- Assumed (not yet confirmed): a `global` Git Hook and a `roots.<id>` Git Hook for the same lifecycle event **stack** (both run) rather than the root replacing the global one. Used in the `examples/cws-engineering-workspace.manifest.json` draft — backend `pre-commit` runs both the global secret scan and its own Java lint. Matches "hooks merge by key" from the original notes but hasn't been explicitly re-confirmed in this session.

- Discovery is by known location, not a browsable registry: teams' Coworking Space Bundles live together in a `coworkspaces/` folder, one per team, inside the same repo as the team's Plugin Marketplace (not a separate dedicated repo — see Coworking Space Bundle definition above, which supersedes the original "separate central repo" framing).

- Manifest authoring reuses the existing marketplace browse/install UI rather than a new dedicated editor, to avoid feature creep: browsing and picking a Skill/Agent/Instruction/Command/Plugin gets an "add to Coworking Space" action alongside "install." Roots and Git/Session Hooks aren't marketplace items (nothing to browse — they're bespoke per team), so they're still authored by directly editing `manifest.json`, with schema-powered validation/autocomplete.

## Flagged ambiguities

- Persona's scope was initially assumed to cover Roots, Context, and Skills together; narrowed by the domain expert to Context only — "persona only matters to get the relevant context for different parties." Roots/Skills filtering by Persona is not decided either way, deferred.
- Whether Persona filtering of Context is **tag-based** (every Context entry carries an optional list of relevant Personas; untagged = visible to all) vs. **Persona-owned content** (a Persona declares its own additions). Deferred — explicitly parked for later by the domain expert.
- Whether an untagged entry defaults to **visible to everyone** (opt-out model) or **hidden until tagged** (opt-in model). Deferred along with the above.
