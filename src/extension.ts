import * as vscode from 'vscode';
import { type AriadnaThread, type Node, ValidationError, validateThread, normalizeThread } from './model';

let currentThread: AriadnaThread | null = null;

type TreeElement = AriadnaThread | Node;

function isThread(element: TreeElement): element is AriadnaThread {
    return 'title' in element && !('caption' in element);
}

class AriadnaTreeDataProvider implements vscode.TreeDataProvider<TreeElement> {
    private thread: AriadnaThread | null = null;

    private _onDidChangeTreeData = new vscode.EventEmitter<TreeElement | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    setThread(thread: AriadnaThread): void {
        this.thread = thread;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TreeElement): vscode.TreeItem {
        if (isThread(element)) {
            const item = new vscode.TreeItem(
                element.title,
                element.root
                    ? vscode.TreeItemCollapsibleState.Expanded
                    : vscode.TreeItemCollapsibleState.None,
            );
            item.tooltip = element.description ?? undefined;
            return item;
        }

        const node = element;
        const item = new vscode.TreeItem(
            node.caption,
            node.childs.length > 0
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None,
        );
        if (node.srcLink) {
            item.description = `${node.srcLink.path}:${node.srcLink.lineNum}`;
        }
        return item;
    }

    getChildren(element?: TreeElement): TreeElement[] {
        if (!element) {
            return this.thread ? [this.thread] : [];
        }
        if (isThread(element)) {
            return element.root ? [element.root] : [];
        }
        return element.childs;
    }
}

let treeDataProvider: AriadnaTreeDataProvider;

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
    treeDataProvider.setThread(data);
    vscode.window.showInformationMessage(`Thread "${data.title}" loaded`);
}

export function activate(context: vscode.ExtensionContext) {
    treeDataProvider = new AriadnaTreeDataProvider();
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
