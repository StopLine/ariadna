# План: контекстное меню «Обновить srcLink» + абсолютные пути

## Контекст
При работе с тредом пользователь хочет обновлять srcLink узла из текущей позиции редактора. Также нужно корректно обрабатывать абсолютные пути в srcLink при навигации.

## Файлы
- `package.json` — команда + context menu
- `src/extension.ts` — логика обновления и правка навигации

## Изменения

### 1. `package.json`

**a) Новая команда:**
```json
{ "command": "ariadna.updateSrcLink", "title": "Update from Editor" }
```

**b) Контекстное меню `view/item/context`:**
```json
{
  "command": "ariadna.updateSrcLink",
  "when": "view == ariadnaDetail && viewItem == srcLinkField",
  "group": "inline"
}
```

### 2. `src/extension.ts`

**a) Пометка элементов srcLink через `contextValue`:**
В `NodeDetailTreeProvider.getTreeItem()` — если `element.label === 'srcLink'` и у него есть children, ставим `item.contextValue = 'srcLinkField'`.

**b) Хранение текущего узла в `NodeDetailTreeProvider`:**
Добавить поле `private currentNode: Node | null = null`, сохранять в `showNode()`.

**c) Команда `ariadna.updateSrcLink`:**
1. Проверить наличие `detailProvider.currentNode` и `currentThread`
2. Получить `vscode.window.activeTextEditor` — если нет, выход
3. Взять `editor.document.uri.fsPath` → вычислить path:
   - Если fsPath начинается с `currentThread.rootPath` → `path.relative(rootPath, fsPath)`
   - Иначе → полный fsPath
4. `lineNum` = `editor.selection.active.line + 1` (1-based)
5. `lineContent` = `editor.document.lineAt(lineNum - 1).text`
6. Обновить `node.srcLink = { path, lineNum, lineContent }`
7. Вызвать `detailProvider.showNode(node)` для обновления панели деталей
8. Вызвать `treeDataProvider.refresh()` для обновления описания узла в основном дереве

**d) Метод `refresh()` в `AriadnaTreeDataProvider`:**
Добавить публичный метод `refresh()` который вызывает `this._onDidChangeTreeData.fire()`.

**e) Правка навигации в `ariadna.selectNode`:**
```ts
const isAbsolute = path.isAbsolute(node.srcLink.path);
const filePath = isAbsolute
    ? node.srcLink.path
    : path.join(currentThread.rootPath, node.srcLink.path);
```

## Проверка
- `npm run compile` — без ошибок
