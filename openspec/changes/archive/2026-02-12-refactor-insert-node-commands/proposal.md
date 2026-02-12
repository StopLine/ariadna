## Why

Команды `insertNodeBefore` и `insertNodeAfter` содержат дублирующийся код (10 из 12 строк идентичны). Единственное отличие — индекс вставки: `container.index` vs `container.index + 1`. Это усложняет поддержку и увеличивает риск ошибок при изменениях.

## What Changes

- Создание общей функции `insertNodeRelative()` для устранения дублирования
- Рефакторинг команд `insertNodeBefore` и `insertNodeAfter` для использования новой функции
- Сохранение публичного API команд (поведение не меняется)

## Capabilities

### New Capabilities
- `node-relative-insert`: Общая функция для вставки узла с относительным смещением от существующего узла

### Modified Capabilities
<!-- Поведение команд не меняется, только внутренняя реализация -->

## Impact

- `src/extension.ts`: Создание функции `insertNodeRelative()` и рефакторинг обработчиков команд `ariadna.insertNodeBefore` и `ariadna.insertNodeAfter`
