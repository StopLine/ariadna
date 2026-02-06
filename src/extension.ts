import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "ariadna" is now active!');

    const disposable = vscode.commands.registerCommand('ariadna.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from Ariadna!');
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
