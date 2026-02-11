# Changelog

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
