import { parse as commentJsonParse, stringify as commentJsonStringify } from 'comment-json';

/**
 * Safely parse JSONC (JSON with comments and trailing commas) while preserving comments.
 */
export function parseJsonc<T = any>(input: string): T {
    if (!input || typeof input !== 'string') {
        throw new Error('Empty input');
    }

    try {
        const res = commentJsonParse(input, null, true) as T;
        console.log('[JSONC] Successfully parsed JSONC input, length:', input.length);
        return res;
    } catch (e) {
        console.warn('[JSONC] commentJsonParse failed, falling back to manual comment-stripping:', e);
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
        const res = commentJsonStringify(val, null, space);
        console.log('[JSONC] Stringified JSONC object, result length:', res.length);
        return res;
    } catch (e) {
        console.warn('[JSONC] commentJsonStringify failed, falling back to JSON.stringify:', e);
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
