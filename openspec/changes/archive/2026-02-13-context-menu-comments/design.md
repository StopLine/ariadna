## Context

В detail-панели (`ariadnaDetail`) комментарии отображаются как дочерние элементы группы "comments". Каждый комментарий — это `DetailItem` с `commentIndex`. Сейчас единственная операция — редактирование по двойному клику (`ariadna.editComment`). Нет способа добавить или удалить комментарий.

Существующий паттерн контекстного меню: для нод в основном дереве (`ariadnaView`) уже есть Add Child / Insert Before / Insert After / Delete через `contextValue = 'nodeItem'`. Для detail-панели используется только `contextValue = 'srcLinkField'`.

## Goals / Non-Goals

**Goals:**
- Добавить контекстное меню на элементы комментариев и группу "comments" в detail-панели
- Реализовать add/delete операции с комментариями через `InputBox`

**Non-Goals:**
- Изменение модели данных (`Comment` остаётся `string`)
- Drag-and-drop для переупорядочивания комментариев
- Bulk-операции (удаление нескольких комментариев)

## Decisions

### 1. contextValue для tree items

Добавить два новых contextValue в `NodeDetailTreeProvider.getTreeItem()`:
- `commentItem` — на каждом комментарии (DetailItem с `commentIndex !== undefined`)
- `commentsGroup` — на родительском элементе "comments"

**Rationale**: Это стандартный механизм VS Code для фильтрации пунктов контекстного меню по `viewItem`.

### 2. Команды и их аргументы

| Команда | Контекст | Аргумент |
|---|---|---|
| `ariadna.addComment` | На "comments" группе | — (добавляет в конец) |
| `ariadna.addCommentAfter` | На комментарии | `commentIndex` |
| `ariadna.addCommentBefore` | На комментарии | `commentIndex` |
| `ariadna.deleteComment` | На комментарии | `commentIndex` |

Все команды работают с `currentNode` (текущая выбранная нода). Индекс комментария передаётся через `DetailItem`.

**Rationale**: Аналогично `ariadna.editComment`, который уже принимает индекс. Использование текущей ноды из глобального состояния — существующий паттерн.

### 3. Ввод текста через InputBox

Для add-команд — `vscode.window.showInputBox()` с placeholder и валидацией длины (max 255 символов, как в `validateComment`).

**Rationale**: Аналогично `editComment`, который уже использует `showInputBox`.

### 4. Группировка в меню

- Add Before / Add After — группа `1_add`
- Delete — группа `2_delete`

**Rationale**: Тот же паттерн группировки, что и для нод в `ariadnaView`.

## Risks / Trade-offs

- [Индексы могут устареть при быстрых последовательных операциях] → Каждая операция вызывает `refresh()` на detail provider, что пересоздаёт дерево с актуальными индексами.
