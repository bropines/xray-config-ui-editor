import { describe, expect, it } from 'bun:test';
import { awgTagsForExp, parseNoiseExp, type ExpSegment } from './exp';
import { formatAwgSpec, parseAwgSpec } from './awg-tags';

/**
 * The noise expression grammar of v26.10.10
 * (infra/conf/transport_finalmask.go:361-441), read once for both the
 * diagnostics (finalmask-rules.noiseExpProblem, tested there for its words)
 * and the AmneziaWG export.
 */

const segments = (exp: string): ExpSegment[] => {
    const parsed = parseNoiseExp(exp);
    if ('error' in parsed) throw new Error(parsed.error);
    return parsed.segments;
};

describe('parseNoiseExp', () => {
    it('reads every tag the core builds', () => {
        expect(segments('<b 0xDE AD><r 8><rc 4-8><rd 2><t><c><n>')).toEqual([
            { kind: 'bytes', hex: 'dead' },
            { kind: 'random', key: 'r', min: 8, max: 8, size: '8' },
            { kind: 'letters', key: 'rc', min: 4, max: 8, size: '4-8' },
            { kind: 'digits', key: 'rd', min: 2, max: 2, size: '2' },
            { kind: 'timestamp' },
            { kind: 'counter' },
            { kind: 'nonce' },
        ]);
    });

    it('drops one 0x and one 0X, as the two TrimPrefix calls do', () => {
        expect(segments('<b 0XAB>')).toEqual([{ kind: 'bytes', hex: 'ab' }]);
        expect(segments('<b 0x0Xab>')).toEqual([{ kind: 'bytes', hex: 'ab' }]);
    });

    it('takes whitespace around and between tags, and nothing else', () => {
        expect(segments('  < t >\n<r  3 >  ')).toEqual([{ kind: 'timestamp' }, { kind: 'random', key: 'r', min: 3, max: 3, size: '3' }]);
        expect(parseNoiseExp('x<t>')).toEqual({ error: 'invalid noise exp near x' });
        expect(parseNoiseExp('')).toEqual({ error: 'empty noise exp: ' });
        expect(parseNoiseExp('<r -1>')).toEqual({ error: 'invalid size in noise exp: -1' });
        expect(parseNoiseExp('<x>')).toEqual({ error: 'unknown <x> in noise exp' });
    });
});

describe('awgTagsForExp', () => {
    const mapped = (exp: string) => awgTagsForExp(segments(exp));

    it('spells the shared tags the AmneziaWG way, and <n> as <r 8>', () => {
        const result = mapped('<b 0xDEAD><r 8><rc 4><rd 2><t><n>');
        expect('tags' in result && formatAwgSpec(result.tags)).toBe('<b 0xdead><r 8><rc 4><rd 2><t><r 8>');
    });

    it('writes a chain AmneziaWG itself parses back to the same tags', () => {
        const result = mapped('<b 0x0102><r 0><t><rc 3>');
        if (!('tags' in result)) throw new Error('not mapped');
        const back = parseAwgSpec(formatAwgSpec(result.tags));
        expect(back.notes).toEqual([]);
        expect(back.tags).toEqual(result.tags);
    });

    it('has no spelling for a counter or a ranged length', () => {
        for (const exp of ['<c>', '<b 0x01><c>', '<r 8-16>', '<rc 1-2>', '<rd 0-9>']) {
            const result = mapped(exp);
            expect('notes' in result).toBe(true);
        }
        const result = mapped('<r 8-16><c><r 8-16>');
        // One note per thing that does not carry, not one per tag.
        expect('notes' in result && result.notes.map(note => note.severity)).toEqual(['warning', 'warning']);
    });
});
