import { describe, it, expect } from 'bun:test';
import {
    BYPASS_LISTS,
    RUSSIAN_DOMAINS,
    LEAK_CHECK_DOMAINS,
    DEFAULT_BYPASS_DOMAINS,
    splitBypassDomains,
    composeBypassDomains,
} from './bypass-domains';
import {
    DNS_RESOLVERS,
    DEFAULT_DNS_UPSTREAM,
    DEFAULT_QUERY_STRATEGY,
    createDefaultDns,
    matchResolverPreset,
} from './dns';
import {
    getNoisePresets,
    matchNoisePreset,
    noiseItems,
    noiseMask,
    withNoisePreset,
} from './noise';
import { getPresets } from './index';

describe('bypass list registry', () => {
    it('has unique ids and no empty list', () => {
        const ids = BYPASS_LISTS.map(l => l.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(BYPASS_LISTS.every(l => l.domains.length > 0)).toBe(true);
        expect(BYPASS_LISTS.every(l => l.label.length > 0 && l.description.length > 0)).toBe(true);
    });

    it('builds the default set from the registry, in order', () => {
        expect(DEFAULT_BYPASS_DOMAINS).toEqual([...RUSSIAN_DOMAINS, ...LEAK_CHECK_DOMAINS]);
    });

    it('keeps the two lists disjoint, so a toggle removes exactly its own domains', () => {
        const overlap = RUSSIAN_DOMAINS.filter(d => LEAK_CHECK_DOMAINS.includes(d));
        expect(overlap).toEqual([]);
    });
});

describe('splitBypassDomains / composeBypassDomains', () => {
    it('recognises a full preset list and reports nothing custom', () => {
        expect(splitBypassDomains(DEFAULT_BYPASS_DOMAINS)).toEqual({
            enabled: BYPASS_LISTS.map(l => l.id),
            custom: [],
        });
    });

    it('keeps domains that belong to no preset', () => {
        const { enabled, custom } = splitBypassDomains([
            ...RUSSIAN_DOMAINS,
            'domain:mybank.example',
            'geosite:category-ads',
        ]);
        expect(enabled).toEqual(['russian']);
        expect(custom).toEqual(['domain:mybank.example', 'geosite:category-ads']);
    });

    it('treats a partially present list as not enabled, and keeps every domain', () => {
        const partial = RUSSIAN_DOMAINS.slice(0, 3);
        const { enabled, custom } = splitBypassDomains(partial);
        expect(enabled).toEqual([]);
        // Nothing is lost: what the preset did not fully cover stays custom.
        expect(custom).toEqual(partial);
    });

    it('round-trips through compose', () => {
        const original = [...LEAK_CHECK_DOMAINS, 'domain:extra.example'];
        const { enabled, custom } = splitBypassDomains(original);
        expect(composeBypassDomains(enabled, custom)).toEqual(original);
    });

    it('composes an empty list when nothing is enabled', () => {
        expect(composeBypassDomains([], [])).toEqual([]);
    });
});

describe('DNS presets', () => {
    it('has unique ids and non-empty server lists', () => {
        const ids = DNS_RESOLVERS.map(r => r.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(DNS_RESOLVERS.every(r => r.servers.length > 0)).toBe(true);
    });

    it('uses the first preset as the default upstream', () => {
        expect(DEFAULT_DNS_UPSTREAM).toEqual(['1.1.1.1', '8.8.8.8']);
        expect(matchResolverPreset(DEFAULT_DNS_UPSTREAM)?.id).toBe('cloudflare-google');
    });

    it('matches a preset only on an exact server list', () => {
        expect(matchResolverPreset(['1.1.1.1'])).toBeNull();
        expect(matchResolverPreset(['9.9.9.9', '149.112.112.112'])?.id).toBe('quad9');
    });

    it('starts a fresh config with the upstreams plus the system resolver', () => {
        expect(createDefaultDns()).toEqual({
            servers: ['1.1.1.1', '8.8.8.8', 'localhost'],
            queryStrategy: DEFAULT_QUERY_STRATEGY,
            tag: 'dns_inbound',
        });
    });

    it('hands out a copy, so a caller mutating the result cannot edit the preset', () => {
        const first = createDefaultDns();
        first.servers.push('8.8.4.4');
        expect(createDefaultDns().servers).toEqual(['1.1.1.1', '8.8.8.8', 'localhost']);
    });
});

describe('noise presets', () => {
    const typesOf = (finalmask: any) => finalmask.udp.map((mask: any) => mask.type);
    const salamander = { type: 'salamander', settings: { password: 'x' } };

    it('are the noise the WARP profiles carry, one copy for both', () => {
        const profiles = getPresets().filter(preset => preset.name.startsWith('WARP Profile'));
        const carried = profiles.map(preset => (preset.config as any).outbounds[0].streamSettings.finalmask.udp[0].settings.noise);
        expect(carried).toEqual(getNoisePresets().map(preset => preset.noise));
    });

    it('hand out a fresh copy every time', () => {
        const first = noiseItems('warp-a');
        first[0]!.delay = '1-2';
        expect(noiseItems('warp-a')[0]!.delay).toBe('5-10');
    });

    it('recognise a list as the preset it is, however its keys are written', () => {
        const reordered = noiseItems('warp-c').map(item => Object.fromEntries(Object.entries(item).reverse()));
        expect(matchNoisePreset(reordered)).toBe('warp-c');
        expect(matchNoisePreset(noiseItems('warp-c').slice(1))).toBeNull();
        expect(matchNoisePreset(undefined)).toBeNull();
    });

    it('start a UDP chain when there is none', () => {
        expect(withNoisePreset(undefined, 'warp-b', '26.7')).toEqual({ udp: [noiseMask('warp-b')] });
        // The rest of finalmask stays as it was.
        const quicParams = { congestion: 'bbr' };
        expect(withNoisePreset({ quicParams }, 'warp-b', '26.7')).toEqual({ quicParams, udp: [noiseMask('warp-b')] });
    });

    it('fill the noise layer a chain has, keeping its reset and its place', () => {
        const finalmask = { udp: [salamander, { type: 'noise', settings: { reset: '30-60', noise: [{ rand: '10-20' }] } }] };
        const next = withNoisePreset(finalmask, 'warp-a', '26.7') as any;
        expect(next.udp[0]).toBe(salamander);
        expect(next.udp[1]).toEqual({ type: 'noise', settings: { reset: '30-60', noise: noiseItems('warp-a') } });
        // Nothing written back into the value it was given.
        expect(finalmask.udp[1]!.settings).toEqual({ reset: '30-60', noise: [{ rand: '10-20' }] });
    });

    it('add a new layer at the end the core wraps around the socket first', () => {
        // 26.3 walks the list forward, 26.7 and 26.9 from the back.
        expect(typesOf(withNoisePreset({ udp: [salamander] }, 'warp-a', '26.3'))).toEqual(['noise', 'salamander']);
        expect(typesOf(withNoisePreset({ udp: [salamander] }, 'warp-a', '26.7'))).toEqual(['salamander', 'noise']);
        expect(typesOf(withNoisePreset({ udp: [salamander] }, 'warp-a', '26.9'))).toEqual(['salamander', 'noise']);
        // 26.10 reverses the lists up front: the same end.
        expect(typesOf(withNoisePreset({ udp: [salamander] }, 'warp-a', '26.10'))).toEqual(['salamander', 'noise']);
    });

    it('leave a mask that has to hold that end where it is', () => {
        const xicmp = { type: 'xicmp', settings: {} };
        // xicmp is pinned to udp[last] on 26.9 and udp[0] on 26.3.
        expect(typesOf(withNoisePreset({ udp: [salamander, xicmp] }, 'warp-a', '26.9'))).toEqual(['salamander', 'noise', 'xicmp']);
        expect(typesOf(withNoisePreset({ udp: [xicmp, salamander] }, 'warp-a', '26.3'))).toEqual(['xicmp', 'noise', 'salamander']);
    });

    it('know which masks hold the socket end on 26.10', () => {
        const hold = (type: string) => ({ type, settings: {} });
        // xicmp and udphop still have to be last, and an xdns client skips whatever sits after it.
        expect(typesOf(withNoisePreset({ udp: [salamander, hold('xicmp')] }, 'warp-a', '26.10'))).toEqual(['salamander', 'noise', 'xicmp']);
        expect(typesOf(withNoisePreset({ udp: [hold('udphop')] }, 'warp-a', '26.10'))).toEqual(['noise', 'udphop']);
        expect(typesOf(withNoisePreset({ udp: [hold('xdns')] }, 'warp-a', '26.10'))).toEqual(['noise', 'xdns']);
        // realm and a UDP sudoku may sit anywhere now, so the new layer goes past them; on 26.9 they held the end.
        expect(typesOf(withNoisePreset({ udp: [hold('realm')] }, 'warp-a', '26.10'))).toEqual(['realm', 'noise']);
        expect(typesOf(withNoisePreset({ udp: [hold('realm')] }, 'warp-a', '26.9'))).toEqual(['noise', 'realm']);
        expect(typesOf(withNoisePreset({ udp: [hold('xdns')] }, 'warp-a', '26.9'))).toEqual(['xdns', 'noise']);
    });
});
