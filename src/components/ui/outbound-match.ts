// ============================================================
// How a listed outbound is matched against what is selected
// ============================================================

export interface MatchResult {
    exact: boolean;
    prefixMatch: boolean;
    pendingMatch: boolean;
    matchedPrefix?: string;
}

/**
 * A selection holds exact tags and prefixes at once — `vless-us-` picks up
 * every node in that location, and `direct` picks up one outbound. This says
 * which of the three ways a given tag is covered, including the half-typed
 * prefix still in the input, which the list highlights as you type.
 */
export function checkOutboundMatch(
    tag: string,
    selected: string[],
    pendingInput: string = ''
): MatchResult {
    const exact = selected.includes(tag);
    let matchedPrefix: string | undefined;

    const prefixMatch = !exact && selected.some(s => {
        if (s && tag.startsWith(s)) {
            matchedPrefix = s;
            return true;
        }
        return false;
    });

    const cleanInput = pendingInput.trim();
    const pendingMatch =
        !exact &&
        !prefixMatch &&
        cleanInput.length > 0 &&
        tag.startsWith(cleanInput);

    return { exact, prefixMatch, pendingMatch, matchedPrefix };
}
