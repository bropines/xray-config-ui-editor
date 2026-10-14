/**
 * A routing rule's `attrs`: the request attributes the rule matches on.
 *
 * The rule decodes it as `Attributes map[string]string` on every supported
 * line (v26.3.27:infra/conf/router.go:546, v26.7.28:infra/conf/router.go:147,
 * v26.9.9:infra/conf/router.go:147, v26.10.10:infra/conf/router.go:158 — 26.10
 * did not change it). So it is an object of strings and nothing else: a string,
 * a list or a number in its place, or a number, a boolean or a nested object as
 * one of its values, is an encoding/json type error. The rule's decode returns
 * it (v26.3.27:infra/conf/router.go:553-556, v26.7.28:infra/conf/router.go:154-157,
 * v26.9.9:infra/conf/router.go:155-158, v26.10.10:infra/conf/router.go:166-169),
 * parseRule wraps it as "invalid field rule" (v26.10.10:infra/conf/router.go:300)
 * and RouterConfig.Build() hands it up unchanged
 * (v26.10.10:infra/conf/router.go:113-116) — the config does not load.
 * A JSON `null` is a nil map, the same as no key (see string-map.ts).
 *
 * What the map means, for the form's help: each key is an attribute name,
 * lower-cased before it is looked up, and each value is a Go regular
 * expression the attribute's value has to match; every entry has to match
 * (v26.10.10:app/router/config.go:72-78, condition.go:265-283). The attributes
 * are `:method` and `:path` of a sniffed HTTP request
 * (v26.10.10:common/protocol/http/sniff.go:104-109) and, on the HTTP inbound,
 * every request header by its lower-case name (v26.10.10:proxy/http/server.go:237-241).
 *
 * Not checked here: the value is compiled with `regexp.MustCompile`
 * (v26.10.10:app/router/config.go:75, the same call on every line), so a
 * pattern Go cannot compile panics while routing is built. JavaScript's
 * RegExp accepts a different language from Go's RE2 — `(?i)` is RE2 only,
 * look-arounds are JavaScript only — so a check here would be wrong both ways.
 */

import { t } from '../../i18n';
import { isPlainObject, previewValue, stringMapProblems } from './string-map';

export type AttrsProblemKind = 'attrs.type' | 'attrs.value';

export interface AttrsProblem {
    kind: AttrsProblemKind;
    /** Where it is, from the rule down. */
    field: 'attrs';
    /** Always critical: either way the rule does not decode and the config does not load. */
    severity: 'critical';
    message: string;
    suggestion?: string;
    /** For `attrs.value`: the attribute whose value is not a string. */
    name?: string;
}

/** What the rule holds under `attrs`, whatever it is; nothing for a non-object rule. */
export const readAttrs = (rule: unknown): unknown => (isPlainObject(rule) ? rule.attrs : undefined);

/** Whether the rule holds an `attrs` the core cannot read as an object at all. */
export const attrsWrongType = (rule: unknown): boolean => {
    const held = readAttrs(rule);
    return held !== undefined && held !== null && !isPlainObject(held);
};

/**
 * Everything about one rule's `attrs` that stops the core decoding the rule.
 * Nothing for a rule without one, and nothing for a snippet reference or
 * anything else that is not a rule object — callers skip those first.
 */
export const attrsProblems = (rule: unknown): AttrsProblem[] =>
    stringMapProblems(readAttrs(rule)).map((problem): AttrsProblem => (
        problem.kind === 'not-object'
            ? {
                kind: 'attrs.type',
                field: 'attrs',
                severity: 'critical',
                message: t("{what} is {value}, but Xray reads an object of attribute names to strings there. It cannot decode the rule, so the config will not load.", { what: 'attrs', value: previewValue(problem.held) }),
                suggestion: t("Write it as an object, for example {example}.", { example: '{ ":method": "GET" }' }),
            }
            : {
                kind: 'attrs.value',
                field: 'attrs',
                severity: 'critical',
                name: problem.name,
                message: t("{what} gives \"{name}\" the value {value}, and attribute values are strings. Xray cannot decode the rule, so the config will not load.", { what: 'attrs', name: problem.name, value: previewValue(problem.held) }),
                suggestion: t("Put the value in quotes."),
            }
    ));
