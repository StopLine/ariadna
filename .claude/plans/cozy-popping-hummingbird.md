# Plan: rootPath — warning icon и select folder

## Context

Поле `rootPath` в треде используется для разрешения относительных путей в `srcLink`. Ранее оно отображалось как простой текст без валидации. Добавлены:
1. Warning-иконка, если директория rootPath недоступна (по аналогии с `srcLink.path`)
2. Кнопка "Select Folder" в контекстном меню для выбора папки через стандартный диалог

## Выполненные изменения

### 1. Warning-иконка для rootPath (`src/extension.ts`)

- `showThread()` стал `async` — проверяет через `vscode.workspace.fs.stat()`, что директория rootPath существует и является директорией
- Если путь недоступен или не директория — `isError = true`, отображается warning-иконка
- Все вызовы `showThread()` обновлены с `await`

### 2. Команда selectRootPath (`src/extension.ts` + `package.json`)

- Новая команда `ariadna.selectRootPath` — `showOpenDialog` с `canSelectFolders: true`
- `contextValue = 'rootPathField'` для элемента rootPath в detail-панели
- Inline-кнопка в `view/item/context` меню для `rootPathField`
- Команда зарегистрирована в `package.json` → `contributes.commands`

## Изменённые файлы

- `src/extension.ts` — `showThread()` async + валидация, `contextValue`, новая команда
- `package.json` — команда `selectRootPath`, меню для `rootPathField`
