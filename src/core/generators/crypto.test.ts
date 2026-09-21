import { describe, expect, it } from 'bun:test';
import {
    generateRealityShortIds,
    generateShortId,
    publicKeyFromPrivateKey,
    generateRealityKeyPair,
    MAX_SHORT_ID_LENGTH,
} from './crypto';

describe('generateRealityShortIds', () => {
    it('makes the number asked for', () => {
        expect(generateRealityShortIds(5)).toHaveLength(5);
        expect(generateRealityShortIds(1)).toHaveLength(1);
        expect(generateRealityShortIds(0)).toHaveLength(0);
    });

    it('never repeats an id within a batch', () => {
        // A duplicate shortId is a wasted slot: the server matches a client by
        // it, so two identical entries can only ever behave as one.
        const made = generateRealityShortIds(64, { length: 4 });
        expect(new Set(made).size).toBe(made.length);
    });

    it('avoids ids that are already in the list', () => {
        const existing = generateRealityShortIds(8, { length: 2 });
        const more = generateRealityShortIds(8, { length: 2, existing });
        expect(more.filter(id => existing.includes(id))).toEqual([]);
    });

    it('emits hex within the length REALITY accepts', () => {
        for (const id of generateRealityShortIds(20)) {
            expect(id).toMatch(/^[0-9a-f]+$/);
            expect(id.length).toBeLessThanOrEqual(MAX_SHORT_ID_LENGTH);
        }
        expect(generateRealityShortIds(4, { length: 6 }).every(id => id.length === 6)).toBe(true);
    });

    it('clamps a length outside the accepted range', () => {
        expect(generateRealityShortIds(1, { length: 99 })[0]!.length).toBe(MAX_SHORT_ID_LENGTH);
        expect(generateRealityShortIds(1, { length: 0 })[0]!.length).toBe(1);
    });

    it('gives up rather than looping when the space is exhausted', () => {
        // 16 possible single-character ids: asking for 50 must return what it
        // can and stop, not spin forever looking for a 17th.
        const made = generateRealityShortIds(50, { length: 1 });
        expect(made.length).toBeLessThanOrEqual(16);
        expect(new Set(made).size).toBe(made.length);
    });
});

describe('generateShortId', () => {
    it('produces hex of the requested length', () => {
        expect(generateShortId(8)).toMatch(/^[0-9a-f]{8}$/);
        expect(generateShortId(16)).toMatch(/^[0-9a-f]{16}$/);
    });
});

describe('REALITY keys', () => {
    it('derives the public half from the private one', () => {
        const pair = generateRealityKeyPair();
        expect(publicKeyFromPrivateKey(pair.privateKey)).toBe(pair.publicKey);
    });

    it('refuses input that is not a 32-byte key', () => {
        expect(publicKeyFromPrivateKey('')).toBeNull();
        expect(publicKeyFromPrivateKey('not-a-key')).toBeNull();
    });
});
