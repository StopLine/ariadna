# Индикация проблем с полями SrcLink (красная иконка)

## Context
При выборе узла в панели деталей отображаются поля srcLink (path, lineNum, lineContent). Сейчас они всегда выглядят одинаково, даже если файл не существует, строка за пределами файла или содержимое строки не совпадает. Нужно показывать красную иконку-предупреждение у проблемных полей.

## Правила подсветки
- **path** — красная иконка, если файл не найден (относительно `rootPath` или абсолютный)
- **lineNum** — красная иконка, если файл найден, но номер строки за пределами файла
- **lineContent** — красная иконка, если строка существует, но содержимое отличается (сравнение после `.trim()`)
- **srcLink** (родительское) — красная иконка, если хотя бы одно дочернее поле проблемное

## Файлы для изменения
- `src/extension.ts` — единственный файл

## План

### 1. Добавить `isError` в `DetailItem` (строка 156)
```typescript
type DetailItem = { label: string; value?: string; children?: DetailItem[]; commentIndex?: number; isError?: boolean };
```

### 2. Сделать `showNode()` асинхронным (строка 166)
Валидация SrcLink требует чтения файла через `vscode.workspace.openTextDocument()`. После построения items для srcLink — проверить:
- `openTextDocument(uri)` кидает исключение → `pathError = true`
- `lineNum < 1 || lineNum > doc.lineCount` → `lineNumError = true`
- `doc.lineAt(lineNum - 1).text.trim() !== lineContent.trim()` → `lineContentError = true`

Пометить `isError = true` на проблемных дочерних элементах и на самом `srcLink`, если есть хотя бы одна проблема.

Путь к файлу: `path.isAbsolute(srcLink.path) ? srcLink.path : path.join(currentThread.rootPath, srcLink.path)`

### 3. В `getTreeItem()` (строка 212) — показать красную иконку
```typescript
if (element.isError) {
    item.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('errorForeground'));
}
```

### 4. Обновить вызовы `showNode()`
`showNode()` станет async, поэтому вызовы нужно обновить с `await`:
- `ariadna.selectNode` (строка 615) — уже в async-функции, добавить `await`
- `ariadna.editComment` (строка 684) — добавить `await`
- `ariadna.editCaption` (строка 700) — добавить `await`
- `prependMark()` (строка 387) — сделать async или вызвать без await (fire-and-forget допустимо)
- Восстановление сессии (строка 907) — добавить `await`

## Проверка
- `npm run compile` — без ошибок
- `npm run lint` — без ошибок
