# План: Комментарии с тултипом и редактированием в панели Node Details

## Контекст

Панель Node Details (`ariadnaDetail`) — `TreeDataProvider<DetailItem>`. Комментарии отображаются как дочерние элементы дерева с нумерацией `[0]`, `[1]` в label и текстом в description — однострочно, без тултипа, без редактирования.

Требования:
1. Убрать нумерацию `[i]` — вместо неё показывать текст комментария как label
2. При наведении мыши — показывать полный текст комментария в tooltip
3. При двойном щелчке — открывать модальное окно (`showInputBox`) для редактирования

Остаёмся на TreeView, без перехода на WebviewView.

## План реализации

### Шаг 1: Изменить отображение комментариев в `NodeDetailTreeProvider`

Файл: `src/extension.ts`

В методе `showNode()` (строка 103) изменить маппинг комментариев:
- **Было**: `{ label: \`[\${i}]\`, value: c }`
- **Стало**: `{ label: c, commentIndex: i }` (добавить поле `commentIndex` в тип `DetailItem`)

В методе `getTreeItem()` для элементов-комментариев:
- `item.label` = текст комментария (обрезается VS Code автоматически при нехватке места)
- `item.tooltip` = полный текст комментария (показывается при наведении)
- `item.command` = команда `ariadna.editComment` с аргументом `commentIndex` (срабатывает по клику/двойному клику)

### Шаг 2: Добавить поле `commentIndex` в `DetailItem`

Файл: `src/extension.ts`, строка 70

Расширить тип:
```ts
type DetailItem = { label: string; value?: string; children?: DetailItem[]; commentIndex?: number };
```

### Шаг 3: Зарегистрировать команду `ariadna.editComment`

Файл: `src/extension.ts`, в `activate()`

- `vscode.commands.registerCommand('ariadna.editComment', async (index: number) => { ... })`
- Получить текущий узел из `detailProvider.currentNode`
- Открыть `vscode.window.showInputBox({ value: node.comments[index], prompt: 'Edit comment' })`
- При подтверждении — обновить `node.comments[index]` и вызвать `detailProvider.showNode(node)` для обновления дерева

### Шаг 4: Зарегистрировать команду в `package.json`

Файл: `package.json`, секция `contributes.commands`

Добавить:
```json
{ "command": "ariadna.editComment", "title": "Edit Comment" }
```

## Ключевые файлы

- `src/extension.ts` — изменения в `DetailItem`, `NodeDetailTreeProvider`, новая команда
- `package.json` — регистрация команды `ariadna.editComment`
- `src/model.ts` — без изменений

## Верификация

1. `npm run compile` — без ошибок
2. Запустить Extension Development Host, загрузить `sample1_data.json`
3. Комментарии отображаются без `[0]`/`[1]`, текст виден как label
4. При наведении — полный текст в tooltip
5. Клик на комментарий — появляется InputBox для редактирования
6. После редактирования — сохранить thread, проверить обновление в JSON
7. `npm run lint` — без ошибок
