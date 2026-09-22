import { describe, expect, it } from 'bun:test';
import { lintValue, formatPath } from './json-lint';

/**
 * The editors used to underline working configs in red.
 *
 * These are the shapes people actually paste in — a routing rule with
 * matchers, an inbound with REALITY, a DNS block with a scoped server. Every
 * one of them must come back clean, because every one of them runs.
 */

describe('a valid config is not an error', () => {
    it('accepts the routing rule from the report', () => {
        // Underlined as "must NOT have additional properties" because the
        // generated schema knew only ruleTag/outboundTag/balancerTag.
        expect(lintValue('rule', {
            ruleTag: 'BLOCK-BITTORRENT-PROTO',
            protocol: ['bittorrent'],
            outboundTag: 'BLOCK',
        })).toEqual([]);
    });

    it('accepts every matcher a field rule can carry', () => {
        expect(lintValue('rule', {
            type: 'field',
            ruleTag: 'ALL',
            domain: ['geosite:ads', 'full:example.com', 'regexp:.*\\.ru$'],
            ip: ['geoip:private', '10.0.0.0/8'],
            port: '53,443,1000-2000',
            sourcePort: 1080,
            network: 'tcp,udp',
            source: ['192.168.0.0/16'],
            user: ['user@example.com'],
            inboundTag: ['socks-in'],
            protocol: ['bittorrent', 'tls'],
            attrs: { ':method': 'GET' },
            balancerTag: 'LB-EU',
        })).toEqual([]);
    });

    it('accepts a whole config with inbounds, outbounds, routing and dns', () => {
        expect(lintValue('full', {
            log: { loglevel: 'warning' },
            inbounds: [{
                tag: 'socks-in',
                port: 10808,
                listen: '127.0.0.1',
                protocol: 'socks',
                settings: { auth: 'noauth', udp: true },
                sniffing: { enabled: true, destOverride: ['http', 'tls'] },
            }],
            outbounds: [
                {
                    tag: 'proxy',
                    protocol: 'vless',
                    settings: { vnext: [{ address: 'example.com', port: 443, users: [{ id: 'uuid', flow: 'xtls-rprx-vision', encryption: 'none' }] }] },
                    streamSettings: {
                        network: 'tcp',
                        security: 'reality',
                        realitySettings: { serverName: 'example.com', fingerprint: 'chrome', publicKey: 'x', shortId: 'ab', spiderX: '/assets/app.js' },
                    },
                },
                { tag: 'direct', protocol: 'freedom' },
                { tag: 'block', protocol: 'blackhole' },
            ],
            routing: {
                domainStrategy: 'IPIfNonMatch',
                rules: [{ type: 'field', protocol: ['bittorrent'], outboundTag: 'block' }],
                balancers: [{ tag: 'LB', selector: ['proxy'], strategy: { type: 'leastPing' } }],
            },
            dns: { servers: ['1.1.1.1', { address: '8.8.8.8', domains: ['geosite:google'] }], queryStrategy: 'UseIP' },
        })).toEqual([]);
    });

    it('accepts an inbound on its own, and a list of them', () => {
        const inbound = { tag: 'in', port: 443, protocol: 'vless', settings: { clients: [], decryption: 'none' } };
        expect(lintValue('inbound', inbound)).toEqual([]);
        expect(lintValue('inbounds', [inbound, { ...inbound, tag: 'in2', port: '1080-1090' }])).toEqual([]);
    });

    it('accepts a balancer and a reverse block', () => {
        expect(lintValue('balancer', { tag: 'LB', selector: ['vless-'], fallbackTag: 'direct' })).toEqual([]);
        expect(lintValue('reverse', { bridges: [{ tag: 'bridge', domain: 'example.com' }], portals: [] })).toEqual([]);
    });

    it('carries keys the schemas have never heard of rather than condemning them', () => {
        // Panel extensions and future Xray fields land in configs all the time.
        expect(lintValue('rule', { outboundTag: 'direct', somethingNewInXray: 42 })).toEqual([]);
        expect(lintValue('full', { inbounds: [], _remnawaveMeta: { profile: 'x' } })).toEqual([]);
    });
});

describe('a real mistake is still an error', () => {
    it('reports a field of the wrong type, and says what it wanted', () => {
        const issues = lintValue('rule', { outboundTag: 42 });
        expect(issues).toHaveLength(1);
        expect(issues[0]!.path).toEqual(['outboundTag']);
        expect(issues[0]!.message).toBe('outboundTag: expected a string');
    });

    it('reports a missing required field', () => {
        const issues = lintValue('balancer', { selector: ['a'] });
        expect(issues.map(i => formatPath(i.path))).toContain('tag');
    });

    it('points inside an array at the entry that is wrong', () => {
        const issues = lintValue('inbounds', [
            { protocol: 'socks' },
            { protocol: 'socks', port: { nonsense: true } },
        ]);
        expect(issues.map(i => formatPath(i.path))).toContain('[1].port');
    });

    it('names the allowed values for a closed set', () => {
        const issues = lintValue('full', { log: { loglevel: 'verbose' } });
        expect(issues).toHaveLength(1);
        expect(issues[0]!.message).toContain('must be one of');
        expect(issues[0]!.message).toContain('"warning"');
    });

    it('reports one issue per field, not one per union branch', () => {
        const issues = lintValue('rule', { port: { nope: 1 }, outboundTag: 5 });
        expect(issues).toHaveLength(2);
    });
});

describe('formatPath', () => {
    it('reads the way the JSON does', () => {
        expect(formatPath(['routing', 'rules', 0, 'port'])).toBe('routing.rules[0].port');
        expect(formatPath([])).toBe('');
        expect(formatPath([2, 'tag'])).toBe('[2].tag');
    });
});

describe('the settings block is checked against its protocol', () => {
    it('reaches inside a vless inbound and names the client that is wrong', () => {
        const issues = lintValue('inbound', {
            tag: 'in', port: 443, protocol: 'vless',
            settings: { clients: [{ id: 12345 }], decryption: 'none' },
        });
        expect(issues).toHaveLength(1);
        expect(issues[0]!.message).toBe('settings.clients[0].id: expected a string');
    });

    it('lists what a settings enum accepts', () => {
        const issues = lintValue('outbound', {
            tag: 'direct', protocol: 'freedom', settings: { domainStrategy: 'Nonsense' },
        });
        expect(issues[0]!.message).toContain('settings.domainStrategy: must be one of');
        expect(issues[0]!.message).toContain('"UseIP"');
    });

    it('finds it inside a whole config too', () => {
        const issues = lintValue('full', {
            inbounds: [{ tag: 'in', port: 443, protocol: 'trojan', settings: { clients: 'not-a-list' } }],
        });
        expect(issues.map(i => formatPath(i.path))).toEqual(['inbounds[0].settings.clients']);
    });

    it('says nothing about a protocol it has no shape for', () => {
        // A protocol from a newer core, or a panel's own: not an error.
        expect(lintValue('outbound', {
            tag: 'x', protocol: 'something-new', settings: { whatever: true },
        })).toEqual([]);
    });

    it('accepts the settings every shipped protocol actually uses', () => {
        const inbounds = [
            { protocol: 'vless', settings: { clients: [{ id: 'u', flow: 'xtls-rprx-vision' }], decryption: 'none' } },
            { protocol: 'vmess', settings: { clients: [{ id: 'u', level: 0 }] } },
            { protocol: 'trojan', settings: { clients: [{ password: 'p' }] } },
            { protocol: 'shadowsocks', settings: { method: 'aes-256-gcm', password: 'p', network: 'tcp,udp' } },
            { protocol: 'socks', settings: { auth: 'noauth', udp: true } },
            { protocol: 'http', settings: { allowTransparent: false } },
            { protocol: 'dokodemo-door', settings: { address: '1.1.1.1', port: 53, network: 'tcp,udp' } },
        ];
        for (const inbound of inbounds) {
            expect(lintValue('inbound', { tag: 't', port: 443, ...inbound })).toEqual([]);
        }

        const outbounds = [
            { protocol: 'freedom', settings: { domainStrategy: 'UseIP' } },
            { protocol: 'blackhole', settings: { response: { type: 'http' } } },
            { protocol: 'dns', settings: { network: 'udp', address: '8.8.8.8', port: 53 } },
            { protocol: 'loopback', settings: { inboundTag: 'socks-in' } },
            { protocol: 'vless', settings: { vnext: [{ address: 'e.com', port: 443, users: [{ id: 'u', encryption: 'none' }] }] } },
            { protocol: 'shadowsocks', settings: { servers: [{ address: 'e.com', port: 443, method: 'aes-256-gcm', password: 'p' }] } },
        ];
        for (const outbound of outbounds) {
            expect(lintValue('outbound', { tag: 't', ...outbound })).toEqual([]);
        }
    });
});
