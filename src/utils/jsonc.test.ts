import { describe, it, expect } from 'bun:test';
import { parseJsonc, stringifyJsonc, stripJsoncComments } from './jsonc';

describe('parseJsonc / stringifyJsonc — comment preservation', () => {
    // Regression test for a real bug: parseJsonc used to call comment-json's
    // parse() with removesComments=true (the opposite of what it's meant to
    // do), so every comment a user wrote in their raw config was silently
    // discarded on the very first parse — before any of the "preserve
    // comments" round-trip logic elsewhere (configStore's CRUD actions,
    // JsonField's reconciliation) ever got a chance to matter.
    it('preserves a line comment through a parse -> stringify round-trip', () => {
        const src = `{\n  // keep me\n  "inbounds": []\n}`;
        const parsed = parseJsonc(src);
        const out = stringifyJsonc(parsed, 2);
        expect(out).toContain('// keep me');
    });

    it('preserves an inline trailing comment on an array element', () => {
        const src = `{\n  "inbounds": [\n    { "tag": "a" } // inline note\n  ]\n}`;
        const parsed = parseJsonc(src);
        const out = stringifyJsonc(parsed, 2);
        expect(out).toContain('// inline note');
    });

    it('preserves comments through a subsequent plain-object mutation (the pattern configStore CRUD actions rely on)', () => {
        const src = `{\n  // top comment\n  "inbounds": [\n    { "tag": "a" }\n  ]\n}`;
        const parsed = parseJsonc<any>(src);
        // Mirrors what updateSection/addItem/etc. do: mutate the parsed
        // object directly (no immer), then re-stringify.
        parsed.inbounds.push({ tag: 'b' });
        const out = stringifyJsonc(parsed, 2);
        expect(out).toContain('// top comment');
        expect(parsed.inbounds).toHaveLength(2);
    });

    it('still parses comment-free JSON correctly (no regression for the common case)', () => {
        const src = `{"inbounds": [{"tag": "a"}], "outbounds": []}`;
        const parsed = parseJsonc<any>(src);
        expect(parsed.inbounds).toHaveLength(1);
        expect(parsed.inbounds[0].tag).toBe('a');
    });

    it('tolerates trailing commas', () => {
        const src = `{\n  "inbounds": [{"tag": "a"},],\n}`;
        const parsed = parseJsonc<any>(src);
        expect(parsed.inbounds).toHaveLength(1);
    });

    it('throws on genuinely malformed JSON (neither comment-json nor the regex fallback can recover it)', () => {
        const src = `{"a": 1,, }`;
        expect(() => parseJsonc(src)).toThrow();
    });

    it('throws on empty input', () => {
        expect(() => parseJsonc('')).toThrow();
    });
});

describe('stripJsoncComments', () => {
    it('removes line and block comments while leaving strings containing // or /* intact', () => {
        const src = `{\n  // comment\n  "url": "http://example.com", /* block */\n  "note": "not a /* comment */ really"\n}`;
        const stripped = stripJsoncComments(src);
        expect(stripped).not.toContain('// comment');
        expect(stripped).not.toContain('/* block */');
        expect(stripped).toContain('"url": "http://example.com"');
    });

    it('removes trailing commas', () => {
        const src = `{"a": 1, "b": [1, 2,],}`;
        const stripped = stripJsoncComments(src);
        expect(() => JSON.parse(stripped)).not.toThrow();
    });
});
