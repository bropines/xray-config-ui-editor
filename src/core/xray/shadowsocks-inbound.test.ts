import { describe, expect, it } from 'bun:test';
import { isShadowsocksInbound, shadowsocksInboundProblems } from './shadowsocks-inbound';
import { ruleDiagnostics } from './versions/rules';
import { isShadowsocks2022Method, ss2022KeyBytes } from './shadowsocks-keys';
import { generateShadowsocks2022Key } from '../generators/crypto';
import { createDefaultInbound, createEndpoint } from '../generators/endpoint-factory';
import { valueUses } from './versions/check';
import { CORE_VERSIONS, type CoreVersionId } from './versions';

/**
 * `method` on a Shadowsocks inbound is read three different ways, and by a
 * multi-user classic server not at all. The value set that used to judge it
 * compared every name case-insensitively and flagged an empty one wherever it
 * stood. Each case here is a branch of infra/conf/shadowsocks.go on a named
 * tag (see the module for the lines).
 */

const LINES = CORE_VERSIONS.map(line => line.id);
const UP_TO_26_9: CoreVersionId[] = ['26.3', '26.7', '26.9'];
const FROM_26_7: CoreVersionId[] = ['26.7', '26.9', '26.10'];

const inbound = (settings: Record<string, unknown>, protocol = 'shadowsocks') => ({ tag: 'ss', protocol, port: 8388, settings });
const found = (settings: Record<string, unknown>, version: CoreVersionId) =>
    shadowsocksInboundProblems(inbound(settings), version).map(problem => `${problem.kind} ${problem.field}`);

/** 16 and 32 bytes, base64 — the two key sizes. */
const KEY16 = Buffer.alloc(16, 7).toString('base64');
const KEY32 = Buffer.alloc(32, 7).toString('base64');
const AES128 = '2022-blake3-aes-128-gcm';
const AES256 = '2022-blake3-aes-256-gcm';
const CHACHA = '2022-blake3-chacha20-poly1305';

describe('one classic account', () => {
    it('takes a known AEAD cipher with a password, on every line', () => {
        for (const line of LINES) {
            expect(found({ method: 'aes-256-gcm', password: 'p' }, line)).toEqual([]);
        }
    });

    it('matches the cipher without regard to case, and by its aead_ and ietf spellings', () => {
        // cipherFromString lower-cases first (v26.7.28:infra/conf/shadowsocks.go:18).
        for (const method of ['AES-128-GCM', 'aead_aes_256_gcm', 'Chacha20-Ietf-Poly1305', 'xchacha20-poly1305', 'AEAD_XCHACHA20_POLY1305']) {
            for (const line of LINES) expect(found({ method, password: 'p' }, line)).toEqual([]);
        }
    });

    it('refuses an unknown or empty cipher', () => {
        for (const line of LINES) {
            expect(found({ method: 'rc4-md5', password: 'p' }, line)).toEqual(['method.unknown settings.method']);
            expect(found({ method: '', password: 'p' }, line)).toEqual(['method.unknown settings.method']);
            expect(found({ password: 'p' }, line)).toEqual(['method.unknown settings.method']);
        }
    });

    it('takes none and plain on 26.3 alone', () => {
        // v26.3.27:infra/conf/shadowsocks.go:26 and :88; gone from cipherFromString at v26.7.28 :17-30.
        for (const method of ['none', 'plain', 'NONE']) {
            expect(found({ method, password: 'p' }, '26.3')).toEqual([]);
            for (const line of FROM_26_7) expect(found({ method, password: 'p' }, line)).toEqual(['method.unknown settings.method']);
        }
    });

    it('needs a password', () => {
        for (const line of LINES) {
            expect(found({ method: 'aes-256-gcm' }, line)).toEqual(['password.empty settings.password']);
            expect(found({ method: 'aes-256-gcm', password: '' }, line)).toEqual(['password.empty settings.password']);
        }
    });

    it('lists the names the line takes, with none only where it works', () => {
        const suggestion = (line: CoreVersionId) =>
            shadowsocksInboundProblems(inbound({ method: 'x', password: 'p' }), line)[0]!.suggestion!;
        expect(suggestion('26.3')).toContain('none');
        expect(suggestion('26.7')).not.toContain('none');
        expect(suggestion('26.7')).toContain(AES128);
        expect(suggestion('26.7')).not.toContain('aead_');
    });
});

describe('several classic accounts', () => {
    const users = (...methods: (string | undefined)[]) => methods.map(method => ({ password: 'p', ...(method === undefined ? {} : { method }) }));

    it('does not read the top-level method or password at all', () => {
        // Users != nil takes the loop and never looks at v.Cipher
        // (v26.3.27:infra/conf/shadowsocks.go:61-79, v26.7.28 :65-91).
        for (const line of LINES) {
            expect(found({ method: '', clients: users('aes-256-gcm', 'chacha20-poly1305') }, line)).toEqual([]);
            expect(found({ clients: users('aes-256-gcm') }, line)).toEqual([]);
            expect(found({ method: 'nonsense', password: '', clients: users('aes-128-gcm') }, line)).toEqual([]);
        }
    });

    it('wants an AEAD cipher on every user, none and plain included in the refusal', () => {
        // The range check is AES_128_GCM..XCHACHA20_POLY1305 (v26.3.27 :70-73, v26.7.28 :77-78);
        // NONE is past the end of it on 26.3 (v26.3.27:proxy/shadowsocks/config.proto, NONE = 9).
        for (const line of LINES) {
            expect(found({ clients: users('aes-256-gcm', '', 'none', 'plain', undefined, 'rc4', 'AES-128-GCM') }, line)).toEqual([
                'user.method settings.clients[1].method',
                'user.method settings.clients[2].method',
                'user.method settings.clients[3].method',
                'user.method settings.clients[4].method',
                'user.method settings.clients[5].method',
            ]);
        }
    });

    it('needs a password on every user', () => {
        expect(found({ clients: [{ method: 'aes-256-gcm' }, { method: 'aes-256-gcm', password: 'p' }] }, '26.7'))
            .toEqual(['password.empty settings.clients[0].password']);
    });

    it('loads an empty list: a server with no accounts', () => {
        for (const line of LINES) expect(found({ method: 'aes-256-gcm', clients: [] }, line)).toEqual([]);
        for (const line of LINES) expect(found({ clients: [] }, line)).toEqual([]);
    });

    it('reads `users` from 26.7, and `clients` before it whenever that is a list', () => {
        const aead = users('aes-256-gcm');
        const bad = users('');
        // 26.3 has no `users` key: the inbound is one account with no method.
        expect(found({ users: bad }, '26.3')).toEqual(['password.empty settings.password', 'method.unknown settings.method']);
        for (const line of FROM_26_7) {
            expect(found({ users: bad }, line)).toEqual(['user.method settings.users[0].method']);
            expect(found({ users: bad, clients: aead }, line)).toEqual([]);
            expect(found({ users: aead, clients: bad }, line)).toEqual(['user.method settings.clients[0].method']);
            // An empty `clients` wins too (v26.7.28:infra/conf/shadowsocks.go:54-56).
            expect(found({ users: bad, clients: [] }, line)).toEqual([]);
        }
    });
});

describe('a 2022 method', () => {
    it('takes one key when no users are listed', () => {
        for (const line of LINES) {
            expect(found({ method: AES128, password: KEY16 }, line)).toEqual([]);
            expect(found({ method: AES256, password: KEY32 }, line)).toEqual([]);
            expect(found({ method: CHACHA, password: KEY32 }, line)).toEqual([]);
            expect(found({ method: AES128, password: KEY16, clients: [] }, line)).toEqual([]);
        }
    });

    it('is matched exactly up to 26.9 and in lower case from 26.10', () => {
        // v26.7.28:infra/conf/shadowsocks.go:58 (C.Contains) against v26.10.10 :56 (GetCipherMethod lower-cases).
        const upper = '2022-BLAKE3-AES-128-GCM';
        for (const line of UP_TO_26_9) {
            const single = shadowsocksInboundProblems(inbound({ method: upper, password: KEY16 }), line);
            expect(single.map(problem => problem.kind)).toEqual(['method.unknown']);
            // It says how to write it.
            expect(single[0]!.suggestion).toContain(AES128);
        }
        expect(found({ method: upper, password: KEY16 }, '26.10')).toEqual([]);
    });

    it('explains a mis-cased name that fell through to a classic multi-user server', () => {
        // Users listed, so the name is never read and each user is a classic account: their keys are no cipher.
        const settings = { method: '2022-Blake3-AES-128-GCM', password: KEY16, clients: [{ password: KEY16 }] };
        for (const line of UP_TO_26_9) {
            const problems = shadowsocksInboundProblems(inbound(settings), line);
            expect(problems.map(problem => problem.kind)).toEqual(['user.method']);
            expect(problems[0]!.suggestion).toContain(AES128);
        }
        expect(found(settings, '26.10')).toEqual([]);
    });

    describe('with users', () => {
        it('serves several users from a master key, each with a key and no method', () => {
            for (const line of LINES) {
                expect(found({ method: AES128, password: KEY16, clients: [{ password: KEY16 }, { password: KEY16, email: 'a@b' }] }, line)).toEqual([]);
                expect(found({ method: AES256, password: KEY32, clients: [{ password: KEY32 }] }, line)).toEqual([]);
            }
        });

        it('refuses a user method', () => {
            // "users must have empty method": v26.3.27:infra/conf/shadowsocks.go:125, v26.7.28 :139.
            for (const line of LINES) {
                expect(found({ method: AES128, password: KEY16, clients: [{ password: KEY16, method: 'aes-128-gcm' }] }, line))
                    .toEqual(['user.method2022 settings.clients[0].method']);
            }
        });

        it('serves AES methods only', () => {
            // "only blake3-aes-*-gcm methods are supported": v26.3.27:infra/conf/shadowsocks.go:114, v26.7.28 :126.
            for (const line of LINES) {
                expect(found({ method: CHACHA, password: KEY32, clients: [{ password: KEY32 }] }, line)).toEqual(['method.chacha settings.method']);
                // Without users it is a single key, and chacha20 is fine.
                expect(found({ method: CHACHA, password: KEY32, clients: [] }, line)).toEqual([]);
            }
        });

        it('is a relay once the first user has an address, and then every user needs one', () => {
            // v26.7.28:infra/conf/shadowsocks.go:130 and :166.
            const relay = [
                { password: KEY16, address: '10.0.0.1', port: 8389 },
                { password: KEY16 },
            ];
            for (const line of LINES) {
                expect(found({ method: AES128, password: KEY16, clients: relay }, line)).toEqual(['relay.address settings.clients[1].address']);
                expect(found({ method: AES128, password: KEY16, clients: [relay[0], { ...relay[1], address: '10.0.0.2' }] }, line)).toEqual([]);
                // An address on a later user alone does not make it a relay.
                expect(found({ method: AES128, password: KEY16, clients: [{ password: KEY16 }, { password: KEY16, address: 'x' }] }, line)).toEqual([]);
            }
        });
    });

    describe('keys', () => {
        const single = (password: unknown, method = AES128) => ({ method, password });

        it('are required', () => {
            for (const line of LINES) {
                expect(found(single(''), line)).toEqual(['key.empty settings.password']);
                expect(found({ method: AES128 }, line)).toEqual(['key.empty settings.password']);
            }
        });

        it('are base64 up to 26.9, where the string itself is the key from 26.10', () => {
            // v26.7.28 (sing-shadowsocks) refuses what StdEncoding cannot decode;
            // v26.10.10:proxy/shadowsocks_2022/kdf.go:17-20 falls back to the raw bytes.
            const raw16 = 'abcdefghijklmnop!';
            expect(raw16.length).toBe(17);
            for (const line of UP_TO_26_9) {
                expect(found(single('not base64!!'), line)).toEqual(['key.base64 settings.password']);
                // Missing padding is not base64 to Go's StdEncoding.
                expect(found(single(KEY16.replace(/=+$/, '')), line)).toEqual(['key.base64 settings.password']);
                // Neither is the URL-safe alphabet.
                expect(found(single('-_-_-_-_-_-_-_-_-_-_-w=='), line)).toEqual(['key.base64 settings.password']);
            }
            expect(found(single('exactly16bytes!?'), '26.10')).toEqual([]);
            expect(found(single(raw16), '26.10')).toEqual(['key.size settings.password']);
        });

        it('may be longer than needed up to 26.9, where they are cut down, and must be exact from 26.10', () => {
            // sing-shadowsocks@v0.2.7:shadowaead_2022/service.go:99-107 hashes a longer key down;
            // v26.10.10:proxy/shadowsocks_2022/kdf.go:21 wants N exactly.
            for (const line of UP_TO_26_9) {
                expect(found(single(KEY32), line)).toEqual([]);
                expect(found(single(KEY16, AES256), line)).toEqual(['key.short settings.password']);
            }
            expect(found(single(KEY32), '26.10')).toEqual(['key.size settings.password']);
            expect(found(single(KEY16, AES256), '26.10')).toEqual(['key.size settings.password']);
        });

        it('are 16 bytes for aes-128 and 32 for the other two', () => {
            for (const line of LINES) {
                expect(found(single(KEY16, AES128), line)).toEqual([]);
                expect(found(single(KEY32, AES256), line)).toEqual([]);
                expect(found(single(KEY32, CHACHA), line)).toEqual([]);
                expect(found(single(KEY16, CHACHA), line)).toEqual([line === '26.10' ? 'key.size settings.password' : 'key.short settings.password']);
            }
        });

        it('are checked on every user and on the master key', () => {
            const settings = { method: AES128, password: KEY16, clients: [{ password: KEY16 }, { password: '' }, { password: 'x!' }] };
            expect(found(settings, '26.7')).toEqual([
                'key.empty settings.clients[1].password',
                'key.base64 settings.clients[2].password',
            ]);
            expect(found({ ...settings, password: '' }, '26.7')).toContain('key.empty settings.password');
        });
    });
});

describe('what is written for a new 2022 account', () => {
    it('knows how long each method wants its key', () => {
        expect([AES128, AES256, CHACHA].map(ss2022KeyBytes)).toEqual([16, 32, 32]);
        expect(isShadowsocks2022Method(AES128.toUpperCase())).toBe(true);
        expect(isShadowsocks2022Method('aes-128-gcm')).toBe(false);
    });

    it('generates a key of exactly that size, in padded base64, that every line takes', () => {
        for (const method of [AES128, AES256, CHACHA]) {
            const key = generateShadowsocks2022Key(method);
            expect(Buffer.from(key, 'base64')).toHaveLength(ss2022KeyBytes(method));
            expect(key).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
            for (const line of LINES) expect(found({ method, password: key }, line)).toEqual([]);
        }
    });

    it('is what the factory writes for a 2022 inbound, where a hex id is refused on every line', () => {
        const made = createDefaultInbound('shadowsocks-2022');
        for (const line of LINES) expect(shadowsocksInboundProblems(made, line)).toEqual([]);
        // The hex id it used to write.
        for (const line of LINES) {
            expect(found({ method: AES128, password: 'a1b2c3d4e5f60718' }, line)).toHaveLength(1);
        }
    });

    it('is what the factory writes for a classic inbound with a 2022 method chosen, and not for any other', () => {
        const chosen = createEndpoint('inbound', 'shadowsocks', { method: AES256 });
        expect(Buffer.from((chosen.settings as any).password, 'base64')).toHaveLength(32);
        const classic = createEndpoint('inbound', 'shadowsocks');
        expect((classic.settings as any).password).toMatch(/^[0-9a-f]{16}$/);
        const vless = createEndpoint('inbound', 'trojan', { method: AES256 });
        expect((vless.settings as any).clients[0].password).toMatch(/^[0-9a-f]{16}$/);
    });
});

describe('where it is reported', () => {
    it('is critical, in the diagnostics, on the field', () => {
        const config = { inbounds: [inbound({ method: 'rc4-md5', password: 'p' })] };
        const diagnostics = ruleDiagnostics(config, '26.7').filter(d => d.field === 'settings.method');
        expect(diagnostics).toHaveLength(1);
        expect(diagnostics[0]).toMatchObject({ section: 'inbounds', itemIndex: 0, severity: 'critical' });
    });

    it('is the only thing that judges the method — the value set only feeds the chooser', () => {
        const config = { inbounds: [inbound({ method: '', clients: [{ password: 'p', method: 'aes-256-gcm' }] })] };
        expect(valueUses(config).filter(use => use.set.id === 'inbound.shadowsocks.method')).toEqual([]);
        for (const line of LINES) expect(ruleDiagnostics(config, line)).toEqual([]);
    });

    it('answers for both names of the protocol, in any case, and for nothing else', () => {
        expect(isShadowsocksInbound({ protocol: 'shadowsocks' })).toBe(true);
        expect(isShadowsocksInbound({ protocol: 'Shadowsocks-2022' })).toBe(true);
        expect(isShadowsocksInbound({ protocol: 'vless' })).toBe(false);
        expect(isShadowsocksInbound(null)).toBe(false);
        expect(shadowsocksInboundProblems({ protocol: 'vless', settings: { method: 'x' } }, '26.7')).toEqual([]);
        expect(shadowsocksInboundProblems(null, '26.7')).toEqual([]);
    });

    it('does not trip over settings that are not an object', () => {
        expect(shadowsocksInboundProblems({ protocol: 'shadowsocks' }, '26.7').map(problem => problem.kind))
            .toEqual(['password.empty', 'method.unknown']);
        expect(shadowsocksInboundProblems({ protocol: 'shadowsocks', settings: 'x' }, '26.7')).toHaveLength(2);
    });
});
