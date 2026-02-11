# Changelog

## [Unreleased] — 2026-02-11 ~15:40

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
