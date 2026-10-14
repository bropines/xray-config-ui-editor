import { describe, expect, it } from 'bun:test';
import { isShadowsocksOutbound, shadowsocksOutboundProblems, shadowsocksServer, shadowsocksUot } from './shadowsocks-outbound';
import { ruleDiagnostics } from './versions/rules';
import { valueUses, versionDiagnostics } from './versions/check';
import { runFullDiagnostics } from '../diagnostics';
import { generateShadowsocks2022Key } from '../generators/crypto';
import { createDefaultOutbound } from '../generators/endpoint-factory';
import { CORE_VERSIONS, type CoreVersionId } from './versions';

/**
 * An outbound reads `method` on every line, never defaults it, and reads its
 * server from one of two shapes. Each case here is a branch of
 * `ShadowsocksClientConfig.Build()` on a named tag (see the module for the
 * lines); the cipher and key rules shared with the inbound are in
 * shadowsocks-inbound.test.ts.
 */

const LINES = CORE_VERSIONS.map(line => line.id);
const UP_TO_26_9: CoreVersionId[] = ['26.3', '26.7', '26.9'];
const FROM_26_7: CoreVersionId[] = ['26.7', '26.9', '26.9.30', '26.10'];
/** Shadowsocks reads a cipher and a key the same way from v26.9.30 on: its own 2022 package, not sing-shadowsocks. */
const FROM_26_9_30: CoreVersionId[] = ['26.9.30', '26.10'];

const KEY16 = Buffer.alloc(16, 7).toString('base64');
const KEY32 = Buffer.alloc(32, 7).toString('base64');
const AES128 = '2022-blake3-aes-128-gcm';
const AES256 = '2022-blake3-aes-256-gcm';
const CHACHA = '2022-blake3-chacha20-poly1305';

const SERVER = { address: 'ss.example', port: 8388, method: 'aes-256-gcm', password: 'p' };

const flat = (settings: Record<string, unknown>, protocol = 'shadowsocks') => ({ tag: 'ss', protocol, settings });
const listed = (server: Record<string, unknown>, protocol = 'shadowsocks') => flat({ servers: [server] }, protocol);
const found = (outbound: unknown, version: CoreVersionId) =>
    shadowsocksOutboundProblems(outbound, version).map(problem => `${problem.kind} ${problem.field}`);

describe('the two shapes', () => {
    it('takes a complete server in either, on every line', () => {
        for (const line of LINES) {
            expect(found(listed(SERVER), line)).toEqual([]);
            expect(found(flat(SERVER), line)).toEqual([]);
        }
    });

    it('is flat as soon as settings.address is there, and then reads nothing from servers', () => {
        // v26.3.27:infra/conf/shadowsocks.go:187-200 — `if v.Address != nil` replaces `servers`.
        const both = flat({ ...SERVER, servers: [{ address: 'other' }, { address: 'another' }] });
        expect(shadowsocksServer(both)).toMatchObject({ shape: 'flat', path: ['settings'], base: 'settings', count: 1 });
        for (const line of LINES) expect(found(both, line)).toEqual([]);
    });

    it('reads the flat fields strictly: a method in servers[0] does not stand in for a missing flat one', () => {
        const mixed = flat({ address: 'ss.example', servers: [SERVER] });
        for (const line of LINES) {
            expect(found(mixed, line)).toEqual([
                'port.missing settings.port',
                'password.empty settings.password',
                'method.empty settings.method',
            ]);
        }
    });

    it('is the list when address is null, which Go decodes into a nil pointer', () => {
        const nulled = flat({ address: null, servers: [SERVER] });
        expect(shadowsocksServer(nulled)).toMatchObject({ shape: 'servers', base: 'settings.servers[0]' });
        for (const line of LINES) expect(found(nulled, line)).toEqual([]);
    });

    it('wants exactly one server in the list', () => {
        // v26.3.27 :201-203, v26.7.28 :213-215, v26.10.10 :214-216.
        for (const line of LINES) {
            expect(found(flat({ servers: [] }), line)).toEqual(['servers.count settings.servers']);
            expect(found(flat({}), line)).toEqual(['servers.count settings.servers']);
            expect(found(flat({ servers: [SERVER, SERVER] }), line)).toEqual(['servers.count settings.servers']);
        }
    });

    it('says which entry a problem is in, in the shape in use', () => {
        for (const line of LINES) {
            expect(found(listed({ ...SERVER, password: '' }), line)).toEqual(['password.empty settings.servers[0].password']);
            expect(found(flat({ ...SERVER, password: '' }), line)).toEqual(['password.empty settings.password']);
        }
    });
});

describe('what Build() asks for, whatever the cipher', () => {
    it('wants an address, a port and a password', () => {
        // address :208/:234, port :211/:237, password :214/:240 on 26.3; :220/:244, :223/:247, :226/:250 on 26.7;
        // :219, :222, :225 on 26.10.
        for (const line of LINES) {
            expect(found(listed({ ...SERVER, address: undefined }), line)).toEqual(['address.missing settings.servers[0].address']);
            expect(found(listed({ ...SERVER, port: 0 }), line)).toEqual(['port.missing settings.servers[0].port']);
            expect(found(listed({ ...SERVER, port: undefined }), line)).toEqual(['port.missing settings.servers[0].port']);
            expect(found(listed({ ...SERVER, password: '' }), line)).toEqual(['password.empty settings.servers[0].password']);
            expect(found(listed({ method: AES128 }), line)).toEqual([
                'address.missing settings.servers[0].address',
                'port.missing settings.servers[0].port',
                'password.empty settings.servers[0].password',
            ]);
        }
    });

    it('does not call a value of the wrong type empty: that is a failed decode, which the type checks say', () => {
        for (const line of LINES) {
            expect(found(listed({ ...SERVER, password: 5 }), line)).toEqual([]);
            expect(found(listed({ ...SERVER, method: 5 }), line)).toEqual([]);
        }
    });
});

describe('the cipher', () => {
    it('is never defaulted: an empty or missing method is refused on every line', () => {
        // The classic builder reads "" as an unknown cipher
        // (v26.3.27 :246-249, v26.7.28 :256-259, v26.10.10 :241-244).
        for (const line of LINES) {
            expect(found(listed({ ...SERVER, method: '' }), line)).toEqual(['method.empty settings.servers[0].method']);
            expect(found(listed({ ...SERVER, method: undefined }), line)).toEqual(['method.empty settings.servers[0].method']);
        }
    });

    it('takes the classic names without regard to case, and their aead_ spellings', () => {
        for (const method of ['AES-128-GCM', 'aead_aes_256_gcm', 'Chacha20-Ietf-Poly1305', 'xchacha20-poly1305', 'AEAD_XCHACHA20_POLY1305']) {
            for (const line of LINES) expect(found(listed({ ...SERVER, method }), line)).toEqual([]);
        }
    });

    it('refuses a name it does not know', () => {
        for (const line of LINES) {
            const [problem] = shadowsocksOutboundProblems(listed({ ...SERVER, method: 'rc4-md5' }), line);
            expect(problem).toMatchObject({ kind: 'method.unknown', field: 'settings.servers[0].method', severity: 'critical' });
            expect(problem!.suggestion).toContain('aes-256-gcm');
        }
    });

    it('takes none and plain on 26.3 alone', () => {
        // v26.3.27:infra/conf/shadowsocks.go:26; gone from v26.7.28 :17-30.
        for (const method of ['none', 'plain', 'NONE']) {
            expect(found(listed({ ...SERVER, method }), '26.3')).toEqual([]);
            for (const line of FROM_26_7) expect(found(listed({ ...SERVER, method }), line)).toEqual(['method.unknown settings.servers[0].method']);
        }
    });

    it('lists none as a choice only where it works', () => {
        const suggestion = (line: CoreVersionId) =>
            shadowsocksOutboundProblems(listed({ ...SERVER, method: 'x' }), line)[0]!.suggestion!;
        expect(suggestion('26.3')).toContain('none');
        expect(suggestion('26.7')).not.toContain('none');
        for (const line of FROM_26_9_30) expect(suggestion(line)).toContain(AES128);
    });

    it('matches a 2022 name exactly up to 26.9 and in lower case from v26.9.30', () => {
        // C.Contains(shadowaead_2022.List, ...) — v26.3.27 :207, v26.7.28 :219 — against GetCipherMethod, v26.9.30 and v26.10.10 :229.
        const upper = '2022-BLAKE3-AES-128-GCM';
        for (const line of UP_TO_26_9) {
            const [problem] = shadowsocksOutboundProblems(listed({ ...SERVER, method: upper, password: KEY16 }), line);
            expect(problem).toMatchObject({ kind: 'method.unknown' });
            expect(problem!.suggestion).toContain(AES128);
        }
        for (const line of FROM_26_9_30) expect(found(listed({ ...SERVER, method: upper, password: KEY16 }), line)).toEqual([]);
    });
});

describe('a 2022 password', () => {
    const with2022 = (password: unknown, method = AES128) => listed({ ...SERVER, method, password });

    it('takes a base64 key of the size the cipher names', () => {
        for (const line of LINES) {
            expect(found(with2022(KEY16, AES128), line)).toEqual([]);
            expect(found(with2022(KEY32, AES256), line)).toEqual([]);
            expect(found(with2022(KEY32, CHACHA), line)).toEqual([]);
            expect(found(with2022(generateShadowsocks2022Key(AES256), AES256), line)).toEqual([]);
        }
    });

    it('is only an empty password when it is empty: Build() refuses that before it reads the key', () => {
        for (const line of LINES) expect(found(with2022(''), line)).toEqual(['password.empty settings.servers[0].password']);
    });

    it('is base64 up to 26.9, and the string itself from v26.9.30', () => {
        for (const line of UP_TO_26_9) {
            expect(found(with2022('not base64!!'), line)).toEqual(['key.base64 settings.servers[0].password']);
            expect(found(with2022(KEY16.replace(/=+$/, '')), line)).toEqual(['key.base64 settings.servers[0].password']);
        }
        for (const line of FROM_26_9_30) expect(found(with2022('exactly16bytes!?'), line)).toEqual([]);
        for (const line of FROM_26_9_30) expect(found(with2022('abcdefghijklmnop!'), line)).toEqual(['key.size settings.servers[0].password']);
    });

    it('may be longer than needed up to 26.9, and must be exact from v26.9.30', () => {
        for (const line of UP_TO_26_9) {
            expect(found(with2022(KEY32), line)).toEqual([]);
            expect(found(with2022(KEY16, AES256), line)).toEqual(['key.short settings.servers[0].password']);
        }
        for (const line of FROM_26_9_30) expect(found(with2022(KEY32), line)).toEqual(['key.size settings.servers[0].password']);
        for (const line of FROM_26_9_30) expect(found(with2022(KEY16, AES256), line)).toEqual(['key.size settings.servers[0].password']);
    });

    it('joins a master key and a user key with a colon, and checks each', () => {
        // sing-shadowsocks@v0.2.7:shadowaead_2022/protocol.go:72-80; v26.10.10:proxy/shadowsocks_2022/kdf.go:27-38.
        for (const line of LINES) {
            expect(found(with2022(`${KEY16}:${KEY16}`), line)).toEqual([]);
            expect(found(with2022(`${KEY16}:${KEY16}:${KEY16}`), line)).toEqual([]);
        }
        const bad = shadowsocksOutboundProblems(with2022(`${KEY16}:x!`), '26.7');
        expect(bad.map(problem => problem.kind)).toEqual(['key.base64']);
        expect(bad[0]!.message).toContain('key 2 of 2');
        // An empty part is a missing key, not an empty password.
        expect(found(with2022(`${KEY16}:`), '26.7')).toEqual(['key.empty settings.servers[0].password']);
        for (const line of FROM_26_9_30) expect(found(with2022(`${KEY16}:`), line)).toEqual(['key.empty settings.servers[0].password']);
    });

    it('takes one key only with chacha20', () => {
        // sing-shadowsocks@v0.2.7:shadowaead_2022/protocol.go:99-102; v26.10.10:proxy/shadowsocks_2022/outbound.go:48-50.
        for (const line of LINES) {
            expect(found(with2022(`${KEY32}:${KEY32}`, CHACHA), line)).toEqual(['key.multi settings.servers[0].password']);
            expect(found(with2022(`${KEY32}:${KEY32}`, AES256), line)).toEqual([]);
        }
    });

    it('is not asked of a classic password, which is any text, colons included', () => {
        for (const line of LINES) expect(found(listed({ ...SERVER, password: 'a:b:c d' }), line)).toEqual([]);
    });
});

describe('UDP over TCP', () => {
    const with2022Uot = (extra: Record<string, unknown> = {}, method = AES128) =>
        listed({ ...SERVER, method, password: KEY16, uot: true, ...extra });

    it('does something only on 26.3, and only beside a 2022 name', () => {
        // v26.3.27:infra/conf/shadowsocks.go:223-224 passes it to the 2022 builder; the classic one (:229-263) never looks.
        expect(shadowsocksUot(with2022Uot(), '26.3')).toEqual({ effect: 'works', held: ['uot'] });
        expect(shadowsocksUot(listed({ ...SERVER, uot: true }), '26.3')).toEqual({ effect: 'method', held: ['uot'] });
        for (const line of FROM_26_7) {
            expect(shadowsocksUot(with2022Uot(), line).effect).toBe('line');
            expect(shadowsocksUot(listed({ ...SERVER, uot: true }), line).effect).toBe('line');
        }
    });

    it('goes by the name as 26.3 compares it: exactly', () => {
        expect(shadowsocksUot(with2022Uot({}, '2022-BLAKE3-AES-128-GCM'), '26.3').effect).toBe('method');
    });

    it('holds the keys in the shape the core reads', () => {
        expect(shadowsocksUot(flat({ ...SERVER, uot: true, uotVersion: 2 }), '26.7').held).toEqual(['uot', 'uotVersion']);
        // In servers[0] and flat at once: the flat one is read, and has none.
        expect(shadowsocksUot(flat({ ...SERVER, servers: [{ uot: true }] }), '26.3').held).toEqual([]);
        expect(shadowsocksUot(listed({ ...SERVER, uotVersion: 2 }), '26.3').held).toEqual(['uotVersion']);
    });

    it('is a warning beside a classic cipher on 26.3, which reads the key and throws it away', () => {
        const [problem] = shadowsocksOutboundProblems(listed({ ...SERVER, uot: true, uotVersion: 2 }), '26.3');
        expect(problem).toMatchObject({ kind: 'uot.method', field: 'settings.servers[0].uot', severity: 'warning' });
        expect(shadowsocksOutboundProblems(listed({ ...SERVER, uot: true, uotVersion: 2 }), '26.3').map(p => p.field))
            .toEqual(['settings.servers[0].uot', 'settings.servers[0].uotVersion']);
        expect(found(with2022Uot(), '26.3')).toEqual([]);
    });

    it('is the version table that speaks on a line without the key, in both shapes', () => {
        const rows = (outbound: unknown, line: CoreVersionId) =>
            versionDiagnostics({ outbounds: [outbound] }, line).filter(d => /uot/i.test(d.field ?? '')).map(d => `${d.severity} ${d.field}`);
        expect(rows(flat({ ...SERVER, uot: true, uotVersion: 2 }), '26.7')).toEqual(['warning settings.uot', 'warning settings.uotVersion']);
        for (const line of FROM_26_9_30) expect(rows(listed({ ...SERVER, uot: true, uotVersion: 2 }), line)).toEqual(['warning settings.servers[].uot', 'warning settings.servers[].uotVersion']);
        // 26.3 reads both keys: with a 2022 name nothing is said, beside a classic one the rule above says it.
        expect(rows(listed({ ...SERVER, method: AES128, password: KEY16, uot: true, uotVersion: 2 }), '26.3')).toEqual([]);
        expect(rows(listed({ ...SERVER, uot: true, uotVersion: 2 }), '26.3')).toEqual(['warning settings.servers[0].uot', 'warning settings.servers[0].uotVersion']);
        // ...and the rule above does not say it twice.
        expect(found(flat({ ...SERVER, uot: true }), '26.7')).toEqual([]);
    });
});

describe('the protocol name', () => {
    it('is no protocol: the loader has one Shadowsocks', () => {
        for (const line of LINES) {
            const [problem, ...rest] = shadowsocksOutboundProblems(listed(SERVER, 'shadowsocks-2022'), line);
            expect(problem).toMatchObject({ kind: 'protocol.name', field: 'protocol', severity: 'critical' });
            expect(problem!.suggestion).toContain('shadowsocks');
            expect(rest).toEqual([]);
        }
        expect(found(listed(SERVER, 'Shadowsocks-2022'), '26.7')).toEqual(['protocol.name protocol']);
        expect(found(listed(SERVER, 'shadowsocks'), '26.7')).toEqual([]);
    });

    it('is not what the factory writes for the 2022 spelling', () => {
        const made = createDefaultOutbound('shadowsocks-2022');
        expect(made.protocol).toBe('shadowsocks');
        for (const line of LINES) expect(shadowsocksOutboundProblems(made, line)).toEqual([]);
    });
});

describe('where it is reported', () => {
    it('is critical, in the diagnostics, on the field of the outbound it is in', () => {
        const config = { outbounds: [{ tag: 'a', protocol: 'freedom' }, listed({ ...SERVER, method: 'rc4-md5' })] };
        const diagnostics = ruleDiagnostics(config, '26.7').filter(d => d.field === 'settings.servers[0].method');
        expect(diagnostics).toHaveLength(1);
        expect(diagnostics[0]).toMatchObject({ section: 'outbounds', itemIndex: 1, severity: 'critical' });
    });

    it('carries the warning as a warning, so it does not stop a panel save', () => {
        const config = { outbounds: [listed({ ...SERVER, uot: true })] };
        const diagnostics = runFullDiagnostics(config as never, [], '26.3').filter(d => d.field?.includes('uot'));
        expect(diagnostics).toHaveLength(1);
        expect(diagnostics[0]!.severity).toBe('warning');
    });

    it('gates the panel save on what is critical', () => {
        const config = { outbounds: [flat({ ...SERVER, method: '' })] };
        expect(runFullDiagnostics(config as never, [], '26.7').filter(d => d.severity === 'critical').map(d => d.field))
            .toEqual(['settings.method']);
        // Without a line nothing version-specific is said.
        expect(runFullDiagnostics(config as never, []).filter(d => d.field === 'settings.method')).toEqual([]);
    });

    it('is the only thing that judges the method — the value set only feeds the chooser', () => {
        const config = { outbounds: [listed({ ...SERVER, method: '' }), listed({ ...SERVER, method: 'AES-256-GCM' })] };
        expect(valueUses(config).filter(use => use.set.id.startsWith('outbound.shadowsocks'))).toEqual([]);
        for (const line of LINES) expect(versionDiagnostics(config, line).filter(d => d.field === 'settings.servers[].method')).toEqual([]);
    });

    it('skips a snippet reference and anything that is not a Shadowsocks outbound', () => {
        const config = { outbounds: [{ snippet: 'NAME' }, null, { protocol: 'vless', settings: {} }] };
        expect(ruleDiagnostics(config, '26.7').filter(d => d.section === 'outbounds')).toEqual([]);
        expect(isShadowsocksOutbound({ protocol: 'Shadowsocks-2022' })).toBe(true);
        expect(isShadowsocksOutbound({ protocol: 'vless' })).toBe(false);
        expect(isShadowsocksOutbound(null)).toBe(false);
        expect(shadowsocksOutboundProblems(null, '26.7')).toEqual([]);
    });

    it('does not trip over settings that are not an object', () => {
        expect(shadowsocksOutboundProblems({ protocol: 'shadowsocks' }, '26.7').map(problem => problem.kind)).toEqual(['servers.count']);
        expect(shadowsocksOutboundProblems({ protocol: 'shadowsocks', settings: 'x' }, '26.7').map(problem => problem.kind)).toEqual(['servers.count']);
        expect(shadowsocksOutboundProblems({ protocol: 'shadowsocks', settings: { servers: [null] } }, '26.7')).toEqual([]);
    });
});
