## 1. contextValue в NodeDetailTreeProvider

- [x] 1.1 Добавить `contextValue = 'commentsGroup'` на элемент "comments" в `getTreeItem()`
- [x] 1.2 Добавить `contextValue = 'commentItem'` на элементы комментариев (где `commentIndex !== undefined`) в `getTreeItem()`

## 2. Регистрация команд в package.json

- [x] 2.1 Добавить команды `ariadna.addComment`, `ariadna.addCommentAfter`, `ariadna.addCommentBefore`, `ariadna.deleteComment` в `contributes.commands`
- [x] 2.2 Добавить пункты контекстного меню в `contributes.menus.view/item/context` с `when`-условиями по `viewItem`

## 3. Реализация команд в extension.ts

- [x] 3.1 Реализовать `ariadna.addComment` — InputBox + append в конец `comments[]` + refresh
- [x] 3.2 Реализовать `ariadna.addCommentAfter` — InputBox + splice после `commentIndex` + refresh
- [x] 3.3 Реализовать `ariadna.addCommentBefore` — InputBox + splice перед `commentIndex` + refresh
- [x] 3.4 Реализовать `ariadna.deleteComment` — splice по `commentIndex` + refresh

## 4. Тестирование

- [x] 4.1 Проверить компиляцию (`npm run compile`)
- [x] 4.2 Проверить lint (`npm run lint`)
