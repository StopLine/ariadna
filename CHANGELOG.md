# Changelog

## 2026-02-12 00:07

### Added
- Drag-and-drop перемещение узлов в дереве `ariadnaView` через стандартный VS Code TreeDragAndDropController API
- Хелперы в `extension.ts`:
  - `findNodeById()` — рекурсивный поиск узла по ID в дереве
  - `isDescendantOf()` — проверка, является ли узел потомком другого (предотвращение циклов)
- Методы DnD контроллера в `AriadnaTreeDataProvider`:
  - `handleDrag()` — разрешает перетаскивание только Node элементов (не Thread)
  - `handleDrop()` — обрабатывает drop с автоматической проверкой на циклические ссылки, обновлением `parentId` и перемещением узла
  - `getParent()` — возвращает родительский элемент для узла (нужен для `createTreeView`)
- Тесты для `findNodeById` и `isDescendantOf` в `src/test/model.test.ts` (8 тестов)
- Экспортированные функции `_findNodeById` и `_isDescendantOf` для тестирования

### Changed
- `AriadnaTreeDataProvider` теперь реализует `vscode.TreeDragAndDropController<TreeElement>`
- Регистрация дерева: `registerTreeDataProvider` → `createTreeView` с параметром `dragAndDropController`
- `.eslintrc.json`: добавлено правило `argsIgnorePattern: "^_"` для игнорирования неиспользуемых параметров с префиксом подчеркивания

### Behavior
- Перетаскивание узла на другой узел → узел становится дочерним элементом целевого узла (добавляется в конец `childs`)
- Перетаскивание узла на пустое место или Thread → узел перемещается на корневой уровень
- Попытка перетащить узел на самого себя или собственного потомка игнорируется (защита от циклов)
- MIME тип для DnD: `application/vnd.code.tree.ariadnaview`

## 2026-02-11 23:35

### Added
- Редактирование `caption` узла по клику в панели Node Details — открывается InputBox с валидацией (caption не может быть пустым)
- Команда `ariadna.editCaption` — изменяет caption текущего узла и обновляет дерево

## 2026-02-11 23:17

### Fixed
- Кнопка "Update from Editor" для `srcLink` теперь доступна даже когда `srcLink = null` — можно устанавливать srcLink для новосозданных узлов

## 2026-02-11 23:04

### Added
- Контекстное меню для узлов в дереве `ariadnaView`:
  - **Add Child** — добавить дочерний узел (доступно для Thread и Node)
  - **Insert Before** — вставить узел перед выбранным (только для Node)
  - **Insert After** — вставить узел после выбранного (только для Node)
  - **Delete** — удалить узел с подтверждением, если есть дочерние элементы (только для Node)
- Команды: `ariadna.addChildNode`, `ariadna.insertNodeBefore`, `ariadna.insertNodeAfter`, `ariadna.deleteNode`
- Вспомогательные функции в `extension.ts`:
  - `nextNodeId()` — генерация уникального ID для нового узла
  - `findParentContainer()` — поиск родительского массива и индекса узла в дереве
  - `createEmptyNode()` — создание нового узла с caption "New node"
- Файл `.eslintrc.json` — базовая конфигурация ESLint для проекта

### Changed
- `AriadnaTreeDataProvider.getTreeItem()`: установлен `contextValue = 'threadItem'` для Thread и `contextValue = 'nodeItem'` для Node (необходимо для работы контекстного меню)
- `package.json`: добавлены 4 новые команды и пункты меню `view/item/context` с условиями `viewItem`

## 2026-02-11 22:48

### Changed
- Модель `AriadnaThread`: поле `root: Node | null` заменено на `childs: Node[]` — теперь на верхнем уровне треда может быть несколько корневых узлов (синхронизация с Python-моделью)
- `src/model.ts`: обновлены функции `normalizeThread()`, `serializeThread()`, `validateThread()` для работы с массивом `childs`
- `src/extension.ts`: `AriadnaTreeDataProvider.getTreeItem()` и `getChildren()` теперь проверяют `element.childs.length > 0` вместо `element.root`
- `src/test/model.test.ts`: все тесты обновлены для работы с `childs` вместо `root`

## 2026-02-11 18:32

### Changed
- Комментарии в панели Node Details отображаются без нумерации `[0]`/`[1]` — текст комментария теперь показывается как label элемента дерева
- При наведении на комментарий появляется tooltip с полным текстом
- Клик на комментарий открывает `InputBox` для редактирования (команда `ariadna.editComment`) с валидацией длины (макс. 255 символов)

### Added
- Команда `ariadna.editComment` — редактирование комментария выбранного узла через модальный ввод
- Поле `commentIndex` в типе `DetailItem` для связи элемента дерева с индексом комментария

## 2026-02-11 18:02

### Added
- Кнопка «Save Thread» (иконка `$(save)`) в заголовке sidebar рядом с кнопкой загрузки
- Команда `ariadna.saveThread` — сохранение текущего треда в JSON-файл через `showSaveDialog`
- Функции сериализации `serializeNode()` и `serializeThread()` в `model.ts` (camelCase → snake_case JSON)
- Запоминание пути загруженного файла (`lastLoadedUri`) — диалог сохранения по умолчанию открывается в папке исходного файла с подставленным именем

## 2026-02-11 17:43

### Added
- Контекстное меню «Update from Editor» на элементе `srcLink` в панели Node Details — обновляет `srcLink` узла из текущей позиции активного редактора (путь, номер строки, содержимое строки)
- Команда `ariadna.updateSrcLink` с привязкой к `view/item/context` (inline) при `viewItem == srcLinkField`
- Метод `refresh()` в `AriadnaTreeDataProvider` для принудительного обновления основного дерева

### Changed
- Навигация `ariadna.selectNode` корректно обрабатывает абсолютные пути в `srcLink.path` (через `path.isAbsolute()`)
- `NodeDetailTreeProvider` хранит текущий узел (`currentNode`) и устанавливает `contextValue = 'srcLinkField'` для элемента srcLink

## 2026-02-11 17:15

### Added
- Навигация к исходному коду при клике на узел: если у узла заполнен `srcLink`, открывается файл `rootPath + path` в редакторе с позиционированием на строку `lineNum`

## 2026-02-11 17:07

### Added
- Панель «Node Details» (`ariadnaDetail`) в нижней части sidebar — второй TreeView, отображающий свойства выбранного узла (id, parentId, caption, srcLink, comments, visualMarks) как дерево ключ-значение
- `NodeDetailTreeProvider` в `extension.ts` — провайдер данных для панели деталей
- Команда `ariadna.selectNode` — обновляет панель деталей при клике на узел в основном дереве
- `item.command` на элементах-узлах основного дерева для вызова `ariadna.selectNode`

## 2026-02-11 17:01

### Added
- `CLAUDE.md` — инструкции проекта для Claude Code (архитектура, команды, модель данных)
- Display loaded thread as a tree in the sidebar (AriadnaTreeDataProvider).
  - Thread title shown as the root element (expanded).
  - Nodes show caption and source location (path:line) as description.
  - Tree updates automatically when a thread is loaded via `ariadna.loadThread`.

## 2f8b020 — 2026-02-11 ~15:40

### Added
- Команда `ariadna.loadThread` — загрузка треда из JSON-файла через стандартный диалог выбора файла
- Кнопка загрузки (иконка `folder-opened`) в заголовке sidebar-панели Ariadna
- Валидация загруженного JSON с выводом модального окна при ошибке (некорректный JSON или нарушение ограничений модели)
- Загруженный тред сохраняется в памяти расширения

### Changed
- `src/extension.ts` — подключена модель данных (`model.ts`), добавлена функция `loadThread`
- `package.json` — добавлена команда и привязка к меню `view/title`

## d5a403b — 2026-02-11 15:26 — Add data model with validation and tests

### Added
- Модель данных на TypeScript (`src/model.ts`): интерфейсы `SrcLink`, `VisualMark`, `Node`, `AriadnaThread`
- Runtime-валидация модели: `validateVisualMark`, `validateComment`, `validateNode`, `validateThread`
- Класс `ValidationError` с указанием имени поля
- Тесты валидации (`src/test/model.test.ts`) — 19 тестов на mocha (TDD)

## fdec5f9 — 2026-02-11 15:20 — Начальная модель данных

### Added
- Python/Pydantic модель данных (`data_model.py`) — исходная спецификация

## 7de7417 — 2026-02-07 11:02 — Add Ariadna activity bar icon and empty sidebar view

### Added
- Иконка Ariadna в activity bar
- Пустая sidebar-панель `ariadnaView`
- Команда `ariadna.helloWorld`

## 97ce390 — 2026-02-06 20:42 — Add VS Code extension scaffold

### Added
- Scaffold VS Code расширения: `package.json`, `tsconfig.json`, `src/extension.ts`
