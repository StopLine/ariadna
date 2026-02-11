# План: замена `root` на `childs` в AriadnaThread

## Контекст
В Python-модели (`data_model.py`) поле `root: Node | None` заменено на `childs: list[Node]` — теперь на верхнем уровне треда может быть несколько корневых узлов. Нужно синхронизировать TypeScript-код.

## Изменения

### 1. `src/model.ts` — интерфейс AriadnaThread (строка 38)
- `root: Node | null` → `childs: Node[]`

### 2. `src/model.ts` — normalizeThread (строка 78)
- Было: `root: raw.root != null ? normalizeNode(raw.root) : null`
- Стало: `childs: (raw.childs ?? []).map((c: RawObject) => normalizeNode(c))`

### 3. `src/model.ts` — serializeThread (строка 107)
- Было: `root: thread.root ? serializeNode(thread.root) : null`
- Стало: `childs: thread.childs.map(c => serializeNode(c))`

### 4. `src/model.ts` — validateThread (строки 162-164)
- Было: `if (thread.root !== null) { validateNode(thread.root); }`
- Стало: `for (const child of thread.childs) { validateNode(child); }`

### 5. `src/extension.ts` — AriadnaTreeDataProvider.getTreeItem (строки 33-35)
- Было: `element.root ? Expanded : None`
- Стало: `element.childs.length > 0 ? Expanded : None`

### 6. `src/extension.ts` — AriadnaTreeDataProvider.getChildren (строка 64)
- Было: `return element.root ? [element.root] : []`
- Стало: `return element.childs`

### 7. `src/test/model.test.ts` — обновить тесты
- `makeThread`: заменить `root: null` → `childs: []`
- Тест "validates root node": передавать `childs: [badRoot]` вместо `root: badRoot`
- Тест "fills defaults": проверять `result.childs` вместо `result.root`
- Тест "normalizes nested root node": передавать `childs: [...]` и проверять `result.childs[0]`
- Тест "normalized thread passes validation": передавать `childs: [{ id: 0 }]`

## Проверка
- `npm run compile` — без ошибок
- `npm run test` — все тесты проходят
