import { describe, expect, it } from 'bun:test';
import { boundedDiff, diffCounts, tallyLineChanges } from './bounded-diff';

/** A config-shaped text with `changed` of its 220 rules altered. */
const config = (seed: number, changed: number): string => {
    const rules = Array.from({ length: 220 }, (_, i) => {
        const salt = i < changed ? `-v${seed}` : '';
        return {
            type: 'field',
            ruleTag: `Rule-${i}${salt}`,
            domain: Array.from({ length: 20 }, (_, d) => `geosite:example-${i}-${d}${salt}`),
            outboundTag: `proxy-${i % 8}`,
        };
    });
    return JSON.stringify({ routing: { rules } }, null, 2);
};

describe('boundedDiff', () => {
    it('returns the changes when the diff fits the budget', () => {
        const result = boundedDiff(config(0, 0), config(1, 1));
        expect(result.changes).not.toBeNull();
        expect(result.approximate).toBe(false);
        expect(result.additions).toBeGreaterThan(0);
        expect(result.deletions).toBeGreaterThan(0);
    });

    it('gives up instead of running away with the main thread', () => {
        // Unbounded, this pair measured 16 seconds.
        const started = performance.now();
        const result = boundedDiff(config(0, 0), config(1, 220), 150);
        const elapsed = performance.now() - started;

        expect(result.changes).toBeNull();
        expect(result.approximate).toBe(true);
        // Counts still arrive, from the tally rather than the alignment.
        expect(result.additions).toBeGreaterThan(0);
        expect(elapsed).toBeLessThan(2_000);
    });

    it('short-circuits identical text', () => {
        const same = config(0, 0);
        const result = boundedDiff(same, same);
        expect(result).toEqual({ changes: [], additions: 0, deletions: 0, approximate: false });
    });
});

describe('tallyLineChanges', () => {
    it('counts lines added and removed', () => {
        expect(tallyLineChanges('a\nb\nc', 'a\nx\nc')).toEqual({ additions: 1, deletions: 1 });
        expect(tallyLineChanges('a\nb', 'a\nb\nc')).toEqual({ additions: 1, deletions: 0 });
        expect(tallyLineChanges('a\nb\nc', 'a')).toEqual({ additions: 0, deletions: 2 });
    });

    it('counts repeated lines by multiplicity, not presence', () => {
        expect(tallyLineChanges('x\nx\nx', 'x')).toEqual({ additions: 0, deletions: 2 });
        expect(tallyLineChanges('x', 'x\nx\nx')).toEqual({ additions: 2, deletions: 0 });
    });

    it('sees nothing in identical text', () => {
        expect(tallyLineChanges('a\nb\nc', 'a\nb\nc')).toEqual({ additions: 0, deletions: 0 });
    });

    it('over-counts a moved line, which is why it is called approximate', () => {
        // The alignment a real diff does is exactly what is skipped here.
        expect(tallyLineChanges('a\nb', 'b\na')).toEqual({ additions: 0, deletions: 0 });
        expect(tallyLineChanges('a\nb\nc', 'c\nb\na\nd')).toEqual({ additions: 1, deletions: 0 });
    });
});

describe('diffCounts', () => {
    it('answers quickly even when the diff itself cannot', () => {
        const started = performance.now();
        const counts = diffCounts(config(0, 0), config(1, 220));
        expect(performance.now() - started).toBeLessThan(2_000);
        expect(counts.approximate).toBe(true);
        expect(counts.additions + counts.deletions).toBeGreaterThan(0);
    });
});
