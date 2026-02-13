# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Ariadna

Ariadna is a VS Code extension for navigating and annotating source code execution paths. Users create tree-structured bookmarks ("threads") through code to illustrate use cases, with support for comments, visual marks (emoji), and branching scenarios. Threads are stored as JSON files.

## Build & Development Commands

- `npm run compile` — compile TypeScript to `out/`
- `npm run watch` — compile in watch mode (default VS Code build task)
- `npm run lint` — run ESLint on `src/`
- `npm run test` — run tests via `@vscode/test-cli` (runs compile + lint first via `pretest`)

To debug: use the **"Run Extension"** launch configuration in VS Code, which starts an Extension Development Host with the compiled output.

## Architecture

- **Entry point**: `src/extension.ts` — exports `activate()` and `deactivate()`. Contains two tree data providers:
  - `AriadnaTreeDataProvider` — sidebar tree view (`ariadnaView`) showing the thread hierarchy with drag-and-drop support.
  - `NodeDetailTreeProvider` — detail panel (`ariadnaDetail`) showing properties of the selected node or thread.
- **Data model**: `src/model.ts` — defines core types (`AriadnaThread`, `Node`, `SrcLink`, `Comment`) plus normalization (snake_case JSON ↔ camelCase TS), serialization, and validation.
- **Thread structure**: `AriadnaThread` has `childs: Node[]` directly (no wrapper root node). Each `Node` has `id`, `parentId`, `srcLink`, `caption`, `comments[]`, and `childs[]`.
- **Output**: compiled JS goes to `out/` (CommonJS modules, ES2022 target).
- **VS Code API**: targets VS Code `^1.85.0`. The `@types/vscode` package provides types — do not import `vscode` as a runtime dependency; it is provided by the host.
- **Commands**: defined in `package.json` `contributes.commands` — includes node CRUD (`addChildNode`, `insertNodeBefore/After`, `deleteNode`), editing (`editCaption`, `editComment`), comments (`addComment`, `addCommentBefore/After`, `deleteComment`), visual marks (emoji toggles), `loadThread`/`saveThread`, and `updateSrcLink`.

## Data Model

- **AriadnaThread** — `title`, `rootPath`, optional `description`, `childs: Node[]`, `vcsRev`, `currentNodeId`.
- **Node** — `id`, `parentId`, `srcLink` (file path + line number + expected content), `caption`, `comments[]`, `childs[]`.
- **Normalization** — `normalize*()` functions convert snake_case JSON keys to camelCase and fill defaults. `serialize*()` does the reverse for saving.
- **Validation** — `validate*()` functions enforce constraints (char lengths, integer IDs, etc.) and throw `ValidationError` with field names. Data is validated on load before entering extension state.

## Testing

- Tests are in `src/test/model.test.ts` using Mocha (TDD `suite`/`test` style).
- Test runner: `@vscode/test-cli` + `@vscode/test-electron`, configured in `.vscode-test.mjs` (runs compiled JS from `out/test/`).
- Factory helpers (`makeNode`, `makeThread`) build valid objects for testing.
- Helper exports from `extension.ts` (`_getCurrentThread`, `_findNodeById`, `_isDescendantOf`) are available for test access.

## Rules for Claude Code

- не используй vscode-test

- при коммите не забудь добавить новые файл из @.claude из папки проекта, за исключением @settings.local.json

- записывай план в @.claude в папке проекта, а не на уровне пользователя

