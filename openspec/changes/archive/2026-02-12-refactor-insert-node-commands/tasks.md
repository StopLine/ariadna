## 1. Создание общей функции

- [x] 1.1 Создать функцию `insertNodeRelative(node: Node, offset: number): void` после `createEmptyNode`
- [x] 1.2 Реализовать проверку `currentThread` с early return
- [x] 1.3 Реализовать поиск родительского контейнера с early return
- [x] 1.4 Реализовать создание нового узла с правильным parentId
- [x] 1.5 Реализовать вставку узла через `splice(container.index + offset, 0, newNode)`
- [x] 1.6 Реализовать обновление дерева через `treeDataProvider.refresh()`

## 2. Рефакторинг команд

- [x] 2.1 Заменить тело `insertNodeBefore` на вызов `insertNodeRelative(node, 0)`
- [x] 2.2 Заменить тело `insertNodeAfter` на вызов `insertNodeRelative(node, 1)`

## 3. Верификация

- [x] 3.1 Запустить `npm run compile` для проверки отсутствия ошибок TypeScript
- [x] 3.2 Проверить работу команды "Insert Before" в Extension Development Host
- [x] 3.3 Проверить работу команды "Insert After" в Extension Development Host
