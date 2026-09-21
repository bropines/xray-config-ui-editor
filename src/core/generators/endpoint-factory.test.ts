import { describe, expect, it } from 'bun:test';
import {
    createEndpoint,
    createDefaultInbound,
    createDefaultOutbound,
    protocolsFor,
    supportsProtocol,
    bidirectionalProtocols,
} from './endpoint-factory';

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
