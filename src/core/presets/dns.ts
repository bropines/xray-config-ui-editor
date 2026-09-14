import { t } from '../../i18n';

// ============================================================
// DNS defaults — src/core/presets/dns.ts
// ============================================================
//
// Every place that writes a `dns` block used to carry its own copy of
// "1.1.1.1, 8.8.8.8, UseIP": the WARP presets, the store's initDns, the
// local-balancer builder, the dns outbound factory. Four copies of the same
// decision means changing it is a search-and-replace, and nothing tells a
// reader which one is authoritative.
//
// This module is that answer. It holds the resolvers the UI offers, the
// default upstream set, and the one factory for a starter `dns` block.
// ============================================================

/** A named upstream the UI can offer as a one-click choice. */
export interface DnsResolverPreset {
    id: string;
    label: string;
    /** What picking it means, in one line. */
    hint: string;
    /** Server entries exactly as Xray expects them. */
    servers: string[];
}

/**
 * Plain IPs rather than DoH URLs on purpose: a client config's DNS block is
 * resolved by the local Xray instance before the tunnel is up, and a DoH URL
 * there needs its own bootstrap. Anyone who wants DoH can paste it — the
 * field is free text.
 */
export const DNS_RESOLVERS: DnsResolverPreset[] = [
    {
        id: 'cloudflare-google',
        get label() { return t("Cloudflare + Google"); },
        get hint() { return t("The common default: 1.1.1.1 with 8.8.8.8 as the second opinion."); },
        servers: ['1.1.1.1', '8.8.8.8'],
    },
    {
        id: 'cloudflare',
        get label() { return t("Cloudflare only"); },
        get hint() { return t("1.1.1.1 and its secondary 1.0.0.1."); },
        servers: ['1.1.1.1', '1.0.0.1'],
    },
    {
        id: 'google',
        get label() { return t("Google only"); },
        get hint() { return t("8.8.8.8 and 8.8.4.4."); },
        servers: ['8.8.8.8', '8.8.4.4'],
    },
    {
        id: 'quad9',
        get label() { return t("Quad9"); },
        get hint() { return t("9.9.9.9 — filters known-malicious domains."); },
        servers: ['9.9.9.9', '149.112.112.112'],
    },
    {
        id: 'adguard',
        get label() { return t("AdGuard DNS"); },
        get hint() { return t("94.140.14.14 — blocks ads and trackers at the DNS level."); },
        servers: ['94.140.14.14', '94.140.15.15'],
    },
    {
        id: 'system',
        get label() { return t("System resolver"); },
        get hint() { return t("Whatever the machine already uses. Answers come from the local network."); },
        servers: ['localhost'],
    },
];

/**
 * What every generator starts from unless the user picks otherwise. A copy,
 * not the preset's own array — a caller that mutates this must not be able to
 * rewrite the preset list for everyone else.
 */
export const DEFAULT_DNS_UPSTREAM: string[] = [...DNS_RESOLVERS[0]!.servers];

/**
 * `UseIP` returns A and AAAA and lets routing match on the resolved address.
 * The alternatives (`UseIPv4`, `UseIPv6`, `AsIs`) are offered in the DNS
 * editor; this is the one a fresh config starts with.
 */
export const DEFAULT_QUERY_STRATEGY = 'UseIP';

/** Tag used when the DNS block needs to be addressable from routing rules. */
export const DEFAULT_DNS_TAG = 'dns_inbound';

/**
 * The starter DNS block for a config that has none — the shape the DNS editor
 * opens with. Includes the system resolver last so a lookup that the upstreams
 * cannot answer still has somewhere to go.
 */
export const createDefaultDns = () => ({
    servers: [...DEFAULT_DNS_UPSTREAM, 'localhost'],
    queryStrategy: DEFAULT_QUERY_STRATEGY,
    tag: DEFAULT_DNS_TAG,
});

/** The resolver preset whose servers match `servers` exactly, if any. */
export const matchResolverPreset = (servers: string[]): DnsResolverPreset | null => {
    const key = (list: string[]) => list.map(s => s.trim()).filter(Boolean).join(',');
    const wanted = key(servers || []);
    return DNS_RESOLVERS.find(preset => key(preset.servers) === wanted) || null;
};
