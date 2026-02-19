import * as path from 'path';
import * as vscode from 'vscode';
import { type AriadnaThread, type Node, ValidationError, validateThread, normalizeThread, serializeThread } from './model';

const DOUBLE_CLICK_THRESHOLD = 300;

let currentThread: AriadnaThread | null = null;
let lastLoadedUri: vscode.Uri | null = null;
let lastDetailClick: { label: string; commentIndex?: number; timestamp: number } | null = null;
let lastThreadClickTime = 0;
let lastNodeClickTime = 0;
let isDirty = false;
let mainTreeView: vscode.TreeView<TreeElement>;
let extensionContext: vscode.ExtensionContext;
let lastSelectedNodeId: number | null = null;

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
            item.tooltip = element.title ?? undefined;
            const path = lastLoadedUri ? lastLoadedUri.fsPath : "";
            if (path)
                item.tooltip += '\n(' + path + ')';
            item.contextValue = 'threadItem';
            item.command = {
                command: 'ariadna.selectThread',
                title: 'Select Thread',
                arguments: [element],
            };
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

        markDirty();
        this._onDidChangeTreeData.fire();
    }
}

type DetailItem = { label: string; value?: string; children?: DetailItem[]; commentIndex?: number; isError?: boolean };

class NodeDetailTreeProvider implements vscode.TreeDataProvider<DetailItem> {
    private items: DetailItem[] = [];
    currentNode: Node | null = null;
    currentThread: AriadnaThread | null = null;

    private _onDidChangeTreeData = new vscode.EventEmitter<DetailItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    async showNode(node: Node): Promise<void> {
        this.currentNode = node;
        this.currentThread = null;
        const items: DetailItem[] = [
            { label: 'caption', value: node.caption },
        ];

        if (node.srcLink) {
            const pathItem: DetailItem = { label: 'path', value: node.srcLink.path };
            const lineNumItem: DetailItem = { label: 'lineNum', value: String(node.srcLink.lineNum) };
            const lineContentItem: DetailItem = { label: 'lineContent', value: node.srcLink.lineContent };
            const srcLinkItem: DetailItem = {
                label: 'srcLink',
                children: [pathItem, lineNumItem, lineContentItem],
            };

            const fullPath = path.isAbsolute(node.srcLink.path)
                ? node.srcLink.path
                : currentThread?.rootPath
                    ? path.join(currentThread.rootPath, node.srcLink.path)
                    : null;

            if (fullPath) {
                try {
                    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(fullPath));
                    if (node.srcLink.lineNum < 1 || node.srcLink.lineNum > doc.lineCount) {
                        lineNumItem.isError = true;
                    } else {
                        const actualContent = doc.lineAt(node.srcLink.lineNum - 1).text.trim();
                        if (actualContent !== node.srcLink.lineContent.trim()) {
                            lineContentItem.isError = true;
                        }
                    }
                } catch {
                    pathItem.isError = true;
                }
            }

            if (pathItem.isError || lineNumItem.isError || lineContentItem.isError) {
                srcLinkItem.isError = true;
            }

            items.push(srcLinkItem);
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

        this.items = items;
        this._onDidChangeTreeData.fire();
    }

    async showThread(thread: AriadnaThread): Promise<void> {
        this.currentNode = null;
        this.currentThread = thread;
        const rootPathItem: DetailItem = { label: 'rootPath', value: thread.rootPath };
        if (thread.rootPath) {
            try {
                const stat = await vscode.workspace.fs.stat(vscode.Uri.file(thread.rootPath));
                if ((stat.type & vscode.FileType.Directory) === 0) {
                    rootPathItem.isError = true;
                }
            } catch {
                rootPathItem.isError = true;
            }
        }
        const items: DetailItem[] = [
            { label: 'title', value: thread.title },
            rootPathItem,
            { label: 'description', value: thread.description ?? '(none)' },
            { label: 'vcsRev', value: thread.vcsRev ?? '(none)' },
        ];
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
            item.tooltip = element.value;
        }
        if (element.commentIndex !== undefined) {
            item.command = {
                command: 'ariadna.detailItemClick',
                title: 'Click',
                arguments: [element.label, element.commentIndex],
            };
        }
        if (element.label === 'caption' || ['title', 'rootPath', 'description', 'vcsRev'].includes(element.label)) {
            item.command = {
                command: 'ariadna.detailItemClick',
                title: 'Click',
                arguments: [element.label, undefined],
            };
        }
        if (element.isError) {
            item.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('errorForeground'));
        }
        if (element.label === 'srcLink') {
            item.contextValue = 'srcLinkField';
        }
        if (element.label === 'rootPath') {
            item.contextValue = 'rootPathField';
        }
        if (element.label === 'comments' && element.commentIndex === undefined) {
            item.contextValue = 'commentsGroup';
        }
        if (element.commentIndex !== undefined) {
            item.contextValue = 'commentItem';
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

function markDirty(): void {
    isDirty = true;
    mainTreeView.description = '*';
}

function clearDirty(): void {
    isDirty = false;
    mainTreeView.description = '';
}

function saveState(): void {
    const state = extensionContext.workspaceState;
    state.update('ariadna.lastThreadUri', lastLoadedUri?.toString() ?? undefined);
    state.update('ariadna.lastSelectedNodeId', lastSelectedNodeId ?? undefined);
}

function addRecentThread(uri: vscode.Uri, title: string): void {
    const state = extensionContext.workspaceState;
    const recent = state.get<{ uri: string; title: string }[]>('ariadna.recentThreads', []);
    const uriStr = uri.toString();
    const filtered = recent.filter(r => r.uri !== uriStr);
    filtered.unshift({ uri: uriStr, title });
    if (filtered.length > 10) {
        filtered.length = 10;
    }
    state.update('ariadna.recentThreads', filtered);
}

async function confirmSaveIfDirty(): Promise<boolean> {
    if (!isDirty) {
        return true;
    }
    const answer = await vscode.window.showWarningMessage(
        'Current thread has unsaved changes. Save before continuing?',
        { modal: true },
        'Save',
        'Don\'t Save',
    );
    if (answer === undefined) {
        return false;
    }
    if (answer === 'Save') {
        await vscode.commands.executeCommand('ariadna.saveThread');
    }
    return true;
}

function createEmptyNode(thread: AriadnaThread, parentId: number | null): Node {
    return {
        id: nextNodeId(thread),
        parentId,
        srcLink: null,
        caption: 'New node',
        comments: [],
        childs: [],
    };
}

async function prependMark(node: Node, mark: string): Promise<void> {
    const prefix = mark + ' ';
    if (node.caption.startsWith(prefix)) {
        node.caption = node.caption.slice(prefix.length);
    } else {
        node.caption = prefix + node.caption;
    }
    markDirty();
    treeDataProvider.refresh();
    if (detailProvider.currentNode?.id === node.id) {
        await detailProvider.showNode(node);
    }
}

function insertNodeRelative(node: Node, offset: number): Node | undefined {
    if (!currentThread) {
        return undefined;
    }
    const container = findParentContainer(currentThread, node.id);
    if (!container) {
        return undefined;
    }
    const newNode = createEmptyNode(currentThread, node.parentId);
    container.childs.splice(container.index + offset, 0, newNode);
    markDirty();
    treeDataProvider.refresh();
    return newNode;
}

async function loadThread(): Promise<void> {
    if (!await confirmSaveIfDirty()) {
        return;
    }
    const defaultUri = lastLoadedUri
        ? vscode.Uri.file(path.dirname(lastLoadedUri.fsPath))
        : undefined;
    const uris = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: { 'Ariadna Thread': ['json'] },
        title: 'Load Ariadna Thread',
        defaultUri,
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
    clearDirty();
    lastSelectedNodeId = null;
    saveState();
    addRecentThread(uris[0], data.title);
    treeDataProvider.refresh();
    await detailProvider.showThread(currentThread);
}

export function activate(context: vscode.ExtensionContext) {
    extensionContext = context;
    treeDataProvider = new AriadnaTreeDataProvider();
    const treeView = vscode.window.createTreeView('ariadnaView', {
        treeDataProvider: treeDataProvider,
        dragAndDropController: treeDataProvider,
    });
    mainTreeView = treeView;
    context.subscriptions.push(treeView);

    detailProvider = new NodeDetailTreeProvider();
    const detailTreeView = vscode.window.createTreeView('ariadnaDetail', {
        treeDataProvider: detailProvider,
    });

    context.subscriptions.push(detailTreeView);

    context.subscriptions.push(
        vscode.commands.registerCommand('ariadna.loadThread', loadThread),
        vscode.commands.registerCommand('ariadna.loadRecentThread', async () => {
            const state = extensionContext.workspaceState;
            const recent = state.get<{ uri: string; title: string }[]>('ariadna.recentThreads', []);
            if (recent.length === 0) {
                vscode.window.showInformationMessage('No recent threads');
                return;
            }

            const items = recent.map(r => ({
                label: r.title,
                description: vscode.Uri.parse(r.uri).fsPath,
                uri: r.uri,
            }));

            const picked = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a recent thread',
            });
            if (!picked) {
                return;
            }

            if (!await confirmSaveIfDirty()) {
                return;
            }

            const uri = vscode.Uri.parse(picked.uri);
            const fileContent = await vscode.workspace.fs.readFile(uri);
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
                    await vscode.window.showErrorMessage(`Unexpected error: ${err}`, { modal: true });
                }
                return;
            }

            lastLoadedUri = uri;
            currentThread = data;
            treeDataProvider.setThread(data);
            clearDirty();
            lastSelectedNodeId = null;
            saveState();
            addRecentThread(uri, data.title);
            treeDataProvider.refresh();
            await detailProvider.showThread(currentThread);

        }),
        vscode.commands.registerCommand('ariadna.saveThread', async () => {
            if (!currentThread) {
                vscode.window.showWarningMessage('No thread loaded');
                return;
            }
            if (!lastLoadedUri) {
                await vscode.commands.executeCommand('ariadna.saveThreadAs');
                return;
            }
            const data = serializeThread(currentThread);
            const json = JSON.stringify(data, null, 2) + '\n';
            await vscode.workspace.fs.writeFile(lastLoadedUri, Buffer.from(json, 'utf-8'));
            clearDirty();
        }),
        vscode.commands.registerCommand('ariadna.saveThreadAs', async () => {
            if (!currentThread) {
                vscode.window.showWarningMessage('No thread loaded');
                return;
            }
            let uriToOpen = lastLoadedUri;
            if (!uriToOpen) {
                const state = context.workspaceState;
                const uriStr = state.get<string>('ariadna.lastThreadUri');
                uriToOpen = uriStr ? vscode.Uri.parse(path.dirname(uriStr)) : null;
            }

            const uri = await vscode.window.showSaveDialog({
                defaultUri: uriToOpen ?? undefined,
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
            clearDirty();
            addRecentThread(uri, currentThread.title);
            vscode.window.showInformationMessage(`Thread saved to ${path.basename(uri.fsPath)}`);
            treeDataProvider.refresh();
        }),
        vscode.commands.registerCommand('ariadna.createNewThread', async () => {
            if (!await confirmSaveIfDirty()) {
                return;
            }
            currentThread = {
                title: 'New thread',
                rootPath: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '',
                description: null,
                childs: [],
                vcsRev: null,
                currentNodeId: null,
            };
            lastLoadedUri = null;
            treeDataProvider.setThread(currentThread);
            const newNode = createEmptyNode(currentThread, null);
            currentThread.childs.push(newNode);
            clearDirty();
            lastSelectedNodeId = null;
        }),
        vscode.commands.registerCommand('ariadna.selectThread', async (thread: AriadnaThread) => {
            const now = Date.now();
            if (now - lastThreadClickTime < DOUBLE_CLICK_THRESHOLD) {
                lastThreadClickTime = 0;
                const newTitle = await vscode.window.showInputBox({
                    value: thread.title,
                    prompt: 'Edit thread title',
                    validateInput: (v) => !v || v.trim().length === 0 ? 'Title cannot be empty' : undefined,
                });
                if (newTitle !== undefined && newTitle.trim().length > 0) {
                    thread.title = newTitle;
                    markDirty();
                    treeDataProvider.refresh();
                    await detailProvider.showThread(thread);
                }
                return;
            }
            lastThreadClickTime = now;
            await detailProvider.showThread(thread);
        }),
        vscode.commands.registerCommand('ariadna.selectNode', async (node: Node) => {
            const now = Date.now();
            if (now - lastNodeClickTime < DOUBLE_CLICK_THRESHOLD) {
                lastNodeClickTime = 0;
                await vscode.commands.executeCommand('ariadna.editCaption');
                return;
            }
            lastNodeClickTime = now;
            lastSelectedNodeId = node.id;
            saveState();
            await detailProvider.showNode(node);
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
        vscode.commands.registerCommand('ariadna.updateSrcLinkForNode', async (node: Node) => {
            await mainTreeView.reveal(node, { select: true, focus: true });
            detailProvider.showNode(node);
            vscode.commands.executeCommand('ariadna.updateSrcLink');
        }),
        vscode.commands.registerCommand('ariadna.updateSrcLink', async () => {
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
            markDirty();
            await detailProvider.showNode(node);
            treeDataProvider.refresh();
        }),
        vscode.commands.registerCommand('ariadna.selectRootPath', async () => {
            if (!currentThread) {
                return;
            }
            const result = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                defaultUri: currentThread.rootPath
                    ? vscode.Uri.file(currentThread.rootPath)
                    : undefined,
                openLabel: 'Select Root Path',
            });
            if (result && result[0]) {
                currentThread.rootPath = result[0].fsPath;
                markDirty();
                await detailProvider.showThread(currentThread);
                treeDataProvider.refresh();
            }
        }),
        vscode.commands.registerCommand('ariadna.detailItemClick', (label: string, commentIndex?: number) => {
            const now = Date.now();
            const isSameItem = lastDetailClick !== null &&
                label === lastDetailClick.label &&
                commentIndex === lastDetailClick.commentIndex;

            if (isSameItem && now - lastDetailClick!.timestamp < DOUBLE_CLICK_THRESHOLD) {
                // Double-click detected
                if (commentIndex !== undefined) {
                    vscode.commands.executeCommand('ariadna.editComment', commentIndex);
                } else if (label === 'caption') {
                    vscode.commands.executeCommand('ariadna.editCaption');
                } else if (['title', 'rootPath', 'description', 'vcsRev'].includes(label)) {
                    vscode.commands.executeCommand('ariadna.editThreadField', label);
                }
                lastDetailClick = null;
                return;
            }

            lastDetailClick = { label, commentIndex, timestamp: now };
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
                markDirty();
                await detailProvider.showNode(node);
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
                markDirty();
                await detailProvider.showNode(node);
                treeDataProvider.refresh();
            }
        }),
        vscode.commands.registerCommand('ariadna.addChildNode', async (element: TreeElement) => {
            if (!currentThread) {
                return;
            }
            const parentId = isThread(element) ? null : element.id;
            const newNode = createEmptyNode(currentThread, parentId);
            element.childs.push(newNode);
            markDirty();
            treeDataProvider.refresh();
            await mainTreeView.reveal(newNode, { select: true, focus: true });
            await vscode.commands.executeCommand('ariadna.selectNode', newNode);
        }),
        vscode.commands.registerCommand('ariadna.insertNodeBefore', async (node: Node) => {
            const newNode = insertNodeRelative(node, 0);
            if (newNode) {
                await mainTreeView.reveal(newNode, { select: true, focus: true });
                await vscode.commands.executeCommand('ariadna.selectNode', newNode);
            }
        }),
        vscode.commands.registerCommand('ariadna.insertNodeAfter', async (node: Node) => {
            const newNode = insertNodeRelative(node, 1);
            if (newNode) {
                await mainTreeView.reveal(newNode, { select: true, focus: true });
                await vscode.commands.executeCommand('ariadna.selectNode', newNode);
            }
        }),
        vscode.commands.registerCommand('ariadna.addComment', async () => {
            const node = detailProvider.currentNode;
            if (!node) {
                return;
            }
            const text = await vscode.window.showInputBox({
                prompt: 'Add comment',
                validateInput: (v) => {
                    if (!v || v.trim().length === 0) { return 'Comment cannot be empty'; }
                    if (v.length > 255) { return 'Max 255 characters'; }
                    return undefined;
                },
            });
            if (text !== undefined) {
                node.comments.push(text);
                markDirty();
                await detailProvider.showNode(node);
            }
        }),
        vscode.commands.registerCommand('ariadna.addCommentAfter', async (item: DetailItem) => {
            const node = detailProvider.currentNode;
            const index = item?.commentIndex;
            if (!node || index === undefined) {
                return;
            }
            const text = await vscode.window.showInputBox({
                prompt: 'Add comment after',
                validateInput: (v) => {
                    if (!v || v.trim().length === 0) { return 'Comment cannot be empty'; }
                    if (v.length > 255) { return 'Max 255 characters'; }
                    return undefined;
                },
            });
            if (text !== undefined) {
                node.comments.splice(index + 1, 0, text);
                markDirty();
                await detailProvider.showNode(node);
            }
        }),
        vscode.commands.registerCommand('ariadna.addCommentBefore', async (item: DetailItem) => {
            const node = detailProvider.currentNode;
            const index = item?.commentIndex;
            if (!node || index === undefined) {
                return;
            }
            const text = await vscode.window.showInputBox({
                prompt: 'Add comment before',
                validateInput: (v) => {
                    if (!v || v.trim().length === 0) { return 'Comment cannot be empty'; }
                    if (v.length > 255) { return 'Max 255 characters'; }
                    return undefined;
                },
            });
            if (text !== undefined) {
                node.comments.splice(index, 0, text);
                markDirty();
                await detailProvider.showNode(node);
            }
        }),
        vscode.commands.registerCommand('ariadna.deleteComment', async (item: DetailItem) => {
            const node = detailProvider.currentNode;
            const index = item?.commentIndex;
            if (!node || index === undefined) {
                return;
            }
            node.comments.splice(index, 1);
            markDirty();
            await detailProvider.showNode(node);
        }),
        vscode.commands.registerCommand('ariadna.markCheck', (node: Node) => prependMark(node, '✅')),
        vscode.commands.registerCommand('ariadna.markExclamation', (node: Node) => prependMark(node, '❗')),
        vscode.commands.registerCommand('ariadna.markQuestion', (node: Node) => prependMark(node, '❓')),
        vscode.commands.registerCommand('ariadna.markFire', (node: Node) => prependMark(node, '🔥')),
        vscode.commands.registerCommand('ariadna.markCross', (node: Node) => prependMark(node, '❌')),
        vscode.commands.registerCommand('ariadna.markHeart', (node: Node) => prependMark(node, '❤️')),
        vscode.commands.registerCommand('ariadna.editThreadField', async (field: string) => {
            const thread = detailProvider.currentThread;
            if (!thread) {
                return;
            }
            let currentValue: string;
            let prompt: string;
            let validateInput: ((v: string) => string | undefined) | undefined;

            switch (field) {
                case 'title':
                    currentValue = thread.title;
                    prompt = 'Edit thread title';
                    validateInput = (v) => !v || v.trim().length === 0 ? 'Title cannot be empty' : undefined;
                    break;
                case 'rootPath':
                    currentValue = thread.rootPath;
                    prompt = 'Edit root path';
                    break;
                case 'description':
                    currentValue = thread.description ?? '';
                    prompt = 'Edit description (empty to clear)';
                    validateInput = (v) => v.length > 255 ? 'Max 255 characters' : undefined;
                    break;
                case 'vcsRev':
                    currentValue = thread.vcsRev ?? '';
                    prompt = 'Edit VCS revision (empty to clear)';
                    break;
                default:
                    return;
            }

            const newValue = await vscode.window.showInputBox({
                value: currentValue,
                prompt,
                validateInput,
            });
            if (newValue === undefined) {
                return;
            }

            switch (field) {
                case 'title':
                    if (newValue.trim().length === 0) { return; }
                    thread.title = newValue;
                    break;
                case 'rootPath':
                    thread.rootPath = newValue;
                    break;
                case 'description':
                    thread.description = newValue.length === 0 ? null : newValue;
                    break;
                case 'vcsRev':
                    thread.vcsRev = newValue.length === 0 ? null : newValue;
                    break;
            }

            markDirty();
            await detailProvider.showThread(thread);
            treeDataProvider.refresh();
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
            markDirty();
            treeDataProvider.refresh();
        }),
    );

    // Restore last session state
    (async () => {
        const state = context.workspaceState;
        const uriStr = state.get<string>('ariadna.lastThreadUri');
        if (!uriStr) {
            return;
        }
        const uri = vscode.Uri.parse(uriStr);
        try {
            const fileContent = await vscode.workspace.fs.readFile(uri);
            const text = Buffer.from(fileContent).toString('utf-8');
            const data = normalizeThread(JSON.parse(text));
            validateThread(data);

            lastLoadedUri = uri;
            currentThread = data;
            treeDataProvider.setThread(data);
            clearDirty();
            addRecentThread(uri, data.title);

            // Restore selected node
            const nodeId = state.get<number>('ariadna.lastSelectedNodeId');
            if (nodeId !== undefined && nodeId !== null) {
                const node = findNodeById(data, nodeId);
                if (node) {
                    lastSelectedNodeId = nodeId;
                    mainTreeView.reveal(node, { select: true, focus: false });
                    await detailProvider.showNode(node);
                }
            }
        } catch {
            // File missing or invalid — silently ignore, start with empty state
        }
    })();
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

export function _isDirty(): boolean {
    return isDirty;
}
