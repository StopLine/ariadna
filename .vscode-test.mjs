import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/test/**/*.test.js',
  version: '1.85.0',
  workspaceFolder: './',
  mocha: {
    ui: 'tdd',
    timeout: 20000
  }
});
