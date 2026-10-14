import { describe, expect, it } from 'bun:test';
import {
    createEndpoint,
    createDefaultInbound,
    createDefaultOutbound,
    protocolsFor,
    supportsProtocol,
    bidirectionalProtocols,
    normalizeInbound,
    spellingConflicts,
    adoptAlias,
    dropAlias,
} from './endpoint-factory';
import { CORE_VERSIONS } from '../xray/versions';
import { versionDiagnostics } from '../xray/versions/check';
import { protocolsFor as offeredProtocols } from '../xray/versions/protocols';
import { masqueProblems } from '../xray/masque';

describe('createEndpoint', () => {
    it('builds an inbound that listens and an outbound that dials', () => {
        const inbound = createEndpoint('inbound', 'vless');
        const outbound = createEndpoint('outbound', 'vless');

        expect(inbound.tag).toMatch(/^in-\d+$/);
        expect(inbound.port).toBe(10808);
        expect(inbound.sniffing?.enabled).toBe(true);

        expect(outbound.tag).toMatch(/^out-\d+$/);
        // An outbound has no listen port of its own; the port belongs to the
        // server it dials, inside settings.
        expect((outbound as any).port).toBeUndefined();
        expect((outbound as any).settings.vnext[0].port).toBe(443);
    });

    it('uses the documented spellings on each side', () => {
        // `clients` on a server, `vnext` on a client — what the core documents
        // and what the schemas now declare.
        expect((createDefaultInbound('vless').settings as any).clients).toHaveLength(1);
        expect((createDefaultOutbound('vless').settings as any).vnext).toHaveLength(1);
        expect((createDefaultInbound('trojan').settings as any).clients).toHaveLength(1);
        expect((createDefaultOutbound('trojan').settings as any).servers).toHaveLength(1);
    });

    it('carries one identity across both sides', () => {
        // Building a client for a server is the whole reason the two live in
        // one factory: the same id has to come out the other end.
        const uuid = '9bed733f-b58f-4d23-9ca2-6397e8debedf';
        const inbound = createEndpoint('inbound', 'vless', { uuid });
        const outbound = createEndpoint('outbound', 'vless', { uuid, address: 'nl.example.com', port: 8443 });

        expect((inbound.settings as any).clients[0].id).toBe(uuid);
        expect((outbound.settings as any).vnext[0].users[0].id).toBe(uuid);
        expect((outbound.settings as any).vnext[0].address).toBe('nl.example.com');
        expect((outbound.settings as any).vnext[0].port).toBe(8443);
    });

    it('gives VLESS an encryption field, not a VMess security field', () => {
        // The old outbound factory wrote `security: 'auto'` into a VLESS user,
        // which belongs to VMess and does nothing here.
        const user = (createDefaultOutbound('vless').settings as any).vnext[0].users[0];
        expect(user.encryption).toBe('none');
        expect(user.security).toBeUndefined();
    });

    it('picks the 2022 cipher for the 2022 spelling', () => {
        expect((createDefaultInbound('shadowsocks').settings as any).method).toBe('aes-256-gcm');
        expect((createDefaultInbound('shadowsocks-2022').settings as any).method)
            .toBe('2022-blake3-aes-128-gcm');
        expect((createDefaultOutbound('shadowsocks-2022').settings as any).servers[0].method)
            .toBe('2022-blake3-aes-128-gcm');
    });

    it('drops the transport for protocols that have none', () => {
        const tun = createDefaultInbound('tun');
        expect(tun.streamSettings).toBeUndefined();
        expect(tun.port).toBeUndefined();
    });

    it('honours transport overrides', () => {
        const inbound = createEndpoint('inbound', 'vless', { network: 'ws', security: 'tls' });
        expect(inbound.streamSettings?.network).toBe('ws');
        expect(inbound.streamSettings?.security).toBe('tls');
    });

    it('still builds something usable for an unknown protocol', () => {
        // The protocol list moves with xray-core; refusing to build is worse
        // than handing back a skeleton to fill in.
        const made = createEndpoint('outbound', 'something-new');
        expect(made.protocol).toBe('something-new');
        expect(made.settings).toEqual({});
    });
});

describe('protocol support', () => {
    it('knows which side each protocol exists on', () => {
        expect(supportsProtocol('outbound', 'freedom')).toBe(true);
        expect(supportsProtocol('inbound', 'freedom')).toBe(false);
        expect(supportsProtocol('inbound', 'tun')).toBe(true);
        expect(supportsProtocol('outbound', 'tun')).toBe(false);
    });

    it('lists only buildable protocols per side', () => {
        expect(protocolsFor('inbound')).toContain('dokodemo-door');
        expect(protocolsFor('inbound')).not.toContain('blackhole');
        expect(protocolsFor('outbound')).toContain('blackhole');
        expect(protocolsFor('outbound')).not.toContain('tun');
    });

    it('reports the protocols that exist on both sides', () => {
        const both = bidirectionalProtocols();
        for (const proto of ['vless', 'vmess', 'trojan', 'shadowsocks', 'socks', 'http']) {
            expect(both).toContain(proto);
        }
        expect(both).not.toContain('freedom');
    });

    it('builds every listed protocol without throwing', () => {
        for (const direction of ['inbound', 'outbound'] as const) {
            for (const protocol of protocolsFor(direction)) {
                const made = createEndpoint(direction, protocol);
                expect(made.protocol).toBe(protocol);
                expect(made.tag).toBeTruthy();
                expect(made.settings).toBeDefined();
            }
        }
    });
});

describe('what each protocol is built with, per supported core', () => {
    it('writes nothing any supported core ignores or refuses', () => {
        // The factory is version-free, so everything it writes has to mean the
        // same thing on every line. The feature table is the judge — for the
        // protocols a line offers: a protocol the chooser does not list on a
        // line (masque before 26.10) is never built for it.
        for (const version of CORE_VERSIONS) {
            for (const direction of ['inbound', 'outbound'] as const) {
                for (const protocol of offeredProtocols(version.id, direction, protocolsFor(direction))) {
                    const made = createEndpoint(direction, protocol);
                    const config = direction === 'inbound' ? { inbounds: [made] } : { outbounds: [made] };
                    const found = versionDiagnostics(config, version.id)
                        .filter(d => d.severity !== 'info')
                        .map(d => `${version.id} ${direction} ${protocol}: ${d.field}`);
                    expect(found).toEqual([]);
                }
            }
        }
    });

    it('builds masque ends the 26.10 core accepts, on the masque transport with TLS', () => {
        // Both ends need network masque and security tls; the server also needs
        // an address pool with a host address in it, and users under `clients`.
        const server = createDefaultInbound('masque', { password: 'secret' });
        const client = createDefaultOutbound('masque', { address: 'm.example.com', port: 8443 });
        expect(server.settings).toEqual({
            clients: [{ email: 'user@masque', pass: 'secret' }],
            address: ['10.250.0.1/24'],
        });
        expect(server.streamSettings).toMatchObject({ network: 'masque', security: 'tls' });
        expect(client.settings).toEqual({ address: 'm.example.com', port: 8443 });
        expect(client.streamSettings).toMatchObject({ network: 'masque', security: 'tls' });
        expect(masqueProblems(server, 'inbound', '26.10')).toEqual([]);
        expect(masqueProblems(client, 'outbound', '26.10')).toEqual([]);
    });

    it('gives a hysteria server `clients` with `auth`, and version 2', () => {
        // `users` is only read from 26.7, `password` is a key on no line, and
        // the Hysteria 1 bandwidth keys are not keys at all.
        const settings = createDefaultInbound('hysteria', { password: 'secret' }).settings as any;
        expect(settings.version).toBe(2);
        expect(settings.clients).toEqual([{ auth: 'secret', level: 0 }]);
        expect(settings.users).toBeUndefined();
        for (const key of ['up_mbps', 'down_mbps', 'ignore_client_bandwidth']) expect(settings[key]).toBeUndefined();
    });

    it('builds a flat hysteria client whose password lives in the transport', () => {
        // Previously `settings.servers[{address, port, password}]`, none of
        // which HysteriaClientConfig reads.
        const outbound = createDefaultOutbound('hysteria', { address: 'hy.example.com', port: 8443, password: 'secret' });
        expect(outbound.settings).toEqual({ version: 2, address: 'hy.example.com', port: 8443 });
        expect((outbound.streamSettings as any).hysteriaSettings).toEqual({ version: 2, auth: 'secret' });
    });

    it('dials VLESS and Trojan over TLS', () => {
        // 26.9 refuses either without TLS to a public address — vnext and
        // servers[] forms included (v26.9.9:infra/conf/xray.go:236).
        expect(createDefaultOutbound('vless').streamSettings?.security).toBe('tls');
        expect(createDefaultOutbound('trojan').streamSettings?.security).toBe('tls');
    });

    it('leaves out keys no line has', () => {
        expect((createDefaultInbound('tun').settings as any).stack).toBeUndefined();
        // AsIs is what an absent domainStrategy means, and 26.9 deprecates the key.
        expect(createDefaultOutbound('freedom').settings).toEqual({});
    });

    it.each(['socks', 'http'])('writes a %s server entry with the keys the core decodes, and no level', protocol => {
        // The entry is {address, port, users} on every line
        // (v26.7.28:infra/conf/socks.go:71-75 and http.go:52-56), so the
        // `level: 0` this used to write was a key the decoder dropped. A level
        // that counts belongs to the login: users[0].level, or the flat form's.
        const settings = createDefaultOutbound(protocol, { address: 'p.example', port: 1080 }).settings as any;
        expect(settings).toEqual({ servers: [{ address: 'p.example', port: 1080 }] });
        expect(settings.servers[0]).not.toHaveProperty('level');
    });

    it('spells dokodemo-door the way 26.3 reads it', () => {
        const settings = createDefaultInbound('dokodemo-door', { address: '1.1.1.1', port: 53 }).settings as any;
        expect(settings).toEqual({ address: '1.1.1.1', port: 53, network: 'tcp,udp' });
    });

    it('builds mixed as the socks inbound it is, on the inbound side only', () => {
        // One struct for both names (v26.7.28:infra/conf/xray.go:27-28), and no
        // `mixed` in the outbound loader at all.
        expect(createDefaultInbound('mixed').settings).toEqual(createDefaultInbound('socks').settings);
        expect(supportsProtocol('inbound', 'mixed')).toBe(true);
        expect(supportsProtocol('outbound', 'mixed')).toBe(false);
        expect(bidirectionalProtocols()).not.toContain('mixed');
    });

    it('leaves a WireGuard inbound without a key and without a made-up peer', () => {
        // The one default here that is incomplete on purpose. A secret key is
        // not the factory's to invent, so the inbound says it has none — and
        // core/xray/wireguard-inbound.ts makes sure that is reported. The peer
        // with an empty public key this used to write was a second refusal
        // (v26.7.28:proxy/wireguard/config.go:12) that helped nobody.
        const settings = createDefaultInbound('wireguard').settings as any;
        expect(settings).toEqual({ secretKey: '', peers: [], mtu: 1420 });
    });
});

describe('normalizeInbound', () => {
    it('moves a lone `users` onto `clients`, which every line reads', () => {
        const inbound = { tag: 'in', protocol: 'vless', port: 443, settings: { users: [{ id: 'a' }], decryption: 'none' } };
        const next = normalizeInbound(inbound) as any;
        expect(next.settings).toEqual({ clients: [{ id: 'a' }], decryption: 'none' });
    });

    it('uses `accounts` for http and socks', () => {
        const next = normalizeInbound({ protocol: 'socks', port: 1080, settings: { auth: 'password', users: [{ user: 'u', pass: 'p' }] } }) as any;
        expect(next.settings.accounts).toEqual([{ user: 'u', pass: 'p' }]);
        expect(next.settings.users).toBeUndefined();
    });

    it('leaves both spellings alone — which list was meant is the user\'s call', () => {
        const inbound = { protocol: 'trojan', port: 443, settings: { clients: [], users: [{ password: 'x' }] } };
        expect(normalizeInbound(inbound)).toBe(inbound);
        expect(spellingConflicts(inbound).map(pair => pair.alias)).toEqual(['users']);
    });

    it('treats a zero dokodemo port as unset, as the core does', () => {
        const next = normalizeInbound({ protocol: 'tunnel', port: 53, settings: { port: 0, rewritePort: 5353, rewriteAddress: '1.1.1.1' } }) as any;
        expect(next.settings).toEqual({ port: 5353, address: '1.1.1.1' });
    });

    it('repairs the hysteria shape this editor used to write', () => {
        const next = normalizeInbound({
            protocol: 'hysteria', port: 443,
            settings: { users: [{ password: 'a' }, { auth: 'b' }], up_mbps: 100 },
        }) as any;
        expect(next.settings.version).toBe(2);
        expect(next.settings.clients).toEqual([{ auth: 'a' }, { auth: 'b' }]);
        // Not a rewrite with one meaning, so it stays for the editor to show.
        expect(next.settings.up_mbps).toBe(100);
    });

    it('drops an empty listen, which crashes the loader before 26.9', () => {
        const next = normalizeInbound({ protocol: 'vless', port: 443, listen: '', settings: {} });
        expect('listen' in next).toBe(false);
    });

    it('turns a tun autoOutboundsInterface switch into the string the core decodes', () => {
        expect((normalizeInbound({ protocol: 'tun', settings: { autoOutboundsInterface: true } }).settings as any).autoOutboundsInterface).toBe('auto');
        expect((normalizeInbound({ protocol: 'tun', settings: { autoOutboundsInterface: false } }).settings as any).autoOutboundsInterface).toBe('');
    });

    it('returns the same object when there is nothing to do', () => {
        const inbound = createDefaultInbound('vless');
        expect(normalizeInbound(inbound)).toBe(inbound);
        const hysteria = createDefaultInbound('hysteria');
        expect(normalizeInbound(hysteria)).toBe(hysteria);
    });

    it('can adopt or drop the alias on request', () => {
        const inbound = { protocol: 'vmess', port: 1, settings: { clients: [], users: [{ id: 'u' }] } };
        const pair = spellingConflicts(inbound)[0]!;
        expect((adoptAlias(inbound, pair).settings as any)).toEqual({ clients: [{ id: 'u' }] });
        expect((dropAlias(inbound, pair).settings as any)).toEqual({ clients: [] });
    });
});
