# Двойной клик на узле дерева → редактирование caption

## Контекст
Сейчас клик на узле в основном дереве (`ariadnaView`) вызывает `ariadna.selectNode` — показывает детали и открывает файл. Нужно добавить: двойной клик на узле открывает диалог редактирования caption (аналогично тому, как уже работает двойной клик на caption в панели деталей).

## Подход
Используем тот же паттерн двойного клика, что уже применяется для `ariadna.detailItemClick` (строка 448): отслеживаем время между кликами и сравниваем с `DOUBLE_CLICK_THRESHOLD` (300мс).

## Изменения

**Файл:** `src/extension.ts`

### 1. Добавить переменную для отслеживания кликов по узлам дерева (~строка 9, рядом с `lastDetailClick`)
```typescript
let lastNodeClick: { nodeId: number; timestamp: number } | null = null;
```

### 2. Изменить команду `ariadna.selectNode` (строка 413)
Добавить проверку двойного клика в начало обработчика. При двойном клике — вызывать `ariadna.editCaption`, при одинарном — текущее поведение (показать детали + открыть файл).

```typescript
vscode.commands.registerCommand('ariadna.selectNode', async (node: Node) => {
    const now = Date.now();
    const isDoubleClick = lastNodeClick !== null &&
        node.id === lastNodeClick.nodeId &&
        now - lastNodeClick.timestamp < DOUBLE_CLICK_THRESHOLD;

    if (isDoubleClick) {
        lastNodeClick = null;
        detailProvider.showNode(node);
        vscode.commands.executeCommand('ariadna.editCaption');
        return;
    }

    lastNodeClick = { nodeId: node.id, timestamp: now };
    detailProvider.showNode(node);
    // ... остальная логика навигации к файлу без изменений
```

Важно: `detailProvider.showNode(node)` вызывается и при двойном клике, чтобы `editCaption` нашёл `detailProvider.currentNode`.

## Проверка
- `npm run compile` — компиляция проходит
- В Extension Development Host: одинарный клик — выбор узла + навигация к файлу; двойной клик — диалог редактирования caption
