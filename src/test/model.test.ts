import * as assert from 'assert';
import {
    type AriadnaThread,
    type Node,
    type VisualMark,
    ValidationError,
    validateVisualMark,
    validateComment,
    validateNode,
    validateThread,
    vmarkNote,
    normalizeSrcLink,
    normalizeNode,
    normalizeThread,
} from '../model';

suite('Model Validation', () => {

    // --- VisualMark ---

    suite('validateVisualMark', () => {
        test('accepts valid mark', () => {
            assert.doesNotThrow(() => validateVisualMark(vmarkNote));
        });

        test('rejects empty char', () => {
            const mark: VisualMark = { char: '', name: 'ok' };
            assert.throws(() => validateVisualMark(mark), ValidationError);
        });

        test('rejects char longer than 4', () => {
            const mark: VisualMark = { char: 'abcde', name: 'ok' };
            assert.throws(() => validateVisualMark(mark), ValidationError);
        });

        test('rejects empty name', () => {
            const mark: VisualMark = { char: '!', name: '' };
            assert.throws(() => validateVisualMark(mark), ValidationError);
        });

        test('rejects name longer than 20', () => {
            const mark: VisualMark = { char: '!', name: 'a'.repeat(21) };
            assert.throws(() => validateVisualMark(mark), ValidationError);
        });
    });

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
                visualMarks: [],
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

        test('validates visual marks inside node', () => {
            assert.throws(
                () => validateNode(makeNode({ visualMarks: [{ char: '', name: 'bad' }] })),
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
                caption: '', comments: [], visualMarks: [], childs: [],
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
            assert.deepStrictEqual(result.visualMarks, []);
            assert.deepStrictEqual(result.childs, []);
        });

        test('converts snake_case keys', () => {
            const result = normalizeNode({
                id: 1,
                parent_id: 0,
                src_link: { path: 'a.ts', line_num: 1, line_content: 'x' },
                visual_marks: [{ char: '!', name: 'bang' }],
            });
            assert.strictEqual(result.parentId, 0);
            assert.strictEqual(result.srcLink!.lineNum, 1);
            assert.strictEqual(result.visualMarks[0].char, '!');
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
                    visual_marks: [{ char: '!', name: 'x' }],
                }],
            });
            assert.strictEqual(result.childs[0].srcLink!.lineNum, 42);
            assert.strictEqual(result.childs[0].visualMarks[0].char, '!');
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
});
