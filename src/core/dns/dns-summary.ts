// ============================================================
// What is worth knowing about a DNS block at a glance
// ============================================================

import type { XrayConfig } from '../types';

/**
 * The dashboard card used to show a server count, a host count, a strategy and
 * `clientIp`. Two of those are numbers you cannot act on, and `clientIp` is an
 * EDNS Client Subnet hint that is empty in almost every config — so the card
 * read "N/A" permanently and told nobody anything.
 *
 * What actually matters when you glance at a DNS block is which resolvers it
 * uses, whether any of them are scoped to particular domains, and whether the
 * pieces are wired together at all: a DNS block nothing routes to, or FakeDNS
 * pools no inbound sniffs for, are silent no-ops that look configured.
 */
export type DnsIssueCode =
    /** A dns block with nothing to resolve against. */
    | 'no-servers'
    /** A dns outbound exists, but no rule routes queries into it. */
    | 'dns-outbound-unrouted'
    /** FakeDNS pools defined, but no inbound sniffs for fakedns. */
    | 'fakedns-unsniffed'
    /** queryStrategy asks for IPv6 while every upstream is IPv4. */
    | 'ipv6-strategy-ipv4-upstreams';

/**
 * A code rather than a sentence: the wording belongs to the UI, where the
 * translation scanner can see it as a literal. A message built in core would
 * reach `t()` as a variable and never be picked up.
 */
export interface DnsIssue {
    severity: 'error' | 'warning';
    code: DnsIssueCode;
}

export interface DnsSummary {
    configured: boolean;
    /** Upstream addresses, in order, however they were written. */
    servers: string[];
    /** Servers restricted to a domain list — that is what makes DNS split. */
    scopedServers: number;
    strategy: string;
    /** Static host mappings. */
    hosts: number;
    /** EDNS Client Subnet hint, only when actually set. */
    clientIp?: string;
    fakeDns: { enabled: boolean; pools: number; sniffed: boolean };
    /** A rule sends queries to a `dns` protocol outbound. */
    routedToDnsOutbound: boolean;
    issues: DnsIssue[];
}

const addressOf = (server: unknown): string | null => {
    if (typeof server === 'string') return server;
    if (server && typeof server === 'object') {
        const address = (server as any).address;
        if (typeof address === 'string') return address;
    }
    return null;
};

const isScoped = (server: unknown): boolean =>
    !!server && typeof server === 'object' && Array.isArray((server as any).domains)
    && (server as any).domains.length > 0;

export const summariseDns = (config: XrayConfig | null | undefined): DnsSummary => {
    const dns: any = config?.dns;
    const inbounds = (config?.inbounds || []) as any[];
    const outbounds = (config?.outbounds || []) as any[];
    const rules = (config?.routing?.rules || []) as any[];

    const rawServers = Array.isArray(dns?.servers) ? dns.servers : [];
    const servers: string[] = rawServers.map(addressOf).filter((a: string | null): a is string => !!a);
    const scopedServers = rawServers.filter(isScoped).length;

    const fakeDnsRaw = (config as any)?.fakedns ?? dns?.fakedns;
    const pools = Array.isArray(fakeDnsRaw) ? fakeDnsRaw.length : fakeDnsRaw ? 1 : 0;
    // A FakeDNS pool only does anything if some inbound sniffs for it.
    const sniffed = inbounds.some(inbound =>
        (inbound?.sniffing?.destOverride || []).includes('fakedns'));

    const dnsOutboundTags = outbounds
        .filter(o => o?.protocol === 'dns')
        .map(o => o?.tag)
        .filter(Boolean);
    const routedToDnsOutbound = rules.some(rule =>
        rule && typeof rule === 'object' && !('snippet' in rule)
        && dnsOutboundTags.includes(rule.outboundTag));

    const issues: DnsIssue[] = [];
    if (dns) {
        if (servers.length === 0) {
            issues.push({ severity: 'error', code: 'no-servers' });
        }
        if (dnsOutboundTags.length > 0 && !routedToDnsOutbound) {
            issues.push({ severity: 'warning', code: 'dns-outbound-unrouted' });
        }
        if (pools > 0 && !sniffed) {
            issues.push({ severity: 'warning', code: 'fakedns-unsniffed' });
        }
        if (dns.queryStrategy === 'UseIPv6' && servers.every(s => /^\d+\.\d+\.\d+\.\d+/.test(s))) {
            issues.push({ severity: 'warning', code: 'ipv6-strategy-ipv4-upstreams' });
        }
    }

    return {
        configured: !!dns,
        servers,
        scopedServers,
        strategy: dns?.queryStrategy || 'UseIP',
        hosts: Object.keys(dns?.hosts || {}).length,
        clientIp: typeof dns?.clientIp === 'string' && dns.clientIp ? dns.clientIp : undefined,
        fakeDns: { enabled: pools > 0, pools, sniffed },
        routedToDnsOutbound,
        issues,
    };
};
