// ============================================================
// Finding a place in JSON text by the path that names it
// ============================================================

import { EditorState } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { jsonc } from '@platformos/lang-jsonc';
import type { SyntaxNode, Tree } from '@lezer/common';

/**
 * A validator reports `routing.rules[0].port`; an editor has to underline it.
 *
 * This used to be `doc.indexOf('"port"')` walking forward from the last
 * match, which lands on whichever `"port"` comes first in the file rather
 * than the one in the rule that is wrong. The parse tree already knows where
 * everything is, so the answer is exact — including inside a config with
 * comments, which is why the jsonc grammar is used and not JSON.parse.
 */

export interface TextRange {
    from: number;
    to: number;
}

const VALUE_NODES = new Set(['Object', 'Array', 'String', 'Number', 'True', 'False', 'Null']);

export const treeFor = (text: string): Tree =>
    syntaxTree(EditorState.create({ doc: text, extensions: [jsonc()] }));

/** The quoted name of a `PropertyName` node, without its quotes. */
const nameOf = (text: string, node: SyntaxNode): string => {
    const raw = text.slice(node.from, node.to);
    return raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2 ? raw.slice(1, -1) : raw;
};

/** The value half of a property — everything after its name. */
const valueOf = (property: SyntaxNode): SyntaxNode | null => {
    for (let child = property.firstChild; child; child = child.nextSibling) {
        if (VALUE_NODES.has(child.name)) return child;
    }
    return null;
};

/** The first Object or Array under the document node. */
const rootValue = (tree: Tree): SyntaxNode | null => {
    const top = tree.topNode;
    for (let child = top.firstChild; child; child = child.nextSibling) {
        if (VALUE_NODES.has(child.name)) return child;
    }
    return top.firstChild;
};

const childValues = (node: SyntaxNode): SyntaxNode[] => {
    const out: SyntaxNode[] = [];
    for (let child = node.firstChild; child; child = child.nextSibling) {
        if (VALUE_NODES.has(child.name)) out.push(child);
    }
    return out;
};

/**
 * Where `path` lives in `text`.
 *
 * Returns the key for an object member — underlining the name reads better
 * than underlining a whole nested object — and the value itself for an array
 * entry, which has no name of its own. Null when the path is not in the text,
 * which happens while it is being typed.
 */
export const rangeAtPath = (
    text: string,
    path: (string | number)[],
    tree: Tree = treeFor(text),
): TextRange | null => {
    const root = rootValue(tree);
    if (!root) return null;
    if (path.length === 0) return { from: root.from, to: root.to };

    let node: SyntaxNode = root;
    for (let i = 0; i < path.length; i++) {
        const segment = path[i]!;
        const last = i === path.length - 1;

        if (typeof segment === 'number') {
            if (node.name !== 'Array') return null;
            const entry: SyntaxNode | undefined = childValues(node)[segment];
            if (!entry) return null;
            if (last) return { from: entry.from, to: entry.to };
            node = entry;
            continue;
        }

        if (node.name !== 'Object') return null;
        let foundName: SyntaxNode | null = null;
        let foundValue: SyntaxNode | null = null;
        for (let child = node.firstChild; child; child = child.nextSibling) {
            if (child.name !== 'Property') continue;
            const nameNode = child.firstChild;
            if (!nameNode || nameNode.name !== 'PropertyName') continue;
            if (nameOf(text, nameNode) !== segment) continue;
            foundName = nameNode;
            foundValue = valueOf(child);
            break;
        }
        if (!foundName) return null;
        if (last) return { from: foundName.from, to: foundName.to };
        if (!foundValue) return null;
        node = foundValue;
    }

    return null;
};

/**
 * The path of the object the cursor is inside, for completion.
 *
 * A cursor half-way through typing a key is inside that key's Property node,
 * so the property it is in is dropped: what matters is the object it belongs
 * to, whose other keys are the ones worth offering.
 */
export const pathAtPosition = (
    text: string,
    pos: number,
    tree: Tree = treeFor(text),
): (string | number)[] => {
    const path: (string | number)[] = [];
    let node: SyntaxNode | null = tree.resolveInner(pos, -1);

    // Anything inside a property's own name or value still belongs to the
    // object around it, so climb out of the property first.
    while (node && node.name !== 'Object' && node.name !== 'Array' && node.name !== 'JsoncText' && node.name !== 'JsonText') {
        node = node.parent;
    }

    while (node && node.parent) {
        const parent: SyntaxNode = node.parent;
        if (parent.name === 'Property') {
            const nameNode = parent.firstChild;
            if (nameNode && nameNode.name === 'PropertyName') path.unshift(nameOf(text, nameNode));
            node = parent.parent;
            continue;
        }
        if (parent.name === 'Array') {
            path.unshift(childValues(parent).findIndex(child => child.from === node!.from));
        }
        node = parent;
    }

    return path;
};

/** Whether the cursor is writing a key or the value that follows one. */
export interface CursorContext {
    kind: 'key' | 'value';
    /** For a key: the object it belongs to. For a value: the field itself. */
    path: (string | number)[];
}

/**
 * What the cursor is in the middle of writing.
 *
 * Completion needs the difference: inside `"netw` it should offer the keys of
 * the surrounding object, and inside `"network": "` the values that key
 * accepts. An array counts as its property's value, since that is where the
 * entries of `"protocol": ["…"]` are typed.
 */
export const contextAt = (
    text: string,
    pos: number,
    tree: Tree = treeFor(text),
): CursorContext => {
    const inner = tree.resolveInner(pos, -1);

    let node: SyntaxNode | null = inner;
    while (node) {
        if (node.name === 'PropertyName') {
            return { kind: 'key', path: pathAtPosition(text, pos, tree) };
        }
        if (node.name === 'Property') {
            const nameNode = node.firstChild;
            // Still inside the name itself — including the gap right after it,
            // before a colon has been typed.
            if (nameNode && nameNode.name === 'PropertyName' && pos <= nameNode.to) {
                return { kind: 'key', path: pathAtPosition(text, pos, tree) };
            }
            const key = nameNode && nameNode.name === 'PropertyName' ? nameOf(text, nameNode) : null;
            const owner = pathAtPosition(text, node.from, tree);
            return { kind: 'value', path: key === null ? owner : [...owner, key] };
        }
        // An array is not a stopping point: its entries are the value of the
        // property that holds it, which is the key whose values to offer.
        if (node.name === 'Object') break;
        node = node.parent;
    }

    return { kind: 'key', path: pathAtPosition(text, pos, tree) };
};
