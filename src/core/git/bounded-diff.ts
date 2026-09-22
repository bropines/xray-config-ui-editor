// ============================================================
// A line diff that cannot run away with the main thread
// ============================================================

import { diffLines, type Change } from 'diff';

/**
 * `diffLines` is O(N·D) in the number of differing lines, which is fine right
 * up until it is not. Measured on a 203 kB config of ~7,000 lines:
 *
 *     1 rule changed ->      6 ms
 *    20 rules        ->    124 ms
 *    60 rules        ->  1,158 ms
 *   120 rules        ->  7,365 ms
 *   whole config     -> 16,223 ms
 *
 * Every one of those runs on the main thread, and the app runs several per
 * action — a commit, the stats in the commit dialog, the history view. That
 * is where "the git log freezes everything for two minutes" comes from, and
 * it is not the storage or the IndexedDB write: those measured 29 ms and
 * 40 ms for the same data.
 *
 * The library takes a wall-clock `timeout` and bails out rather than
 * finishing. A bail is not a failure — a diff nobody can read is worth less
 * than a count that arrives instantly — so callers get counts either way and
 * the viewer says plainly when it gave up.
 */

/** Budget for a diff whose result is only a counter. */
export const SUMMARY_DIFF_TIMEOUT_MS = 150;

/** Budget for a diff the user is looking at and waiting for. */
export const VIEW_DIFF_TIMEOUT_MS = 1_500;

export interface DiffCounts {
    additions: number;
    deletions: number;
    /** The diff ran out of budget; the counts come from a line tally instead. */
    approximate: boolean;
}

export interface BoundedDiff extends DiffCounts {
    /** Null when the diff bailed out — there is nothing to render. */
    changes: Change[] | null;
}

const countFrom = (changes: Change[]): { additions: number; deletions: number } => {
    let additions = 0;
    let deletions = 0;
    for (const change of changes) {
        if (change.added) additions += change.count || 1;
        if (change.removed) deletions += change.count || 1;
    }
    return { additions, deletions };
};

/**
 * Counts changed lines without aligning them.
 *
 * A multiset difference is O(n) and answers the only question a summary asks —
 * how much moved — without the alignment that makes the real diff expensive.
 * It over-counts a line that merely moved, which is why it is labelled
 * approximate wherever it is shown.
 */
export const tallyLineChanges = (before: string, after: string): { additions: number; deletions: number } => {
    const counts = new Map<string, number>();
    for (const line of before.split('\n')) counts.set(line, (counts.get(line) ?? 0) + 1);

    let additions = 0;
    for (const line of after.split('\n')) {
        const remaining = counts.get(line) ?? 0;
        if (remaining > 0) counts.set(line, remaining - 1);
        else additions += 1;
    }

    let deletions = 0;
    for (const remaining of counts.values()) deletions += remaining;

    return { additions, deletions };
};

/**
 * Diffs two texts within a time budget.
 *
 * Returns the changes when it finishes in time, and counts either way.
 */
export const boundedDiff = (
    before: string,
    after: string,
    timeoutMs = VIEW_DIFF_TIMEOUT_MS,
): BoundedDiff => {
    // Identical inputs are the common case on a re-render; skip the work.
    if (before === after) {
        return { changes: [], additions: 0, deletions: 0, approximate: false };
    }

    const changes = diffLines(before, after, { timeout: timeoutMs }) as Change[] | undefined;
    if (changes) {
        return { changes, ...countFrom(changes), approximate: false };
    }
    return { changes: null, ...tallyLineChanges(before, after), approximate: true };
};

/** Counts only — used where nothing renders the changes themselves. */
export const diffCounts = (
    before: string,
    after: string,
    timeoutMs = SUMMARY_DIFF_TIMEOUT_MS,
): DiffCounts => {
    const { additions, deletions, approximate } = boundedDiff(before, after, timeoutMs);
    return { additions, deletions, approximate };
};
