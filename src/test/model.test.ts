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
                root: null,
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
                () => validateThread(makeThread({ root: badRoot })),
                ValidationError,
            );
        });
    });
});
