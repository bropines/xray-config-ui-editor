import { parse as commentJsonParse, stringify as commentJsonStringify } from 'comment-json';

/**
 * Safely parse JSONC (JSON with comments and trailing commas) while preserving comments.
 */
export function parseJsonc<T = any>(input: string): T {
    if (!input || typeof input !== 'string') {
        throw new Error('Empty input');
    }

    try {
        // The 3rd arg to comment-json's parse is `removesComments` — passing
        // `true` here (as this used to) means "strip all comments while
        // parsing", the exact opposite of what parseJsonc is documented and
        // relied upon to do everywhere it's called (updateSection et al. in
        // configStore.ts, JsonField's comment-preserving reconciliation).
        // Every comment a user ever wrote in their raw config was being
        // silently discarded on the very first parse, before any of the
        // "preserve comments" logic downstream ever got a chance to run.
        return commentJsonParse(input, null, false) as T;
    } catch (e) {
        const cleanComments = input.replace(/("(?:\\.|[^\\"])*")|\/\*[\s\S]*?\*\/|\/\/.*/g, (match, group1) => {
            return group1 ? group1 : "";
        });
        const cleanTrailingCommas = cleanComments.replace(/,(\s*[\}\]])/g, '$1');
        return JSON.parse(cleanTrailingCommas);
    }
}

/**
 * Stringify JSON object or comment-json object, preserving comments if present.
 */
export function stringifyJsonc(val: any, space: number = 2): string {
    if (val === undefined || val === null) return "";
    try {
        return commentJsonStringify(val, null, space);
    } catch (e) {
        return JSON.stringify(val, null, space);
    }
}

/**
 * Strip comments and trailing commas from JSONC string
 */
export function stripJsoncComments(input: string): string {
    if (!input) return "";
    const cleanComments = input.replace(/("(?:\\.|[^\\"])*")|\/\*[\s\S]*?\*\/|\/\/.*/g, (match, group1) => {
        return group1 ? group1 : "";
    });
    return cleanComments.replace(/,(\s*[\}\]])/g, '$1');
}
