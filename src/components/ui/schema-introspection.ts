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

// Helper to inspect the Zod type at runtime
export function getSchemaTypeAndDetails(schema: z.ZodTypeAny): {
    type: 'string' | 'number' | 'boolean' | 'enum' | 'object' | 'array' | 'unknown';
    options?: string[];
    innerSchema?: z.ZodTypeAny;
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

        // 3. Check for string fallback
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
