import * as vscode from 'vscode';

class AriadnaTreeDataProvider implements vscode.TreeDataProvider<void> {
    getTreeItem(): vscode.TreeItem {
        return new vscode.TreeItem('');
    }

    getChildren(): void[] {
        return [];
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "ariadna" is now active!');

    const treeDataProvider = new AriadnaTreeDataProvider();
    vscode.window.registerTreeDataProvider('ariadnaView', treeDataProvider);

    const disposable = vscode.commands.registerCommand('ariadna.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from Ariadna!');
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
