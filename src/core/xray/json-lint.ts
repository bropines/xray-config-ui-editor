// ============================================================
// What the JSON editors check against
// ============================================================

import { z } from 'zod';
import {
    XrayConfigSchema,
    InboundSchema,
    OutboundSchema,
    RoutingSchema,
    RoutingRuleSchema,
    BalancerSchema,
    DnsSchema,
    ReverseSchema,
} from './schemas';

/**
 * The JSON editors used to validate against `utils/config.schema.json`, which
 * a script derives from Xray-core's Go structs. That schema cannot see how
 * Xray actually reads a config: a routing rule, for instance, is unmarshalled
 * by hand in Go, so the generated definition knows only `ruleTag`,
 * `outboundTag` and `balancerTag` — and carries `additionalProperties: false`.
 * Every real rule therefore lit up red for `domain`, `ip`, `protocol` and the
 * rest, which is the "Schema: must NOT have additional properties" people
 * were seeing on configs that run perfectly well.
 *
 * The forms in this app have never used that schema. They use the zod schemas
 * under `core/xray/schemas`, written from the Xray documentation, where every
 * object is `.passthrough()` — unknown keys are carried, not condemned. This
 * module points the editors at the same schemas, so the JSON view and the
 * form view finally agree about what a valid config is.
 */

export type LintMode =
    | 'full' | 'inbound' | 'inbounds' | 'outbound' | 'outbounds'
    | 'rule' | 'dns' | 'balancer' | 'routing' | 'reverse';

export interface JsonIssue {
    /** Where the problem is, as a path of keys and array indexes. */
    path: (string | number)[];
    /** One sentence, addressed to whoever is looking at the editor. */
    message: string;
}

const SCHEMAS: Record<LintMode, z.ZodTypeAny> = {
    full: XrayConfigSchema,
    inbound: InboundSchema,
    inbounds: z.array(InboundSchema),
    outbound: OutboundSchema,
    outbounds: z.array(OutboundSchema),
    rule: RoutingRuleSchema,
    routing: RoutingSchema,
    dns: DnsSchema,
    balancer: BalancerSchema,
    reverse: ReverseSchema,
};

export const schemaFor = (mode: LintMode): z.ZodTypeAny => SCHEMAS[mode] ?? XrayConfigSchema;

/** `['routing', 'rules', 0, 'port']` -> `routing.rules[0].port`. */
export const formatPath = (path: (string | number)[]): string =>
    path.reduce<string>((out, segment) => (
        typeof segment === 'number' ? `${out}[${segment}]` : out ? `${out}.${segment}` : String(segment)
    ), '');

const article = (word: string) => (/^[aeiou]/i.test(word) ? 'an' : 'a');

/**
 * Says what is wrong in the terms the editor's user has in front of them.
 *
 * zod's own wording is aimed at a developer reading a stack trace ("Invalid
 * input: expected string, received number"); this names the field and what it
 * wanted, which is the part that tells you what to type instead.
 */
const describe = (issue: z.core.$ZodIssue): string => {
    const where = formatPath(issue.path as (string | number)[]);
    const field = where ? `${where}: ` : '';

    switch (issue.code) {
        case 'invalid_type': {
            const expected = String((issue as any).expected ?? 'a different type');
            return `${field}expected ${article(expected)} ${expected}`;
        }
        case 'invalid_value': {
            const values = (issue as any).values as unknown[] | undefined;
            if (values?.length) {
                const list = values.map(v => JSON.stringify(v)).join(', ');
                return `${field}must be one of ${list}`;
            }
            return `${field}${issue.message}`;
        }
        case 'unrecognized_keys': {
            const keys = ((issue as any).keys as string[] | undefined) ?? [];
            return `${field}unknown ${keys.length === 1 ? 'key' : 'keys'}: ${keys.join(', ')}`;
        }
        case 'too_small':
        case 'too_big':
        case 'invalid_format':
        case 'not_multiple_of':
            return `${field}${issue.message}`;
        case 'invalid_union':
            return `${field}does not match any of the shapes this field accepts`;
        default:
            return `${field}${issue.message}`;
    }
};

/**
 * Validates an already-parsed value.
 *
 * Returns at most one issue per path: zod reports every branch of a union it
 * tried, and a field that is wrong in six ways is still one thing to fix.
 */
export const lintValue = (mode: LintMode, value: unknown): JsonIssue[] => {
    const result = schemaFor(mode).safeParse(value);
    if (result.success) return [];

    const seen = new Set<string>();
    const issues: JsonIssue[] = [];
    for (const issue of result.error.issues) {
        const path = issue.path as (string | number)[];
        const key = formatPath(path);
        if (seen.has(key)) continue;
        seen.add(key);
        issues.push({ path, message: describe(issue) });
    }
    return issues;
};
