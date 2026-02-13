## Why

Сейчас комментарии к ноде можно только редактировать по двойному клику, но нет способа добавить новый комментарий или удалить существующий. Нужны операции CRUD через контекстное меню в detail-панели.

## What Changes

- На элементе отдельного комментария в `ariadnaDetail` появляются пункты контекстного меню:
  - **Add After** — добавить комментарий после выбранного
  - **Add Before** — добавить комментарий перед выбранным
  - **Delete** — удалить выбранный комментарий
- На родительском элементе "comments" появляется пункт:
  - **Add** — добавить комментарий (в конец списка)
- Новые команды: `ariadna.addComment`, `ariadna.addCommentBefore`, `ariadna.addCommentAfter`, `ariadna.deleteComment`
- В `NodeDetailTreeProvider` добавляются `contextValue` для комментариев (`commentItem`) и группы комментариев (`commentsGroup`)

## Capabilities

### New Capabilities
- `comment-context-menu`: контекстное меню для добавления/удаления комментариев в detail-панели

### Modified Capabilities
<!-- нет изменений в существующих спеках -->

## Impact

- `src/extension.ts` — новые команды, contextValue на tree items в NodeDetailTreeProvider
- `package.json` — регистрация команд и меню в `contributes.commands` / `contributes.menus`
- Модель (`src/model.ts`) не меняется — Comment остаётся `string`, операции над массивом `comments[]` тривиальны
