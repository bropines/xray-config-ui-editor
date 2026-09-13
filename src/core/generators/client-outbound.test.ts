import { describe, it, expect } from 'bun:test';
import { buildClientOutbound, clientOutboundBlocker } from './client-outbound';
import { generateRealityKeyPair, publicKeyFromPrivateKey } from './crypto';

// A throwaway key pair stands in for a panel inbound's REALITY key: the point
// of these tests is that the *public* half the client gets is derived from the
// *private* half the server holds, never copied from somewhere else.
const KEYS = generateRealityKeyPair();

const realityInbound = (over: any = {}) => ({
    tag: 'VLESS-REALITY',
    protocol: 'vless',
    port: 443,
    settings: { clients: [], decryption: 'none' },
    streamSettings: {
        network: 'raw',
        security: 'reality',
        realitySettings: {
            target: '127.0.0.1:8443',
            serverNames: ['example.app', 'www.example.app'],
            privateKey: KEYS.privateKey,
            shortIds: ['aabbccdd', '11223344'],
        },
        ...over,
    },
});

const host = (over: any = {}) => ({
    remark: '🇳🇱 Amsterdam #1',
    address: '203.0.113.10',
    port: 443,
    sni: null,
    host: null,
    path: null,
    alpn: null,
    fingerprint: 'firefox',
    securityLayer: 'DEFAULT',
    ...over,
});

const USER = '9bed733f-b58f-4d23-9ca2-6397e8debedf';

describe('REALITY over raw TCP — the common case', () => {
    const { outbound, notes } = buildClientOutbound({
        host: host(), inbound: realityInbound(), userId: USER, tag: 'proxy',
    });

    it('derives the public key from the inbound private key', () => {
        expect(outbound.streamSettings.realitySettings.publicKey)
            .toBe(publicKeyFromPrivateKey(KEYS.privateKey)!);
        expect(outbound.streamSettings.realitySettings.publicKey).not.toBe(KEYS.privateKey);
    });

    it('points at the host address, not the inbound listen address', () => {
        expect(outbound.settings.vnext[0]).toMatchObject({ address: '203.0.113.10', port: 443 });
    });

    it('uses the inbound SNI when the host does not override it', () => {
        expect(outbound.streamSettings.realitySettings.serverName).toBe('example.app');
    });

    it('lets the host override the SNI', () => {
        const { outbound: o } = buildClientOutbound({
            host: host({ sni: 'cdn.example.net' }), inbound: realityInbound(), userId: USER, tag: 'proxy',
        });
        expect(o.streamSettings.realitySettings.serverName).toBe('cdn.example.net');
    });

    it('takes one shortId and says so', () => {
        expect(outbound.streamSettings.realitySettings.shortId).toBe('aabbccdd');
        expect(notes.join(' ')).toContain('2 shortIds');
    });

    it('renames the raw transport to tcp, which every current client accepts', () => {
        expect(outbound.streamSettings.network).toBe('tcp');
    });

    it('turns on XTLS Vision, since REALITY over TCP supports it', () => {
        expect(outbound.settings.vnext[0].users[0]).toEqual({
            id: USER,
            encryption: 'none',
            flow: 'xtls-rprx-vision',
        });
    });
});

describe('a host that publishes an inbound behind TLS', () => {
    const xhttpInbound = {
        protocol: 'vless',
        settings: { clients: [], decryption: 'none' },
        streamSettings: {
            network: 'xhttp',
            security: 'none',
            xhttpSettings: { mode: 'packet-up', path: '/from/inbound', extra: { xPaddingBytes: '50-150' } },
        },
    };
    const cdnHost = host({
        securityLayer: 'TLS',
        sni: 'cdn.example.net',
        host: 'cdn.example.net',
        path: '/static/segment.ts',
        alpn: 'h2,http/1.1',
        xHttpExtraParams: { xmux: { maxConcurrency: '1' }, noSSEHeader: true },
    });

    const { outbound } = buildClientOutbound({ host: cdnHost, inbound: xhttpInbound, userId: USER, tag: 'proxy' });

    it('follows the host security layer even though the inbound runs plain', () => {
        expect(outbound.streamSettings.security).toBe('tls');
        expect(outbound.streamSettings.tlsSettings).toEqual({
            serverName: 'cdn.example.net',
            fingerprint: 'firefox',
            alpn: ['h2', 'http/1.1'],
        });
    });

    it('prefers the host path and extra params over the inbound ones', () => {
        expect(outbound.streamSettings.xhttpSettings).toEqual({
            mode: 'packet-up',
            host: 'cdn.example.net',
            path: '/static/segment.ts',
            extra: { xmux: { maxConcurrency: '1' }, noSSEHeader: true },
        });
    });

    it('leaves flow empty, because Vision is not valid on xhttp', () => {
        expect(outbound.settings.vnext[0].users[0].flow).toBe('');
    });
});

describe('other transports', () => {
    it('maps gRPC serviceName', () => {
        const inbound = {
            protocol: 'vless',
            streamSettings: {
                network: 'grpc',
                security: 'reality',
                realitySettings: { serverNames: ['g.example.app'], privateKey: KEYS.privateKey, shortIds: ['ab'] },
                grpcSettings: { serviceName: 'GunService' },
            },
        };
        const { outbound } = buildClientOutbound({ host: host(), inbound, userId: USER, tag: 'proxy' });
        expect(outbound.streamSettings.grpcSettings).toEqual({ serviceName: 'GunService' });
        expect(outbound.settings.vnext[0].users[0].flow).toBe('');
    });

    it('maps websocket path and Host header', () => {
        const inbound = {
            protocol: 'vless',
            streamSettings: { network: 'ws', security: 'none', wsSettings: { path: '/ws' } },
        };
        const { outbound } = buildClientOutbound({
            host: host({ host: 'ws.example.net' }), inbound, userId: USER, tag: 'proxy',
        });
        expect(outbound.streamSettings.wsSettings).toEqual({ path: '/ws', headers: { Host: 'ws.example.net' } });
    });

    it('carries per-host mux and sockopt through', () => {
        const { outbound } = buildClientOutbound({
            host: host({ muxParams: { enabled: true, concurrency: 8 }, sockoptParams: { tcpFastOpen: true } }),
            inbound: realityInbound(), userId: USER, tag: 'proxy',
        });
        expect(outbound.mux).toEqual({ enabled: true, concurrency: 8 });
        expect(outbound.streamSettings.sockopt).toEqual({ tcpFastOpen: true });
    });
});

describe('hosts that cannot be mirrored', () => {
    it('explains a protocol whose secret is per-user', () => {
        expect(clientOutboundBlocker(host(), { protocol: 'shadowsocks' })).toContain('per-user secret');
    });

    it('explains a REALITY inbound with no private key', () => {
        const inbound = realityInbound();
        delete inbound.streamSettings.realitySettings.privateKey;
        expect(clientOutboundBlocker(host(), inbound)).toContain('no REALITY private key');
    });

    it('explains a key that is not X25519', () => {
        const inbound = realityInbound();
        inbound.streamSettings.realitySettings.privateKey = 'not-a-key';
        expect(clientOutboundBlocker(host(), inbound)).toContain('not a valid X25519 key');
    });

    it('explains a host with no address', () => {
        expect(clientOutboundBlocker(host({ address: '' }), realityInbound())).toContain('no address');
    });

    it('passes a host that can be mirrored', () => {
        expect(clientOutboundBlocker(host(), realityInbound())).toBeNull();
    });

    it('throws with that same reason when built anyway', () => {
        expect(() => buildClientOutbound({ host: host(), inbound: { protocol: 'shadowsocks' }, userId: USER, tag: 'proxy' }))
            .toThrow('per-user secret');
    });
});

describe('publicKeyFromPrivateKey', () => {
    it('round-trips a generated pair', () => {
        const pair = generateRealityKeyPair();
        expect(publicKeyFromPrivateKey(pair.privateKey)).toBe(pair.publicKey);
    });

    it('returns null for junk instead of an unusable key', () => {
        expect(publicKeyFromPrivateKey('')).toBeNull();
        expect(publicKeyFromPrivateKey('too-short')).toBeNull();
        expect(publicKeyFromPrivateKey('!!!not base64!!!')).toBeNull();
    });
});
