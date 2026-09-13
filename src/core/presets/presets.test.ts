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
