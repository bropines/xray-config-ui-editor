import { describe, it, expect } from 'bun:test';
import {
    buildLocalBalancerConfig,
    buildLocalBalancerSubscription,
    groupNodesByLabel,
    proxyTagFor,
    slugifyLabel,
    isProxyOutbound,
    DEFAULT_LOCAL_BALANCER_OPTIONS,
    type LocalBalancerNode,
} from './local-balancer';

const vless = (address: string): any => ({
    tag: 'whatever-the-link-called-it',
    protocol: 'vless',
    settings: { vnext: [{ address, port: 443, users: [{ id: 'u', encryption: 'none', flow: 'xtls-rprx-vision' }] }] },
    streamSettings: { network: 'tcp', security: 'reality', realitySettings: { serverName: 'example.app', publicKey: 'k' } },
});

const node = (address: string, label?: string): LocalBalancerNode => ({ outbound: vless(address), label });

describe('buildLocalBalancerConfig — the wiring that has to agree', () => {
    const { config, summary } = buildLocalBalancerConfig([
        node('81.94.159.32'),
        node('81.94.159.33'),
    ], { remarks: '🇳🇱 ⚡ Нидерланды' });

    it('gives the first proxy the bare prefix so the selector prefix-matches all of them', () => {
        expect(config.outbounds.map((o: any) => o.tag)).toEqual(['proxy', 'proxy-2', 'direct', 'block']);
        expect(config.routing.balancers[0].selector).toEqual(['proxy']);
        expect(summary.proxyTags).toEqual(['proxy', 'proxy-2']);
    });

    it('points the catch-all rule at the balancer it just created', () => {
        const catchAll = config.routing.rules.at(-1);
        expect(catchAll).toEqual({ type: 'field', network: 'tcp,udp', balancerTag: 'entry-balancer' });
        expect(config.routing.balancers[0].tag).toBe('entry-balancer');
    });

    it('gives the probe the same selector as the balancer', () => {
        expect(config.burstObservatory.subjectSelector).toEqual(config.routing.balancers[0].selector);
    });

    it('repeats the bypass list in the DNS entry, which is where it is easy to forget', () => {
        const ruleDomains = config.routing.rules[0].domain;
        expect(config.dns.servers[0]).toEqual({
            address: 'localhost',
            domains: ruleDomains,
            skipFallback: true,
        });
        expect(config.dns.servers.slice(1)).toEqual(['1.1.1.1', '8.8.8.8']);
    });

    it('routes bittorrent and the bypass list straight out', () => {
        expect(config.routing.rules[0].outboundTag).toBe('direct');
        expect(config.routing.rules[1]).toEqual({ type: 'field', protocol: ['bittorrent'], outboundTag: 'direct' });
        expect(config.outbounds.find((o: any) => o.tag === 'direct')).toEqual({ tag: 'direct', protocol: 'freedom' });
    });

    it('opens the two local listeners a client needs', () => {
        expect(config.inbounds.map((i: any) => [i.protocol, i.port, i.listen])).toEqual([
            ['socks', 10808, '127.0.0.1'],
            ['http', 10809, '127.0.0.1'],
        ]);
        expect(config.inbounds[0].sniffing.destOverride).toEqual(['http', 'tls', 'quic']);
    });

    it('carries the subscription label through', () => {
        expect(config.remarks).toBe('🇳🇱 ⚡ Нидерланды');
    });

    it('drops the tag the link came with rather than leaving two tags in play', () => {
        expect(config.outbounds[0].tag).toBe('proxy');
        expect(JSON.stringify(config)).not.toContain('whatever-the-link-called-it');
    });
});

describe('single node', () => {
    it('skips the balancer, the catch-all rule and the probe', () => {
        const { config, summary } = buildLocalBalancerConfig([node('1.2.3.4')]);
        expect(summary.balanced).toBe(false);
        expect(config.routing.balancers).toBeUndefined();
        expect(config.burstObservatory).toBeUndefined();
        // Bypass + bittorrent only; everything else falls through to outbound #1.
        expect(config.routing.rules).toHaveLength(2);
        expect(config.outbounds[0].tag).toBe('proxy');
    });

    it('still builds one when explicitly asked, for a config meant to grow', () => {
        const { config, summary } = buildLocalBalancerConfig([node('1.2.3.4')], { forceBalancer: true });
        expect(summary.balanced).toBe(true);
        expect(config.routing.balancers[0].selector).toEqual(['proxy']);
        expect(config.burstObservatory).toBeDefined();
    });
});

describe('strategy settings', () => {
    it('writes leastLoad tuning', () => {
        const { config } = buildLocalBalancerConfig([node('a'), node('b')]);
        expect(config.routing.balancers[0].strategy).toEqual({
            type: 'leastLoad',
            settings: { maxRTT: '4s', expected: 1 },
        });
    });

    it('omits tuning for strategies that ignore it', () => {
        const { config } = buildLocalBalancerConfig([node('a'), node('b')], { strategy: 'leastPing' });
        expect(config.routing.balancers[0].strategy).toEqual({ type: 'leastPing' });
    });
});

describe('probe choice', () => {
    it('can use the plain observatory instead of the burst one', () => {
        const { config } = buildLocalBalancerConfig([node('a'), node('b')], { probe: 'observatory' });
        expect(config.burstObservatory).toBeUndefined();
        expect(config.observatory).toEqual({
            subjectSelector: ['proxy'],
            probeInterval: '10s',
            probeURL: 'https://www.gstatic.com/generate_204',
            enableConcurrency: true,
        });
    });

    it('can leave the balancer unprobed', () => {
        const { config } = buildLocalBalancerConfig([node('a'), node('b')], { probe: 'none' });
        expect(config.observatory).toBeUndefined();
        expect(config.burstObservatory).toBeUndefined();
        expect(config.routing.balancers).toHaveLength(1);
    });
});

describe('options that turn parts off', () => {
    it('drops the DNS block and keeps the bypass rule', () => {
        const { config } = buildLocalBalancerConfig([node('a'), node('b')], { dns: false });
        expect(config.dns).toBeUndefined();
        expect(config.routing.rules[0].outboundTag).toBe('direct');
    });

    it('drops the bypass rule but keeps a DNS block without a localhost entry', () => {
        const { config } = buildLocalBalancerConfig([node('a'), node('b')], { bypassDomains: [] });
        expect(config.routing.rules[0]).toEqual({ type: 'field', protocol: ['bittorrent'], outboundTag: 'direct' });
        expect(config.dns.servers).toEqual(['1.1.1.1', '8.8.8.8']);
    });

    it('can run with only a SOCKS listener', () => {
        const { config } = buildLocalBalancerConfig([node('a')], { httpPort: null });
        expect(config.inbounds.map((i: any) => i.protocol)).toEqual(['socks']);
    });

    it('adds DNS-only extras, such as your own panel domain', () => {
        const { config } = buildLocalBalancerConfig([node('a')], { dnsExtraDomains: ['domain:blackvpn.io'] });
        expect(config.dns.servers[0].domains.at(-1)).toBe('domain:blackvpn.io');
        expect(config.routing.rules[0].domain).not.toContain('domain:blackvpn.io');
    });
});

describe('tagging', () => {
    it('numbers tags by default', () => {
        expect(proxyTagFor(0, DEFAULT_LOCAL_BALANCER_OPTIONS)).toBe('proxy');
        expect(proxyTagFor(2, DEFAULT_LOCAL_BALANCER_OPTIONS)).toBe('proxy-3');
    });

    it('can label tags while keeping the prefix the selector needs', () => {
        const opts = { ...DEFAULT_LOCAL_BALANCER_OPTIONS, tagStyle: 'labelled' as const };
        expect(proxyTagFor(0, opts, '🇳🇱 ⚡ Нидерланды #1')).toBe('proxy-Нидерланды-1');
        const { config } = buildLocalBalancerConfig(
            [node('a', '🇳🇱 Amsterdam #1'), node('b', '🇳🇱 Amsterdam #2')],
            { tagStyle: 'labelled' }
        );
        expect(config.outbounds.slice(0, 2).map((o: any) => o.tag)).toEqual(['proxy-Amsterdam-1', 'proxy-Amsterdam-2']);
        // Every tag still starts with the prefix, so the selector matches.
        expect(config.outbounds.slice(0, 2).every((o: any) => o.tag.startsWith('proxy'))).toBe(true);
    });

    it('strips flags and punctuation out of a slug', () => {
        expect(slugifyLabel('🇫🇮 ⚡ Финляндия #2')).toBe('Финляндия-2');
        expect(slugifyLabel('')).toBe('');
    });
});

describe('grouping by label', () => {
    const nodes = [
        node('a', '🇳🇱 ⚡ Нидерланды #1'),
        node('b', '🇳🇱 ⚡ Нидерланды #2'),
        node('c', '🇫🇮 ⚡ Финляндия #1'),
        node('d'),
    ];

    it('collapses numbered variants of one location into a single group', () => {
        expect(groupNodesByLabel(nodes).map(g => [g.name, g.nodes.length])).toEqual([
            ['🇳🇱 ⚡ Нидерланды', 2],
            ['🇫🇮 ⚡ Финляндия', 1],
            ['Config', 1],
        ]);
    });

    it('builds one config per group, each labelled with its group name', () => {
        const results = buildLocalBalancerSubscription(groupNodesByLabel(nodes));
        expect(results.map(r => r.config.remarks)).toEqual(['🇳🇱 ⚡ Нидерланды', '🇫🇮 ⚡ Финляндия', 'Config']);
        // Two nodes -> balanced; one node -> no balancer.
        expect(results.map(r => r.summary.balanced)).toEqual([true, false, false]);
    });
});

describe('input filtering', () => {
    it('ignores freedom/blackhole entries that came along for the ride', () => {
        expect(isProxyOutbound({ protocol: 'freedom' })).toBe(false);
        expect(isProxyOutbound({ protocol: 'blackhole' })).toBe(false);
        expect(isProxyOutbound(vless('a'))).toBe(true);

        const { summary } = buildLocalBalancerConfig([
            { outbound: { tag: 'direct', protocol: 'freedom' } },
            node('1.2.3.4'),
        ]);
        expect(summary.nodeCount).toBe(1);
    });

    it('refuses to build a config with nothing to proxy through', () => {
        expect(() => buildLocalBalancerConfig([{ outbound: { tag: 'direct', protocol: 'freedom' } }]))
            .toThrow('No proxy outbounds');
    });
});
