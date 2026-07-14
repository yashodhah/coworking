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
