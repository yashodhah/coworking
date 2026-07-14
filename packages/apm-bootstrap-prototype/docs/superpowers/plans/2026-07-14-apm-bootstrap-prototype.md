# apm Bootstrap Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a throwaway VS Code extension that provisions `apm-cli` into a private venv and lets a developer confirm from inside VS Code that the resulting `apm` executable runs.

**Architecture:** A TypeScript VS Code extension with two Command Palette commands (`apmBootstrap.setup`, `apmBootstrap.testVersion`) backed by two logic modules (`src/provision.ts`, `src/runApm.ts`) and one shared child-process helper (`src/childProcess.ts`), wired together in `src/extension.ts`.

**Tech Stack:** TypeScript 7, `@types/vscode` ^1.125.0, Node's built-in `child_process`/`fs`/`path` modules, no runtime dependencies.

## Global Constraints

- `apm-cli` version is pinned to exactly `0.25.0`, hardcoded in `src/provision.ts` — never resolved dynamically from PyPI.
- Target platforms are macOS/Linux only (`python3` on PATH, `bin/` venv layout) — no Windows path handling.
- No automated test suite. All verification in this plan is manual: `npm run compile` for type-correctness, plus running the extension in the Extension Development Host (F5) and/or invoking compiled pure-Node modules directly.
- No out-of-band/background provisioning, no hidden identity (command titles and messages name "apm" and "python" directly), no Health Check/version-mismatch re-provisioning, no auto-rebuild-and-retry. Setup runs synchronously in the foreground under `vscode.window.withProgress` and reports failures once, as-is.
- A single try/catch per command wraps the `child_process` calls; error notifications show raw stderr, never rephrased or hidden.

---

## File Structure

- `package.json` — extension manifest: name, `main`, `contributes.commands` (both commands), build scripts, devDependencies.
- `tsconfig.json` — compiler options (`src` → `out`, CommonJS, ES2022, strict).
- `.vscode/launch.json` — F5 launch config for the Extension Development Host.
- `.vscode/tasks.json` — background `npm: watch` task used as `launch.json`'s `preLaunchTask`.
- `.gitignore` — excludes `node_modules/`, `out/`.
- `src/childProcess.ts` — shared `runCommand()` helper (spawn + capture stdout/stderr/exit code) and `lastStderrLine()`. Pure Node, no `vscode` import — independently runnable via `node` after compiling.
- `src/provision.ts` — `getVenvDir()` and `provisionApm()`: locates `python3`, creates the venv, pip-installs the pinned `apm-cli` version, reports progress/success/failure.
- `src/runApm.ts` — `testApmVersion()`: locates `<venv>/bin/apm`, spawns `--version`, reports the result.
- `src/extension.ts` — `activate()`/`deactivate()`: registers both commands.

---

### Task 1: Scaffold the extension project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.vscode/launch.json`
- Create: `.vscode/tasks.json`
- Create: `.gitignore`
- Create: `src/extension.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a compilable, launchable extension shell with no commands registered yet. Later tasks add imports to `src/extension.ts` and entries to `package.json`'s `contributes.commands` array.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "apm-bootstrap-prototype",
  "displayName": "APM Bootstrap Prototype",
  "description": "Throwaway prototype that provisions apm-cli into a private venv and confirms it runs from VS Code.",
  "version": "0.0.1",
  "private": true,
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": ["Other"],
  "main": "./out/extension.js",
  "activationEvents": [],
  "contributes": {
    "commands": []
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./"
  },
  "devDependencies": {
    "@types/vscode": "^1.125.0",
    "@types/node": "^20.11.0",
    "typescript": "^7.0.2"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2022",
    "lib": ["ES2022"],
    "outDir": "out",
    "rootDir": "src",
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "exclude": ["node_modules", ".vscode-test"]
}
```

- [ ] **Step 3: Create `.vscode/launch.json`**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
      "outFiles": ["${workspaceFolder}/out/**/*.js"],
      "preLaunchTask": "npm: watch"
    }
  ]
}
```

- [ ] **Step 4: Create `.vscode/tasks.json`**

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "npm",
      "script": "watch",
      "problemMatcher": "$tsc-watch",
      "isBackground": true,
      "presentation": {
        "reveal": "never"
      },
      "group": {
        "kind": "build",
        "isDefault": true
      }
    }
  ]
}
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules/
out/
*.vsix
```

- [ ] **Step 6: Create `src/extension.ts`**

```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // Commands are registered by later tasks.
}

export function deactivate() {}
```

- [ ] **Step 7: Install dependencies and compile**

Run: `npm install && npm run compile`
Expected: exits 0, creates `out/extension.js`.

- [ ] **Step 8: Manually launch the Extension Development Host**

In VS Code, open this folder and press F5 (or Run > Start Debugging). Expected: a new "Extension Development Host" window opens with no errors in the Debug Console. Close that window when done.

- [ ] **Step 9: Commit**

```bash
git add package.json tsconfig.json .vscode/launch.json .vscode/tasks.json .gitignore src/extension.ts
git commit -m "chore: scaffold apm bootstrap prototype extension"
```

---

### Task 2: Shared child-process helper

**Files:**
- Create: `src/childProcess.ts`

**Interfaces:**
- Consumes: nothing beyond Node's `child_process` module.
- Produces: `runCommand(command: string, args: string[]): Promise<CommandResult>` where `CommandResult = { code: number; stdout: string; stderr: string }`, and `lastStderrLine(stderr: string): string`. Both `src/provision.ts` (Task 3) and `src/runApm.ts` (Task 4) import these from `./childProcess`.

- [ ] **Step 1: Create `src/childProcess.ts`**

```typescript
import { spawn } from 'child_process';

export interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

export function runCommand(command: string, args: string[]): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (err) => reject(err));
    child.on('close', (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

export function lastStderrLine(stderr: string): string {
  const lines = stderr.trim().split('\n');
  return lines[lines.length - 1] ?? '';
}
```

- [ ] **Step 2: Compile**

Run: `npm run compile`
Expected: exits 0, creates `out/childProcess.js`.

- [ ] **Step 3: Manually verify the success path**

Run: `node -e "require('./out/childProcess').runCommand('python3', ['--version']).then(r => console.log(JSON.stringify(r)))"`
Expected: prints something like `{"code":0,"stdout":"Python 3.11.x\n","stderr":""}` (exact patch version varies).

- [ ] **Step 4: Manually verify the error path**

Run: `node -e "require('./out/childProcess').runCommand('definitely-not-a-real-command', []).catch(e => console.log('rejected:', e.code))"`
Expected: prints `rejected: ENOENT`.

- [ ] **Step 5: Commit**

```bash
git add src/childProcess.ts
git commit -m "feat: add shared child-process helper"
```

---

### Task 3: Provisioning (`apmBootstrap.setup`)

**Files:**
- Create: `src/provision.ts`
- Modify: `src/extension.ts`
- Modify: `package.json` (`contributes.commands`)

**Interfaces:**
- Consumes: `runCommand`, `lastStderrLine` from `./childProcess` (Task 2).
- Produces: `getVenvDir(context: vscode.ExtensionContext): string` and `provisionApm(context: vscode.ExtensionContext): Promise<void>`. `getVenvDir` is consumed by `src/runApm.ts` in Task 4.

- [ ] **Step 1: Create `src/provision.ts`**

```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import { runCommand, lastStderrLine } from './childProcess';

const APM_CLI_VERSION = '0.25.0';

export function getVenvDir(context: vscode.ExtensionContext): string {
  return path.join(context.globalStorageUri.fsPath, 'apm-venv');
}

export async function provisionApm(context: vscode.ExtensionContext): Promise<void> {
  try {
    const pythonCheck = await runCommand('python3', ['--version']);
    if (pythonCheck.code !== 0) {
      vscode.window.showErrorMessage(
        `apm Bootstrap: python3 not found on PATH (${lastStderrLine(pythonCheck.stderr) || 'no output'}).`
      );
      return;
    }

    const venvDir = getVenvDir(context);

    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'apm Bootstrap', cancellable: false },
      async (progress) => {
        progress.report({ message: 'Creating environment...' });
        const venvResult = await runCommand('python3', ['-m', 'venv', venvDir]);
        if (venvResult.code !== 0) {
          vscode.window.showErrorMessage(
            `apm Bootstrap: failed to create venv (${lastStderrLine(venvResult.stderr) || 'no output'}).`
          );
          return;
        }

        progress.report({ message: 'Installing apm...' });
        const pipPath = path.join(venvDir, 'bin', 'pip');
        const installResult = await runCommand(pipPath, ['install', `apm-cli==${APM_CLI_VERSION}`]);
        if (installResult.code !== 0) {
          vscode.window.showErrorMessage(
            `apm Bootstrap: failed to install apm-cli (${lastStderrLine(installResult.stderr) || 'no output'}).`
          );
          return;
        }

        vscode.window.showInformationMessage('apm Bootstrap: apm set up.');
      }
    );
  } catch (err) {
    vscode.window.showErrorMessage(`apm Bootstrap: ${(err as Error).message}`);
  }
}
```

- [ ] **Step 2: Register the command in `src/extension.ts`**

Replace the file's contents with:

```typescript
import * as vscode from 'vscode';
import { provisionApm } from './provision';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('apmBootstrap.setup', () => provisionApm(context))
  );
}

export function deactivate() {}
```

- [ ] **Step 3: Add the command to `package.json`**

In `package.json`, change:

```json
  "contributes": {
    "commands": []
  },
```

to:

```json
  "contributes": {
    "commands": [
      {
        "command": "apmBootstrap.setup",
        "title": "APM Bootstrap: Set Up apm"
      }
    ]
  },
```

- [ ] **Step 4: Compile**

Run: `npm run compile`
Expected: exits 0.

- [ ] **Step 5: Manually verify via the Extension Development Host**

1. Press F5 to launch the Extension Development Host.
2. Open the Command Palette and run "APM Bootstrap: Set Up apm".
3. Expected: a progress notification shows "Creating environment..." then "Installing apm...", followed by an info notification "apm Bootstrap: apm set up."

- [ ] **Step 6: Manually verify the venv on disk**

Run (macOS/Linux):

```bash
find ~/Library/Application\ Support/Code/User/globalStorage ~/.config/Code/User/globalStorage -maxdepth 1 -iname "*apm-bootstrap-prototype*" 2>/dev/null
```

Expected: one matching directory. Then:

```bash
ls <that-directory>/apm-venv/bin/apm
<that-directory>/apm-venv/bin/apm --version
```

Expected: the `apm` file exists and running it directly prints a version string containing `0.25.0`.

- [ ] **Step 7: Commit**

```bash
git add src/provision.ts src/extension.ts package.json
git commit -m "feat: add apm provisioning setup command"
```

---

### Task 4: Version check (`apmBootstrap.testVersion`)

**Files:**
- Create: `src/runApm.ts`
- Modify: `src/extension.ts`
- Modify: `package.json` (`contributes.commands`)

**Interfaces:**
- Consumes: `runCommand` from `./childProcess` (Task 2), `getVenvDir` from `./provision` (Task 3).
- Produces: `testApmVersion(context: vscode.ExtensionContext): Promise<void>`.

- [ ] **Step 1: Create `src/runApm.ts`**

```typescript
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { runCommand } from './childProcess';
import { getVenvDir } from './provision';

export async function testApmVersion(context: vscode.ExtensionContext): Promise<void> {
  const apmPath = path.join(getVenvDir(context), 'bin', 'apm');

  if (!fs.existsSync(apmPath)) {
    vscode.window.showErrorMessage(
      'apm Bootstrap: apm is not set up yet. Run "APM Bootstrap: Set Up apm" first.'
    );
    return;
  }

  try {
    const result = await runCommand(apmPath, ['--version']);
    if (result.code === 0) {
      vscode.window.showInformationMessage(`apm Bootstrap: ${result.stdout.trim()}`);
    } else {
      vscode.window.showErrorMessage(
        `apm Bootstrap: apm --version failed (${result.stderr.trim() || 'no output'}).`
      );
    }
  } catch (err) {
    vscode.window.showErrorMessage(`apm Bootstrap: ${(err as Error).message}`);
  }
}
```

- [ ] **Step 2: Register the command in `src/extension.ts`**

Replace the file's contents with:

```typescript
import * as vscode from 'vscode';
import { provisionApm } from './provision';
import { testApmVersion } from './runApm';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('apmBootstrap.setup', () => provisionApm(context)),
    vscode.commands.registerCommand('apmBootstrap.testVersion', () => testApmVersion(context))
  );
}

export function deactivate() {}
```

- [ ] **Step 3: Add the command to `package.json`**

In `package.json`, change:

```json
  "contributes": {
    "commands": [
      {
        "command": "apmBootstrap.setup",
        "title": "APM Bootstrap: Set Up apm"
      }
    ]
  },
```

to:

```json
  "contributes": {
    "commands": [
      {
        "command": "apmBootstrap.setup",
        "title": "APM Bootstrap: Set Up apm"
      },
      {
        "command": "apmBootstrap.testVersion",
        "title": "APM Bootstrap: Run apm --version"
      }
    ]
  },
```

- [ ] **Step 4: Compile**

Run: `npm run compile`
Expected: exits 0.

- [ ] **Step 5: Manually verify the "not set up" path**

Rename or delete the `apm-venv` directory found in Task 3 Step 6 (e.g. `mv <that-directory>/apm-venv <that-directory>/apm-venv.bak`). Then:

1. Press F5 to launch the Extension Development Host.
2. Run "APM Bootstrap: Run apm --version" from the Command Palette.
3. Expected: error notification "apm Bootstrap: apm is not set up yet. Run \"APM Bootstrap: Set Up apm\" first."
4. Restore the venv: `mv <that-directory>/apm-venv.bak <that-directory>/apm-venv`.

- [ ] **Step 6: Manually verify the success path**

1. In the same or a new Extension Development Host window, run "APM Bootstrap: Run apm --version".
2. Expected: info notification "apm Bootstrap: ..." containing a version string with `0.25.0`.

- [ ] **Step 7: Commit**

```bash
git add src/runApm.ts src/extension.ts package.json
git commit -m "feat: add apm version check command"
```

---

### Task 5: End-to-end manual verification

**Files:** none (verification only).

**Interfaces:**
- Consumes: both commands from Tasks 3 and 4.
- Produces: nothing further — this is the plan's final deliverable check, matching the spec's Testing Plan exactly.

- [ ] **Step 1: Start from a clean slate**

Delete any leftover venv from earlier tasks:

```bash
find ~/Library/Application\ Support/Code/User/globalStorage ~/.config/Code/User/globalStorage -maxdepth 1 -iname "*apm-bootstrap-prototype*" -exec rm -rf {} \; 2>/dev/null
```

- [ ] **Step 2: Run the full flow**

1. Press F5 to launch the Extension Development Host.
2. Run "APM Bootstrap: Set Up apm" from the Command Palette. Expected: progress notification, then "apm Bootstrap: apm set up."
3. Run "APM Bootstrap: Run apm --version" from the Command Palette. Expected: info notification with a version string containing `0.25.0`.

- [ ] **Step 3: Confirm this matches the spec's Testing Plan**

Re-read the "Testing Plan" section of `docs/superpowers/specs/2026-07-14-apm-bootstrap-prototype-design.md` and confirm both steps above match its two manual checks. No automated test suite is expected — this manual flow is the deliverable.

- [ ] **Step 4: Commit (if anything changed)**

```bash
git status
```

If nothing is staged (this task is verification-only), there is nothing to commit — skip. Otherwise:

```bash
git add -A
git commit -m "chore: complete manual end-to-end verification"
```
