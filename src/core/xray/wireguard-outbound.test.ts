import { describe, expect, it } from 'bun:test';
import { isWarpEndpoint, isWireguardOutbound, wireguardOutboundProblems } from './wireguard-outbound';
import { wireguardInboundProblems } from './wireguard-inbound';
import { generateWireguardKeyPair, generateWireguardPresharedKey } from '../generators/crypto';
import { createDefaultOutbound } from '../generators/endpoint-factory';
import { withoutWarpAccount } from '../generators/warp';
import { WARP_ENDPOINT } from '../presets';
import { runFullDiagnostics } from '../diagnostics';
import { CORE_VERSIONS, type CoreVersionId } from './versions';

/**
 * A WireGuard outbound could be made here that no core runs: the factory
 * writes an empty secret key and a peer with an empty public key and
 * endpoint, a WARP profile starts keyless, and nothing but the form on save
 * said so. Every expectation below is a branch of infra/conf/wireguard.go or
 * proxy/wireguard on a named tag — the sources are cited where the list is
 * kept, in wireguard-outbound.ts.
 */

const SECRET = generateWireguardKeyPair().secretKey;
const SERVER = generateWireguardKeyPair().publicKey;
const LINES = CORE_VERSIONS.map(line => line.id);

const wg = (settings: Record<string, unknown>) => ({ tag: 'wg', protocol: 'wireguard', settings });
const complete = (patch: Record<string, unknown> = {}, peer: Record<string, unknown> = {}) => wg({
    secretKey: SECRET,
    address: ['10.0.0.2/32'],
    peers: [{ publicKey: SERVER, endpoint: 'vpn.example.com:51820', ...peer }],
    ...patch,
});

const found = (outbound: unknown, version?: CoreVersionId) =>
    wireguardOutboundProblems(outbound, version).map(problem => `${problem.kind} ${problem.field}`);

describe('what the factory builds', () => {
    it('is incomplete on purpose, and says so on every line', () => {
        for (const line of [undefined, ...LINES]) {
            expect(found(createDefaultOutbound('wireguard'), line)).toEqual([
                'secretKey.empty settings.secretKey',
                'publicKey.empty settings.peers[0].publicKey',
                'endpoint.empty settings.peers[0].endpoint',
            ]);
        }
    });

    it('has an interface address every line takes', () => {
        // /24 is what the form used to suggest; 26.3 refuses it.
        const address = (createDefaultOutbound('wireguard').settings as any).address;
        for (const line of LINES) expect(found(wg({ address }), line)).not.toContain('address settings.address');
    });

    it('is fine once the key, the peer key and the endpoint are in', () => {
        for (const line of [undefined, ...LINES]) expect(found(complete(), line)).toEqual([]);
    });
});

describe('the secret key', () => {
    it('is empty or missing: refused by Build() on every line', () => {
        for (const line of [undefined, ...LINES]) {
            expect(found(complete({ secretKey: '' }), line)).toEqual(['secretKey.empty settings.secretKey']);
            expect(found(complete({ secretKey: undefined }), line)).toEqual(['secretKey.empty settings.secretKey']);
        }
        expect(found({ protocol: 'wireguard' })).toContain('secretKey.empty settings.secretKey');
    });

    it('tells a key that cannot be decoded from one of the wrong size', () => {
        expect(found(complete({ secretKey: 'not a key!' }))).toEqual(['secretKey.invalid settings.secretKey']);
        expect(found(complete({ secretKey: 'AAAA' }))).toEqual(['secretKey.length settings.secretKey']);
        // The tunnel is built on the first connection, not when the config loads.
        expect(wireguardOutboundProblems(complete({ secretKey: 'AAAA' }))[0]!.message).toContain('every connection');
    });

    it('is taken in hex as well, which the core takes as it is', () => {
        expect(found(complete({ secretKey: 'ab'.repeat(32) }))).toEqual([]);
    });

    it('points at Generate WARP when the peer is Cloudflare, and not otherwise', () => {
        const warp = complete({ secretKey: '' }, { endpoint: WARP_ENDPOINT });
        const other = complete({ secretKey: '' });
        for (const line of [undefined, ...LINES]) {
            expect(wireguardOutboundProblems(warp, line)[0]!.suggestion).toContain('Generate WARP');
            expect(wireguardOutboundProblems(other, line)[0]!.suggestion).not.toContain('Generate WARP');
        }
    });

    it('is flagged on a WARP profile added before its registration, with the button to fix it', () => {
        // generators/warp.ts withoutWarpAccount: no key and no peer key,
        // deliberately, with Cloudflare's endpoint in place.
        const profile = wg(withoutWarpAccount({ address: ['172.16.0.2/32'], mtu: 1280 }));
        const problems = wireguardOutboundProblems(profile, '26.7');
        expect(problems.map(problem => problem.kind)).toEqual(['secretKey.empty', 'publicKey.empty']);
        for (const problem of problems) expect(problem.suggestion).toContain('Generate WARP');
    });
});

describe('the peers', () => {
    it('are required: 26.7 and 26.9 refuse none, 26.3 starts it with nothing to send through', () => {
        const message = (line?: CoreVersionId) => wireguardOutboundProblems(complete({ peers: [] }), line)[0]!.message;
        for (const line of [undefined, ...LINES]) {
            expect(found(complete({ peers: [] }), line)).toEqual(['peers.none settings.peers']);
            expect(found(wg({ secretKey: SECRET }), line)).toEqual(['peers.none settings.peers']);
        }
        expect(message('26.7')).toContain('will not load');
        expect(message('26.9')).toContain('will not load');
        expect(message('26.3')).not.toContain('will not load');
        expect(message('26.3')).toContain('v26.3.27');
    });

    it('need a public key, and the line decides how it is said', () => {
        const peer = { publicKey: '' };
        const message = (line?: CoreVersionId) => wireguardOutboundProblems(complete({}, peer), line)[0]!.message;
        for (const line of [undefined, ...LINES]) {
            expect(found(complete({}, peer), line)).toEqual(['publicKey.empty settings.peers[0].publicKey']);
        }
        expect(message('26.7')).toContain('will not load');
        expect(message('26.9')).toContain('will not load');
        expect(message('26.3')).not.toContain('will not load');
        expect(message()).not.toContain('Xray v');
    });

    it('need an endpoint, and the line decides how it is said', () => {
        const peer = { endpoint: '' };
        const message = (line?: CoreVersionId) => wireguardOutboundProblems(complete({}, peer), line)[0]!.message;
        for (const line of [undefined, ...LINES]) {
            expect(found(complete({}, peer), line)).toEqual(['endpoint.empty settings.peers[0].endpoint']);
        }
        expect(message('26.7')).toContain('will not load');
        expect(message('26.3')).not.toContain('will not load');
    });

    it('need an endpoint that is host:port', () => {
        const at = (endpoint: unknown) => found(complete({}, { endpoint }));
        for (const good of ['vpn.example.com:51820', '162.159.192.1:2408', '[2606:4700:d0::a29f:c001]:2408', 'engage.cloudflareclient.com:2408']) {
            expect(at(good)).toEqual([]);
        }
        for (const bad of ['vpn.example.com', 'vpn.example.com:', 'vpn.example.com:port', 'vpn.example.com:70000', '2606:4700:d0::a29f:c001:2408', ':2408', 'a b:80', 12345]) {
            expect(at(bad)).toEqual(['endpoint.form settings.peers[0].endpoint']);
        }
    });

    it('name which peer a problem belongs to', () => {
        const problems = wireguardOutboundProblems(complete({
            peers: [
                { publicKey: SERVER, endpoint: 'a.example.com:1' },
                { publicKey: 'not a key!', endpoint: 'b.example.com:1' },
                { publicKey: SERVER, endpoint: 'c.example.com:1', preSharedKey: 'AAAA' },
            ],
        }));
        expect(problems.map(problem => [problem.peer, problem.kind])).toEqual([[1, 'publicKey.invalid'], [2, 'preSharedKey.length']]);
        expect(problems[0]!.field).toBe('settings.peers[1].publicKey');
    });

    it('do not need a pre-shared key, only a real one when it is there', () => {
        expect(found(complete({}, { preSharedKey: '' }))).toEqual([]);
        expect(found(complete({}, { preSharedKey: generateWireguardPresharedKey() }))).toEqual([]);
        expect(found(complete({}, { preSharedKey: '***' }))).toEqual(['preSharedKey.invalid settings.peers[0].preSharedKey']);
    });

    it('take allowed IPs as networks only, and may leave them out', () => {
        const allowed = (...list: string[]) => found(complete({}, { allowedIPs: list }));
        expect(allowed('0.0.0.0/0', '::/0', '10.0.0.0/8', 'fd00::2/128')).toEqual([]);
        for (const bad of ['10.0.0.2', 'fd00::2', '10.0.0.2/33', 'home.example/24', '']) {
            expect(allowed(bad)).toEqual(['allowedIPs settings.peers[0].allowedIPs']);
        }
        expect(found(complete())).toEqual([]);
    });

    it('show how to write a single address as a network', () => {
        const [problem] = wireguardOutboundProblems(complete({}, { allowedIPs: ['10.0.0.2'] }));
        expect(problem!.suggestion).toContain('10.0.0.2/32');
    });

    it('mention Generate WARP for a Cloudflare peer without a key, and not for another', () => {
        const warp = wireguardOutboundProblems(complete({}, { endpoint: 'engage.cloudflareclient.com:2408', publicKey: '' }));
        expect(warp.find(problem => problem.kind === 'publicKey.empty')!.suggestion).toContain('Generate WARP');
        const other = wireguardOutboundProblems(complete({}, { publicKey: '' }));
        expect(other.find(problem => problem.kind === 'publicKey.empty')!.suggestion).not.toContain('Generate WARP');
    });
});

describe('the interface address', () => {
    const at = (address: unknown[], line?: CoreVersionId) => found(complete({ address }), line);

    it('is an address or a single host on every line', () => {
        for (const line of [undefined, ...LINES]) {
            expect(at(['172.16.0.2', '2606:4700:110:8a36::2'], line)).toEqual([]);
            expect(at(['172.16.0.2/32', '2606:4700:110:8a36::2/128'], line)).toEqual([]);
        }
    });

    it('may be a wider prefix from 26.7, and not on 26.3', () => {
        // v26.3.27:proxy/wireguard/client.go:64 -> wireguard.go:37-39 for a
        // client too; v26.7.28:proxy/wireguard/client.go:86-99 takes any prefix.
        expect(at(['10.0.0.1/24'], '26.3')).toEqual(['address settings.address']);
        expect(at(['fd00::1/64'], '26.3')).toEqual(['address settings.address']);
        expect(at(['10.0.0.1/24', 'fd00::1/64'], '26.7')).toEqual([]);
        expect(at(['10.0.0.1/24', 'fd00::1/64'], '26.9')).toEqual([]);
        expect(at(['10.0.0.1/24'])).toEqual([]);
    });

    it('offers the single host a refused prefix should have been', () => {
        const [problem] = wireguardOutboundProblems(complete({ address: ['10.0.0.7/24'] }), '26.3');
        expect(problem!.suggestion).toContain('10.0.0.7/32');
        const [v6] = wireguardOutboundProblems(complete({ address: ['fd00::7/64'] }), '26.3');
        expect(v6!.suggestion).toContain('fd00::7/128');
    });

    it('is never a host name', () => {
        for (const line of [undefined, ...LINES]) expect(at(['wg.example.com'], line)).toEqual(['address settings.address']);
    });

    it('is judged exactly as an inbound judges it', () => {
        // One rule, two readers: the same list gives the same verdict, line by line.
        const lists = [['10.0.0.1'], ['10.0.0.1/24'], ['fd00::1/64'], ['10.0.0.1/32', 'x'], ['10.0.0.1/33']];
        for (const line of [undefined, ...LINES]) {
            for (const address of lists) {
                const inbound = { protocol: 'wireguard', settings: { secretKey: SECRET, address } };
                const outbound = complete({ address });
                const kinds = (problems: { kind: string }[]) => problems.filter(problem => problem.kind === 'address').length;
                expect(kinds(wireguardOutboundProblems(outbound, line))).toBe(kinds(wireguardInboundProblems(inbound, line)));
            }
        }
    });
});

describe('reserved', () => {
    const reserved = (value: unknown) => found(complete({ reserved: value }));

    it('is empty or three bytes, as an inbound is held to', () => {
        expect(reserved([])).toEqual([]);
        expect(reserved([0, 0, 0])).toEqual([]);
        expect(reserved([83, 12, 255])).toEqual([]);
        expect(reserved('AAAA')).toEqual([]);
        expect(reserved([1, 2])).toEqual(['reserved settings.reserved']);
        expect(reserved([1, 2, 3, 4])).toEqual(['reserved settings.reserved']);
        expect(reserved('AAA=')).toEqual(['reserved settings.reserved']);
    });

    it('holds bytes: a list entry past 255, or a fraction, cannot be decoded at all', () => {
        for (const bad of [[0, 0, 256], [0, 0, -1], [0, 0, 1.5], [0, 0, '0'], [999, 0, 0]]) {
            expect(reserved(bad)).toEqual(['reserved settings.reserved']);
        }
        expect(wireguardOutboundProblems(complete({ reserved: [0, 0, 256] }))[0]!.message).toContain('not a byte');
    });
});

describe('remoteDNS', () => {
    const dns = (list: unknown[], line?: CoreVersionId) => found(complete({ remoteDNS: list }), line);

    it('is not read before 26.9, so there is nothing to refuse there', () => {
        expect(dns(['dns.example.com'], '26.3')).toEqual([]);
        expect(dns(['dns.example.com'], '26.7')).toEqual([]);
        expect(dns(['dns.example.com'])).toEqual([]);
    });

    it('is parsed as IP addresses from 26.9, where anything else panics the core at start', () => {
        // v26.9.9:proxy/wireguard/client.go:121-124, v26.10.10:proxy/wireguard/client.go:105-108
        expect(dns(['1.1.1.1', '2606:4700:4700::1111'], '26.9')).toEqual([]);
        expect(dns(['dns.example.com'], '26.9')).toEqual(['remoteDNS settings.remoteDNS']);
        expect(dns(['1.1.1.1', ''], '26.9')).toEqual(['remoteDNS settings.remoteDNS']);
        for (const line of ['26.9.30', '26.10'] as const) {
            expect(dns(['1.1.1.1', 'dns.example.com'], line)).toEqual(['remoteDNS settings.remoteDNS']);
            expect(dns(['1.1.1.1', '2606:4700:4700::1111'], line)).toEqual([]);
        }
    });

    it('may be the one entry "local" on v26.9.9 only', () => {
        // v26.9.9:proxy/wireguard/client.go:117-120; gone in v26.9.30, whose client.go is v26.10.10's.
        expect(dns(['local'], '26.9')).toEqual([]);
        expect(dns(['local', '1.1.1.1'], '26.9')).toEqual(['remoteDNS settings.remoteDNS']);
        expect(dns(['local'], '26.9.30')).toEqual(['remoteDNS settings.remoteDNS']);
        expect(dns(['local'], '26.10')).toEqual(['remoteDNS settings.remoteDNS']);
    });
});

describe('which outbounds this is about', () => {
    it('is only WireGuard ones', () => {
        expect(found(createDefaultOutbound('vless'))).toEqual([]);
        expect(found(null)).toEqual([]);
        expect(found('wireguard')).toEqual([]);
    });

    it('matches the protocol the way the loader does, without regard to case', () => {
        // v26.7.28:infra/conf/loader.go:46
        expect(isWireguardOutbound({ protocol: 'WireGuard' })).toBe(true);
        expect(found({ protocol: 'WireGuard', settings: {} })).toContain('secretKey.empty settings.secretKey');
    });

    it('does not mind a peer that is not an object, which the type check will say', () => {
        expect(() => found(complete({ peers: [null, 'x'] }))).not.toThrow();
    });
});

describe('which endpoints are Cloudflare WARP', () => {
    it('knows the name registration hands back, and the addresses it also gives', () => {
        for (const yes of [WARP_ENDPOINT, 'ENGAGE.CLOUDFLARECLIENT.COM:2408', '162.159.192.1:2408', '188.114.97.1:2408', '[2606:4700:d0::a29f:c001]:2408', 'cloudflareclient.com']) {
            expect(isWarpEndpoint(yes)).toBe(true);
        }
        for (const no of ['vpn.example.com:51820', '1.1.1.1:2408', '', undefined, 5]) {
            expect(isWarpEndpoint(no)).toBe(false);
        }
    });
});

describe('in the diagnostics', () => {
    const critical = (outbounds: unknown[], line?: CoreVersionId) =>
        runFullDiagnostics({ outbounds } as any, [], line)
            .filter(d => d.severity === 'critical')
            .map(d => [d.section, d.itemIndex, d.field]);

    it('blocks what the factory builds, at the outbound it belongs to, with or without a line', () => {
        for (const line of [undefined, ...LINES]) {
            expect(critical([createDefaultOutbound('vless'), createDefaultOutbound('wireguard')], line)).toEqual([
                ['outbounds', 1, 'settings.secretKey'],
                ['outbounds', 1, 'settings.peers[0].publicKey'],
                ['outbounds', 1, 'settings.peers[0].endpoint'],
            ]);
        }
    });

    it('carries the suggestion', () => {
        const [first] = runFullDiagnostics({ outbounds: [createDefaultOutbound('wireguard')] } as any, [], '26.7');
        expect(first!.suggestion).toBeTruthy();
    });

    it('clears once the outbound is complete', () => {
        for (const line of LINES) expect(critical([complete()], line)).toEqual([]);
    });

    it('reports a prefix 26.3 refuses as critical on 26.3 and not on the others', () => {
        const outbound = complete({ address: ['10.0.0.2/24'] });
        expect(critical([outbound], '26.3')).toEqual([['outbounds', 0, 'settings.address']]);
        expect(critical([outbound], '26.7')).toEqual([]);
        expect(critical([outbound], '26.9')).toEqual([]);
    });

    it('catches a domainStrategy the core refuses, through the version table, and not twice', () => {
        for (const line of ['26.3', '26.7', '26.9'] as const) {
            const found = runFullDiagnostics({ outbounds: [complete({ domainStrategy: 'AsIs' })] } as any, [], line)
                .filter(d => d.severity === 'critical' && d.field === 'settings.domainStrategy');
            expect(found).toHaveLength(1);
        }
    });
});
