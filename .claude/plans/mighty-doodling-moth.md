# Улучшения для поля rootPath

## Контекст
Поле `rootPath` в detail-панели (`ariadnaDetail`) сейчас отображается как простой текст без валидации. Для `srcLink.path` уже реализована проверка доступности файла с иконкой warning — нужно аналогично добавить проверку для `rootPath`. Также нужна кнопка выбора папки через стандартный диалог VS Code.

## Файлы для изменения
- `src/extension.ts` — логика проверки и команда
- `package.json` — регистрация команды и контекстное меню

---

## 1. Warning-иконка для rootPath

**Файл:** `src/extension.ts`, метод `showThread()` (строка ~227)

Сейчас `showThread()` — синхронный (`void`). Нужно сделать его `async` и добавить проверку существования директории `rootPath` через `vscode.workspace.fs.stat()`.

```ts
async showThread(thread: AriadnaThread): Promise<void> {
    this.currentNode = null;
    this.currentThread = thread;

    const rootPathItem: DetailItem = { label: 'rootPath', value: thread.rootPath };

    // Проверяем доступность директории
    if (thread.rootPath) {
        try {
            const stat = await vscode.workspace.fs.stat(vscode.Uri.file(thread.rootPath));
            if (stat.type !== vscode.FileType.Directory) {
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
```

Существующий паттерн: `isError` уже обрабатывается в `getTreeItem()` (строка ~266) — иконка `warning` с цветом `errorForeground` устанавливается автоматически.

---

## 2. Команда "Select Folder" для rootPath

### 2.1. Регистрация команды в `extension.ts`

Добавить новую команду `ariadna.selectRootPath` рядом с `ariadna.updateSrcLink` (строка ~665):

```ts
vscode.commands.registerCommand('ariadna.selectRootPath', async () => {
    const thread = detailProvider.currentThread;
    if (!thread || !currentThread) {
        return;
    }
    const result = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: thread.rootPath ? vscode.Uri.file(thread.rootPath) : undefined,
        openLabel: 'Select Root Path',
    });
    if (result && result.length > 0) {
        thread.rootPath = result[0].fsPath;
        currentThread.rootPath = result[0].fsPath;
        markDirty();
        await detailProvider.showThread(thread);
        treeDataProvider.refresh();
    }
}),
```

### 2.2. Объявление команды в `package.json`

В массив `commands`:
```json
{
    "command": "ariadna.selectRootPath",
    "title": "Select Folder"
}
```

### 2.3. Контекстное меню в `package.json`

В массив `view/item/context` (по аналогии с `updateSrcLink` на строке ~170):
```json
{
    "command": "ariadna.selectRootPath",
    "when": "view == ariadnaDetail && viewItem == rootPathField",
    "group": "inline"
}
```

### 2.4. contextValue для rootPath

В `getTreeItem()` (строка ~269), добавить по аналогии с `srcLinkField`:
```ts
if (element.label === 'rootPath') {
    item.contextValue = 'rootPathField';
}
```

---

## Верификация
- `npm run compile` — без ошибок
- `npm run lint` — без ошибок
- Вручную: загрузить тред с несуществующим rootPath → иконка warning
- Вручную: кликнуть кнопку Select Folder на rootPath → диалог выбора папки → значение обновляется
