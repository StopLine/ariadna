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

// --- Normalization (snake_case JSON → camelCase TS, fill defaults) ---

/** Raw JSON shape (snake_case keys, optional fields) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawObject = Record<string, any>;

export function normalizeSrcLink(raw: RawObject): SrcLink {
    return {
        path: raw.path ?? '',
        lineNum: raw.lineNum ?? raw.line_num ?? 0,
        lineContent: raw.lineContent ?? raw.line_content ?? '',
    };
}

export function normalizeNode(raw: RawObject): Node {
    return {
        id: raw.id,
        parentId: raw.parentId ?? raw.parent_id ?? null,
        srcLink: raw.srcLink ?? raw.src_link
            ? normalizeSrcLink(raw.srcLink ?? raw.src_link)
            : null,
        caption: raw.caption ?? '',
        comments: raw.comments ?? [],
        visualMarks: (raw.visualMarks ?? raw.visual_marks ?? []).map(
            (m: RawObject) => ({ char: m.char, name: m.name }) as VisualMark,
        ),
        childs: (raw.childs ?? []).map((c: RawObject) => normalizeNode(c)),
    };
}

export function normalizeThread(raw: RawObject): AriadnaThread {
    return {
        title: raw.title ?? '',
        rootPath: raw.rootPath ?? raw.root_path ?? '/',
        description: raw.description ?? null,
        root: raw.root != null ? normalizeNode(raw.root) : null,
        vcsRev: raw.vcsRev ?? raw.vcs_rev ?? null,
        currentNodeId: raw.currentNodeId ?? raw.current_node_id ?? null,
    };
}

// --- Serialization (camelCase TS → snake_case JSON) ---

export function serializeNode(node: Node): RawObject {
    return {
        id: node.id,
        parent_id: node.parentId,
        src_link: node.srcLink ? {
            path: node.srcLink.path,
            line_num: node.srcLink.lineNum,
            line_content: node.srcLink.lineContent,
        } : null,
        caption: node.caption,
        comments: node.comments,
        visual_marks: node.visualMarks.map(m => ({ char: m.char, name: m.name })),
        childs: node.childs.map(c => serializeNode(c)),
    };
}

export function serializeThread(thread: AriadnaThread): RawObject {
    return {
        title: thread.title,
        root_path: thread.rootPath,
        description: thread.description,
        root: thread.root ? serializeNode(thread.root) : null,
        vcs_rev: thread.vcsRev,
        current_node_id: thread.currentNodeId,
    };
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
