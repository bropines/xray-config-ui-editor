/**
 * A JSON object whose values are all strings.
 *
 * Several keys the core reads are `map[string]string` — an HTTP outbound's
 * `headers` (v26.7.28:infra/conf/http.go:66), a routing rule's webhook
 * `headers` (v26.7.28:infra/conf/router.go:129) and `attrs` (:147). Go decodes
 * them with encoding/json, which refuses anything else: a string, a list or
 * a number where the object goes, or a number, a boolean or a nested object
 * as one of the values, is a type error and the decode returns it
 * (v26.7.28:infra/conf/loader.go:51-53 for a protocol's settings,
 * v26.7.28:infra/conf/router.go:154-157 for a routing rule). The config does
 * not load; there is no "ignore this key".
 *
 * A JSON `null` is a nil map and fine, like an absent key. So is a `null`
 * *value*: encoding/json ignores a null for a string (decode.go, literalStore —
 * the Go standard library, go 1.26 at v26.3.27:go.mod:3, go 1.27 at
 * v26.10.10:go.mod:3), so the key is kept with an empty string and nothing
 * fails.
 */

export type StringMapProblem =
    /** The key holds something that is not an object. */
    | { kind: 'not-object'; held: unknown }
    /** The object holds a value under `name` that is not a string. */
    | { kind: 'not-string'; name: string; held: unknown };

export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/** What stops the core reading `value` as a map of strings; nothing for an absent or null one. */
export const stringMapProblems = (value: unknown): StringMapProblem[] => {
    if (value === undefined || value === null) return [];
    if (!isPlainObject(value)) return [{ kind: 'not-object', held: value }];
    return Object.entries(value)
        .filter(([, held]) => held !== null && typeof held !== 'string')
        .map(([name, held]): StringMapProblem => ({ kind: 'not-string', name, held }));
};

/** A held value, short enough for one line of a message. */
export const previewValue = (value: unknown): string => {
    let text: string;
    try {
        text = JSON.stringify(value) ?? String(value);
    } catch {
        text = String(value);
    }
    return text.length > 48 ? `${text.slice(0, 47)}…` : text;
};
