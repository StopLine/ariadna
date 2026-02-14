# Синхронизация ограничений max_length=255 для полей AriadnaThread

## Context
В Python-модели (`data_model.py`) добавлены `max_length=255` для полей `title`, `root_path`, `vcs_rev`. Нужно синхронизировать TS-код: валидацию в `model.ts` и InputBox-валидацию в `extension.ts`.

## Файлы
- `src/model.ts` — `validateThread()`
- `src/extension.ts` — команда `ariadna.editThreadField`
- `src/test/model.test.ts` — тесты валидации

## Изменения

### 1. `src/model.ts` — `validateThread()`
Добавить проверки длины после существующей проверки `!thread.title`:
```typescript
if (thread.title.length > 255) {
    throw new ValidationError('title', 'must be at most 255 characters');
}
if (thread.rootPath.length > 255) {
    throw new ValidationError('rootPath', 'must be at most 255 characters');
}
if (thread.vcsRev !== null && thread.vcsRev.length > 255) {
    throw new ValidationError('vcsRev', 'must be at most 255 characters');
}
```

### 2. `src/extension.ts` — `ariadna.editThreadField`
Добавить `validateInput` для полей, где его ещё нет:
- **title** — добавить `v.length > 255 ? 'Max 255 characters' : ...`
- **rootPath** — добавить `validateInput: (v) => v.length > 255 ? 'Max 255 characters' : undefined`
- **vcsRev** — добавить `validateInput: (v) => v.length > 255 ? 'Max 255 characters' : undefined`

### 3. `src/test/model.test.ts` — добавить тесты
Тесты на то, что `title`, `rootPath`, `vcsRev` длиной >255 бросают `ValidationError`.

## Проверка
- `npm run compile`
- `npm run lint`
- `npm run test`
