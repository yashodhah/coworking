# apm-wxtension: apm Bootstrap

This context covers how the VS Code extension silently provisions and manages its own private copy of the `apm` command-line tool, without touching the user's system Python.

## Language

**apm-cli**:
The PyPI package name. What you `pip install`.
_Avoid_: "apm" when specifically referring to the package (use "apm-cli" for the package, "apm" for the resulting command).

**apm**:
The command-line executable that `apm-cli` installs (e.g. `.../apm-venv/bin/apm`). What actually gets invoked at runtime.
_Avoid_: "apm CLI" as a precise term — fine informally, but "apm" is the executable's exact name.

**Managed Environment**:
The extension-owned Python virtual environment at `<globalStorageUri>/apm-venv/`, containing the private Python, pip, and the installed `apm` executable. Fully isolated from the user's system Python; owned and disposable by the extension.
_Avoid_: "the venv" in user-facing text (fine in code/logs); "install" alone (ambiguous with "installing the extension").

**System Python**:
A Python 3.10+ interpreter already present on the user's machine, discovered via `PATH` (or the `py` launcher on Windows). Used only as the tool that creates the Managed Environment — never itself modified or installed into.

**Provisioning**:
The end-to-end flow that builds a working Managed Environment from scratch: locate a System Python, create the venv, upgrade pip, install the pinned `apm-cli` version, then run a Health Check to confirm it worked.
_Avoid_: "installing apm" as a stand-in for the whole flow — Provisioning is the umbrella term; installing `apm-cli` via pip is one step within it.

**Health Check**:
A fast (≤5-10s), non-destructive invocation of the `apm` executable that confirms both that it runs successfully and that its reported version matches the version pinned by the current extension release. A failed or mismatched Health Check means the Managed Environment is treated as "not provisioned," triggering Provisioning.
_Avoid_: "version check" alone — the Health Check compares against the pinned version, not just "does it run."

**Pinned Version**:
The exact `apm-cli` version number baked into a given release of the extension (e.g. `apm-cli==1.4.0`). Provisioning always installs this exact version; it never floats to "whatever is latest on PyPI."

## Relationships

- **Provisioning** builds a **Managed Environment** using a **System Python**.
- A **Health Check** validates a **Managed Environment** — checked on every activation, and re-run automatically if `apm` fails unexpectedly mid-session.
- A **Health Check** compares the installed version of `apm-cli` against the current **Pinned Version**; a mismatch is treated the same as a broken environment and re-triggers **Provisioning**.

## Example dialogue

> **Dev:** "The user already has `apm` on their system PATH from a global `pip install apm-cli` — do we use that?"
> **Domain expert:** "No. We only ever use the copy inside the **Managed Environment**. A **System Python** is just the tool we use to *build* that environment — we never invoke a **System Python**'s own `apm` or site-packages directly."

> **Dev:** "We bumped the **Pinned Version** in the new extension release. Existing users still have the old one installed — do they get stuck on it?"
> **Domain expert:** "No — the next **Health Check** compares installed vs pinned, sees the mismatch, and re-runs **Provisioning** automatically."

## Flagged ambiguities

- The spec's title says "apm CLI Bootstrap" and uses "apm CLI" loosely throughout to mean the whole tool. Resolved: **apm-cli** is the package name, **apm** is the executable name — use them precisely in implementation and internal docs. (Verified against the real PyPI listing.)
- "install" was used both for "installing the extension" and "installing apm-cli into the venv." Resolved: use **Provisioning** for the latter to avoid collision.
