# План: Двойной клик на узле → редактирование caption

## Контекст
Сейчас двойной клик реализован только для тредов (`selectThread` — редактирует title). Для узлов (`selectNode`) двойного клика нет — клик просто выбирает узел и открывает файл. Нужно добавить аналогичную логику: двойной клик на узле вызывает `editCaption`.

## Файл
- `src/extension.ts`

## Шаги

1. **Добавить переменную** `lastNodeClickTime` рядом с `lastThreadClickTime` (строка 10):
   ```typescript
   let lastNodeClickTime = 0;
   ```

2. **Обернуть** команду `ariadna.selectNode` (строка 642) в логику двойного клика по аналогии с `selectThread` (строки 622–641):
   - Если `Date.now() - lastNodeClickTime < DOUBLE_CLICK_THRESHOLD` — вызвать `vscode.commands.executeCommand('ariadna.editCaption')` и выйти
   - Иначе — записать время и выполнить текущую логику (showNode + открытие файла)

## Проверка
- `npm run compile` — без ошибок
- Вручную: двойной клик на узле в дереве должен открывать InputBox для редактирования caption
