import { describe, expect, it } from 'bun:test';
import { summariseDns } from './dns-summary';

const base: any = {
    inbounds: [{ tag: 'in', protocol: 'socks', sniffing: { enabled: true, destOverride: ['http', 'tls'] } }],
    outbounds: [{ tag: 'direct', protocol: 'freedom' }],
    routing: { rules: [] },
};

describe('summariseDns', () => {
    it('reports nothing configured when there is no dns block', () => {
        const summary = summariseDns(base);
        expect(summary.configured).toBe(false);
        expect(summary.issues).toEqual([]);
    });

    it('reads upstreams in both the string and object forms', () => {
        const summary = summariseDns({
            ...base,
            dns: { servers: ['1.1.1.1', { address: 'https://dns.google/dns-query', domains: ['geosite:google'] }] },
        });
        expect(summary.servers).toEqual(['1.1.1.1', 'https://dns.google/dns-query']);
        // A server restricted to domains is what makes DNS split, which is the
        // structural fact worth seeing at a glance.
        expect(summary.scopedServers).toBe(1);
    });

    it('flags a dns block that resolves nothing', () => {
        const summary = summariseDns({ ...base, dns: { servers: [] } });
        expect(summary.issues[0]).toEqual({ severity: 'error', code: 'no-servers' });
    });

    it('flags a dns outbound nothing routes to', () => {
        // The classic half-wired DNS setup: the outbound exists, no rule sends
        // queries to it, and DNS quietly never goes through it.
        const summary = summariseDns({
            ...base,
            dns: { servers: ['1.1.1.1'] },
            outbounds: [...base.outbounds, { tag: 'dns-out', protocol: 'dns' }],
        });
        expect(summary.routedToDnsOutbound).toBe(false);
        expect(summary.issues.map(i => i.code)).toContain('dns-outbound-unrouted');
    });

    it('says nothing when the dns outbound is routed to', () => {
        const summary = summariseDns({
            ...base,
            dns: { servers: ['1.1.1.1'] },
            outbounds: [...base.outbounds, { tag: 'dns-out', protocol: 'dns' }],
            routing: { rules: [{ type: 'field', port: 53, outboundTag: 'dns-out' }] },
        });
        expect(summary.routedToDnsOutbound).toBe(true);
        expect(summary.issues).toEqual([]);
    });

    it('flags FakeDNS pools no inbound sniffs for', () => {
        const summary = summariseDns({
            ...base,
            dns: { servers: ['1.1.1.1'] },
            fakedns: [{ ipPool: '198.18.0.0/15', poolSize: 65535 }],
        });
        expect(summary.fakeDns).toEqual({ enabled: true, pools: 1, sniffed: false });
        expect(summary.issues.map(i => i.code)).toContain('fakedns-unsniffed');
    });

    it('accepts FakeDNS when an inbound sniffs for it', () => {
        const summary = summariseDns({
            ...base,
            inbounds: [{ tag: 'in', protocol: 'socks', sniffing: { destOverride: ['http', 'tls', 'fakedns'] } }],
            dns: { servers: ['1.1.1.1'] },
            fakedns: [{ ipPool: '198.18.0.0/15' }],
        });
        expect(summary.fakeDns.sniffed).toBe(true);
        expect(summary.issues).toEqual([]);
    });

    it('notices UseIPv6 with only IPv4 upstreams', () => {
        const summary = summariseDns({
            ...base,
            dns: { servers: ['1.1.1.1', '8.8.8.8'], queryStrategy: 'UseIPv6' },
        });
        expect(summary.issues.map(i => i.code)).toContain('ipv6-strategy-ipv4-upstreams');
    });

    it('surfaces clientIp only when it is actually set', () => {
        // It used to read "N/A" permanently, which told nobody anything.
        expect(summariseDns({ ...base, dns: { servers: ['1.1.1.1'] } }).clientIp).toBeUndefined();
        expect(summariseDns({ ...base, dns: { servers: ['1.1.1.1'], clientIp: '' } }).clientIp).toBeUndefined();
        expect(summariseDns({ ...base, dns: { servers: ['1.1.1.1'], clientIp: '1.2.3.4' } }).clientIp).toBe('1.2.3.4');
    });

    it('counts static hosts and defaults the strategy', () => {
        const summary = summariseDns({
            ...base,
            dns: { servers: ['1.1.1.1'], hosts: { 'a.com': '1.2.3.4', 'b.com': '5.6.7.8' } },
        });
        expect(summary.hosts).toBe(2);
        expect(summary.strategy).toBe('UseIP');
    });

    it('ignores snippet placeholders when looking for routing', () => {
        const summary = summariseDns({
            ...base,
            dns: { servers: ['1.1.1.1'] },
            outbounds: [...base.outbounds, { tag: 'dns-out', protocol: 'dns' }],
            routing: { rules: [{ snippet: 'SOMETHING' }] },
        });
        expect(summary.routedToDnsOutbound).toBe(false);
    });

    it('survives a null config', () => {
        expect(summariseDns(null).configured).toBe(false);
    });
});
