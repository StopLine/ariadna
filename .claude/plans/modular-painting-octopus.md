# Убрать id и parentId из панели деталей узла

## Контекст
В панели "Node Details" (вид `ariadnaDetail`) отображаются служебные поля `id` и `parentId`, которые не несут пользы для пользователя. Нужно их скрыть.

## Изменение

**Файл:** `src/extension.ts`, метод `NodeDetailTreeProvider.showNode()` (~строка 152)

Удалить два элемента из массива `items`:
```typescript
{ label: 'id', value: String(node.id) },
{ label: 'parentId', value: node.parentId === null ? 'null' : String(node.parentId) },
```

Больше никакие файлы менять не нужно — эти поля нигде больше не используются для отображения.

## Проверка
- `npm run compile` — убедиться, что компиляция проходит
- Запустить Extension Development Host и убедиться, что панель деталей не содержит полей id/parentId
