import * as path from 'path';
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
        item.command = {
            command: 'ariadna.selectNode',
            title: 'Select Node',
            arguments: [node],
        };
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

type DetailItem = { label: string; value?: string; children?: DetailItem[] };

class NodeDetailTreeProvider implements vscode.TreeDataProvider<DetailItem> {
    private items: DetailItem[] = [];

    private _onDidChangeTreeData = new vscode.EventEmitter<DetailItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    showNode(node: Node): void {
        const items: DetailItem[] = [
            { label: 'id', value: String(node.id) },
            { label: 'parentId', value: node.parentId === null ? 'null' : String(node.parentId) },
            { label: 'caption', value: node.caption },
        ];

        if (node.srcLink) {
            items.push({
                label: 'srcLink',
                children: [
                    { label: 'path', value: node.srcLink.path },
                    { label: 'lineNum', value: String(node.srcLink.lineNum) },
                    { label: 'lineContent', value: node.srcLink.lineContent },
                ],
            });
        } else {
            items.push({ label: 'srcLink', value: 'null' });
        }

        if (node.comments.length > 0) {
            items.push({
                label: 'comments',
                children: node.comments.map((c, i) => ({ label: `[${i}]`, value: c })),
            });
        } else {
            items.push({ label: 'comments', value: '(empty)' });
        }

        if (node.visualMarks.length > 0) {
            items.push({
                label: 'visualMarks',
                children: node.visualMarks.map((m, i) => ({ label: `[${i}]`, value: `${m.char} ${m.name}` })),
            });
        } else {
            items.push({ label: 'visualMarks', value: '(empty)' });
        }

        this.items = items;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DetailItem): vscode.TreeItem {
        const hasChildren = element.children && element.children.length > 0;
        const item = new vscode.TreeItem(
            element.label,
            hasChildren
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.None,
        );
        if (element.value !== undefined) {
            item.description = element.value;
        }
        return item;
    }

    getChildren(element?: DetailItem): DetailItem[] {
        if (!element) {
            return this.items;
        }
        return element.children ?? [];
    }
}

let treeDataProvider: AriadnaTreeDataProvider;
let detailProvider: NodeDetailTreeProvider;

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

    detailProvider = new NodeDetailTreeProvider();
    vscode.window.registerTreeDataProvider('ariadnaDetail', detailProvider);

    context.subscriptions.push(
        vscode.commands.registerCommand('ariadna.helloWorld', () => {
            vscode.window.showInformationMessage('Hello World from Ariadna!');
        }),
        vscode.commands.registerCommand('ariadna.loadThread', loadThread),
        vscode.commands.registerCommand('ariadna.selectNode', async (node: Node) => {
            detailProvider.showNode(node);
            if (node.srcLink && currentThread?.rootPath) {
                const filePath = path.join(currentThread.rootPath, node.srcLink.path);
                const uri = vscode.Uri.file(filePath);
                const line = Math.max(node.srcLink.lineNum - 1, 0);
                const range = new vscode.Range(line, 0, line, 0);
                await vscode.window.showTextDocument(uri, {
                    selection: range,
                    preserveFocus: false,
                });
            }
        }),
    );
}

export function deactivate() {}

export function _getCurrentThread(): AriadnaThread | null {
    return currentThread;
}
