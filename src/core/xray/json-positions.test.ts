import { describe, expect, it } from 'bun:test';
import { rangeAtPath, pathAtPosition, contextAt } from './json-positions';

const CONFIG = `{
  // routing first
  "routing": {
    "rules": [
      { "ruleTag": "A", "port": 80 },
      { "ruleTag": "B", "port": { "bad": 1 } }
    ]
  },
  "inbounds": [
    { "tag": "socks-in", "port": 10808 }
  ]
}`;

const at = (path: (string | number)[]) => {
    const range = rangeAtPath(CONFIG, path);
    return range ? CONFIG.slice(range.from, range.to) : null;
};

describe('rangeAtPath', () => {
    it('finds a top-level key', () => {
        expect(at(['routing'])).toBe('"routing"');
    });

    it('finds the key inside the array entry that is meant, not the first one that matches', () => {
        // The naive search this replaced would stop at the first `"port"`.
        const second = rangeAtPath(CONFIG, ['routing', 'rules', 1, 'port'])!;
        const first = rangeAtPath(CONFIG, ['routing', 'rules', 0, 'port'])!;
        expect(CONFIG.slice(second.from, second.to)).toBe('"port"');
        expect(second.from).toBeGreaterThan(first.from);
        // And it is the one on the rule tagged B.
        expect(CONFIG.slice(0, second.from)).toContain('"B"');
    });

    it('points at a whole array entry when the path ends in an index', () => {
        expect(at(['inbounds', 0])).toBe('{ "tag": "socks-in", "port": 10808 }');
    });

    it('is not confused by comments', () => {
        expect(at(['inbounds'])).toBe('"inbounds"');
    });

    it('returns the document for an empty path, and null for a path that is not there', () => {
        expect(rangeAtPath(CONFIG, [])).toEqual({ from: 0, to: CONFIG.length });
        expect(rangeAtPath(CONFIG, ['nope'])).toBeNull();
        expect(rangeAtPath(CONFIG, ['routing', 'rules', 9, 'port'])).toBeNull();
    });

    it('survives text that is still being typed', () => {
        expect(rangeAtPath('{ "routing": { "rul', ['routing', 'rules'])).toBeNull();
        expect(rangeAtPath('', ['a'])).toBeNull();
    });
});

describe('pathAtPosition', () => {
    const posOf = (needle: string) => CONFIG.indexOf(needle) + needle.length;

    it('answers with the object the cursor is in', () => {
        expect(pathAtPosition(CONFIG, posOf('"ruleTag": "A'))).toEqual(['routing', 'rules', 0]);
    });

    it('counts array entries', () => {
        expect(pathAtPosition(CONFIG, posOf('"ruleTag": "B'))).toEqual(['routing', 'rules', 1]);
    });

    it('descends into a nested object', () => {
        expect(pathAtPosition(CONFIG, posOf('"bad"'))).toEqual(['routing', 'rules', 1, 'port']);
    });

    it('is empty at the top level', () => {
        expect(pathAtPosition(CONFIG, 2)).toEqual([]);
    });
});

describe('contextAt', () => {
    const doc = `{
  "routing": {
    "domainStrategy": "IPIfNonMatch",
    "rules": [
      { "network": "tcp", "protocol": ["bittorrent"] }
    ]
  }
}`;
    const after = (needle: string) => doc.indexOf(needle) + needle.length;

    it('is writing a key inside the object that holds it', () => {
        expect(contextAt(doc, after('"doma'))).toEqual({ kind: 'key', path: ['routing'] });
    });

    it('is writing a value once past the key', () => {
        expect(contextAt(doc, after('"domainStrategy": "IPIf')))
            .toEqual({ kind: 'value', path: ['routing', 'domainStrategy'] });
    });

    it('treats an array entry as the value of its key', () => {
        expect(contextAt(doc, after('["bittorr')))
            .toEqual({ kind: 'value', path: ['routing', 'rules', 0, 'protocol'] });
    });

    it('offers keys in an empty object', () => {
        expect(contextAt('{ "routing": { } }', 15)).toEqual({ kind: 'key', path: ['routing'] });
    });
});
