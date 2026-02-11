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

- **Entry point**: `src/extension.ts` — exports `activate()` and `deactivate()`. Registers `AriadnaTreeDataProvider` for the sidebar view, and commands (`ariadna.helloWorld`, `ariadna.loadThread`). Maintains `currentThread` state.
- **Data model**: `src/model.ts` — defines the core types (`AriadnaThread`, `Node`, `SrcLink`, `VisualMark`, `Comment`) and runtime validation functions. Threads are recursive tree structures where each `Node` has `childs: Node[]`.
- **Output**: compiled JS goes to `out/` (CommonJS modules, ES2022 target).
- **VS Code API**: targets VS Code `^1.85.0`. The `@types/vscode` package provides types — do not import `vscode` as a runtime dependency; it is provided by the host.
- **Contribution points** in `package.json` under `contributes`: activity bar container (`ariadna`), sidebar view (`ariadnaView`), commands, and a view/title menu button for loading threads.

## Data Model

The thread JSON format (see `data/model_schema.json` and `data/sample1_data.json`):

- **AriadnaThread** — root document with `title`, `rootPath`, optional `description`, `root` node tree, `vcsRev`, and `currentNodeId`.
- **Node** — tree node with `id`, `parentId`, `srcLink` (file path + line number + expected content), `caption`, `comments[]`, `visualMarks[]`, and `childs[]`.
- **Validation** — all types have `validate*()` functions in `model.ts` that enforce constraints (char lengths, integer IDs, etc.) and throw `ValidationError` with field names. Data is validated on load before entering extension state.

## Testing

- Tests are in `src/test/model.test.ts` using Mocha.
- Factory helpers (`makeNode`, `makeThread`) build valid objects for testing.
- `_getCurrentThread()` is exported from `extension.ts` for test access.

## Dual-Language Schema

The data model exists in both Python (Pydantic, in `data/`) and TypeScript. The Python side generates the JSON schema and sample data. Keep these in sync when modifying the model.
