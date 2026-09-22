import { describe, expect, it } from 'bun:test';
import { pickDisplayText } from './json-display-text';

/**
 * The rule this encodes is "do not throw away what the author wrote". A JSON
 * field is refilled whenever its value changes elsewhere, and re-printing the
 * object is the one answer that always loses the comments.
 */

describe('pickDisplayText', () => {
    it('keeps the text on screen when it already means the value', () => {
        const text = '{\n  // keep me\n  "tag": "proxy"\n}';
        expect(pickDisplayText({ value: { tag: 'proxy' }, text })).toBeNull();
    });

    it('never overwrites text that is mid-edit and does not parse', () => {
        expect(pickDisplayText({ value: { tag: 'proxy' }, text: '{ "tag": "pro' })).toBeNull();
    });

    it('prefers the raw text it was handed for this value', () => {
        const rawText = '{\n  /* from the store */\n  "tag": "proxy"\n}';
        expect(pickDisplayText({ value: { tag: 'proxy' }, text: '{}', rawText })).toBe(rawText);
    });

    it('ignores raw text that belongs to a different value', () => {
        const stale = '{ "tag": "old" }';
        const picked = pickDisplayText({ value: { tag: 'new' }, text: '{}', rawText: stale });
        expect(picked).not.toBe(stale);
        expect(picked).toContain('"new"');
    });

    it('takes the section out of the stored config, comments and all', () => {
        const rawConfigText = '{\n  "inbounds": [\n    // the local socks\n    { "tag": "socks-in" }\n  ]\n}';
        const picked = pickDisplayText({
            value: [{ tag: 'socks-in' }],
            text: '{}',
            rawConfigText,
            schemaMode: 'inbound',
        });
        expect(picked).toContain('the local socks');
    });

    it('takes the whole stored config for a full-config field', () => {
        const rawConfigText = '{\n  // everything\n  "inbounds": []\n}';
        expect(pickDisplayText({
            value: { inbounds: [] },
            text: '{}',
            rawConfigText,
            schemaMode: 'full',
        })).toBe(rawConfigText);
    });

    it('prints the value when nothing stored matches it', () => {
        const picked = pickDisplayText({
            value: { tag: 'fresh' },
            text: '{ "tag": "other" }',
            rawConfigText: '{ "inbounds": [] }',
            schemaMode: 'full',
        });
        expect(picked).toContain('"fresh"');
    });

    it('drops the parser marker comment-json adds to a root object', () => {
        const value = { i: 3, tag: 'proxy' } as Record<string, unknown>;
        const picked = pickDisplayText({ value, text: '' });
        expect(picked).toContain('"tag"');
        expect(picked).not.toContain('"i"');
    });

    it('survives a stored config that is itself broken', () => {
        const picked = pickDisplayText({
            value: { tag: 'proxy' },
            text: '',
            rawConfigText: '{ not json at all',
            schemaMode: 'full',
        });
        expect(picked).toContain('"proxy"');
    });
});
