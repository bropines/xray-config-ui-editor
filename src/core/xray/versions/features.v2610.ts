/**
 * What v26.9.30 and 26.10 added or dropped outside MASQUE, finalmask and the
 * other areas that have a file of their own.
 *
 * Read from v26.9.30 and v26.10.10 against v26.9.9 with
 * scripts/core-versions/inventory.ts: the keys below are the ones whose
 * structs gained or lost a field. The older-tag citations point at the struct
 * that lacks the field, so a reader can see the absence for themselves.
 *
 * The two lines split these between them. v26.9.30 has the tun keys and has
 * lost WireGuard's `domainStrategy`; 26.10 alone adds the dns and routing
 * scripts, the dns server `id` and `useSystemCA` (every one of them is absent
 * from v26.9.30's structs, cited below), so a row says both columns.
 */
import type { CoreFeature, CoreValueSet, FeatureStatus } from './features';
import { byLine } from './by-line';

const s = byLine<FeatureStatus>;

const SIDES = ['outbound', 'inbound'] as const;

export const V2610_FEATURES: CoreFeature[] = [
    // ── dns and routing: Lua scripts (26.10 only) ───────────────────────
    {
        id: 'config.dns.script',
        scope: 'config',
        path: 'dns.script',
        status: s('absent', 'absent', 'absent', 'absent', 'accepted'),
        detail: 'A Lua file that answers DNS queries arrived in 26.10; the core resolves the path at load and refuses one it cannot find. v26.9.30 has no such key.',
        evidence: [
            'v26.3.27:infra/conf/dns.go:198', 'v26.7.28:infra/conf/dns.go:160', 'v26.9.9:infra/conf/dns.go:160',
            'v26.9.30:infra/conf/dns.go:160',
            'v26.10.10:infra/conf/dns.go:167', 'v26.10.10:infra/conf/dns.go:287-293',
        ],
    },
    {
        id: 'config.routing.script',
        scope: 'config',
        path: 'routing.script',
        status: s('absent', 'absent', 'absent', 'absent', 'accepted'),
        detail: 'A Lua file that picks the route arrived in 26.10; the core resolves the path at load and refuses one it cannot find. v26.9.30 has no such key.',
        evidence: [
            'v26.3.27:infra/conf/router.go:77', 'v26.7.28:infra/conf/router.go:71', 'v26.9.9:infra/conf/router.go:71',
            'v26.9.30:infra/conf/router.go:71',
            'v26.10.10:infra/conf/router.go:76', 'v26.10.10:infra/conf/router.go:98-104',
        ],
    },
    {
        id: 'dnsServer.id',
        scope: 'dnsServer',
        path: 'id',
        status: s('absent', 'absent', 'absent', 'absent', 'accepted'),
        detail: 'A DNS server can carry an id for the DNS script to name it; earlier lines, v26.9.30 included, have no such key and drop it silently.',
        evidence: [
            'v26.3.27:infra/conf/dns.go:18', 'v26.7.28:infra/conf/dns.go:19', 'v26.9.9:infra/conf/dns.go:19',
            'v26.9.30:infra/conf/dns.go:19',
            'v26.10.10:infra/conf/dns.go:21',
        ],
    },

    // ── tun (v26.9.30) ──────────────────────────────────────────────────
    ...(['autoSystemDnsToGateway', 'autoSystemWfpBlockLeak'] as const).map((key, index): CoreFeature => ({
        id: `inbound.tun.${key}`,
        scope: 'inbound',
        protocol: ['tun'],
        path: `settings.${key}`,
        status: s('absent', 'absent', 'absent', 'accepted', 'accepted'),
        detail: key === 'autoSystemDnsToGateway'
            ? 'Pointing the system DNS at the TUN gateway arrived in v26.9.30; on Linux it needs a gateway.'
            : 'Windows filters that block traffic leaking around the TUN arrived in v26.9.30; on Windows they need autoSystemRoutingTable.',
        evidence: [
            'v26.3.27:infra/conf/tun.go:8', 'v26.7.28:infra/conf/tun.go:14', 'v26.9.9:infra/conf/tun.go:14',
            `v26.9.30:infra/conf/tun.go:${27 + index}`,
            `v26.10.10:infra/conf/tun.go:${27 + index}`,
        ],
    })),

    // ── TLS (26.10 only) ────────────────────────────────────────────────
    ...SIDES.map(scope => ({
        id: `${scope}.tlsSettings.useSystemCA`,
        scope,
        path: 'streamSettings.tlsSettings.useSystemCA',
        status: s('absent', 'absent', 'absent', 'absent', 'accepted'),
        detail: 'Trusting the operating system\'s certificate store alongside the configured certificates arrived in 26.10; v26.9.30 has no such key.',
        evidence: [
            'v26.3.27:infra/conf/transport_internet.go:646', 'v26.7.28:infra/conf/transport_security.go:300',
            'v26.9.9:infra/conf/transport_security.go:300', 'v26.9.30:infra/conf/transport_security.go:300-319',
            'v26.10.10:infra/conf/transport_security.go:319',
        ],
    } satisfies CoreFeature)),

    // ── wireguard (v26.9.30) ────────────────────────────────────────────
    // WireGuardConfig lost the field, and with it the check that fails a bad
    // value: the endpoint is looked up through the core's DNS for both
    // families (v26.9.30:proxy/wireguard/client.go:344 and the same line of
    // v26.10.10, whose client.go is identical).
    ...SIDES.map(scope => ({
        id: `${scope}.wireguard.domainStrategy.key`,
        scope,
        protocol: ['wireguard'],
        path: 'settings.domainStrategy',
        status: s('accepted', 'accepted', 'accepted', 'absent', 'absent'),
        detail: 'WireGuard no longer has a domain strategy of its own from v26.9.30; the key is dropped silently and the endpoint name is resolved for both address families.',
        evidence: ['v26.9.9:infra/conf/wireguard.go:68', 'v26.9.30:infra/conf/wireguard.go:59-69', 'v26.10.10:infra/conf/wireguard.go:59-69'],
    } satisfies CoreFeature)),
    // remoteDNS keeps its row (accepted from 26.9). What its entries may be is
    // not a row: v26.9.9 took ["local"] to mean "resolve names with the core's
    // own DNS, not through the tunnel" (v26.9.9:proxy/wireguard/client.go:117-120),
    // and v26.9.30 and 26.10 parse every entry as an IP with MustParseAddr,
    // which panics on a name (v26.9.30:proxy/wireguard/client.go:101-108,
    // v26.10.10:proxy/wireguard/client.go:101-108). That is judged, line by
    // line, with the rest of the outbound in core/xray/wireguard-outbound.
];

export const V2610_VALUE_SETS: CoreValueSet[] = [
    {
        id: 'inbound.tun.autoSystemWfpBlockLeak',
        scope: 'inbound',
        protocol: ['tun'],
        path: 'settings.autoSystemWfpBlockLeak[]',
        allowed: byLine<string[] | null>(null, null, null, ['dns', 'misconfigtun'], ['dns', 'misconfigtun']),
        outside: 'rejected',
        detail: 'Lower-cased, then matched against dns and misconfigtun; any other entry fails the load with "unknown autoSystemWfpBlockLeak value".',
        evidence: ['v26.9.30:infra/conf/tun.go:42-49', 'v26.10.10:infra/conf/tun.go:42-49'],
    },
];
