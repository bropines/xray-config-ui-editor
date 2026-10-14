import { describe, expect, it } from 'bun:test';
import { generateKeyPairSync, type KeyObject } from 'node:crypto';
import { decodeWarpKey, warpPrivateKeyFailure, warpPublicKeyFailure } from './warp-keys';

/**
 * The keys of `masqueSettings.warp`, against what Go's crypto/x509 takes
 * (v26.10.10:infra/conf/transport_method.go:914-957). The real keys come from
 * node's crypto, so the curve arithmetic is checked against an implementation
 * that is not ours.
 */

const pem = (key: KeyObject, type: 'pkcs8' | 'sec1') =>
    key.export({ type, format: 'pem' }) as string;
const derOf = (key: KeyObject, type: 'pkcs8' | 'sec1' | 'spki'): Buffer =>
    key.export({ type, format: 'der' }) as Buffer;

const p256 = () => generateKeyPairSync('ec', { namedCurve: 'prime256v1' });

// A tiny DER writer, to build keys node would never export.
const length = (n: number): number[] => {
    if (n < 0x80) return [n];
    const bytes: number[] = [];
    for (let rest = n; rest > 0; rest = Math.floor(rest / 256)) bytes.unshift(rest % 256);
    return [0x80 | bytes.length, ...bytes];
};
const node = (tag: number, ...parts: (number[] | Uint8Array)[]): number[] => {
    const body = parts.flatMap(part => Array.from(part));
    return [tag, ...length(body.length), ...body];
};
const P256_OID = [0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07];
const sec1 = (scalar: number[]) =>
    Buffer.from(node(0x30, node(0x02, [1]), node(0x04, scalar), node(0xa0, P256_OID))).toString('base64');
const fromBigInt = (n: bigint): number[] => Array.from(Buffer.from(n.toString(16).padStart(64, '0'), 'hex'));
const ORDER = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n;

describe('a key as the core decodes it', () => {
    it('trims, and refuses nothing at all', () => {
        expect(decodeWarpKey('  \n ')).toBe('empty');
        expect(warpPrivateKeyFailure('')).toBe('empty');
        expect(warpPublicKeyFailure('   ')).toBe('empty');
    });

    it('takes a PEM block of any label, else standard base64', () => {
        const { privateKey } = p256();
        const text = pem(privateKey, 'pkcs8');
        const fromPem = decodeWarpKey(text);
        const fromBase64 = decodeWarpKey((derOf(privateKey, 'pkcs8')).toString('base64'));
        expect(typeof fromPem).not.toBe('string');
        expect(Array.from(fromPem as Uint8Array)).toEqual(Array.from(fromBase64 as Uint8Array));
        // Line breaks inside base64 are ignored, as Go's decoder does.
        const wrapped = derOf(privateKey, 'pkcs8').toString('base64').replace(/(.{20})/g, '$1\n');
        expect(typeof decodeWarpKey(wrapped)).not.toBe('string');
        // Text before the block is skipped.
        expect(typeof decodeWarpKey(`# my key\n${text}`)).not.toBe('string');
    });

    it('refuses what is neither: wrong alphabet, missing padding, a damaged block', () => {
        expect(decodeWarpKey('not a key!')).toBe('encoding');
        const base64 = derOf(p256().privateKey, 'pkcs8').toString('base64');
        expect(decodeWarpKey(base64.replace(/=+$/, '') + 'A')).toBe('encoding');
        expect(decodeWarpKey('-----BEGIN PRIVATE KEY-----\n@@@@\n-----END PRIVATE KEY-----')).toBe('encoding');
    });
});

describe('the private key', () => {
    it('takes an ECDSA P-256 key as PKCS #8 or SEC 1, in PEM or base64', () => {
        for (let i = 0; i < 20; i++) {
            const { privateKey } = p256();
            expect(warpPrivateKeyFailure(pem(privateKey, 'pkcs8'))).toBeNull();
            expect(warpPrivateKeyFailure(pem(privateKey, 'sec1'))).toBeNull();
            expect(warpPrivateKeyFailure(derOf(privateKey, 'pkcs8').toString('base64'))).toBeNull();
            expect(warpPrivateKeyFailure(derOf(privateKey, 'sec1').toString('base64'))).toBeNull();
        }
    });

    it('calls a valid key of another kind or curve what it is', () => {
        const p384 = generateKeyPairSync('ec', { namedCurve: 'secp384r1' }).privateKey;
        expect(warpPrivateKeyFailure(pem(p384, 'pkcs8'))).toBe('curve');
        expect(warpPrivateKeyFailure(pem(p384, 'sec1'))).toBe('curve');
        const ed = generateKeyPairSync('ed25519').privateKey;
        expect(warpPrivateKeyFailure(ed.export({ type: 'pkcs8', format: 'pem' }) as string)).toBe('curve');
        const rsa = generateKeyPairSync('rsa', { modulusLength: 1024 }).privateKey;
        expect(warpPrivateKeyFailure(rsa.export({ type: 'pkcs8', format: 'pem' }) as string)).toBe('curve');
    });

    it('refuses a public key, garbage that decodes, and a truncated key', () => {
        const pair = p256();
        expect(warpPrivateKeyFailure(pair.publicKey.export({ type: 'spki', format: 'pem' }) as string)).toBe('private-format');
        expect(warpPrivateKeyFailure(Buffer.from('hello, this is not der at all').toString('base64'))).toBe('private-format');
        const full = derOf(pair.privateKey, 'pkcs8');
        expect(warpPrivateKeyFailure(full.subarray(0, full.length - 10).toString('base64'))).toBe('private-format');
    });

    it('holds a SEC 1 scalar to 1..n-1, as x509 does', () => {
        expect(warpPrivateKeyFailure(sec1(fromBigInt(ORDER - 1n)))).toBeNull();
        expect(warpPrivateKeyFailure(sec1(fromBigInt(1n)))).toBeNull();
        expect(warpPrivateKeyFailure(sec1(fromBigInt(ORDER)))).toBe('private-format');
        expect(warpPrivateKeyFailure(sec1(fromBigInt(0n)))).toBe('private-format');
        // Leading zeros beyond the curve size are dropped; anything else beyond it is not a key.
        expect(warpPrivateKeyFailure(sec1([0, 0, ...fromBigInt(5n)]))).toBeNull();
        expect(warpPrivateKeyFailure(sec1([1, ...fromBigInt(5n)]))).toBe('private-format');
    });
});

describe('the public key', () => {
    it('takes a PKIX key, in PEM or base64', () => {
        for (let i = 0; i < 20; i++) {
            const { publicKey } = p256();
            expect(warpPublicKeyFailure(publicKey.export({ type: 'spki', format: 'pem' }) as string)).toBeNull();
            expect(warpPublicKeyFailure(derOf(publicKey, 'spki').toString('base64'))).toBeNull();
        }
    });

    it('takes other kinds of key: x509 does, and the endpoint is the judge of the rest', () => {
        const ed = generateKeyPairSync('ed25519').publicKey;
        const rsa = generateKeyPairSync('rsa', { modulusLength: 1024 }).publicKey;
        const p384 = generateKeyPairSync('ec', { namedCurve: 'secp384r1' }).publicKey;
        for (const key of [ed, rsa, p384]) {
            expect(warpPublicKeyFailure(key.export({ type: 'spki', format: 'pem' }) as string)).toBeNull();
        }
    });

    it('refuses a private key, a point off the curve, and trailing data', () => {
        const pair = p256();
        expect(warpPublicKeyFailure(pem(pair.privateKey, 'pkcs8'))).toBe('public-format');
        const der = derOf(pair.publicKey, 'spki');
        const off = Buffer.from(der);
        off[off.length - 1] = off[off.length - 1]! ^ 0x01;
        expect(warpPublicKeyFailure(off.toString('base64'))).toBe('public-format');
        expect(warpPublicKeyFailure(Buffer.concat([der, Buffer.from([0])]).toString('base64'))).toBe('public-format');
    });
});
