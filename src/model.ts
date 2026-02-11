/**
 * Модель данных для Ariadna plugin
 */

/** Ссылка на место в исходном коде */
export interface SrcLink {
    path: string;
    lineNum: number;
    lineContent: string;
}

/** Визуальная метка. Юникодный символ или эмодзи */
export interface VisualMark {
    char: string;
    name: string;
}

export const vmarkNote: VisualMark = { char: "⚠️", name: "attention" };

/** Комментарий (макс. 255 символов) */
export type Comment = string;

export interface Node {
    id: number;
    parentId: number | null;
    srcLink: SrcLink | null;
    caption: string;
    comments: Comment[];
    visualMarks: VisualMark[];
    childs: Node[];
}

/** Модель треда */
export interface AriadnaThread {
    title: string;
    rootPath: string;
    description: Comment | null;
    root: Node | null;
    vcsRev: string | null;
    currentNodeId: number | null;
}

// --- Validation ---

export class ValidationError extends Error {
    constructor(public field: string, message: string) {
        super(`${field}: ${message}`);
        this.name = 'ValidationError';
    }
}

export function validateVisualMark(mark: VisualMark): void {
    if (!mark.char || mark.char.length > 4) {
        throw new ValidationError('char', 'must be 1-4 characters');
    }
    if (!mark.name || mark.name.length > 20) {
        throw new ValidationError('name', 'must be 1-20 characters');
    }
}

export function validateComment(comment: Comment): void {
    if (comment.length > 255) {
        throw new ValidationError('comment', 'must be at most 255 characters');
    }
}

export function validateNode(node: Node): void {
    if (!Number.isInteger(node.id)) {
        throw new ValidationError('id', 'must be an integer');
    }
    if (node.parentId !== null && !Number.isInteger(node.parentId)) {
        throw new ValidationError('parentId', 'must be an integer or null');
    }
    for (const comment of node.comments) {
        validateComment(comment);
    }
    for (const mark of node.visualMarks) {
        validateVisualMark(mark);
    }
    for (const child of node.childs) {
        validateNode(child);
    }
}

export function validateThread(thread: AriadnaThread): void {
    if (!thread.title) {
        throw new ValidationError('title', 'must not be empty');
    }
    if (thread.description !== null) {
        validateComment(thread.description);
    }
    if (thread.root !== null) {
        validateNode(thread.root);
    }
}
