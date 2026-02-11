# План: Контекстное меню для узлов (добавление/удаление)

## Контекст

Сейчас в дереве `ariadnaView` нет контекстного меню для узлов — невозможно добавлять или удалять узлы. Нужно добавить CRUD-операции для узлов через контекстное меню.

**Пункты контекстного меню:**
- Для **Node**: вставить после, вставить перед, добавить дочерний, удалить
- Для **AriadnaThread**: только добавить дочерний

## Изменения

### 1. `package.json` — команды и меню

**Новые команды** (секция `contributes.commands`):
- `ariadna.insertNodeAfter` — "Insert After"
- `ariadna.insertNodeBefore` — "Insert Before"
- `ariadna.addChildNode` — "Add Child"
- `ariadna.deleteNode` — "Delete"

**Контекстное меню** (секция `contributes.menus.view/item/context`):
```json
{ "command": "ariadna.addChildNode",   "when": "view == ariadnaView && viewItem == threadItem", "group": "1_add" },
{ "command": "ariadna.addChildNode",   "when": "view == ariadnaView && viewItem == nodeItem",   "group": "1_add" },
{ "command": "ariadna.insertNodeBefore","when": "view == ariadnaView && viewItem == nodeItem",   "group": "1_add" },
{ "command": "ariadna.insertNodeAfter", "when": "view == ariadnaView && viewItem == nodeItem",   "group": "1_add" },
{ "command": "ariadna.deleteNode",      "when": "view == ariadnaView && viewItem == nodeItem",   "group": "2_delete" }
```

### 2. `src/extension.ts` — contextValue + команды

**a) Установить contextValue в `getTreeItem`:**
- Для Thread: `item.contextValue = 'threadItem'`
- Для Node: `item.contextValue = 'nodeItem'`

**b) Вспомогательная функция генерации ID:**
```ts
function nextNodeId(thread: AriadnaThread): number
```
Рекурсивно обходит все узлы, находит максимальный `id`, возвращает `max + 1`.

**c) Вспомогательная функция поиска родительского контейнера:**
```ts
function findParentContainer(thread: AriadnaThread, nodeId: number): { childs: Node[], index: number } | null
```
Ищет узел по `id` в дереве, возвращает массив `childs` родителя и индекс узла в нём.

**d) Создание нового узла:**
```ts
function createEmptyNode(thread: AriadnaThread, parentId: number | null): Node
```
Создаёт узел с `nextNodeId()`, указанным `parentId`, `caption: "New node"`, пустыми массивами.

**e) Регистрация 4 команд:**

1. **`ariadna.addChildNode`** `(element: TreeElement)` — добавляет дочерний узел в `element.childs`. Работает и для Thread, и для Node.
2. **`ariadna.insertNodeBefore`** `(node: Node)` — находит родительский контейнер через `findParentContainer`, вставляет новый узел по `index`.
3. **`ariadna.insertNodeAfter`** `(node: Node)` — аналогично, вставляет по `index + 1`.
4. **`ariadna.deleteNode`** `(node: Node)` — находит родительский контейнер, удаляет элемент через `splice`. Показывает подтверждение если у узла есть дочерние.

После каждой операции — `treeDataProvider.refresh()`.

### 3. `src/model.ts` — без изменений

Модель данных не меняется. Все новые функции — в `extension.ts`.

## Файлы для изменения
- `package.json` (строки 36-83) — команды и меню
- `src/extension.ts` — contextValue, хелперы, регистрация команд

## Верификация
1. `npm run compile` — проверить что компилируется без ошибок
2. `npm run lint` — проверить линтер
