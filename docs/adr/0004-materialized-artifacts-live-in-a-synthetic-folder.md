---
status: accepted
---

# Materialized artifacts live in a synthetic, non-repo folder — never in a cloned Root

When the resolver turns a Coworking Space Manifest into a Resolved Coworking Space for VS Code, it materializes declared customizations (Skills, Instructions, Commands, **Setup**) into whatever native files GitHub Copilot / Claude discover (`.github/instructions/*.instructions.md`, `.github/prompts/*.prompt.md`, `.github/agents/*.agent.md`, etc.). We decided none of these materialized files are ever written into a cloned Root's own repo — instead, the resolver adds one extra, non-repo folder to the generated `.code-workspace`'s `folders` list (a sibling of the cloned Roots at `<chosen-parent>/<workspace-name>`), and every materialized artifact — `global` and per-Root alike — lives there.

This was driven by two confirmed facts about VS Code, not assumption: (1) Copilot/Claude's customization discovery is scoped per opened workspace folder by default — there is no built-in "applies to every folder in this multi-root workspace" location, so a `global` artifact has no natural single home if scattered across cloned repos. (2) VS Code exposes workspace-level settings (`chat.instructionsFilesLocations`, `chat.promptFilesLocations`, `chat.agentFilesLocations`, `chat.agentSkillsLocations`, `chat.hookFilesLocations`) that add extra search locations and can be set directly in the `.code-workspace` file's `settings` block — so a single shared folder can be made discoverable workspace-wide without needing to touch any cloned repo. Per-Root scoping, where needed, is achieved through each customization type's own native mechanism (e.g. an `.instructions.md` file's `applyTo: "backend/**"` glob) rather than by physical location.

## Considered Options

- **Duplicate global artifacts into every Root's own `.github/`.** Rejected: redundant for content meant to be authored once, and risks silent drift if one Root's copy is edited independently of the others.
- **Write per-Root artifacts directly into each cloned repo's own `.github/`.** Rejected: breaks the precedent already established for Git Hooks (materialized content is never copied into or committed to the target Root repo), and conflicts with `.github/`'s normal status as tracked, committed repo content — unlike `.git/hooks`, which is inherently untracked.

## Consequences

- Nothing the resolver materializes is ever written into a cloned Root repo, for any customization type — the same guarantee Git Hooks already had now holds workspace-wide, with no per-type carve-out.
- A resolved workspace always shows one extra, non-repo folder in the VS Code explorer alongside the cloned Roots. That folder has no source repo of its own and isn't cloned from anywhere.
- The resolver must set the relevant `*FilesLocations` settings in the generated `.code-workspace`'s `settings` block to point at this folder, and use each customization type's own scoping mechanism (e.g. `applyTo` globs) for anything that should behave as per-Root despite living in a shared location.
