# Удаление visual_marks из TypeScript кода

## Контекст
В коммите `89ecf27` поле `visual_marks` и класс `VisualMark` были удалены из Python-модели и JSON-схемы. Нужно синхронизировать TypeScript-код.

## Изменения

### 1. `src/model.ts`
- Удалить интерфейс `VisualMark` (строки 12-16)
- Удалить константу `vmarkNote` (строка 18)
- Удалить поле `visualMarks` из интерфейса `Node` (строка 29)
- Удалить маппинг `visualMarks` из `normalizeNode()` (строки 66-68)
- Удалить `visual_marks` из `serializeNode()` (строка 97)
- Удалить функцию `validateVisualMark()` (строки 122-129)
- Удалить валидацию visualMarks из `validateNode()` (строки 147-149)

### 2. `src/extension.ts`
- Удалить блок отображения visualMarks в detail provider (строки 184-191)

### 3. `src/test/model.test.ts`
- Удалить импорты `VisualMark`, `validateVisualMark`, `vmarkNote` (строки 5, 7, 11)
- Удалить suite `validateVisualMark` (строки 22-46)
- Удалить тест `validates visual marks inside node` (строки 103-108)
- Убрать `visualMarks: []` из всех `makeNode()` хелперов (строки 74, 271, 326)
- Убрать `visualMarks: []` из объекта `badRoot` (строка 152)
- Убрать `visual_marks` из тестов нормализации (строки 199, 203, 244, 248)
- Убрать `assert.deepStrictEqual(result.visualMarks, [])` из тестов (строка 190)

## Проверка
```bash
npm run compile && npm run test
```
