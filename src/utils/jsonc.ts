import { parse as commentJsonParse, stringify as commentJsonStringify } from 'comment-json';

/**
 * Safely parse JSONC (JSON with comments and trailing commas) while preserving comments.
 */
export function parseJsonc<T = any>(input: string): T {
    if (!input || typeof input !== 'string') {
        throw new Error('Empty input');
    }

    try {
        // comment-json parse preserves comments as Symbol properties on objects/arrays
        return commentJsonParse(input, null, true) as T;
    } catch (e) {
        // Fallback: strip comments and trailing commas manually if comment-json fails
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
