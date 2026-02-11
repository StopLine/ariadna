# План: панель деталей узла (TreeView)

## Контекст
Нижняя часть sidebar — второй TreeView, отображающий свойства выбранного узла как дерево ключ-значение. `childs` исключаем, `srcLink` плоско, `comments` — раскрывается на отдельные comment.

## Файлы

### 1. `package.json` — добавить view
В `contributes.views.ariadna` добавить:
```json
{ "id": "ariadnaDetail", "name": "Node Details" }
```

### 2. `src/extension.ts`

**a) Тип элемента деталей:**
```ts
type DetailItem = { label: string; value?: string; children?: DetailItem[] };
```

**b) `NodeDetailTreeProvider implements TreeDataProvider<DetailItem>`:**
- `items: DetailItem[]` — плоский список свойств текущего узла
- `showNode(node)` — строит items из полей Node (без childs), fire refresh
- `getTreeItem(item)` — label + description (value), collapsible если есть children
- `getChildren(item?)` — root → items, item → item.children

**c) Построение items из Node:**
- `id` → `{ label: "id", value: "123" }`
- `parentId` → `{ label: "parentId", value: "0" }` или "null"
- `caption` → `{ label: "caption", value: "..." }`
- `srcLink` — если null: одна строка; если есть: три строки `srcLink.path`, `srcLink.lineNum`, `srcLink.lineContent`
- `comments` → `{ label: "comments", children: [{ label: "[0]", value: "text" }, ...] }`
- `visualMarks` → `{ label: "visualMarks", children: [{ label: "[0]", value: "char name" }, ...] }`

**d) Клик по узлу в дереве** — `item.command` на Node-элементах → `ariadna.selectNode` → `detailProvider.showNode(node)`

**e) `activate()`** — регистрация провайдера и команды.

## Проверка
- `npm run compile`
