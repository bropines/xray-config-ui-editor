import { describe, expect, it } from 'bun:test';
import {
    aeadNames,
    base64Bytes,
    canonicalNames,
    canonicalProtocol,
    caseHint,
    isClassicCipher,
    isPseudoShadowsocksProtocol,
    isShadowsocksProtocol,
    keyProblem,
    miscased2022,
    named2022,
    protocolNameProblem,
    shadowsocksLine,
    singleAccountNames,
} from './shadowsocks-rules';
import { validateOutbound } from '../validators';
import { CORE_VERSIONS } from './versions';

/**
 * What the inbound and the outbound read the same way. The per-line facts are
 * cited in the module; the cases below pin the table, so a line added to
 * CORE_VERSIONS has to be placed in it.
 */

const KEY16 = Buffer.alloc(16, 7).toString('base64');
const KEY32 = Buffer.alloc(32, 7).toString('base64');
const AES128 = '2022-blake3-aes-128-gcm';

describe('the lines', () => {
    it('place every supported line', () => {
        expect(CORE_VERSIONS.map(line => [line.id, shadowsocksLine(line.id)])).toEqual([
            ['26.3', { usersAlias: false, noneAtTop: true, exact2022Names: true, exactKeySize: false, readsUot: true }],
            ['26.7', { usersAlias: true, noneAtTop: false, exact2022Names: true, exactKeySize: false, readsUot: false }],
            ['26.9', { usersAlias: true, noneAtTop: false, exact2022Names: true, exactKeySize: false, readsUot: false }],
            ['26.10', { usersAlias: true, noneAtTop: false, exact2022Names: false, exactKeySize: true, readsUot: false }],
        ]);
    });
});

describe('cipher names', () => {
    it('read a 2022 name exactly up to 26.9 and lower-cased from 26.10', () => {
        expect(named2022(AES128, '26.7')).toBe(AES128);
        expect(named2022('2022-Blake3-AES-128-GCM', '26.7')).toBeUndefined();
        expect(miscased2022('2022-Blake3-AES-128-GCM', '26.7')).toBe(AES128);
        expect(named2022('2022-Blake3-AES-128-GCM', '26.10')).toBe(AES128);
        expect(miscased2022('2022-Blake3-AES-128-GCM', '26.10')).toBeUndefined();
        expect(named2022('aes-128-gcm', '26.10')).toBeUndefined();
        expect(named2022('', '26.10')).toBeUndefined();
    });

    it('say how to write a name the line did not match, only when the case is all that is wrong', () => {
        expect(caseHint('2022-BLAKE3-AES-256-GCM', '26.3')).toContain('2022-blake3-aes-256-gcm');
        expect(caseHint('2022-BLAKE3-AES-256-GCM', '26.10')).toBeUndefined();
        expect(caseHint('rc4', '26.3')).toBeUndefined();
    });

    it('read a classic name lower-cased on every line, and none and plain on 26.3 alone', () => {
        for (const line of CORE_VERSIONS) {
            expect(isClassicCipher('AES-128-GCM', line.id)).toBe(true);
            expect(isClassicCipher('aead_xchacha20_poly1305', line.id)).toBe(true);
            expect(isClassicCipher('', line.id)).toBe(false);
            expect(isClassicCipher(AES128, line.id)).toBe(false);
            expect(isClassicCipher('none', line.id)).toBe(line.id === '26.3');
            expect(isClassicCipher('Plain', line.id)).toBe(line.id === '26.3');
        }
    });

    it('list what a chooser should: canonical spellings, none only where it works', () => {
        expect(canonicalNames(['aes-128-gcm', 'aead_aes_128_gcm', 'plain'])).toEqual(['aes-128-gcm']);
        expect(aeadNames()).not.toContain('aead_aes_128_gcm');
        expect(singleAccountNames('26.3')).toContain('none');
        expect(singleAccountNames('26.7')).not.toContain('none');
        expect(singleAccountNames('26.7')[0]).toBe(AES128);
    });

    it('are all that the form accepts as a method of an outbound — the zod enum used to refuse most of them', () => {
        const outbound = (method: string) => ({ tag: 't', protocol: 'shadowsocks', settings: { servers: [{ address: 'e.com', port: 443, method, password: 'p' }] } });
        expect(validateOutbound(outbound('AES-256-GCM')).filter(e => e.field.includes('method'))).toEqual([]);
        expect(validateOutbound(outbound('aead_chacha20_poly1305')).filter(e => e.field.includes('method'))).toEqual([]);
    });
});

describe('keys', () => {
    it('are base64 as Go reads it', () => {
        expect(base64Bytes(KEY16)).toBe(16);
        expect(base64Bytes(KEY32)).toBe(32);
        expect(base64Bytes('')).toBe(0);
        expect(base64Bytes(`${KEY16.slice(0, 8)}\r\n${KEY16.slice(8)}`)).toBe(16);
        expect(base64Bytes(KEY16.replace(/=+$/, ''))).toBeUndefined();
        expect(base64Bytes('-_-_')).toBeUndefined();
    });

    it('are judged by the line: at least N and base64 up to 26.9, exactly N from 26.10', () => {
        const kind = (key: string, method: string, line: '26.7' | '26.10') => keyProblem(key, 'k', method, line)?.kind;
        expect(kind(KEY16, AES128, '26.7')).toBeUndefined();
        expect(kind(KEY32, AES128, '26.7')).toBeUndefined();
        expect(kind(KEY32, AES128, '26.10')).toBe('key.size');
        expect(kind(KEY16, '2022-blake3-aes-256-gcm', '26.7')).toBe('key.short');
        expect(kind('x!', AES128, '26.7')).toBe('key.base64');
        expect(kind('exactly16bytes!?', AES128, '26.10')).toBeUndefined();
        expect(kind('', AES128, '26.7')).toBe('key.empty');
        expect(kind('', AES128, '26.10')).toBe('key.empty');
    });

    it('name where they are, and say how to write one', () => {
        const found = keyProblem('x!', 'settings.password', AES128, '26.7')!;
        expect(found.message).toContain('settings.password');
        expect(found.suggestion).toContain('openssl rand -base64 16');
    });
});

describe('the protocol name', () => {
    it('knows the one that exists and the one this app made up, in any case', () => {
        expect(isShadowsocksProtocol('shadowsocks')).toBe(true);
        expect(isShadowsocksProtocol('Shadowsocks-2022')).toBe(true);
        expect(isShadowsocksProtocol('vless')).toBe(false);
        expect(isShadowsocksProtocol(undefined)).toBe(false);
        expect(isPseudoShadowsocksProtocol('shadowsocks-2022')).toBe(true);
        expect(isPseudoShadowsocksProtocol('shadowsocks')).toBe(false);
    });

    it('writes the real one for ours, and leaves every other name as it was', () => {
        expect(canonicalProtocol('shadowsocks-2022')).toBe('shadowsocks');
        expect(canonicalProtocol('Shadowsocks-2022')).toBe('shadowsocks');
        for (const name of ['shadowsocks', 'vless', 'trojan', 'wireguard', 'something-new']) {
            expect(canonicalProtocol(name)).toBe(name);
        }
    });

    it('says what the loader does with the one that does not exist', () => {
        expect(protocolNameProblem('shadowsocks')).toBeUndefined();
        expect(protocolNameProblem('vless')).toBeUndefined();
        const found = protocolNameProblem('shadowsocks-2022')!;
        expect(found.message).toContain('unknown config id');
        expect(found.suggestion).toContain('shadowsocks');
    });
});
