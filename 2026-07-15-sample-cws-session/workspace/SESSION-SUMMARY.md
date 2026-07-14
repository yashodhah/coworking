# Session Summary — Enterprise Agentic Workspace (for continuation in a new chat)

## Problem statement

The actual goal is bigger than chat customizations: **govern and manage the entire enterprise
SDLC — requirement, spec, design, build, deployment, and post-deployment support — through a
coding-agent-driven workflow**, end to end, in one governed environment. This is explicitly
the *initial version* of that goal, not the goal itself: everything built so far (centralized
chat customizations, the computational harness) is a first, foundational slice — a governed
place for agent configuration and a checkpointing/guardrail mechanism — that later phases will
build on to cover the rest of the lifecycle (build, deploy, and support stages aren't touched
yet).

A deliberate constraint shapes the approach: **use existing tools rather than building
bespoke infrastructure from scratch.** VS Code multi-root workspaces, GitHub Copilot Chat's
built-in customization settings, and plain git hooks are all mechanisms that already ship in
the tools developers use daily — the work here is *governing and wiring* them coherently, not
inventing a new platform.

## Why VS Code workspaces

A `.code-workspace` file was chosen as the organizing unit for this first version because it's
an existing, off-the-shelf mechanism that already matches how enterprise engineers work: a
single task or feature frequently spans several related repos opened together in one window
(as `sample-cws.code-workspace` does with its two example repos). Attaching governance to the
workspace file — rather than to VS Code's global user settings, or to each repo individually —
gives three things at once, using only what VS Code and git already provide:

- **Isolation without duplication:** each `.code-workspace` defines its own governed context.
  Wiring `~/.coworkspaces/<workspace-name>` per workspace file means different repo groupings
  (different projects, different points in the SDLC) get independent configuration, without
  copying files into every repo or falling back to a single global config that can't
  distinguish between projects.
- **Zero footprint on the repos themselves:** workspace-level settings and local git config
  (`core.hooksPath`) live outside the repos entirely, so governance can be layered onto
  existing, unmodified repos and removed just as cleanly — no fork of the repo or the tooling
  is required.
- **Portability of the workspace definition:** the `.code-workspace` file itself is a small,
  shareable artifact describing "these repos, plus this governance" — a natural unit to extend
  as later phases add build, deployment, and support-stage tooling on top of the same
  existing-tools philosophy.

## Starting point

`sample-cws.code-workspace` is a multi-root VS Code workspace referencing two example repos
(`../ai_scout/copilot-ship`, `../ai_scout/scout-diaries/atlassian-mcp-server`). Their content
was explicitly out of scope for this discussion — they're stand-ins only.

Original ask had two parts:
1. **Centralize VS Code chat customizations to a predefined folder** (done this session).
2. **A fully isolated, multi-repo agentic workspace / harness driving the whole SDLC**
   (bigger idea, deliberately deferred — not yet scoped or designed).

## Concept: `~/.coworkspaces`

A per-user, per-workspace managed folder, one subfolder per `.code-workspace` file (named
after the workspace's basename), so different repo groupings don't collide:

```
~/.coworkspaces/
  sample-cws/
    instructions/   prompts/   agents/     # Copilot Chat customizations
    hooks/                                  # computational harness (see below)
    docs/specs/                             # design docs for this entity
```

## Part 1 — Centralized chat customizations (implemented)

- Added to `sample-cws.code-workspace`'s `"settings"` block:
  `chat.instructionsFilesLocations`, `chat.promptFilesLocations`, `chat.agentFilesLocations`
  — each pointing at `~/.coworkspaces/sample-cws/{instructions,prompts,agents}`. All three are
  VS Code settings shaped as `{ "path": true }` objects that **merge with** (not replace) the
  built-in `.github/instructions` etc. defaults — nothing gets blocked.
- Found and fixed a pre-existing typo in the workspace file (`~/.cowkrkspaces`, missing the
  `sample-cws/agents` subpath) that had silently broken this wiring.
- Added `~/.coworkspaces/sample-cws` as a **third folder root** in the workspace
  (`"name": "Agent Customizations (Harness)"`), using an **absolute path**, not `~` — VS
  Code's `~`-expansion is confirmed for the settings above but not documented for the
  `folders` array. Caveat: this hardcodes the workspace file to this machine's home dir; if
  ever shared across a team, that path needs templating per-user.
- Populated `agents/` with 3 sample `.agent.md` files (via a Haiku subagent) illustrating the
  format: `code-reviewer.agent.md`, `test-writer.agent.md`, `planner.agent.md`.
- `instructions/` and `prompts/` are still empty — not yet populated with real content.

## Part 2 — Computational harness (designed, not yet implemented)

New idea explored via `/superpowers:brainstorming`: extend `~/.coworkspaces/sample-cws` with
git hooks that give coding agents cheap automated feedback as they checkpoint work locally
(requirement → spec → design → plan → implementation), using git commits for durability and
traceability even without pushing.

**Full design doc:**
`~/.coworkspaces/sample-cws/docs/specs/2026-07-14-computational-harness-design.md`

Key decisions from that design:
- v1 scope: **secret/credential scanning** (hard block) + **lint/build smoke check** (soft
  nudge, never blocks). SDLC-stage-discipline checks and commit-size nudges deferred to v2.
- Wiring via `git config --local core.hooksPath` per repo — no files written into the repos
  themselves.
- Structure: `hooks/lib/` holds common, reusable check scripts (`secret-scan.sh`,
  `lint-nudge.sh`); each repo gets its own `hooks/<repo-name>/{pre-commit,config.json}` that
  sources the shared lib. Onboarding a repo is an explicit, individual step via
  `install.sh <repo-path> <repo-name>` — never a bulk operation.
- **Existing-hook safety:** `core.hooksPath` is exclusive (overrides `.git/hooks/` entirely),
  so `install.sh` detects any pre-existing hook setup (Husky, `pre-commit` framework, a
  committed `.git/hooks/pre-commit`) and records it as `chained_hooks_path` in `config.json`;
  the new `pre-commit` entrypoint runs that original hook first before running its own checks.
- Explicit per-repo `config.json` for the lint command (not auto-detection) — predictable,
  zero changes to repo files, revisit only if the number of onboarded repos grows large.

**Status:** spec written and self-reviewed, **awaiting your review** before moving to an
implementation plan (via `writing-plans`).

## Part 3 — VS Code Tasks for SDLC external integrations (explored, not yet designed)

New idea explored via `/grill-me-with-docs` against the [VS Code Tasks
docs](https://code.visualstudio.com/docs/debugtest/tasks): use VS Code Tasks (`tasks.json`) —
decoupled from the Part 2 git-hook harness, a separate concern — as a click-to-run way to pull
external context (starting with a Jira user story) into an SDLC session, avoiding manual
copy/paste and avoiding building a bespoke skill for it.

Decisions reached so far:
- Fetched artifact lands at `~/.coworkspaces/sample-cws/sdd/<task-id>/xxxxxxxx.md` —
  coworkspace-level, cross-repo, keyed by external (Jira) task ID. Not the same thing as
  `docs/specs/` (which is just an incidental artifact of this Claude conversation, not a
  deliberate structural element).
- Version control for `sdd/` is explicitly **not required now** — same "deferred" status as
  the still-open "should `~/.coworkspaces` become its own git repo" item below.
- Tasks are the right mechanism for the **inbound fetch** (deterministic, file-output, no LLM
  needed, no review required; VS Code Tasks natively support `${input:task-id}` prompting via
  `promptString`/`pickString` inputs).
- **Constraint that changes the outbound design:** agents in this environment have **no MCP
  access**, and `atlassian-mcp-server` in the workspace is a non-functional stand-in (per the
  original scoping — its content is out of scope, not real integration infrastructure). A
  research subagent's initial recommendation to use MCP tool-calling for the "post
  findings/comment back to Jira" step is therefore **not viable** and needs to be redesigned
  around plain Tasks + REST/CLI instead — likely: write a draft comment to a file, human edits
  it, a separate deterministic Task posts the file's contents to Jira (review happens via file
  edit, not an interactive MCP tool-call confirmation).

**Status:** still being interviewed via `/grill-me-with-docs` — not yet a settled design, no
implementation started.

## Open / deferred decisions

- Whether `~/.coworkspaces` (or the `sample-cws` subfolder) becomes its own git repo, so the
  harness assets are themselves version-controlled — deferred to MVP2 rollout.
- The larger "fully isolated multi-repo agentic SDLC harness" idea from the original ask —
  not yet decomposed or scoped. Likely the next brainstorming topic once Part 2 ships.

## To resume in a new chat

1. Point Claude at this file plus the spec doc above.
2. Decide: approve the harness spec as-is, or request changes.
3. If approved, next step is invoking `writing-plans` to turn the spec into an implementation
   plan (write the actual `secret-scan.sh`, `lint-nudge.sh`, per-repo entrypoints, and
   `install.sh`).
