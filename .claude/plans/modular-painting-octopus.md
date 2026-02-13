# Убрать currentNodeId из TypeScript-кода

## Контекст
Из Python-модели данных убрано поле `current_node_id`. Нужно синхронизировать TypeScript-код — удалить `currentNodeId` из типа, парсинга, сериализации и тестов.

## Изменения

### 1. `src/model.ts`

**Строка 31** — убрать поле из интерфейса `AriadnaThread`:
```
currentNodeId: number | null;  // удалить
```

**Строка 68** — убрать из `parseThread()`:
```
currentNodeId: raw.currentNodeId ?? raw.current_node_id ?? null,  // удалить
```

**Строка 96** — убрать из `serializeThread()`:
```
current_node_id: thread.currentNodeId,  // удалить
```

### 2. `src/test/model.test.ts`

Убрать все упоминания `currentNodeId` / `current_node_id` из тестовых объектов и ассертов (строки 90, 181, 189, 193, 238).

## Проверка
- `npm run compile` — компиляция проходит
- `npm run test` — тесты проходят
