import { describe, expect, it } from 'bun:test';
import {
    CLIENT_ONLY_KEYS,
    isWireguardInbound,
    nextPeerAllowedIP,
    outboundReadsClientKey,
    serverReadsPeerEndpoint,
    wireguardInboundProblems,
} from './wireguard-inbound';
import { generateWireguardKeyPair, generateWireguardPresharedKey } from '../generators/crypto';
import { createDefaultInbound } from '../generators/endpoint-factory';
import { runFullDiagnostics } from '../diagnostics';
import { inboundSettingsSchemaFor } from './schemas/settings-by-protocol';
import { CORE_VERSIONS, type CoreVersionId } from './versions';

/**
 * A WireGuard inbound could be chosen in the editor and never made to work:
 * the factory wrote an empty secret key, no field existed to fill it in, and
 * nothing said the core refuses it. These hold the list of what the core
 * refuses to the source it was read from — every expectation below is a
 * branch of infra/conf/wireguard.go or proxy/wireguard on a named tag.
 */

const server = (settings: Record<string, unknown>) => ({ tag: 'wg', protocol: 'wireguard', port: 51820, settings });
const SECRET = generateWireguardKeyPair().secretKey;
const CLIENT = generateWireguardKeyPair().publicKey;

const found = (inbound: unknown, version?: CoreVersionId) =>
    wireguardInboundProblems(inbound, version).map(problem => `${problem.kind} ${problem.field}`);

const LINES = CORE_VERSIONS.map(line => line.id);

describe('the secret key', () => {
    it('is the one thing wrong with what the factory builds, on every line', () => {
        for (const line of [undefined, ...LINES]) {
            expect(found(createDefaultInbound('wireguard'), line)).toEqual(['secretKey.empty settings.secretKey']);
        }
    });

    it('counts as empty when it is missing altogether', () => {
        expect(found(server({}))).toEqual(['secretKey.empty settings.secretKey']);
        expect(found({ protocol: 'wireguard' })).toEqual(['secretKey.empty settings.secretKey']);
    });

    it('leaves nothing to say once it is a key', () => {
        for (const line of [undefined, ...LINES]) {
            expect(found(server({ secretKey: SECRET, peers: [], mtu: 1420 }), line)).toEqual([]);
        }
    });

    it('is accepted in hex, which the core takes as it is', () => {
        expect(found(server({ secretKey: 'ab'.repeat(32) }))).toEqual([]);
    });

    it('tells a key that cannot be decoded from one of the wrong size', () => {
        // Build() fails on the first; the second passes Build() and stops
        // the inbound being created (v26.7.28:proxy/wireguard/server.go:103).
        expect(found(server({ secretKey: 'not a key!' }))).toEqual(['secretKey.invalid settings.secretKey']);
        expect(found(server({ secretKey: 'AAAA' }))).toEqual(['secretKey.length settings.secretKey']);
        expect(wireguardInboundProblems(server({ secretKey: 'AAAA' }))[0]!.message).toContain('3 bytes');
    });
});

describe('a peer', () => {
    const withPeer = (peer: Record<string, unknown>) => server({ secretKey: SECRET, peers: [{ allowedIPs: ['10.0.0.2/32'], ...peer }] });

    it('is fine with a public key and an address of its own', () => {
        for (const line of LINES) {
            expect(found(withPeer({ publicKey: CLIENT, preSharedKey: generateWireguardPresharedKey(), keepAlive: 25 }), line)).toEqual([]);
        }
    });

    it('is nobody without a public key, on every line', () => {
        for (const line of [undefined, ...LINES]) {
            expect(found(withPeer({ publicKey: '' }), line)).toEqual(['publicKey.empty settings.peers[0].publicKey']);
            expect(found(withPeer({}), line)).toEqual(['publicKey.empty settings.peers[0].publicKey']);
        }
    });

    it('says what the chosen line does about a missing public key', () => {
        const message = (line?: CoreVersionId) => wireguardInboundProblems(withPeer({ publicKey: '' }), line)[0]!.message;
        // 26.7 and 26.9 refuse the inbound; 26.3 builds it and sends the
        // peer's settings without the key line.
        expect(message('26.7')).toContain('v26.7.28');
        expect(message('26.7')).toContain('will not load');
        expect(message('26.9')).toContain('will not load');
        expect(message('26.3')).toContain('v26.3.27');
        expect(message('26.3')).not.toContain('will not load');
        expect(message()).not.toContain('Xray v');
    });

    it('names the peer a problem belongs to', () => {
        const problems = wireguardInboundProblems(server({
            secretKey: SECRET,
            peers: [{ publicKey: CLIENT }, { publicKey: 'not a key!' }, { publicKey: CLIENT, preSharedKey: 'AAAA' }],
        }));
        expect(problems.map(problem => [problem.peer, problem.kind])).toEqual([[1, 'publicKey.invalid'], [2, 'preSharedKey.length']]);
        expect(problems[0]!.field).toBe('settings.peers[1].publicKey');
    });

    it('does not ask for a pre-shared key, only for a real one when it is there', () => {
        expect(found(withPeer({ publicKey: CLIENT, preSharedKey: '' }))).toEqual([]);
        expect(found(withPeer({ publicKey: CLIENT, preSharedKey: '***' }))).toEqual(['preSharedKey.invalid settings.peers[0].preSharedKey']);
    });

    it('takes allowed IPs as networks only', () => {
        // netip.ParsePrefix (v26.7.28:proxy/wireguard/config.go:19): a bare
        // address is not a prefix, and the length has to fit the family.
        const allowed = (...list: string[]) => found(server({ secretKey: SECRET, peers: [{ publicKey: CLIENT, allowedIPs: list }] }), '26.7');
        expect(allowed('10.0.0.2/32', 'fd00::2/128', '0.0.0.0/0', '::/0', '::0/0', '192.168.0.0/16')).toEqual([]);
        for (const bad of ['10.0.0.2', 'fd00::2', '10.0.0.2/33', 'fd00::1/129', '10.0.0.2/032', 'home.example/24', '']) {
            expect(allowed(bad)).toEqual(['allowedIPs settings.peers[0].allowedIPs']);
        }
    });

    it('shows how to write a single address', () => {
        const [v4] = wireguardInboundProblems(server({ secretKey: SECRET, peers: [{ publicKey: CLIENT, allowedIPs: ['10.0.0.2'] }] }));
        expect(v4!.suggestion).toContain('10.0.0.2/32');
        const [v6] = wireguardInboundProblems(server({ secretKey: SECRET, peers: [{ publicKey: CLIENT, allowedIPs: ['fd00::2'] }] }));
        expect(v6!.suggestion).toContain('fd00::2/128');
    });

    it('may leave allowed IPs out: the core fills them in', () => {
        expect(found(server({ secretKey: SECRET, peers: [{ publicKey: CLIENT }] }), '26.9')).toEqual([]);
    });
});

describe('the interface address', () => {
    const at = (address: string[], line?: CoreVersionId) => found(server({ secretKey: SECRET, address }), line);

    it('is an address or a single host on every line', () => {
        for (const line of [undefined, ...LINES]) {
            expect(at(['10.0.0.1', 'fd59:7153:2388:b5fd::1'], line)).toEqual([]);
            expect(at(['10.0.0.1/32', 'fd00::1/128'], line)).toEqual([]);
        }
    });

    it('may be a wider prefix from 26.7, and not on 26.3', () => {
        // v26.3.27:proxy/wireguard/wireguard.go:37 — "interface address subnet
        // should be /32 for IPv4 and /128 for IPv6". 26.7 takes prefix.Addr()
        // of any prefix (v26.7.28:proxy/wireguard/server.go:90-93).
        expect(at(['10.0.0.1/24'], '26.3')).toEqual(['address settings.address']);
        expect(at(['fd00::1/64'], '26.3')).toEqual(['address settings.address']);
        expect(at(['10.0.0.1/24', 'fd00::1/64'], '26.7')).toEqual([]);
        expect(at(['10.0.0.1/24', 'fd00::1/64'], '26.9')).toEqual([]);
        // Without a line there is nothing every line refuses about it.
        expect(at(['10.0.0.1/24'])).toEqual([]);
    });

    it('is never a host name', () => {
        for (const line of [undefined, ...LINES]) {
            expect(at(['wg.example.com'], line)).toEqual(['address settings.address']);
        }
    });
});

describe('what only a client uses', () => {
    it('still has to pass Build(): reserved is empty or three bytes', () => {
        const reserved = (value: unknown) => found(server({ secretKey: SECRET, reserved: value }));
        expect(reserved([])).toEqual([]);
        expect(reserved([0, 0, 0])).toEqual([]);
        expect(reserved('AAAA')).toEqual([]); // three bytes, as base64
        expect(reserved([1, 2])).toEqual(['reserved settings.reserved']);
        expect(reserved([1, 2, 3, 4])).toEqual(['reserved settings.reserved']);
        expect(reserved('AAA=')).toEqual(['reserved settings.reserved']); // two bytes
    });

    it('still has to pass Build(): domainStrategy is one of the Force family', () => {
        // A value set rather than a rule, so it arrives through the version table.
        // Only the lines whose struct still has the key: it is gone from
        // v26.9.30 and v26.10.10 (infra/conf/wireguard.go:59-69), where it is dropped, not judged.
        for (const line of LINES.filter(line => line !== '26.9.30' && line !== '26.10')) {
            const bad = runFullDiagnostics({ inbounds: [server({ secretKey: SECRET, domainStrategy: 'AsIs' })] } as any, [], line);
            expect(bad.map(d => `${d.severity} ${d.field}`)).toEqual(['critical settings.domainStrategy']);
            const good = runFullDiagnostics({ inbounds: [server({ secretKey: SECRET, domainStrategy: 'forceipv4' })] } as any, [], line);
            expect(good).toEqual([]);
        }
    });

    it('is dropped, not judged, on v26.9.30 and 26.10: the struct no longer has the key', () => {
        for (const line of ['26.9.30', '26.10'] as const) {
            const config = { inbounds: [server({ secretKey: SECRET, domainStrategy: 'AsIs' })] } as any;
            expect(runFullDiagnostics(config, [], line).map(d => `${d.severity} ${d.field}`)).toEqual(['warning settings.domainStrategy']);
        }
    });

    it('is listed, so the editor can show one a config holds', () => {
        expect([...CLIENT_ONLY_KEYS]).toEqual(['reserved', 'domainStrategy', 'noKernelTun', 'remoteDNS']);
        // None of them is in the inbound's schema: the JSON editor does not suggest them.
        const shape = (inboundSettingsSchemaFor('wireguard') as any).shape;
        for (const key of CLIENT_ONLY_KEYS) expect(key in shape).toBe(false);
        // What a server does read is.
        for (const key of ['secretKey', 'address', 'peers', 'mtu', 'workers']) expect(key in shape).toBe(true);
        expect(Object.keys(shape.peers.unwrap().element.shape).sort())
            .toEqual(['allowedIPs', 'email', 'keepAlive', 'level', 'preSharedKey', 'publicKey']);
    });

    it('includes a peer endpoint from 26.7, where the server keeps nothing of it', () => {
        expect(serverReadsPeerEndpoint('26.3')).toBe(true);
        expect(serverReadsPeerEndpoint('26.7')).toBe(false);
        expect(serverReadsPeerEndpoint('26.9')).toBe(false);
    });
});

describe('which inbounds this is about', () => {
    it('is only WireGuard ones', () => {
        expect(found(createDefaultInbound('vless'))).toEqual([]);
        expect(found(null)).toEqual([]);
        expect(found('wireguard')).toEqual([]);
    });

    it('matches the protocol the way the loader does, without regard to case', () => {
        // v26.7.28:infra/conf/loader.go:46
        expect(isWireguardInbound({ protocol: 'WireGuard' })).toBe(true);
        expect(found({ protocol: 'WireGuard', settings: {} })).toEqual(['secretKey.empty settings.secretKey']);
    });
});

describe('in the diagnostics', () => {
    it('is critical, at the inbound it belongs to, with or without a line', () => {
        const config = { inbounds: [createDefaultInbound('vless'), createDefaultInbound('wireguard')] } as any;
        for (const line of [undefined, ...LINES]) {
            const critical = runFullDiagnostics(config, [], line).filter(d => d.severity === 'critical');
            expect(critical.map(d => [d.section, d.itemIndex, d.field])).toEqual([['inbounds', 1, 'settings.secretKey']]);
            expect(critical[0]!.suggestion).toBeTruthy();
        }
    });

    it('clears once the key is set', () => {
        const inbound = createDefaultInbound('wireguard');
        const keyed = { ...inbound, settings: { ...inbound.settings, secretKey: SECRET } };
        for (const line of LINES) {
            expect(runFullDiagnostics({ inbounds: [keyed] } as any, [], line)).toEqual([]);
        }
    });

    it('reports every peer that cannot be built, not just the first', () => {
        const config = { inbounds: [server({ secretKey: SECRET, peers: [{ publicKey: '' }, { publicKey: CLIENT, allowedIPs: ['10.0.0.3'] }] })] } as any;
        expect(runFullDiagnostics(config, [], '26.7').map(d => `${d.severity} ${d.field}`)).toEqual([
            'critical settings.peers[0].publicKey',
            'critical settings.peers[1].allowedIPs',
        ]);
    });
});

describe('an address for the next peer', () => {
    it('is the first free host beside the interface', () => {
        // No address set: the core's own default, 10.0.0.1.
        expect(nextPeerAllowedIP({})).toBe('10.0.0.2/32');
        expect(nextPeerAllowedIP({ address: ['10.8.0.1/32', 'fd00::1/128'] })).toBe('10.8.0.2/32');
    });

    it('skips the ones peers already have', () => {
        const peers = [{ allowedIPs: ['10.0.0.2/32'] }, { allowedIPs: ['10.0.0.3/32', 'fd00::3/128'] }, {}];
        expect(nextPeerAllowedIP({ peers })).toBe('10.0.0.4/32');
        // A gap is filled before the range is extended.
        expect(nextPeerAllowedIP({ peers: [{ allowedIPs: ['10.0.0.3/32'] }] })).toBe('10.0.0.2/32');
    });

    it('has no guess for an interface with no IPv4, or a full /24', () => {
        expect(nextPeerAllowedIP({ address: ['fd00::1/128'] })).toBeUndefined();
        const full = Array.from({ length: 254 }, (_, i) => ({ allowedIPs: [`10.0.0.${i + 1}/32`] }));
        expect(nextPeerAllowedIP({ peers: full })).toBeUndefined();
    });
});

describe('what an inbound holding a client-only key is told', () => {
    it('names the lines where no WireGuard reads domainStrategy or remoteDNS at all', () => {
        // v26.9.30:infra/conf/wireguard.go:59-69 dropped domainStrategy (v26.10.10 has the same struct);
        // remoteDNS arrived in 26.9 (v26.9.9:proxy/wireguard/client.go:113).
        expect(outboundReadsClientKey('domainStrategy', '26.9')).toBe(true);
        expect(outboundReadsClientKey('domainStrategy', '26.9.30')).toBe(false);
        expect(outboundReadsClientKey('domainStrategy', '26.10')).toBe(false);
        expect(outboundReadsClientKey('remoteDNS', '26.7')).toBe(false);
        expect(outboundReadsClientKey('remoteDNS', '26.9')).toBe(true);
        expect(outboundReadsClientKey('remoteDNS', '26.9.30')).toBe(true);
        expect(outboundReadsClientKey('reserved', '26.3')).toBe(true);
    });
});
