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
