import * as path from 'path';
import * as vscode from 'vscode';
import { type AriadnaThread, type Node, ValidationError, validateThread, normalizeThread, serializeThread } from './model';

const DOUBLE_CLICK_THRESHOLD = 300;

let currentThread: AriadnaThread | null = null;
let lastLoadedUri: vscode.Uri | null = null;
let lastDetailSelection: { item: DetailItem | null; timestamp: number } = { item: null, timestamp: 0 };

type TreeElement = AriadnaThread | Node;

function isThread(element: TreeElement): element is AriadnaThread {
    return 'title' in element && !('caption' in element);
}

class AriadnaTreeDataProvider implements vscode.TreeDataProvider<TreeElement>, vscode.TreeDragAndDropController<TreeElement> {
    private thread: AriadnaThread | null = null;

    private _onDidChangeTreeData = new vscode.EventEmitter<TreeElement | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    readonly dropMimeTypes = ['application/vnd.code.tree.ariadnaview'];
    readonly dragMimeTypes = ['application/vnd.code.tree.ariadnaview'];

    setThread(thread: AriadnaThread): void {
        this.thread = thread;
        this._onDidChangeTreeData.fire();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TreeElement): vscode.TreeItem {
        if (isThread(element)) {
            const item = new vscode.TreeItem(
                element.title,
                element.childs.length > 0
                    ? vscode.TreeItemCollapsibleState.Expanded
                    : vscode.TreeItemCollapsibleState.None,
            );
            item.tooltip = element.description ?? undefined;
            item.contextValue = 'threadItem';
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
        item.contextValue = 'nodeItem';
        return item;
    }

    getChildren(element?: TreeElement): TreeElement[] {
        if (!element) {
            return this.thread ? [this.thread] : [];
        }
        if (isThread(element)) {
            return element.childs;
        }
        return element.childs;
    }

    getParent(element: TreeElement): TreeElement | undefined {
        if (isThread(element)) {
            return undefined;
        }
        if (!this.thread) {
            return undefined;
        }
        if (element.parentId === null) {
            return this.thread;
        }
        return findNodeById(this.thread, element.parentId) ?? undefined;
    }

    handleDrag(source: TreeElement[], dataTransfer: vscode.DataTransfer, _token: vscode.CancellationToken): void {
        const nodes = source.filter((el): el is Node => !isThread(el));
        if (nodes.length === 0) {
            return;
        }
        dataTransfer.set(
            'application/vnd.code.tree.ariadnaview',
            new vscode.DataTransferItem(nodes),
        );
    }

    handleDrop(target: TreeElement | undefined, dataTransfer: vscode.DataTransfer, _token: vscode.CancellationToken): void {
        if (!currentThread) {
            return;
        }

        const transferItem = dataTransfer.get('application/vnd.code.tree.ariadnaview');
        if (!transferItem) {
            return;
        }
        const draggedNodes: Node[] = transferItem.value;
        if (draggedNodes.length === 0) {
            return;
        }

        const draggedNode = draggedNodes[0];

        let targetChilds: Node[];
        let targetParentId: number | null;

        if (!target || isThread(target)) {
            targetChilds = currentThread.childs;
            targetParentId = null;
        } else {
            if (isDescendantOf(target, draggedNode)) {
                return;
            }
            targetChilds = target.childs;
            targetParentId = target.id;
        }

        const sourceContainer = findParentContainer(currentThread, draggedNode.id);
        if (!sourceContainer) {
            return;
        }
        sourceContainer.childs.splice(sourceContainer.index, 1);

        draggedNode.parentId = targetParentId;

        targetChilds.push(draggedNode);

        this._onDidChangeTreeData.fire();
    }
}

type DetailItem = { label: string; value?: string; children?: DetailItem[]; commentIndex?: number };

class NodeDetailTreeProvider implements vscode.TreeDataProvider<DetailItem> {
    private items: DetailItem[] = [];
    currentNode: Node | null = null;

    private _onDidChangeTreeData = new vscode.EventEmitter<DetailItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    showNode(node: Node): void {
        this.currentNode = node;
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
                children: node.comments.map((c, i) => ({ label: c, commentIndex: i })),
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
        if (element.commentIndex !== undefined) {
            item.tooltip = element.label;
        }
        if (element.label === 'caption') {
            // Command removed - will be triggered by double-click handler
        }
        if (element.label === 'srcLink') {
            item.contextValue = 'srcLinkField';
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

function nextNodeId(thread: AriadnaThread): number {
    let maxId = 0;
    function traverse(nodes: Node[]): void {
        for (const node of nodes) {
            if (node.id > maxId) {
                maxId = node.id;
            }
            traverse(node.childs);
        }
    }
    traverse(thread.childs);
    return maxId + 1;
}

function findParentContainer(thread: AriadnaThread, nodeId: number): { childs: Node[], index: number } | null {
    function search(childs: Node[]): { childs: Node[], index: number } | null {
        for (let i = 0; i < childs.length; i++) {
            if (childs[i].id === nodeId) {
                return { childs, index: i };
            }
            const found = search(childs[i].childs);
            if (found) {
                return found;
            }
        }
        return null;
    }
    return search(thread.childs);
}

function findNodeById(thread: AriadnaThread, nodeId: number): Node | null {
    function search(nodes: Node[]): Node | null {
        for (const node of nodes) {
            if (node.id === nodeId) {
                return node;
            }
            const found = search(node.childs);
            if (found) {
                return found;
            }
        }
        return null;
    }
    return search(thread.childs);
}

function isDescendantOf(potentialDescendant: Node, ancestor: Node): boolean {
    if (potentialDescendant.id === ancestor.id) {
        return true;
    }
    for (const child of ancestor.childs) {
        if (isDescendantOf(potentialDescendant, child)) {
            return true;
        }
    }
    return false;
}

function createEmptyNode(thread: AriadnaThread, parentId: number | null): Node {
    return {
        id: nextNodeId(thread),
        parentId,
        srcLink: null,
        caption: 'New node',
        comments: [],
        visualMarks: [],
        childs: [],
    };
}

function insertNodeRelative(node: Node, offset: number): void {
    if (!currentThread) {
        return;
    }
    const container = findParentContainer(currentThread, node.id);
    if (!container) {
        return;
    }
    const newNode = createEmptyNode(currentThread, node.parentId);
    container.childs.splice(container.index + offset, 0, newNode);
    treeDataProvider.refresh();
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

    lastLoadedUri = uris[0];
    currentThread = data;
    treeDataProvider.setThread(data);
    vscode.window.showInformationMessage(`Thread "${data.title}" loaded`);
}

export function activate(context: vscode.ExtensionContext) {
    treeDataProvider = new AriadnaTreeDataProvider();
    const treeView = vscode.window.createTreeView('ariadnaView', {
        treeDataProvider: treeDataProvider,
        dragAndDropController: treeDataProvider,
    });
    context.subscriptions.push(treeView);

    detailProvider = new NodeDetailTreeProvider();
    const detailTreeView = vscode.window.createTreeView('ariadnaDetail', {
        treeDataProvider: detailProvider,
    });

    detailTreeView.onDidChangeSelection((event) => {
        if (event.selection.length !== 1) {
            return;
        }

        const selectedItem = event.selection[0];
        const now = Date.now();

        // Compare items by content, not by reference
        const isSameItem = lastDetailSelection.item !== null &&
            selectedItem.label === lastDetailSelection.item.label &&
            selectedItem.commentIndex === lastDetailSelection.item.commentIndex;

        if (isSameItem) {
            if (now - lastDetailSelection.timestamp < DOUBLE_CLICK_THRESHOLD) {
                // Double-click detected
                if (selectedItem.commentIndex !== undefined) {
                    vscode.commands.executeCommand('ariadna.editComment', selectedItem.commentIndex);
                } else if (selectedItem.label === 'caption') {
                    vscode.commands.executeCommand('ariadna.editCaption');
                }
                lastDetailSelection.item = null;
                return;
            }
        }

        // First click or different item
        lastDetailSelection = { item: selectedItem, timestamp: now };
    });

    context.subscriptions.push(detailTreeView);

    context.subscriptions.push(
        vscode.commands.registerCommand('ariadna.helloWorld', () => {
            vscode.window.showInformationMessage('Hello World from Ariadna!');
        }),
        vscode.commands.registerCommand('ariadna.loadThread', loadThread),
        vscode.commands.registerCommand('ariadna.saveThread', async () => {
            if (!currentThread) {
                vscode.window.showWarningMessage('No thread loaded');
                return;
            }
            const uri = await vscode.window.showSaveDialog({
                defaultUri: lastLoadedUri ?? undefined,
                filters: { 'Ariadna Thread': ['json'] },
                title: 'Save Ariadna Thread',
            });
            if (!uri) {
                return;
            }
            const data = serializeThread(currentThread);
            const json = JSON.stringify(data, null, 2) + '\n';
            await vscode.workspace.fs.writeFile(uri, Buffer.from(json, 'utf-8'));
            lastLoadedUri = uri;
            vscode.window.showInformationMessage(`Thread saved to ${path.basename(uri.fsPath)}`);
        }),
        vscode.commands.registerCommand('ariadna.selectNode', async (node: Node) => {
            detailProvider.showNode(node);
            if (node.srcLink && currentThread?.rootPath) {
                const isAbsolute = path.isAbsolute(node.srcLink.path);
                const filePath = isAbsolute
                    ? node.srcLink.path
                    : path.join(currentThread.rootPath, node.srcLink.path);
                const uri = vscode.Uri.file(filePath);
                const line = Math.max(node.srcLink.lineNum - 1, 0);
                const range = new vscode.Range(line, 0, line, 0);
                await vscode.window.showTextDocument(uri, {
                    selection: range,
                    preserveFocus: false,
                });
            }
        }),
        vscode.commands.registerCommand('ariadna.updateSrcLink', () => {
            const node = detailProvider.currentNode;
            if (!node || !currentThread) {
                return;
            }
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }
            const fsPath = editor.document.uri.fsPath;
            const srcPath = currentThread.rootPath && fsPath.startsWith(currentThread.rootPath)
                ? path.relative(currentThread.rootPath, fsPath)
                : fsPath;
            const lineNum = editor.selection.active.line + 1;
            const lineContent = editor.document.lineAt(lineNum - 1).text;
            node.srcLink = { path: srcPath, lineNum, lineContent };
            detailProvider.showNode(node);
            treeDataProvider.refresh();
        }),
        vscode.commands.registerCommand('ariadna.editComment', async (index: number) => {
            const node = detailProvider.currentNode;
            if (!node || index < 0 || index >= node.comments.length) {
                return;
            }
            const newText = await vscode.window.showInputBox({
                value: node.comments[index],
                prompt: 'Edit comment',
                validateInput: (v) => v.length > 255 ? 'Max 255 characters' : undefined,
            });
            if (newText !== undefined) {
                node.comments[index] = newText;
                detailProvider.showNode(node);
            }
        }),
        vscode.commands.registerCommand('ariadna.editCaption', async () => {
            const node = detailProvider.currentNode;
            if (!node) {
                return;
            }
            const newCaption = await vscode.window.showInputBox({
                value: node.caption,
                prompt: 'Edit caption',
                validateInput: (v) => !v || v.trim().length === 0 ? 'Caption cannot be empty' : undefined,
            });
            if (newCaption !== undefined && newCaption.trim().length > 0) {
                node.caption = newCaption;
                detailProvider.showNode(node);
                treeDataProvider.refresh();
            }
        }),
        vscode.commands.registerCommand('ariadna.addChildNode', (element: TreeElement) => {
            if (!currentThread) {
                return;
            }
            const parentId = isThread(element) ? null : element.id;
            const newNode = createEmptyNode(currentThread, parentId);
            element.childs.push(newNode);
            treeDataProvider.refresh();
        }),
        vscode.commands.registerCommand('ariadna.insertNodeBefore', (node: Node) => {
            insertNodeRelative(node, 0);
        }),
        vscode.commands.registerCommand('ariadna.insertNodeAfter', (node: Node) => {
            insertNodeRelative(node, 1);
        }),
        vscode.commands.registerCommand('ariadna.deleteNode', async (node: Node) => {
            if (!currentThread) {
                return;
            }
            if (node.childs.length > 0) {
                const answer = await vscode.window.showWarningMessage(
                    `Node "${node.caption}" has ${node.childs.length} child(ren). Delete anyway?`,
                    { modal: true },
                    'Delete',
                );
                if (answer !== 'Delete') {
                    return;
                }
            }
            const container = findParentContainer(currentThread, node.id);
            if (!container) {
                return;
            }
            container.childs.splice(container.index, 1);
            treeDataProvider.refresh();
        }),
    );
}

export function deactivate() {}

export function _getCurrentThread(): AriadnaThread | null {
    return currentThread;
}

export function _findNodeById(thread: AriadnaThread, nodeId: number): Node | null {
    return findNodeById(thread, nodeId);
}

export function _isDescendantOf(potentialDescendant: Node, ancestor: Node): boolean {
    return isDescendantOf(potentialDescendant, ancestor);
}
