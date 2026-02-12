#!/bin/bash
# Setup vscode mock for running tests outside VS Code Extension Host

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VSCODE_MOCK_DIR="$PROJECT_ROOT/node_modules/vscode"

echo "Setting up vscode mock for tests..."

# Create vscode mock directory
mkdir -p "$VSCODE_MOCK_DIR"

# Create mock index.js
cat > "$VSCODE_MOCK_DIR/index.js" << 'EOF'
// Minimal vscode mock for testing
module.exports = {
  window: {
    showInformationMessage: () => {},
    showErrorMessage: () => {},
    showWarningMessage: () => {},
    showOpenDialog: () => Promise.resolve([]),
    showSaveDialog: () => Promise.resolve(undefined),
    showInputBox: () => Promise.resolve(undefined),
    createTreeView: () => ({
      onDidChangeSelection: () => ({ dispose: () => {} }),
    }),
    registerTreeDataProvider: () => {},
    showTextDocument: () => Promise.resolve({}),
    activeTextEditor: null,
  },
  workspace: {
    fs: {
      readFile: () => Promise.resolve(Buffer.from('')),
      writeFile: () => Promise.resolve(),
    },
  },
  commands: {
    registerCommand: () => ({ dispose: () => {} }),
    executeCommand: () => Promise.resolve(),
  },
  TreeItem: class TreeItem {
    constructor(label, collapsibleState) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  },
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2,
  },
  EventEmitter: class EventEmitter {
    constructor() {
      this.event = () => ({ dispose: () => {} });
    }
    fire() {}
  },
  Uri: {
    file: (path) => ({ fsPath: path }),
  },
  Range: class Range {
    constructor(startLine, startChar, endLine, endChar) {
      this.start = { line: startLine, character: startChar };
      this.end = { line: endLine, character: endChar };
    }
  },
  DataTransfer: class DataTransfer {
    constructor() {
      this._data = new Map();
    }
    get(mimeType) {
      return this._data.get(mimeType);
    }
    set(mimeType, value) {
      this._data.set(mimeType, value);
    }
  },
  DataTransferItem: class DataTransferItem {
    constructor(value) {
      this.value = value;
    }
  },
};
EOF

# Create package.json
cat > "$VSCODE_MOCK_DIR/package.json" << 'EOF'
{
  "name": "vscode",
  "version": "1.85.0",
  "description": "Mock vscode module for testing",
  "main": "index.js"
}
EOF

echo "✓ vscode mock installed successfully at $VSCODE_MOCK_DIR"
echo ""
echo "You can now run tests with:"
echo "  npx mocha out/test/**/*.test.js --ui tdd"
echo ""
echo "Or run all tests:"
echo "  npm run test:unit"
