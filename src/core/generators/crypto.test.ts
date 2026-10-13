import { describe, expect, it } from 'bun:test';
import {
    generateRealityShortIds,
    generateShortId,
    publicKeyFromPrivateKey,
    generateRealityKeyPair,
    generateWireguardKeyPair,
    generateWireguardPresharedKey,
    parseWireguardKey,
    wireguardPublicKey,
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

describe('WireGuard keys', () => {
    // RFC 7748 section 6.1: Alice's private key, and the public key it stands for.
    const SECRET_HEX = '77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a';
    const PUBLIC_HEX = '8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a';
    const base64 = (hex: string) => Buffer.from(hex, 'hex').toString('base64');
    const hexOf = (bytes: Uint8Array | null) => (bytes ? Buffer.from(bytes).toString('hex') : null);

    it('derives the public key the curve defines, in the base64 wg prints', () => {
        // Pinned to the RFC vector, so a change of library or of encoding
        // cannot hand a client a key that is merely well-formed.
        expect(wireguardPublicKey(base64(SECRET_HEX))).toBe(base64(PUBLIC_HEX));
        expect(base64(PUBLIC_HEX)).toMatch(/^[A-Za-z0-9+/]{43}=$/);
    });

    it('reads every spelling ParseWireGuardKey reads', () => {
        // infra/conf/wireguard.go: 64 hex characters as they are, otherwise
        // base64 with one "=" trimmed, in whichever alphabet the text uses.
        const padded = base64(SECRET_HEX);
        expect(hexOf(parseWireguardKey(SECRET_HEX))).toBe(SECRET_HEX);
        expect(hexOf(parseWireguardKey(SECRET_HEX.toUpperCase()))).toBe(SECRET_HEX);
        expect(hexOf(parseWireguardKey(padded))).toBe(SECRET_HEX);
        expect(hexOf(parseWireguardKey(padded.replace(/=$/, '')))).toBe(SECRET_HEX);
        expect(wireguardPublicKey(SECRET_HEX)).toBe(base64(PUBLIC_HEX));

        // All ones: "/" in the standard alphabet, "_" in the url-safe one.
        const ones = 'ff'.repeat(32);
        const standard = base64(ones);
        expect(standard).toContain('/');
        expect(hexOf(parseWireguardKey(standard))).toBe(ones);
        expect(hexOf(parseWireguardKey(standard.replace(/\//g, '_').replace(/=$/, '')))).toBe(ones);
    });

    it('refuses what ParseWireGuardKey refuses', () => {
        expect(parseWireguardKey('')).toBeNull(); // "key must not be empty"
        expect(parseWireguardKey(undefined)).toBeNull();
        expect(parseWireguardKey(42)).toBeNull();
        expect(parseWireguardKey('not a key!')).toBeNull();
        // Only one "=" is trimmed, so two leave padding the unpadded decoder rejects.
        expect(parseWireguardKey(Buffer.alloc(16, 1).toString('base64'))).toBeNull();
        // A standard-alphabet character and a url-safe one cannot share a key.
        expect(parseWireguardKey('ab+_')).toBeNull();
    });

    it('does not judge the length, as the core does not until it starts the inbound', () => {
        expect(parseWireguardKey('AAAA')).toHaveLength(3);
        // ...which is why nothing is derived from such a key.
        expect(wireguardPublicKey('AAAA')).toBeNull();
        expect(wireguardPublicKey('')).toBeNull();
    });

    it('generates a pair that agrees with itself, clamped the way wg genkey clamps', () => {
        const pair = generateWireguardKeyPair();
        expect(pair.secretKey).toMatch(/^[A-Za-z0-9+/]{43}=$/);
        expect(wireguardPublicKey(pair.secretKey)).toBe(pair.publicKey);
        const secret = parseWireguardKey(pair.secretKey)!;
        expect(secret).toHaveLength(32);
        expect(secret[0]! & 7).toBe(0);
        expect(secret[31]! & 0xc0).toBe(0x40);
        expect(generateWireguardKeyPair().secretKey).not.toBe(pair.secretKey);
    });

    it('generates a pre-shared key of 32 bytes', () => {
        expect(parseWireguardKey(generateWireguardPresharedKey())).toHaveLength(32);
        expect(generateWireguardPresharedKey()).not.toBe(generateWireguardPresharedKey());
    });
});
