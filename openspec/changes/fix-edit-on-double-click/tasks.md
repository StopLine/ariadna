## 1. Подготовка структуры

- [x] 1.1 Добавить константу `DOUBLE_CLICK_THRESHOLD = 300` в верхней части extension.ts
- [x] 1.2 Добавить переменную состояния `lastDetailSelection` для отслеживания кликов (тип: `{ item: DetailItem | null; timestamp: number }`)

## 2. Модификация NodeDetailTreeProvider

- [x] 2.1 Удалить установку `item.command` для элементов с `commentIndex` в `getTreeItem()`
- [x] 2.2 Удалить установку `item.command` для элемента `caption` в `getTreeItem()`
- [x] 2.3 Сохранить `contextValue` для будущих расширений (не удалять)

## 3. Регистрация обработчика двойного клика

- [x] 3.1 В `activate()` получить TreeView для 'ariadnaDetail' через `vscode.window.createTreeView()` (вместо `registerTreeDataProvider`)
- [x] 3.2 Подписаться на `detailTreeView.onDidChangeSelection`
- [x] 3.3 Добавить TreeView в `context.subscriptions`

## 4. Реализация логики двойного клика

- [x] 4.1 В обработчике selection проверить, что выбран один элемент (`event.selection.length === 1`)
- [x] 4.2 Получить выбранный элемент `DetailItem`
- [x] 4.3 Проверить, совпадает ли с `lastDetailSelection.item`
- [x] 4.4 Если совпадает и время < DOUBLE_CLICK_THRESHOLD — вызвать соответствующую команду редактирования
- [x] 4.5 Определить тип элемента (caption или comment) и вызвать `ariadna.editCaption` или `ariadna.editComment`
- [x] 4.6 Сбросить `lastDetailSelection.item = null` после обработки двойного клика
- [x] 4.7 Обновить `lastDetailSelection` для первого клика или другого элемента

## 5. Верификация

- [x] 5.1 Запустить `npm run compile` для проверки отсутствия ошибок TypeScript
- [ ] 5.2 Протестировать двойной клик на caption в Extension Development Host
- [ ] 5.3 Протестировать двойной клик на комментарии в Extension Development Host
- [ ] 5.4 Протестировать одинарный клик (не должен открывать редактор)
- [ ] 5.5 Протестировать два клика с интервалом > 300ms (не должен открывать редактор)
