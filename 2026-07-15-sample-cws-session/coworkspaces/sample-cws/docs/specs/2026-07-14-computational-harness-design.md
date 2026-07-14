# Computational Harness for `~/.coworkspaces` — Design

**Date:** 2026-07-14
**Status:** Approved design, pending git-init decision (deferred to MVP2 rollout)

## Context

`~/.coworkspaces/sample-cws/` is a per-user, per-workspace managed folder wired into
`sample-cws.code-workspace` via VS Code's `chat.instructionsFilesLocations`,
`chat.promptFilesLocations`, and `chat.agentFilesLocations` settings, and included as a
workspace root so its contents (`instructions/`, `prompts/`, `agents/`) can be browsed and
edited directly. This design extends that entity with a **computational harness**: git hooks
that give coding agents cheap, automated feedback as they checkpoint work (requirement → spec
→ design → plan → implementation) via local commits.

The driving motivation: agents executing a task end-to-end benefit from committing at each
step for durability and traceability, even without pushing. Cheap computational checks at
each of those commits are valuable signal, without adding friction that would discourage
frequent checkpointing.

## Scope (v1)

Two checks:
1. **Secret/credential scanning** — hard block.
2. **Lint/build smoke check** — soft nudge, never blocks.

Explicitly out of scope for v1 (deferred): SDLC-stage-discipline checks (commit message
tagging, spec-before-code ordering) and commit-size hygiene nudges. Both are candidates for
v2, added as new files under `hooks/lib/`.

## Folder layout

```
~/.coworkspaces/sample-cws/
  instructions/ prompts/ agents/     # existing, unchanged by this design
  docs/specs/                         # this document
  hooks/
    lib/
      secret-scan.sh      # common: hard-block check, shared by every repo
      lint-nudge.sh        # common: soft-nudge check, shared by every repo
    copilot-ship/
      pre-commit            # entrypoint; sources ../lib/*.sh
      config.json             # { "lint_cmd": "npm run lint", "chained_hooks_path": null }
    atlassian-mcp-server/
      pre-commit
      config.json
    install.sh                 # install.sh <repo-abs-path> <repo-name>
```

## Wiring

`install.sh <repo-path> <repo-name>` is run once, individually, per repo being onboarded —
never as a bulk operation over the whole workspace. It:

1. Checks the repo's current `git config --local core.hooksPath`. If it's already set to our
   own `hooks/<repo-name>` path, this is a re-run: skip existing-hook detection and exit
   (idempotent).
2. Otherwise, detects any existing hook setup: the current `core.hooksPath` value if one is
   set, or `.git/hooks/pre-commit` if it exists and is a real (non-sample) executable script.
   If found, records that path into `config.json` as `"chained_hooks_path"`.
3. Sets `git config --local core.hooksPath ~/.coworkspaces/sample-cws/hooks/<repo-name>`.

This is a local `.git/config` change only — nothing is written into the repo's tracked files,
satisfying the "minimal changes to existing repos" constraint.

## Commit-time flow

On `git commit` in a wired repo, `hooks/<repo-name>/pre-commit` runs:

1. **Chained hook (if recorded):** if `config.json` has a non-null `chained_hooks_path`, run
   that script first. If it fails (nonzero exit), abort immediately — preserves whatever
   behavior the repo's existing hook tooling (e.g. Husky, `pre-commit` framework) already had,
   since `core.hooksPath` is exclusive and would otherwise silently disable it.
2. **`secret-scan.sh` (hard block):** scans `git diff --cached` (staged changes only) against
   a curated regex list — AWS access keys, PEM private key headers, GitHub/Slack token
   prefixes, generic `password/secret/token =` assignments with a suspicious-looking value.
   Nonzero exit **aborts the commit**, printing the offending line and pattern matched.
3. **`lint-nudge.sh` (soft nudge):** reads `lint_cmd` from `config.json`. If unset, or the
   command isn't found on `PATH`, prints a one-line "skipped" notice and exits 0. Otherwise
   runs it and prints pass/fail. **Never aborts the commit**, regardless of outcome.

## Error handling

- Missing/malformed `config.json`: treated as "no lint command configured" — nudge is
  skipped, commit proceeds normally. Never a hard failure.
- `secret-scan.sh` errors internally (not a match, but a script bug/crash): fails closed —
  treated as a block, since a broken scanner is not a safe scanner. This trades a rare false
  block for never silently skipping secret scanning.
- Chained hook script missing or not executable at commit time (e.g. deleted after install):
  logged as a warning, does not block — since the original hook's absence isn't something
  this harness caused.

## Testing / verification

1. Run `install.sh` for `copilot-ship`.
2. Stage a file containing a fake AWS access key, attempt to commit → confirm blocked with a
   clear message identifying the pattern matched.
3. Fix the file, commit again with no `lint_cmd` configured → confirm it succeeds with a
   "lint_cmd not configured, skipping" nudge.
4. Add `"lint_cmd": "exit 1"` to `config.json`, commit again → confirm it still succeeds, with
   a "lint failed" nudge printed.
5. Simulate an existing hook: create a dummy `.git/hooks/pre-commit` that exits 1 *before*
   running `install.sh`, then install → confirm the chained hook still blocks the commit.

## Open items deferred past v1

- Whether `~/.coworkspaces` (or `~/.coworkspaces/sample-cws`) becomes its own git repo, so
  the harness assets themselves are version-controlled. Deferred to MVP2 rollout.
- SDLC-stage-discipline checks and commit-size nudges (see Scope).
- Auto-detection of lint commands (rejected for v1 in favor of explicit `config.json`, may be
  revisited if the number of onboarded repos grows large enough that manual config becomes a
  burden).
