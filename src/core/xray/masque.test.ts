import { describe, expect, it } from 'bun:test';
import { generateKeyPairSync } from 'node:crypto';
import {
    isIpLiteral,
    isMasque,
    lineHasMasque,
    lineReadsWarp,
    masqueHostProblem,
    masquePathProblem,
    masqueProblems,
    masqueSettingsProblems,
    masqueUserList,
} from './masque';
import { createDefaultInbound, createDefaultOutbound } from '../generators/endpoint-factory';
import { runFullDiagnostics } from '../diagnostics';
import { versionDiagnostics } from './versions/check';
import { featureStatus, featureStatusAt, allowedValues } from './versions/features';
import { CORE_VERSIONS } from './versions';

/**
 * MASQUE as v26.10.10 loads and starts it. Every rule here is one the source
 * refuses (the citations are in masque.ts); each case names what the core says.
 * v26.9.30 has all of it but `warp`, which is the last describe block's subject.
 */

const keyPair = () => {
    const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    return {
        privateKey: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string,
        publicKey: pair.publicKey.export({ type: 'spki', format: 'pem' }) as string,
    };
};

const outbound = (over: Record<string, unknown> = {}) => ({
    tag: 'm',
    protocol: 'masque',
    settings: { address: 'm.example.com', port: 443 },
    streamSettings: { network: 'masque', security: 'tls' },
    ...over,
});

const inbound = (over: Record<string, unknown> = {}) => ({
    tag: 'in',
    protocol: 'masque',
    port: 443,
    settings: { clients: [{ email: 'a@x', pass: 'p' }], address: ['10.250.0.1/24'] },
    streamSettings: { network: 'masque', security: 'tls' },
    ...over,
});

const kinds = (item: unknown, side: 'inbound' | 'outbound', version = '26.10' as const) =>
    masqueProblems(item, side, version).map(problem => problem.kind);
const withSettings = (item: ReturnType<typeof outbound>, settings: Record<string, unknown>) =>
    ({ ...item, settings: { ...item.settings, ...settings } });
const withStream = (item: ReturnType<typeof outbound>, stream: Record<string, unknown>) =>
    ({ ...item, streamSettings: { ...item.streamSettings, ...stream } });
const settingsKinds = (masqueSettings: unknown) =>
    masqueSettingsProblems(masqueSettings, 'streamSettings.masqueSettings', '26.10').map(problem => problem.kind);

describe('which lines it answers for', () => {
    it('v26.9.30 and 26.10 register the protocol, and nothing before them', () => {
        expect(CORE_VERSIONS.filter(line => lineHasMasque(line.id)).map(line => line.id)).toEqual(['26.9.30', '26.10']);
    });

    it('only 26.10 reads WARP over it', () => {
        expect(CORE_VERSIONS.filter(line => lineReadsWarp(line.id)).map(line => line.id)).toEqual(['26.10']);
    });

    it('is silent where the version table already refuses the protocol', () => {
        // inbound.protocol.masque / outbound.protocol.masque say it on 26.3-26.9.
        for (const version of ['26.3', '26.7', '26.9'] as const) {
            expect(masqueProblems(outbound({ settings: {} }), 'outbound', version)).toEqual([]);
            expect(masqueProblems(inbound({ settings: {} }), 'inbound', version)).toEqual([]);
        }
    });

    it('recognises the protocol the way the loader does, lower-cased', () => {
        expect(isMasque({ protocol: 'MASQUE' })).toBe(true);
        expect(isMasque({ protocol: 'vless' })).toBe(false);
        expect(isMasque(null)).toBe(false);
    });
});

describe('a masque outbound', () => {
    it('is fine with an address, a port, TLS and the masque transport', () => {
        expect(kinds(outbound(), 'outbound')).toEqual([]);
    });

    it('needs an address and a port (infra/conf/masque.go:21-26)', () => {
        expect(kinds(outbound({ settings: {} }), 'outbound')).toEqual(['address', 'port']);
        expect(kinds(withSettings(outbound(), { address: '' }), 'outbound')).toEqual(['address']);
        expect(kinds(withSettings(outbound(), { port: 0 }), 'outbound')).toEqual(['port']);
        // A port is a whole number to a uint16: text, or too large, fails the decode.
        expect(kinds(withSettings(outbound(), { port: '443' }), 'outbound')).toEqual(['type']);
        expect(kinds(withSettings(outbound(), { port: 70000 }), 'outbound')).toEqual(['type']);
        expect(kinds(withSettings(outbound(), { address: 5 }), 'outbound')).toEqual(['type']);
    });

    it('takes IP literals in remoteDNS, and no names (:27-31)', () => {
        expect(kinds(withSettings(outbound(), { remoteDNS: ['1.1.1.1', '2606:4700:4700::1111', 'fe80::1%eth0'] }), 'outbound')).toEqual([]);
        const found = masqueProblems(withSettings(outbound(), { remoteDNS: ['1.1.1.1', 'dns.example.com', '1.1.1.1:53'] }), 'outbound', '26.10');
        expect(found.map(problem => problem.kind)).toEqual(['remoteDNS', 'remoteDNS']);
        expect(found[0]!.message).toContain('dns.example.com');
        expect(kinds(withSettings(outbound(), { remoteDNS: 'one.one.one.one' }), 'outbound')).toEqual(['type']);
    });

    it('refuses Mux by name (infra/conf/xray.go:347-350)', () => {
        expect(kinds({ ...outbound(), mux: { enabled: true } }, 'outbound')).toEqual(['mux']);
        expect(kinds({ ...outbound(), mux: { enabled: false } }, 'outbound')).toEqual([]);
    });

    it('starts only on the masque transport, whatever name the core would read it by', () => {
        expect(kinds(withStream(outbound(), { network: 'ws' }), 'outbound')).toEqual(['transport.network']);
        expect(kinds({ ...outbound(), streamSettings: { security: 'tls' } }, 'outbound')).toEqual(['transport.network']);
        // 26.7+ read `method` over `network`.
        expect(kinds(withStream(outbound(), { method: 'ws' }), 'outbound')).toEqual(['transport.network']);
        expect(kinds(withStream(outbound(), { network: 'MASQUE' }), 'outbound')).toEqual([]);
    });

    it('starts only with TLS (proxy/masque/client.go:61-63)', () => {
        expect(kinds(withStream(outbound(), { security: 'none' }), 'outbound')).toEqual(['transport.security']);
        expect(kinds(withStream(outbound(), { security: 'reality' }), 'outbound')).toEqual(['transport.security']);
        expect(kinds(withStream(outbound(), { security: 'TLS' }), 'outbound')).toEqual([]);
        expect(kinds({ ...outbound(), streamSettings: undefined }, 'outbound')).toEqual(['transport.network', 'transport.security']);
    });
});

describe('the masque transport on another proxy', () => {
    it('is refused by the loader, on either side (infra/conf/xray.go:209-211, :351-353)', () => {
        const stream = { network: 'masque', security: 'tls' };
        expect(kinds({ protocol: 'vless', settings: {}, streamSettings: stream }, 'outbound')).toEqual(['transport.owner']);
        expect(kinds({ protocol: 'vless', settings: {}, streamSettings: stream }, 'inbound')).toEqual(['transport.owner']);
        expect(kinds({ protocol: 'vless', settings: {}, streamSettings: { network: 'ws' } }, 'outbound')).toEqual([]);
    });
});

describe('a masque inbound', () => {
    it('is fine with users, an address pool, TLS and the masque transport', () => {
        expect(kinds(inbound(), 'inbound')).toEqual([]);
    });

    it('wants a name, a password and a unique name for every user (infra/conf/masque.go:63-77)', () => {
        const users = (list: unknown[]) => inbound({ settings: { clients: list, address: ['10.250.0.1/24'] } });
        expect(kinds(users([{ pass: 'p' }]), 'inbound')).toEqual(['user.email']);
        expect(kinds(users([{ email: 'a:b@x', pass: 'p' }]), 'inbound')).toEqual(['user.email']);
        expect(kinds(users([{ email: 'a@x' }]), 'inbound')).toEqual(['user.pass']);
        expect(kinds(users([{ email: 'A@x', pass: 'p' }, { email: 'a@X', pass: 'q' }]), 'inbound')).toEqual(['user.duplicate']);
        expect(kinds(users([{ email: 'a@x', pass: 7 }]), 'inbound')).toEqual(['type']);
        // No users at all is a server nobody can sign in to, not a refusal.
        expect(kinds(users([]), 'inbound')).toEqual([]);
        const report = masqueProblems(users([{ email: 'a@x', pass: 'p' }, { email: 'a@x', pass: '' }]), 'inbound', '26.10');
        expect(report[0]!.field).toBe('settings.clients[1].pass');
    });

    it('reads `clients` over `users`, even when it is empty (:55-57)', () => {
        const both = { clients: [], users: [{ email: 'a@x' }], address: ['10.250.0.1/24'] };
        expect(masqueUserList(both).key).toBe('clients');
        expect(masqueUserList(both).users).toEqual([]);
        expect(kinds(inbound({ settings: both }), 'inbound')).toEqual([]);
        // Only `users`: that list is the one checked, and named by its own key.
        const usersOnly = masqueProblems(inbound({ settings: { users: [{ email: '', pass: 'p' }], address: ['10.250.0.1/24'] } }), 'inbound', '26.10');
        expect(usersOnly[0]!.field).toBe('settings.users[0].email');
    });

    it('needs one IPv4 and/or one IPv6 prefix, valid ones (:84-98)', () => {
        const pool = (address: unknown) => inbound({ settings: { clients: [], address } });
        expect(kinds(pool(undefined), 'inbound')).toEqual(['address']);
        expect(kinds(pool([]), 'inbound')).toEqual(['address']);
        expect(kinds(pool('10.0.0.1/24'), 'inbound')).toEqual(['type']);
        expect(kinds(pool(['10.250.0.1/24', 'fd00:250::1/64']), 'inbound')).toEqual([]);
        expect(kinds(pool(['10.250.0.1/24', '10.251.0.1/24']), 'inbound')).toEqual(['address.families']);
        expect(kinds(pool(['fd00::1/64', 'fd01::1/64']), 'inbound')).toEqual(['address.families']);
        // A bare address is not a prefix, a mask is not a length, a zone is not allowed.
        for (const bad of ['10.250.0.1', '10.250.0.1/33', '10.250.0.1/024', 'nonsense', 'fe80::1%eth0/64', '10.250.0.1/255.255.255.0']) {
            expect(kinds(pool([bad]), 'inbound')).toEqual(['address.invalid']);
        }
    });

    it('needs the server address to be a host inside the network (proxy/masque/pool.go:20-45)', () => {
        const pool = (address: string) => kinds(inbound({ settings: { clients: [], address: [address] } }), 'inbound');
        // The network address, and for IPv4 the broadcast address, cannot be the server's.
        expect(pool('10.250.0.0/24')).toEqual(['address.host']);
        expect(pool('10.250.0.255/24')).toEqual(['address.host']);
        expect(pool('10.250.0.1/32')).toEqual(['address.host']);
        expect(pool('10.250.0.1/31')).toEqual(['address.host']);
        expect(pool('fd00:250::/64')).toEqual(['address.host']);
        // IPv6 has no broadcast: the last address is a host.
        expect(pool('fd00:250::ffff:ffff:ffff:ffff/64')).toEqual([]);
        // /30 holds the server and one client; a /127 holds only the server.
        expect(pool('10.250.0.1/30')).toEqual([]);
        expect(pool('fd00:250::1/127')).toEqual(['address.empty']);
        // An IPv4 address dressed as IPv6 is refused outright.
        expect(pool('::ffff:10.250.0.1/120')).toEqual(['address.invalid']);
    });

    it('takes an mtu of 0 or 1280-65535 (:99-101)', () => {
        const mtu = (value: unknown) => kinds(inbound({ settings: { clients: [], address: ['10.250.0.1/24'], mtu: value } }), 'inbound');
        expect(mtu(undefined)).toEqual([]);
        expect(mtu(0)).toEqual([]);
        expect(mtu(1280)).toEqual([]);
        expect(mtu(65535)).toEqual([]);
        expect(mtu(1279)).toEqual(['mtu']);
        expect(mtu(65536)).toEqual(['mtu']);
        expect(mtu(-1)).toEqual(['type']);
        expect(mtu(1500.5)).toEqual(['type']);
        expect(mtu('1500')).toEqual(['type']);
    });

    it('listens on an address, not a name (transport/internet/masque/hub.go:54-56)', () => {
        expect(kinds(inbound({ listen: '0.0.0.0' }), 'inbound')).toEqual([]);
        expect(kinds(inbound({ listen: '::' }), 'inbound')).toEqual([]);
        expect(kinds(inbound({ listen: '' }), 'inbound')).toEqual([]);
        expect(kinds(inbound({ listen: 'example.com' }), 'inbound')).toEqual(['listen']);
        expect(kinds(inbound({ listen: '/tmp/masque.sock' }), 'inbound')).toEqual(['listen']);
    });
});

describe('masqueSettings.path, host, user and headers', () => {
    it('takes the two variables, in the forms the core replaces', () => {
        for (const path of ['/', '/.well-known/masque/ip/*/*/', '/ip/{target}/{ipproto}/', '/ip{?target,ipproto}', '/ip{?ipproto,target}', '/ip?x=1{&target,ipproto}', '/ip?x=1{&ipproto,target}']) {
            expect(masquePathProblem(path)).toBe(false);
            expect(settingsKinds({ path })).toEqual([]);
        }
    });

    it('refuses a path with no slash, an unknown variable or a stray brace (transport_method.go:850)', () => {
        for (const path of ['ip/', '{target}', '/{other}/', '/a{', '/a}b', '/{target,ipproto}']) {
            expect(masquePathProblem(path)).toBe(true);
        }
        expect(settingsKinds({ path: 'ip/' })).toEqual(['path']);
        expect(settingsKinds({ path: '' })).toEqual([]);
    });

    it('takes a host with an optional port and nothing that makes it a URL (:853-857)', () => {
        for (const host of ['example.com', 'example.com:8443', '1.2.3.4', '[2001:db8::1]:443', 'xn--bcher-kva.example', 'a-b.c_d.example', 'example.com:']) {
            expect(masqueHostProblem(host)).toBe(false);
        }
        for (const host of ['example.com/x', 'example.com?x', 'example.com#x', 'user@example.com', 'ex ample.com', 'example.com:abc', 'ex\\ample.com', 'a\u0000b']) {
            expect(masqueHostProblem(host)).toBe(true);
        }
        expect(settingsKinds({ host: 'example.com/x' })).toEqual(['host']);
    });

    it('refuses headers HTTP would not carry, and the three it keeps for itself (:858-868)', () => {
        expect(settingsKinds({ headers: { 'User-Agent': 'chrome', 'X-Thing': 'a b\tc' } })).toEqual([]);
        expect(settingsKinds({ headers: { 'Bad Name': 'x' } })).toEqual(['headers']);
        expect(settingsKinds({ headers: { '': 'x' } })).toEqual(['headers']);
        expect(settingsKinds({ headers: { 'X-A': 'line\nbreak' } })).toEqual(['headers']);
        expect(settingsKinds({ headers: { Host: 'x' } })).toEqual(['headers.reserved']);
        expect(settingsKinds({ headers: { hOsT: 'x' } })).toEqual(['headers.reserved']);
        expect(settingsKinds({ headers: { 'Capsule-Protocol': '?1' } })).toEqual(['headers.reserved']);
        // Authorization is the user and pass's, so it is refused only beside them.
        expect(settingsKinds({ headers: { Authorization: 'Bearer x' } })).toEqual([]);
        expect(settingsKinds({ user: 'a', headers: { Authorization: 'Bearer x' } })).toEqual(['headers.authorization']);
        expect(settingsKinds({ pass: 'b', headers: { authorization: 'Bearer x' } })).toEqual(['headers.authorization']);
    });

    it('takes a null header value, which Go decodes as an empty string', () => {
        expect(settingsKinds({ headers: { 'X-Empty': null } })).toEqual([]);
        expect(settingsKinds({ headers: { 'X-Num': 5 } })).toEqual(['type']);
    });

    it('keeps a colon out of the user name (:872-874)', () => {
        expect(settingsKinds({ user: 'a:b', pass: 'p' })).toEqual(['user']);
        expect(settingsKinds({ user: 'ab', pass: 'a:b' })).toEqual([]);
        expect(settingsKinds({ pass: 'a:b' })).toEqual([]);
    });

    it('wants the right JSON type everywhere, since a wrong one fails the whole document', () => {
        expect(settingsKinds('text')).toEqual(['type']);
        expect(settingsKinds([])).toEqual(['type']);
        expect(settingsKinds({ host: 5, path: true, user: [], pass: {} })).toEqual(['type', 'type', 'type', 'type']);
        expect(settingsKinds({ headers: [] })).toEqual(['type']);
        expect(settingsKinds({ headers: { 'X-A': 1 } })).toEqual(['type']);
        expect(settingsKinds({ warp: 'cloudflare' })).toEqual(['type']);
    });

    it('is not asked about a key that is null, which the decoder leaves unset', () => {
        expect(settingsKinds(null)).toEqual([]);
        expect(settingsKinds({ host: null, headers: null, warp: null })).toEqual([]);
    });
});

describe('masqueSettings.warp', () => {
    const warp = (over: Record<string, unknown> = {}) => ({ ...keyPair(), address: ['172.16.0.2/32', '2606:4700:110:8a36::2/128'], ...over });

    it('takes the identity WARP issued: both keys and the device addresses', () => {
        expect(settingsKinds({ warp: warp() })).toEqual([]);
        // Keys may also be base64, and a private key may be SEC 1.
        const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
        const sec1 = (privateKey.export({ type: 'sec1', format: 'der' }) as Buffer).toString('base64');
        expect(settingsKinds({ warp: warp({ privateKey: sec1 }) })).toEqual([]);
    });

    it('is refused beside user or pass (transport_method.go:818-820)', () => {
        const found = masqueSettingsProblems({ user: 'a', pass: 'b', warp: warp() }, 'streamSettings.masqueSettings', '26.10');
        expect(found.map(problem => problem.field)).toEqual([
            'streamSettings.masqueSettings.user',
            'streamSettings.masqueSettings.pass',
        ]);
        expect(settingsKinds({ pass: 'b', warp: warp() })).toEqual(['warp.credentials']);
    });

    it('needs both keys, and says what is wrong with each (:821-830, :914-957)', () => {
        expect(settingsKinds({ warp: {} })).toEqual(['warp.privateKey', 'warp.publicKey', 'warp.address']);
        const good = warp();
        const reason = (over: Record<string, unknown>, key: 'privateKey' | 'publicKey') =>
            masqueSettingsProblems({ warp: { ...good, ...over } }, 'm', '26.10').find(problem => problem.kind === `warp.${key}`)?.message;
        expect(reason({ privateKey: 'not a key!' }, 'privateKey')).toContain('PEM');
        expect(reason({ privateKey: good.publicKey }, 'privateKey')).toContain('PKCS #8');
        expect(reason({ publicKey: good.privateKey }, 'publicKey')).toContain('PKIX');
        const other = generateKeyPairSync('ec', { namedCurve: 'secp384r1' }).privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
        expect(reason({ privateKey: other }, 'privateKey')).toContain('P-256');
        expect(reason({ privateKey: '   ' }, 'privateKey')).toContain('empty');
        expect(settingsKinds({ warp: { ...good, privateKey: 5 } })).toEqual(['type']);
    });

    it('takes at most one IPv4 and one IPv6 address, bare or as a prefix (:889-912)', () => {
        expect(settingsKinds({ warp: warp({ address: ['172.16.0.2'] }) })).toEqual([]);
        expect(settingsKinds({ warp: warp({ address: ['172.16.0.2/32', '2606:4700:110::2'] }) })).toEqual([]);
        expect(settingsKinds({ warp: warp({ address: [] }) })).toEqual(['warp.address']);
        expect(settingsKinds({ warp: warp({ address: undefined }) })).toEqual(['warp.address']);
        expect(settingsKinds({ warp: warp({ address: ['172.16.0.2', '172.16.0.3/32'] }) })).toEqual(['warp.address.families']);
        expect(settingsKinds({ warp: warp({ address: ['::1', 'fd00::2/64'] }) })).toEqual(['warp.address.families']);
        expect(settingsKinds({ warp: warp({ address: ['nonsense'] }) })).toEqual(['warp.address.invalid']);
        expect(settingsKinds({ warp: warp({ address: '172.16.0.2' }) })).toEqual(['type']);
    });

    it('is reached from a masque proxy, with the field named from the proxy down', () => {
        const item = { ...outbound(), streamSettings: { network: 'masque', security: 'tls', masqueSettings: { warp: {} } } };
        const found = masqueProblems(item, 'outbound', '26.10');
        expect(found.map(problem => problem.field)).toEqual([
            'streamSettings.masqueSettings.warp.privateKey',
            'streamSettings.masqueSettings.warp.publicKey',
            'streamSettings.masqueSettings.warp.address',
        ]);
    });
});

describe('a leftover masqueSettings', () => {
    it('is built whatever the network says, so a wrong one stops the load (transport_internet.go:201-210)', () => {
        const item = { protocol: 'vless', settings: {}, streamSettings: { network: 'ws', masqueSettings: { path: 'no-slash' } } };
        expect(kinds(item, 'outbound')).toEqual(['path']);
        expect(kinds({ ...item, streamSettings: { network: 'ws', masqueSettings: { path: '/ok' } } }, 'outbound')).toEqual([]);
    });
});

describe('IP literals', () => {
    it('are what netip.ParseAddr takes', () => {
        for (const ok of ['1.1.1.1', '::1', '2606:4700:4700::1111', 'fe80::1%eth0', '::ffff:1.2.3.4']) expect(isIpLiteral(ok)).toBe(true);
        for (const bad of ['', 'localhost', '1.1.1', '1.1.1.256', '01.1.1.1', '1.1.1.1:53', '[::1]', '1.1.1.1/24', ' 1.1.1.1']) expect(isIpLiteral(bad)).toBe(false);
    });
});

describe('what the version table says about it', () => {
    it('registers the protocol, the transport and its keys on v26.9.30 and 26.10, and nowhere before', () => {
        for (const version of ['26.3', '26.7', '26.9'] as const) {
            expect(featureStatus(version, 'outbound.protocol.masque')).toBe('rejected');
            expect(featureStatus(version, 'inbound.protocol.masque')).toBe('rejected');
            expect(allowedValues(version, 'stream.network')).not.toContain('masque');
            expect(allowedValues(version, `inbound.stream.network`)).not.toContain('masque');
            for (const key of ['', '.host', '.path', '.user', '.pass', '.headers', '.warp', '.warp.privateKey', '.warp.publicKey', '.warp.address']) {
                expect(featureStatusAt(version, { scope: 'outbound', path: `streamSettings.masqueSettings${key}` })).toBe('absent');
                expect(featureStatusAt(version, { scope: 'inbound', path: `streamSettings.masqueSettings${key}` })).toBe('absent');
            }
        }
        for (const version of ['26.9.30', '26.10'] as const) {
            expect(featureStatus(version, 'outbound.protocol.masque')).toBe('accepted');
            expect(featureStatus(version, 'inbound.protocol.masque')).toBe('accepted');
            expect(allowedValues(version, 'stream.network')).toContain('masque');
            expect(allowedValues(version, 'inbound.stream.network')).toContain('masque');
            for (const key of ['', '.host', '.path', '.user', '.pass', '.headers']) {
                expect(featureStatusAt(version, { scope: 'outbound', path: `streamSettings.masqueSettings${key}` })).toBe('accepted');
                expect(featureStatusAt(version, { scope: 'inbound', path: `streamSettings.masqueSettings${key}` })).toBe('accepted');
            }
        }
        for (const key of ['.warp', '.warp.privateKey', '.warp.publicKey', '.warp.address']) {
            expect(featureStatusAt('26.10', { scope: 'outbound', path: `streamSettings.masqueSettings${key}` })).toBe('accepted');
        }
    });

    it('has no WARP on v26.9.30: MasqueConfig has no warp field, so the key is dropped', () => {
        // v26.9.30:infra/conf/transport_method.go:793-799 — host, path, user, pass, headers.
        for (const key of ['.warp', '.warp.privateKey', '.warp.publicKey', '.warp.address']) {
            expect(featureStatusAt('26.9.30', { scope: 'outbound', path: `streamSettings.masqueSettings${key}` })).toBe('absent');
            expect(featureStatusAt('26.9.30', { scope: 'inbound', path: `streamSettings.masqueSettings${key}` })).toBe('absent');
        }
        const item = { ...outbound(), streamSettings: { network: 'masque', security: 'tls', masqueSettings: { host: 'h.example', warp: { ...keyPair(), address: ['172.16.0.2/32'] } } } };
        const found = versionDiagnostics({ outbounds: [item] }, '26.9.30').filter(d => d.severity !== 'info');
        expect(found.map(d => `${d.severity} ${d.field}`)).toEqual(['warning streamSettings.masqueSettings.warp']);
        // Nothing masque.ts says about warp holds there: a wrong block is dropped before Build() looks.
        const wrong = { ...item, streamSettings: { network: 'masque', security: 'tls', masqueSettings: { user: 'a', pass: 'b', warp: {} } } };
        expect(masqueProblems(wrong, 'outbound', '26.9.30')).toEqual([]);
        expect(masqueProblems(wrong, 'outbound', '26.10').map(problem => problem.kind)).toEqual(['warp.credentials', 'warp.credentials', 'warp.privateKey', 'warp.publicKey', 'warp.address']);
    });

    it('holds the rest of the rules on v26.9.30 as on 26.10', () => {
        // The pairing (xray.go:209-211 and :351-353), TLS and the transport (proxy/masque), mux: the same files.
        const noTls = withStream(outbound(), { security: 'none' });
        const wrongNetwork = withStream(outbound(), { network: 'ws' });
        for (const version of ['26.9.30', '26.10'] as const) {
            expect(masqueProblems(outbound(), 'outbound', version)).toEqual([]);
            expect(masqueProblems(noTls, 'outbound', version).map(problem => problem.kind)).toEqual(['transport.security']);
            expect(masqueProblems(wrongNetwork, 'outbound', version).map(problem => problem.kind)).toEqual(['transport.network']);
            expect(masqueProblems(outbound({ settings: {} }), 'outbound', version).map(problem => problem.kind)).toEqual(['address', 'port']);
            expect(masqueProblems(outbound({ mux: { enabled: true } }), 'outbound', version).map(problem => problem.kind)).toEqual(['mux']);
            expect(masqueSettingsProblems({ path: 'no-slash', headers: { Host: 'x' } }, 'm', version).map(problem => problem.kind)).toEqual(['path', 'headers.reserved']);
        }
    });

    it('reports a whole masque config once on a line that does not know it, not once per key', () => {
        const config = {
            outbounds: [{
                ...outbound(),
                streamSettings: {
                    network: 'masque',
                    security: 'tls',
                    masqueSettings: { host: 'h.example', path: '/', headers: { A: 'b' }, warp: { privateKey: 'x', publicKey: 'y', address: ['1.1.1.1'] } },
                },
            }],
        };
        const found = versionDiagnostics(config, '26.7').map(d => `${d.severity} ${d.field}`);
        expect(found).toContain('critical protocol');
        expect(found).toContain('critical streamSettings.network');
        expect(found.filter(entry => entry.includes('masqueSettings'))).toEqual(['warning streamSettings.masqueSettings']);
        expect(versionDiagnostics(config, '26.10').filter(d => d.severity === 'critical' && d.field?.includes('masqueSettings'))).not.toEqual([]);
    });

    it('lets a good config through on 26.10 with nothing to say', () => {
        const keys = keyPair();
        const config = {
            inbounds: [inbound()],
            outbounds: [{
                ...outbound(),
                streamSettings: {
                    network: 'masque',
                    security: 'tls',
                    masqueSettings: { warp: { ...keys, address: ['172.16.0.2/32'] } },
                },
            }],
        };
        const critical = versionDiagnostics(config, '26.10').filter(d => d.severity !== 'info');
        expect(critical).toEqual([]);
    });

    it('is part of the full diagnostics, as critical', () => {
        const config = { inbounds: [inbound({ settings: { clients: [], address: ['10.250.0.0/24'] } })], outbounds: [outbound({ settings: {} })] };
        const found = runFullDiagnostics(config as any, [], '26.10')
            .filter(d => d.severity === 'critical')
            .map(d => `${d.section} ${d.field}`);
        expect(found).toContain('inbounds settings.address');
        expect(found).toContain('outbounds settings.address');
        expect(found).toContain('outbounds settings.port');
        // Without a line to check against, nothing version-specific is said.
        expect(runFullDiagnostics(config as any, []).filter(d => d.field === 'settings.port')).toEqual([]);
    });

    it('is built right by the factory on the line that offers it', () => {
        expect(masqueProblems(createDefaultInbound('masque'), 'inbound', '26.10')).toEqual([]);
        expect(masqueProblems(createDefaultOutbound('masque'), 'outbound', '26.10')).toEqual([]);
    });
});
