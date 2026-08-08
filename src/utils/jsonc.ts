/**
 * Safely parse JSONC (JSON with comments and trailing commas)
 */
export function parseJsonc<T = any>(input: string): T {
    if (!input || typeof input !== 'string') {
        throw new Error('Empty input');
    }
    
    // Remove single line // comments and multi-line /* */ comments, preserving string literals
    const cleanComments = input.replace(/("(?:\\.|[^\\"])*")|\/\*[\s\S]*?\*\/|\/\/.*/g, (match, group1) => {
        return group1 ? group1 : "";
    });

    // Remove trailing commas before ] or }
    const cleanTrailingCommas = cleanComments.replace(/,(\s*[\}\]])/g, '$1');

    return JSON.parse(cleanTrailingCommas);
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
