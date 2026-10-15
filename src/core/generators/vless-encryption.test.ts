import { describe, expect, it } from 'bun:test';
import {
    DEFAULT_VLESS_ENCRYPTION_OPTIONS,
    deriveClientEncryption,
    generateVlessEncryption,
    generateVlessKeyPair,
    mlkem768PublicKey,
    x25519PublicKey,
    type RandomBytes,
} from './vless-encryption';
import { MLKEM768_VECTORS, VLESSENC_PAIRS, X25519_VECTORS } from './vless-encryption.vectors';
import {
    decodeRawUrlBase64,
    encodeRawUrlBase64,
    isMlkem768PublicKey,
    readVlessEncryption,
    splitVlessEncryption,
} from '../xray/vless-encryption';

const bytesOf = (text: string): Uint8Array => {
    const bytes = decodeRawUrlBase64(text);
    if (!bytes) throw new Error(`not base64: ${text}`);
    return bytes;
};

/** A "random" source that counts upwards from a seed byte, so a test can pin what it generates. */
const counting = (start = 1): RandomBytes => {
    let next = start;
    return length => Uint8Array.from({ length }, () => next++ & 0xff);
};

describe('the keys, against the real core', () => {
    // The rows are what the released v26.10.10 binary printed for fixed inputs;
    // see the header of the vectors file.
    for (const vector of MLKEM768_VECTORS) {
        it(`makes the ML-KEM-768 client key \`xray mlkem768 -i\` prints (${vector.label})`, () => {
            const seed = bytesOf(vector.seed);
            expect(seed.length).toBe(64);
            const publicKey = mlkem768PublicKey(seed);
            expect(publicKey.length).toBe(1184);
            expect(encodeRawUrlBase64(publicKey)).toBe(vector.client);
            // …and what comes out is a key the core takes (its modulus check).
            expect(isMlkem768PublicKey(publicKey)).toBe(true);
        });
    }

    for (const vector of X25519_VECTORS) {
        it(`makes the X25519 public key \`xray x25519 -i\` prints (${vector.label})`, () => {
            // The tool clamps the key before it prints it; the public key is the same
            // for the input as for the clamped one.
            expect(encodeRawUrlBase64(x25519PublicKey(bytesOf(vector.input)))).toBe(vector.publicKey);
            expect(encodeRawUrlBase64(x25519PublicKey(bytesOf(vector.privateKey)))).toBe(vector.publicKey);
        });

        it(`clamps a generated private key as the tool prints it (${vector.label})`, () => {
            const { privateKey, publicKey } = generateVlessKeyPair('x25519', () => bytesOf(vector.input));
            expect(encodeRawUrlBase64(privateKey)).toBe(vector.privateKey);
            expect(encodeRawUrlBase64(publicKey)).toBe(vector.publicKey);
        });
    }
});

describe('the pairs `xray vlessenc` printed', () => {
    // The tool's own output, kept in the vectors file: the client string it
    // printed has to be what is derived from the server string it printed.
    for (const [index, pair] of VLESSENC_PAIRS.entries()) {
        it(`derives the encryption it printed, from the decryption it printed (${pair.authentication}, run ${Math.floor(index / 2) + 1})`, () => {
            expect(deriveClientEncryption(pair.decryption)).toEqual({ ok: true, encryption: pair.encryption });
        });

        it(`reads both of them as good, on the side each is for (${pair.authentication}, run ${Math.floor(index / 2) + 1})`, () => {
            const server = readVlessEncryption(pair.decryption, 'server', 'decryption');
            const client = readVlessEncryption(pair.encryption, 'client', 'encryption');
            expect([server.problems, client.problems]).toEqual([[], []]);
            expect(server.keys.map(key => key.kind)).toEqual([pair.authentication]);
            expect(client.keys.map(key => key.kind)).toEqual([pair.authentication]);
        });

        it(`has the shape the generator writes (${pair.authentication}, run ${Math.floor(index / 2) + 1})`, () => {
            const made = generateVlessEncryption(pair.authentication, {}, counting(index + 1));
            const shape = (text: string) => text.split('.').map((part, at) => (at < 3 ? part : part.length));
            expect(shape(made.decryption)).toEqual(shape(pair.decryption));
            expect(shape(made.encryption)).toEqual(shape(pair.encryption));
        });
    }
});

describe('base64 as the keys are written', () => {
    it('round-trips every length the keys come in', () => {
        for (const length of [1, 2, 3, 31, 32, 33, 63, 64, 65, 1184]) {
            const bytes = Uint8Array.from({ length }, (_, at) => (at * 7 + 3) & 0xff);
            const text = encodeRawUrlBase64(bytes);
            expect(text).not.toMatch(/[=+/]/);
            expect(Array.from(decodeRawUrlBase64(text)!)).toEqual(Array.from(bytes));
        }
    });

    it('is what Node writes for the same bytes', () => {
        const bytes = Uint8Array.from({ length: 100 }, (_, at) => (at * 53 + 1) & 0xff);
        expect(encodeRawUrlBase64(bytes)).toBe(Buffer.from(bytes).toString('base64url'));
    });

    it('refuses what Go\'s RawURLEncoding refuses', () => {
        expect(decodeRawUrlBase64('AAAA=')).toBeNull();
        expect(decodeRawUrlBase64('AA+A')).toBeNull();
        expect(decodeRawUrlBase64('AA/A')).toBeNull();
        expect(decodeRawUrlBase64('A')).toBeNull();
        expect(decodeRawUrlBase64('AAAAA')).toBeNull();
        expect(decodeRawUrlBase64('AA AA')).toBeNull();
        // CR and LF are skipped; trailing bits are not checked.
        expect(decodeRawUrlBase64('AA\r\nAA')?.length).toBe(3);
        expect(decodeRawUrlBase64('__')?.length).toBe(1);
    });
});

describe('generating the pair', () => {
    it('writes what `xray vlessenc` writes, with no options', () => {
        const pair = generateVlessEncryption('x25519', {}, counting());
        const server = pair.decryption.split('.');
        const client = pair.encryption.split('.');
        expect(server.slice(0, 3)).toEqual(['mlkem768x25519plus', 'native', '600s']);
        expect(client.slice(0, 3)).toEqual(['mlkem768x25519plus', 'native', '0rtt']);
        // No padding blocks: four parts, as vlessenc prints.
        expect(server).toHaveLength(4);
        expect(client).toHaveLength(4);
        expect(bytesOf(server[3]!)).toHaveLength(32);
        expect(bytesOf(client[3]!)).toHaveLength(32);
    });

    it('writes an ML-KEM-768 pair with a 64-byte seed and a 1184-byte public key', () => {
        const pair = generateVlessEncryption('mlkem768', {}, counting());
        const server = pair.decryption.split('.');
        const client = pair.encryption.split('.');
        expect(bytesOf(server[3]!)).toHaveLength(64);
        expect(bytesOf(client[3]!)).toHaveLength(1184);
        expect(server[3]).toHaveLength(86);
        expect(client[3]).toHaveLength(1579);
    });

    it('is deterministic for a given source of bytes, and different for another', () => {
        expect(generateVlessEncryption('mlkem768', {}, counting(5))).toEqual(generateVlessEncryption('mlkem768', {}, counting(5)));
        expect(generateVlessEncryption('x25519', {}, counting(5)).decryption).not.toBe(generateVlessEncryption('x25519', {}, counting(6)).decryption);
    });

    it('draws fresh keys from the system source by default', () => {
        const a = generateVlessEncryption('x25519');
        const b = generateVlessEncryption('x25519');
        expect(a.decryption).not.toBe(b.decryption);
    });

    it('carries the options into the right half of each string', () => {
        const pair = generateVlessEncryption('x25519', {
            appearance: 'random', lifetime: '300-600s', resumption: '1rtt', padding: '100-111-1111.75-0-111',
        }, counting());
        expect(pair.decryption.split('.').slice(0, 5)).toEqual(['mlkem768x25519plus', 'random', '300-600s', '100-111-1111', '75-0-111']);
        expect(pair.encryption.split('.').slice(0, 5)).toEqual(['mlkem768x25519plus', 'random', '1rtt', '100-111-1111', '75-0-111']);
    });

    it('defaults to vlessenc\'s own choices', () => {
        expect(DEFAULT_VLESS_ENCRYPTION_OPTIONS).toEqual({ appearance: 'native', lifetime: '600s', resumption: '0rtt', padding: '' });
    });

    it('produces strings the reader takes, on the side each is for', () => {
        for (const authentication of ['x25519', 'mlkem768'] as const) {
            for (const appearance of ['native', 'xorpub', 'random'] as const) {
                const pair = generateVlessEncryption(authentication, { appearance, padding: '100-111-1111.75-0-111.50-0-3333' }, counting(9));
                const server = readVlessEncryption(pair.decryption, 'server', 'decryption');
                const client = readVlessEncryption(pair.encryption, 'client', 'encryption');
                expect(server.problems).toEqual([]);
                expect(client.problems).toEqual([]);
                expect(server.usable && client.usable).toBe(true);
                expect(server.keys.map(key => key.kind)).toEqual([authentication]);
                expect(client.keys.map(key => key.kind)).toEqual([authentication]);
            }
        }
    });
});

describe('the client string from the server\'s', () => {
    it('is exactly the encryption the pair was generated with', () => {
        for (const authentication of ['x25519', 'mlkem768'] as const) {
            const pair = generateVlessEncryption(authentication, {}, counting(40));
            expect(deriveClientEncryption(pair.decryption)).toEqual({ ok: true, encryption: pair.encryption });
        }
    });

    it('carries the appearance and the padding, and turns the ticket lifetime into 0rtt', () => {
        const pair = generateVlessEncryption('x25519', { appearance: 'xorpub', lifetime: '120-300s', padding: '100-35-35.0-0-0.50-1-2' }, counting(3));
        expect(deriveClientEncryption(pair.decryption)).toEqual({ ok: true, encryption: pair.encryption });
    });

    it('takes a resumption and a padding of its own when asked', () => {
        const pair = generateVlessEncryption('x25519', { padding: '100-111-1111' }, counting(3));
        const result = deriveClientEncryption(pair.decryption, { resumption: '1rtt', padding: '' });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        const parts = splitVlessEncryption(result.encryption)!;
        expect(parts.ticket).toBe('1rtt');
        expect(parts.padding).toBe('');
        expect(parts.keys).toHaveLength(1);
    });

    it('says 1rtt for a server that issues no tickets, since there is nothing to resume', () => {
        const pair = generateVlessEncryption('x25519', { lifetime: '0s' }, counting(3));
        const result = deriveClientEncryption(pair.decryption);
        expect(result.ok && splitVlessEncryption(result.encryption)!.ticket).toBe('1rtt');
        // …and the lifetime "0-0s" is the same thing.
        const range = generateVlessEncryption('x25519', { lifetime: '0-0s' }, counting(3));
        const ranged = deriveClientEncryption(range.decryption);
        expect(ranged.ok && splitVlessEncryption(ranged.encryption)!.ticket).toBe('1rtt');
    });

    it('keeps several keys in order, each turned into its public half', () => {
        const x = generateVlessEncryption('x25519', {}, counting(1));
        const m = generateVlessEncryption('mlkem768', {}, counting(70));
        const keyOf = (text: string) => text.split('.').pop()!;
        const both = `mlkem768x25519plus.native.600s.${keyOf(x.decryption)}.${keyOf(m.decryption)}`;
        const result = deriveClientEncryption(both);
        expect(result).toEqual({ ok: true, encryption: `mlkem768x25519plus.native.0rtt.${keyOf(x.encryption)}.${keyOf(m.encryption)}` });
    });

    it('gives "none" for "none"', () => {
        expect(deriveClientEncryption('none')).toEqual({ ok: true, encryption: 'none' });
    });

    it('gives the reasons, and no string, for one the core would refuse', () => {
        for (const bad of ['', undefined, 'None', 'x', 'mlkem768x25519plus.native.600s', 'mlkem768x25519plus.native.0rtt.' + 'A'.repeat(43), 5]) {
            const result = deriveClientEncryption(bad);
            expect(result.ok).toBe(false);
            if (!result.ok) expect(result.problems.length).toBeGreaterThan(0);
        }
    });

    it('does not turn a client\'s public key into a server one', () => {
        const pair = generateVlessEncryption('mlkem768', {}, counting(2));
        // The client string read as a server's: its third part is 0rtt, not a lifetime.
        expect(deriveClientEncryption(pair.encryption).ok).toBe(false);
    });
});
