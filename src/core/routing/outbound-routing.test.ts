import { describe, expect, it } from 'bun:test';
import {
    describeOutboundRouting,
    summariseOutboundRouting,
    layerOf,
    balancerSelects,
    rulematchers,
} from './outbound-routing';

const config: any = {
    outbounds: [
        { tag: 'direct', protocol: 'freedom' },
        { tag: 'proxy', protocol: 'vless' },
        { tag: 'proxy-2', protocol: 'vless' },
        { tag: 'block', protocol: 'blackhole' },
        { tag: 'orphan', protocol: 'freedom' },
    ],
    routing: {
        rules: [
            { type: 'field', domain: ['geosite:ads'], outboundTag: 'block' },
            { type: 'field', ip: ['geoip:ru'], outboundTag: 'direct' },
            { type: 'field', domain: ['geosite:google'], ip: ['8.8.8.8'], balancerTag: 'entry' },
            { type: 'field', network: 'tcp,udp', balancerTag: 'entry' },
            { snippet: 'RU-DIRECT' },
        ],
        balancers: [
            { tag: 'entry', selector: ['proxy'], strategy: { type: 'leastPing' } },
        ],
    },
};

describe('layer classification', () => {
    it('calls header matchers L4', () => {
        expect(layerOf({ ip: ['1.1.1.1'] } as any)).toBe('L4');
        expect(layerOf({ port: '443' } as any)).toBe('L4');
        expect(layerOf({ inboundTag: ['socks-in'] } as any)).toBe('L4');
    });

    it('calls payload matchers L7', () => {
        // These only exist once traffic has been sniffed.
        expect(layerOf({ domain: ['example.com'] } as any)).toBe('L7');
        expect(layerOf({ protocol: ['bittorrent'] } as any)).toBe('L7');
    });

    it('calls a rule that uses both mixed', () => {
        expect(layerOf({ domain: ['a.com'], ip: ['1.1.1.1'] } as any)).toBe('mixed');
    });

    it('treats a catch-all as deciding at no layer', () => {
        expect(layerOf({ outboundTag: 'proxy' } as any)).toBe('none');
        // An empty array is not a matcher — the default rule factory writes
        // `domain: []`, and counting that as L7 would mislabel every new rule.
        expect(layerOf({ domain: [], ip: [], outboundTag: 'proxy' } as any)).toBe('none');
    });

    it('lists only the matchers a rule actually sets', () => {
        expect(rulematchers({ domain: ['a.com'], ip: [], port: '443' } as any).sort())
            .toEqual(['domain', 'port']);
    });
});

describe('balancer selectors', () => {
    it('matches by prefix, as the core does', () => {
        // A selector of "proxy" picks up proxy-2 as well; equality would
        // under-report which outbounds a balancer feeds.
        expect(balancerSelects(['proxy'], 'proxy')).toBe(true);
        expect(balancerSelects(['proxy'], 'proxy-2')).toBe(true);
        expect(balancerSelects(['proxy'], 'direct')).toBe(false);
        expect(balancerSelects([''], 'anything')).toBe(false);
    });
});

describe('describeOutboundRouting', () => {
    it('finds the rule that names an outbound directly', () => {
        const summary = describeOutboundRouting(config, 'block');
        expect(summary.routes).toHaveLength(1);
        expect(summary.routes[0]!.via).toBeNull();
        expect(summary.routes[0]!.layer).toBe('L7');
        expect(summary.layer).toBe('L7');
    });

    it('finds rules that reach an outbound through a balancer', () => {
        const summary = describeOutboundRouting(config, 'proxy-2');
        expect(summary.balancers).toEqual(['entry']);
        expect(summary.routes.map(r => r.via)).toEqual(['entry', 'entry']);
        // One rule is domain+ip, the other is network-only: together, mixed.
        expect(summary.layer).toBe('mixed');
    });

    it('marks the first outbound as the default sink', () => {
        const summary = describeOutboundRouting(config, 'direct');
        expect(summary.isDefault).toBe(true);
        expect(summary.unreachable).toBe(false);
    });

    it('flags an outbound no rule can reach', () => {
        const summary = describeOutboundRouting(config, 'orphan');
        expect(summary.routes).toEqual([]);
        expect(summary.unreachable).toBe(true);
        expect(summary.layer).toBe('none');
    });

    it('ignores snippet placeholders', () => {
        // A `{ snippet: "NAME" }` entry is expanded by the panel and has no
        // matchers of its own; treating it as a rule would invent routes.
        const summary = describeOutboundRouting(config, 'anything-at-all');
        expect(summary.routes).toEqual([]);
    });

    it('survives a config with no routing at all', () => {
        expect(describeOutboundRouting({ outbounds: [] } as any, 'x').unreachable).toBe(true);
        expect(describeOutboundRouting(null, 'x').routes).toEqual([]);
    });
});

describe('summariseOutboundRouting', () => {
    it('covers every tagged outbound', () => {
        const all = summariseOutboundRouting(config);
        expect([...all.keys()].sort()).toEqual(['block', 'direct', 'orphan', 'proxy', 'proxy-2']);
        expect(all.get('orphan')!.unreachable).toBe(true);
        expect(all.get('proxy')!.balancers).toEqual(['entry']);
    });
});
