# План: Drag-and-Drop перемещение узлов в дереве

## Контекст

Сейчас узлы в дереве Ariadna можно добавлять/удалять через контекстное меню, но нельзя перемещать между родителями или менять порядок. Нужно добавить перетаскивание узлов через стандартный VS Code TreeDragAndDropController API (нажал и потянул).

**Ограничение API**: VS Code DnD для деревьев сообщает только целевой узел (на который бросили), но не позицию "между узлами". Поэтому drop на узел = сделать дочерним элементом этого узла. Drop на пустое место / Thread = переместить на корневой уровень.

## Файлы для изменения

- `src/extension.ts` — основные изменения
- `src/test/model.test.ts` — тесты для новых хелперов

## Шаги

### 1. Добавить хелпер `findNodeById` в `extension.ts`

После `findParentContainer` (~строка 194). Рекурсивный поиск узла по ID в дереве. Нужен для `getParent()`.

### 2. Добавить хелпер `isDescendantOf` в `extension.ts`

Проверяет, является ли узел потомком другого (включая самого себя). Нужен чтобы запретить drop узла на самого себя или своих потомков (предотвращение циклов).

### 3. Реализовать DnD контроллер в `AriadnaTreeDataProvider`

Класс будет реализовывать и `TreeDataProvider<TreeElement>`, и `TreeDragAndDropController<TreeElement>`:

- **`dropMimeTypes` / `dragMimeTypes`**: `['application/vnd.code.tree.ariadnaview']`
- **`handleDrag`**: фильтрует — разрешает перетаскивать только Node (не Thread), помещает в DataTransfer
- **`handleDrop`**:
  - Извлекает узел из DataTransfer
  - Если target = Thread или undefined → перемещение на корневой уровень
  - Если target = Node → проверка `isDescendantOf`, затем делает дочерним
  - Удаляет узел из старого места через `findParentContainer` + `splice`
  - Обновляет `parentId`
  - Добавляет в конец `target.childs` через `push`
  - Вызывает `refresh()`
- **`getParent`**: по `parentId` находит родителя через `findNodeById` (нужен для `createTreeView`)

### 4. Переключить регистрацию дерева на `createTreeView`

В `activate()` заменить:
```
registerTreeDataProvider('ariadnaView', treeDataProvider)
```
на:
```
createTreeView('ariadnaView', { treeDataProvider, dragAndDropController: treeDataProvider })
```
и добавить treeView в subscriptions.

### 5. Тесты

Добавить тесты для `findNodeById` и `isDescendantOf` (экспортировать с префиксом `_` как `_getCurrentThread`).

## Проверка

1. `npm run compile` — без ошибок
2. `npm run test` — тесты проходят
3. Запустить расширение → загрузить thread → перетащить узел на другой узел → убедиться что стал дочерним
4. Перетащить узел на пустое место → убедиться что стал корневым
5. Попробовать перетащить узел на собственного потомка → операция должна быть отклонена
