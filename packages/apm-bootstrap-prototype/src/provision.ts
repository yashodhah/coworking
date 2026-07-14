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
