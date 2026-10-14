// ============================================================
// Reading a zod schema at runtime, and the durations in it
// ============================================================

import { z } from 'zod';
import type { TimeUnit } from './duration';

/**
 * The schema's runtime kind — `'string'`, `'optional'`, `'union'` and so on.
 *
 * Read structurally rather than with `instanceof` so a schema that came from
 * a different copy of zod is still recognised. zod 3 spelled this
 * `_def.typeName` ('ZodString'); zod 4 spells it `_def.type` ('string').
 */
const defTag = (schema: unknown): string | undefined =>
    (schema as { _def?: { type?: string } } | null)?._def?.type;

/**
 * What a form can draw for a schema.
 *
 * `object`, `record` and `unknown` are the three a text box cannot hold: the
 * value is (or may be) a JSON object, and a text box writes a string. Xray
 * decodes such a key into a Go struct, pointer or map, where a string is a
 * type error that fails the whole config, so the form gives all three a
 * structured editor — see SchemaField. `unknown` is everything not recognised
 * here, including `any` and a union that mixes a scalar with a structure.
 */
export type SchemaFieldKind = 'string' | 'number' | 'boolean' | 'enum' | 'object' | 'record' | 'array' | 'unknown';

/** Kinds whose value is a container, not something one text box can hold. */
const CONTAINER_KINDS: SchemaFieldKind[] = ['object', 'record', 'array'];

/** A camelCase key as a label: `limitFallbackUpload` → "Limit Fallback Upload". */
export const humanizeKey = (name: string): string =>
    name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

// Helper to inspect the Zod type at runtime
export function getSchemaTypeAndDetails(schema: z.ZodTypeAny): {
    type: SchemaFieldKind;
    options?: string[];
    innerSchema?: z.ZodTypeAny;
    /** A record whose values are strings: the core's map[string]string. */
    stringValues?: boolean;
} {
    let current = schema;

    // Unwrap optional, nullable, default
    while (
        current instanceof z.ZodOptional ||
        current instanceof z.ZodNullable ||
        defTag(current) === 'optional' ||
        defTag(current) === 'nullable' ||
        defTag(current) === 'default'
    ) {
        current = (current as any).unwrap ? (current as any).unwrap() : (current as any)._def.innerType;
    }

    const typeName = defTag(current);

    if (current instanceof z.ZodString || typeName === 'string') {
        return { type: 'string' };
    }
    if (current instanceof z.ZodNumber || typeName === 'number') {
        return { type: 'number' };
    }
    if (current instanceof z.ZodBoolean || typeName === 'boolean') {
        return { type: 'boolean' };
    }
    if (current instanceof z.ZodEnum || typeName === 'enum') {
        return { type: 'enum', options: (current as any).options };
    }
    if (current instanceof z.ZodObject || typeName === 'object') {
        return { type: 'object', innerSchema: current };
    }
    if (current instanceof z.ZodArray || typeName === 'array') {
        return { type: 'array', innerSchema: (current as any).element };
    }
    // A map of names to values — HTTP headers, socket options. It has no
    // shape to draw fields from, but it is an object all the same.
    if (current instanceof z.ZodRecord || typeName === 'record') {
        // map[string]string in the core (headers, attrs): a value that is not
        // a string fails the decode, so the box should refuse one.
        const values = (current as { _def?: { valueType?: unknown } })._def?.valueType;
        return { type: 'record', stringValues: defTag(values) === 'string' || values instanceof z.ZodString };
    }
    if (current instanceof z.ZodUnion || typeName === 'union') {
        const options = (current as any)._def.options || [];

        // 1. Check if any union branch is an enum with defined options
        for (const opt of options) {
            const details = getSchemaTypeAndDetails(opt);
            if (details.type === 'enum' && details.options && details.options.length > 0) {
                return details;
            }
        }

        // 2. Check if all union branches are literals (e.g. z.literal(0) | z.literal(1))
        const literalValues = options
            .filter((opt: any) => opt instanceof z.ZodLiteral || defTag(opt) === 'literal')
            .map((opt: any) => String(opt._def?.value ?? (opt as any).value));
        if (literalValues.length > 0 && literalValues.length === options.length) {
            return { type: 'enum', options: literalValues };
        }

        // 3. A structure next to a scalar — `"url" | { url, headers }`. The
        // string fallback below would hand it a text box, which shows the
        // object branch as "[object Object]" and replaces it with a string on
        // the first keystroke. Neither branch alone can draw it.
        const kinds: SchemaFieldKind[] = options.map((opt: any) => getSchemaTypeAndDetails(opt).type);
        const containers = kinds.filter(kind => CONTAINER_KINDS.includes(kind));
        if (containers.length > 0 && containers.length < kinds.length) {
            return { type: 'unknown' };
        }

        // 4. Check for string fallback
        const hasString = options.some((opt: any) => {
            let u = opt;
            while (
                u instanceof z.ZodOptional || u instanceof z.ZodNullable ||
                defTag(u) === 'optional' || defTag(u) === 'nullable' || defTag(u) === 'default'
            ) {
                u = u.unwrap ? u.unwrap() : u._def.innerType;
            }
            return u instanceof z.ZodString || defTag(u) === 'string';
        });
        if (hasString) {
            return { type: 'string' };
        }
        for (const opt of options) {
            const details = getSchemaTypeAndDetails(opt);
            if (details.type !== 'unknown') {
                return details;
            }
        }
    }

    return { type: 'unknown' };
}

export const DURATION_FIELD_SPECS: Record<string, { defaultUnit: TimeUnit; mode: 'string' | 'number'; baseUnit?: TimeUnit }> = {
    probeInterval: { defaultUnit: 'm', mode: 'string' },
    interval: { defaultUnit: 'm', mode: 'string' },
    timeout: { defaultUnit: 's', mode: 'string' },
    maxRTT: { defaultUnit: 's', mode: 'string' },
    handshake: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    connIdle: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    uplinkOnly: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    downlinkOnly: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    timeoutMs: { defaultUnit: 'ms', mode: 'number', baseUnit: 'ms' },
    serveExpiredTTL: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    refresh: { defaultUnit: 'm', mode: 'number', baseUnit: 'm' },
    tcpKeepAliveIdle: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    tcpKeepAliveInterval: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    tcpUserTimeout: { defaultUnit: 'ms', mode: 'number', baseUnit: 'ms' },
    scMinPostsIntervalMs: { defaultUnit: 'ms', mode: 'number', baseUnit: 'ms' },
    hKeepAlivePeriod: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    maxTimeDiff: { defaultUnit: 'ms', mode: 'number', baseUnit: 'ms' },
    deduplication: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    idle_timeout: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    health_check_timeout: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    max_idle_timeout: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    handshake_timeout: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    keepAlive: { defaultUnit: 's', mode: 'number', baseUnit: 's' },
    tti: { defaultUnit: 'ms', mode: 'number', baseUnit: 'ms' }
};
