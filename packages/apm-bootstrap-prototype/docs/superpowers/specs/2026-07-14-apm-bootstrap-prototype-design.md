# apm Bootstrap Prototype: Design

## Purpose

A minimal, throwaway VS Code extension that proves out the core mechanism from `CONTEXT.md`: provisioning a private copy of `apm` (via `apm-cli` on PyPI) into an extension-owned Python virtual environment, and confirming from inside VS Code that the resulting `apm` executable actually runs.

This is explicitly a prototype, not an implementation of the full design already captured in `docs/adr/`. It exists to validate the pip-install-into-a-venv mechanism and give a working "does it run" test loop, before the ADR-level nuance (out-of-band provisioning, hidden identity, pinned-version health checks, pip config passthrough, auto-rebuild-and-retry) gets built on top of it in a later pass.

## Non-goals

- No dependency-tree UI, activity bar view, or any of the commands from the unrelated `apm-vscode-extension` project (that project assumes `apm` is already on PATH; this prototype is about provisioning it).
- No out-of-band/background provisioning or cross-window lock file (ADR 0001) — setup runs in the foreground and blocks on a visible progress bar.
- No hiding of apm's identity (ADR 0003) — command titles and messages name "apm" and "python" directly; this is a dev-facing prototype.
- No Health Check / version-mismatch re-provisioning (ADR 0002's re-trigger behavior) — the test command just runs `apm --version` once and reports the result.
- No auto-rebuild-and-retry on failure (ADR 0005) — failures are reported as-is, once, with no self-heal.
- No automated test suite — verification is manual (see Testing Plan).
- No Windows-specific path handling — targets macOS/Linux (`python3` on PATH, `bin/` layout).

## Architecture

A single VS Code extension (TypeScript), registering two Command Palette commands:

- **`apmBootstrap.setup`** — *"APM Bootstrap: Set Up apm"*
- **`apmBootstrap.testVersion`** — *"APM Bootstrap: Run apm --version"*

Two modules:

- **`src/provision.ts`** — locates `python3` on PATH, creates a venv at `<globalStorageUri>/apm-venv`, installs `apm-cli==0.25.0` into it. Runs synchronously in the foreground under `vscode.window.withProgress`.
- **`src/runApm.ts`** — locates `<globalStorageUri>/apm-venv/bin/apm` and spawns it with `--version`, capturing stdout/stderr/exit code.

`src/extension.ts` wires both commands up in `activate()`.

## Data Flow

**Setup (`apmBootstrap.setup`):**
1. Spawn `python3 --version` to confirm a system Python exists. Not found → error notification, stop.
2. Run `python3 -m venv <globalStorageUri>/apm-venv`, shown as a `withProgress` step ("Creating environment...").
3. Run `<venv>/bin/pip install apm-cli==0.25.0`, shown as the next progress step ("Installing apm...").
4. Success → info notification ("apm set up"). Failure at either step → error notification including the last line of stderr.

**Test (`apmBootstrap.testVersion`):**
1. Check `<globalStorageUri>/apm-venv/bin/apm` exists. Missing → notification directing the user to run Setup first (no auto-provisioning trigger).
2. Spawn it with `--version`, capture stdout/stderr/exit code.
3. Exit 0 → info notification showing the version string. Non-zero → error notification showing stderr.

## Error Handling

A single try/catch per command around the `child_process` calls. Failures surface directly as VS Code error notifications with raw stderr — no retry, no self-heal, no rephrased/hidden messaging. This is the minimum error handling that still makes failures diagnosable.

## Version Pinning

`apm-cli==0.25.0` (latest on PyPI as of 2026-07-14) is hardcoded in `provision.ts`. This gives reproducibility without building the full Pinned Version / Health Check re-provisioning machinery from ADR 0002.

## Testing Plan

No automated test suite. Manual verification:
1. Press F5 to launch the Extension Development Host.
2. Run *"APM Bootstrap: Set Up apm"* from the Command Palette — confirm it completes with a success notification.
3. Run *"APM Bootstrap: Run apm --version"* — confirm it prints a version string in a notification.

This manual two-command flow is the deliverable answer to "a simple way to test that apm has been installed and its commands can be executed from VS Code."

## Relationship to Existing ADRs

The ADRs in `docs/adr/` describe the target end-state design for a production-quality provisioning system. This prototype intentionally implements a subset of that mechanism (venv creation + pinned pip install + a manual run check) without the ADR-level robustness. A follow-up design pass should revisit each ADR and layer its behavior onto this prototype's foundation once the core mechanism is proven out.
