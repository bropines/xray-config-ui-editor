// ============================================================
// What may be written here — asked of the schema, at a path
// ============================================================

import type { z } from 'zod';
import { schemaFor, type LintMode } from './json-lint';
import { settingsSchemaFor } from './schemas/settings-by-protocol';

/**
 * The JSON editors offered the root object's keys everywhere, at every depth,
 * labelled "schema property" — so inside a routing rule they suggested `log`
 * and `inbounds`. The schema knows better than that: it knows which keys
 * belong where, what type each one takes, and which of them are closed sets
 * with a handful of legal values.
 *
 * Read structurally (`_def.type`) rather than with `instanceof`, for the same
 * reason SchemaField does: a schema built by a second copy of zod would fail
 * the identity check and quietly offer nothing.
 */

export interface FieldHint {
    name: string;
    /** A word for the shape of the value: string, number, object, array… */
    type: string;
    /** The only values allowed, when the field is a closed set. */
    values?: string[];
    required: boolean;
}

type Any = any;

const def = (schema: Any): Any => schema?._def ?? {};
const tag = (schema: Any): string => def(schema).type ?? '';

/** Strips optional/nullable/default/catch, reporting whether it was optional. */
const unwrap = (schema: Any): { schema: Any; required: boolean } => {
    let current = schema;
    let required = true;
    while (current) {
        const kind = tag(current);
        if (kind === 'optional' || kind === 'nullable' || kind === 'default' || kind === 'prefault' || kind === 'catch') {
            if (kind !== 'nullable') required = false;
            current = def(current).innerType;
            continue;
        }
        if (kind === 'lazy') {
            current = def(current).getter?.();
            continue;
        }
        break;
    }
    return { schema: current, required };
};

const shapeOf = (schema: Any): Record<string, Any> | null => {
    const { schema: bare } = unwrap(schema);
    if (!bare) return null;
    if (tag(bare) === 'object') return (bare.shape ?? def(bare).shape ?? null) as Record<string, Any> | null;
    if (tag(bare) === 'union') {
        // Merge the branches: a key any branch accepts is worth offering.
        const merged: Record<string, Any> = {};
        for (const option of def(bare).options ?? []) {
            const shape = shapeOf(option);
            if (shape) for (const [key, value] of Object.entries(shape)) merged[key] ??= value;
        }
        return Object.keys(merged).length ? merged : null;
    }
    return null;
};

/** The values of an enum or a union of literals, if that is what this is. */
const valuesOf = (schema: Any): string[] | undefined => {
    const { schema: bare } = unwrap(schema);
    if (!bare) return undefined;
    const kind = tag(bare);

    if (kind === 'enum') {
        const entries = def(bare).entries ?? bare.options;
        const values = Array.isArray(entries) ? entries : Object.values(entries ?? {});
        return values.map(String);
    }
    if (kind === 'literal') {
        const values = def(bare).values ?? [def(bare).value];
        return values.filter((v: unknown) => v !== undefined).map(String);
    }
    if (kind === 'array') return valuesOf(def(bare).element);
    if (kind === 'union') {
        const all: string[] = [];
        for (const option of def(bare).options ?? []) {
            const values = valuesOf(option);
            if (values) all.push(...values);
        }
        return all.length ? [...new Set(all)] : undefined;
    }
    return undefined;
};

/** A word for what the field holds. */
const typeName = (schema: Any): string => {
    const { schema: bare } = unwrap(schema);
    const kind = tag(bare);
    if (kind === 'array') {
        const element = typeName(def(bare).element);
        return element === 'unknown' ? 'array' : `${element}[]`;
    }
    if (kind === 'record') return 'object';
    if (kind === 'union') {
        const kinds = [...new Set((def(bare).options ?? []).map((o: Any) => typeName(o)))];
        return kinds.length === 1 ? String(kinds[0]) : kinds.join(' | ');
    }
    return kind || 'unknown';
};

/** Follows one path segment into the schema of what lives there. */
const step = (schema: Any, segment: string | number): Any => {
    const { schema: bare } = unwrap(schema);
    if (!bare) return null;
    const kind = tag(bare);

    if (typeof segment === 'number') {
        if (kind === 'array') return def(bare).element;
        return null;
    }
    if (kind === 'record') return def(bare).valueType;
    if (kind === 'union') {
        for (const option of def(bare).options ?? []) {
            const next = step(option, segment);
            if (next) return next;
        }
        return null;
    }
    const shape = shapeOf(bare);
    return shape?.[segment] ?? null;
};

/**
 * Where the protocol for a `settings` block is read from.
 *
 * A document works, but completion runs against text that is usually
 * mid-edit and does not parse — so the editor passes a lookup backed by the
 * syntax tree instead, which reads a half-written file quite happily.
 */
export type ProtocolLookup = (ownerPath: (string | number)[]) => unknown;

/** Reads a value out of the document being edited, if there is one. */
const valueAt = (root: unknown, path: (string | number)[]): unknown => {
    let node: Any = root;
    for (const segment of path) {
        if (node === null || node === undefined) return undefined;
        node = node[segment as keyof typeof node];
    }
    return node;
};

/** Which side of the config a `settings` block at this path belongs to. */
const directionAt = (mode: LintMode, path: (string | number)[]): 'inbound' | 'outbound' | null => {
    if (mode === 'inbound' || mode === 'inbounds') return 'inbound';
    if (mode === 'outbound' || mode === 'outbounds') return 'outbound';
    if (mode !== 'full') return null;
    if (path[0] === 'inbounds') return 'inbound';
    if (path[0] === 'outbounds') return 'outbound';
    return null;
};

/**
 * Walks the schema down a path.
 *
 * `settings` is the one hop the schema alone cannot make: the wrapper leaves
 * it open because its shape depends on the `protocol` written next to it.
 * Given the document, the walk switches to that protocol's schema and carries
 * on, which is how completion can offer `clients` inside a vless inbound and
 * `vnext` inside a vless outbound.
 */
const lookupFrom = (source: unknown | ProtocolLookup): ProtocolLookup => (
    typeof source === 'function'
        ? source as ProtocolLookup
        : (ownerPath) => (valueAt(source, ownerPath) as { protocol?: unknown } | undefined)?.protocol
);

const schemaAtPath = (mode: LintMode, path: (string | number)[], source?: unknown): Any => {
    let current: Any = schemaFor(mode) as unknown as z.ZodTypeAny;
    for (let i = 0; i < path.length; i++) {
        const segment = path[i]!;

        if (segment === 'settings' && source !== undefined) {
            const direction = directionAt(mode, path);
            const protocol = lookupFrom(source)(path.slice(0, i));
            const settings = direction ? settingsSchemaFor(direction, protocol) : null;
            if (settings) {
                current = settings;
                continue;
            }
        }

        current = step(current, segment);
        if (!current) return null;
    }
    return current;
};

/**
 * The keys that belong in the object at `path`.
 *
 * Empty when the path leads somewhere with no fixed keys — a `record` of
 * protocol settings, say — which is the honest answer: anything goes there.
 */
export const fieldsAt = (mode: LintMode, path: (string | number)[], source?: unknown | ProtocolLookup): FieldHint[] => {
    const shape = shapeOf(schemaAtPath(mode, path, source));
    if (!shape) return [];
    return Object.entries(shape).map(([name, field]) => {
        const { required } = unwrap(field);
        const values = valuesOf(field);
        return { name, type: typeName(field), required, ...(values ? { values } : {}) };
    });
};

/** The values the field at `path` accepts, when it accepts only a few. */
export const valuesAt = (mode: LintMode, path: (string | number)[], source?: unknown | ProtocolLookup): string[] => {
    const schema = schemaAtPath(mode, path, source);
    return schema ? valuesOf(schema) ?? [] : [];
};
