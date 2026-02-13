import * as assert from 'assert';
import {
    type AriadnaThread,
    type Node,
    ValidationError,
    validateComment,
    validateNode,
    validateThread,
    normalizeSrcLink,
    normalizeNode,
    normalizeThread,
} from '../model';
import { _findNodeById, _isDescendantOf } from '../extension';

suite('Model Validation', () => {

    // --- Comment ---

    suite('validateComment', () => {
        test('accepts short comment', () => {
            assert.doesNotThrow(() => validateComment('hello'));
        });

        test('accepts 255-char comment', () => {
            assert.doesNotThrow(() => validateComment('x'.repeat(255)));
        });

        test('rejects comment over 255 chars', () => {
            assert.throws(() => validateComment('x'.repeat(256)), ValidationError);
        });
    });

    // --- Node ---

    suite('validateNode', () => {
        function makeNode(overrides: Partial<Node> = {}): Node {
            return {
                id: 0,
                parentId: null,
                srcLink: null,
                caption: '',
                comments: [],
                childs: [],
                ...overrides,
            };
        }

        test('accepts minimal valid node', () => {
            assert.doesNotThrow(() => validateNode(makeNode()));
        });

        test('rejects non-integer id', () => {
            assert.throws(() => validateNode(makeNode({ id: 1.5 })), ValidationError);
        });

        test('rejects non-integer parentId', () => {
            assert.throws(() => validateNode(makeNode({ parentId: 0.1 })), ValidationError);
        });

        test('accepts null parentId', () => {
            assert.doesNotThrow(() => validateNode(makeNode({ parentId: null })));
        });

        test('validates comments inside node', () => {
            assert.throws(
                () => validateNode(makeNode({ comments: ['x'.repeat(256)] })),
                ValidationError,
            );
        });

        test('validates child nodes recursively', () => {
            const child = makeNode({ id: 1.5 });
            assert.throws(
                () => validateNode(makeNode({ childs: [child] })),
                ValidationError,
            );
        });
    });

    // --- AriadnaThread ---

    suite('validateThread', () => {
        function makeThread(overrides: Partial<AriadnaThread> = {}): AriadnaThread {
            return {
                title: 'Test thread',
                rootPath: '/',
                description: null,
                childs: [],
                vcsRev: null,
                currentNodeId: null,
                ...overrides,
            };
        }

        test('accepts minimal valid thread', () => {
            assert.doesNotThrow(() => validateThread(makeThread()));
        });

        test('rejects empty title', () => {
            assert.throws(() => validateThread(makeThread({ title: '' })), ValidationError);
        });

        test('validates description length', () => {
            assert.throws(
                () => validateThread(makeThread({ description: 'x'.repeat(256) })),
                ValidationError,
            );
        });

        test('validates root node', () => {
            const badRoot: Node = {
                id: 0.5, parentId: null, srcLink: null,
                caption: '', comments: [], childs: [],
            };
            assert.throws(
                () => validateThread(makeThread({ childs: [badRoot] })),
                ValidationError,
            );
        });
    });

    // --- Normalization ---

    suite('normalizeSrcLink', () => {
        test('converts snake_case keys', () => {
            const result = normalizeSrcLink({ path: 'a.ts', line_num: 10, line_content: 'foo' });
            assert.strictEqual(result.lineNum, 10);
            assert.strictEqual(result.lineContent, 'foo');
        });

        test('fills defaults for missing fields', () => {
            const result = normalizeSrcLink({});
            assert.strictEqual(result.path, '');
            assert.strictEqual(result.lineNum, 0);
            assert.strictEqual(result.lineContent, '');
        });

        test('prefers camelCase over snake_case', () => {
            const result = normalizeSrcLink({ lineNum: 5, line_num: 99 });
            assert.strictEqual(result.lineNum, 5);
        });
    });

    suite('normalizeNode', () => {
        test('fills defaults for missing optional fields', () => {
            const result = normalizeNode({ id: 1 });
            assert.strictEqual(result.parentId, null);
            assert.strictEqual(result.srcLink, null);
            assert.strictEqual(result.caption, '');
            assert.deepStrictEqual(result.comments, []);
            assert.deepStrictEqual(result.childs, []);
        });

        test('converts snake_case keys', () => {
            const result = normalizeNode({
                id: 1,
                parent_id: 0,
                src_link: { path: 'a.ts', line_num: 1, line_content: 'x' },
            });
            assert.strictEqual(result.parentId, 0);
            assert.strictEqual(result.srcLink!.lineNum, 1);
        });

        test('normalizes children recursively', () => {
            const result = normalizeNode({
                id: 0,
                childs: [{ id: 1, childs: [{ id: 2 }] }],
            });
            assert.strictEqual(result.childs[0].childs[0].id, 2);
            assert.strictEqual(result.childs[0].childs[0].caption, '');
        });
    });

    suite('normalizeThread', () => {
        test('fills defaults for missing optional fields', () => {
            const result = normalizeThread({ title: 'Test' });
            assert.strictEqual(result.rootPath, '/');
            assert.strictEqual(result.description, null);
            assert.deepStrictEqual(result.childs, []);
            assert.strictEqual(result.vcsRev, null);
            assert.strictEqual(result.currentNodeId, null);
        });

        test('converts snake_case keys', () => {
            const result = normalizeThread({
                title: 'T',
                root_path: '/src',
                vcs_rev: 'abc123',
                current_node_id: 5,
            });
            assert.strictEqual(result.rootPath, '/src');
            assert.strictEqual(result.vcsRev, 'abc123');
            assert.strictEqual(result.currentNodeId, 5);
        });

        test('normalizes nested root node', () => {
            const result = normalizeThread({
                title: 'T',
                childs: [{
                    id: 0,
                    src_link: { path: 'f.ts', line_num: 42, line_content: 'hi' },
                }],
            });
            assert.strictEqual(result.childs[0].srcLink!.lineNum, 42);
            assert.deepStrictEqual(result.childs[0].comments, []);
        });

        test('normalized thread passes validation', () => {
            const result = normalizeThread({
                title: 'Minimal',
                childs: [{ id: 0 }],
            });
            assert.doesNotThrow(() => validateThread(result));
        });
    });

    // --- Extension helpers ---

    suite('findNodeById', () => {
        function makeNode(id: number, childs: Node[] = []): Node {
            return {
                id,
                parentId: null,
                srcLink: null,
                caption: `Node ${id}`,
                comments: [],
                childs,
            };
        }

        function makeThread(childs: Node[]): AriadnaThread {
            return {
                title: 'Test',
                rootPath: '/',
                description: null,
                childs,
                vcsRev: null,
                currentNodeId: null,
            };
        }

        test('finds node at root level', () => {
            const thread = makeThread([makeNode(1), makeNode(2)]);
            const result = _findNodeById(thread, 2);
            assert.strictEqual(result?.id, 2);
        });

        test('finds node at deep level', () => {
            const thread = makeThread([
                makeNode(1, [
                    makeNode(2, [
                        makeNode(3),
                    ]),
                ]),
            ]);
            const result = _findNodeById(thread, 3);
            assert.strictEqual(result?.id, 3);
        });

        test('returns null for missing id', () => {
            const thread = makeThread([makeNode(1)]);
            const result = _findNodeById(thread, 99);
            assert.strictEqual(result, null);
        });

        test('returns null for empty thread', () => {
            const thread = makeThread([]);
            const result = _findNodeById(thread, 1);
            assert.strictEqual(result, null);
        });
    });

    suite('isDescendantOf', () => {
        function makeNode(id: number, childs: Node[] = []): Node {
            return {
                id,
                parentId: null,
                srcLink: null,
                caption: `Node ${id}`,
                comments: [],
                childs,
            };
        }

        test('returns true for self', () => {
            const node = makeNode(1);
            assert.strictEqual(_isDescendantOf(node, node), true);
        });

        test('returns true for direct child', () => {
            const child = makeNode(2);
            const parent = makeNode(1, [child]);
            assert.strictEqual(_isDescendantOf(child, parent), true);
        });

        test('returns true for deep descendant', () => {
            const grandchild = makeNode(3);
            const child = makeNode(2, [grandchild]);
            const parent = makeNode(1, [child]);
            assert.strictEqual(_isDescendantOf(grandchild, parent), true);
        });

        test('returns false for unrelated nodes', () => {
            const node1 = makeNode(1);
            const node2 = makeNode(2);
            assert.strictEqual(_isDescendantOf(node1, node2), false);
        });

        test('returns false for parent of node', () => {
            const child = makeNode(2);
            const parent = makeNode(1, [child]);
            assert.strictEqual(_isDescendantOf(parent, child), false);
        });
    });
});
