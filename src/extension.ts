import * as vscode from 'vscode';
import { type AriadnaThread, ValidationError, validateThread, normalizeThread } from './model';

let currentThread: AriadnaThread | null = null;

class AriadnaTreeDataProvider implements vscode.TreeDataProvider<void> {
    getTreeItem(): vscode.TreeItem {
        return new vscode.TreeItem('');
    }

    getChildren(): void[] {
        return [];
    }
}

async function loadThread(): Promise<void> {
    const uris = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: { 'Ariadna Thread': ['json'] },
        title: 'Load Ariadna Thread',
    });
    if (!uris || uris.length === 0) {
        return;
    }

    const fileContent = await vscode.workspace.fs.readFile(uris[0]);
    const text = Buffer.from(fileContent).toString('utf-8');

    let data: AriadnaThread;
    try {
        data = normalizeThread(JSON.parse(text));
    } catch {
        await vscode.window.showErrorMessage('Failed to parse JSON file', { modal: true });
        return;
    }

    try {
        validateThread(data);
    } catch (err) {
        if (err instanceof ValidationError) {
            await vscode.window.showErrorMessage(
                `Validation error in field "${err.field}":\n${err.message}`,
                { modal: true },
            );
        } else {
            await vscode.window.showErrorMessage(
                `Unexpected error: ${err}`,
                { modal: true },
            );
        }
        return;
    }

    currentThread = data;
    vscode.window.showInformationMessage(`Thread "${data.title}" loaded`);
}

export function activate(context: vscode.ExtensionContext) {
    const treeDataProvider = new AriadnaTreeDataProvider();
    vscode.window.registerTreeDataProvider('ariadnaView', treeDataProvider);

    context.subscriptions.push(
        vscode.commands.registerCommand('ariadna.helloWorld', () => {
            vscode.window.showInformationMessage('Hello World from Ariadna!');
        }),
        vscode.commands.registerCommand('ariadna.loadThread', loadThread),
    );
}

export function deactivate() {}

export function _getCurrentThread(): AriadnaThread | null {
    return currentThread;
}
