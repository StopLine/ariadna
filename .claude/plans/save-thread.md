# План: кнопка сохранения треда + запоминание пути загрузки

## Контекст
Пользователь редактирует тред (например, обновляет srcLink через «Update from Editor»), но сохранить изменения обратно в файл пока невозможно. Нужна кнопка «Save Thread» в заголовке sidebar рядом с кнопкой загрузки. При сохранении диалог должен по умолчанию открываться в папке, откуда был загружен файл.

## Файлы
- `package.json` — новая команда + меню
- `src/extension.ts` — запоминание пути, сохранение
- `src/model.ts` — функции сериализации в snake_case JSON

## Изменения

### 1. `src/model.ts` — сериализация в snake_case

JSON-формат использует snake_case (см. `sample1_data.json`), а runtime-модель — camelCase. Нужны функции обратного преобразования. Тип `RawObject` уже определён (строка 47).

```ts
export function serializeNode(node: Node): RawObject
export function serializeThread(thread: AriadnaThread): RawObject
```

### 2. `package.json`

- Новая команда: `ariadna.saveThread`, title "Save Thread", icon `$(save)`
- Добавить в `menus.view/title` рядом с loadThread

### 3. `src/extension.ts`

- Переменная `let lastLoadedUri: vscode.Uri | null = null`
- Сохранение `lastLoadedUri = uris[0]` в `loadThread()` после успешной загрузки
- Импорт `serializeThread` из `./model`
- Команда `ariadna.saveThread`: showSaveDialog с defaultUri из lastLoadedUri, сериализация через serializeThread, запись через workspace.fs.writeFile

## Проверка
- `npm run compile` — без ошибок
