/**
 * What each supported core does with a given key or value.
 *
 * Four answers, and the difference between them is the whole point:
 *
 *   accepted    decoded and used
 *   deprecated  used, with a warning in the log and usually a replacement
 *   absent      the struct has no such field — Go's decoder drops it without
 *               a word (`DecodeJSONConfig` does not DisallowUnknownFields),
 *               so the setting silently does nothing
 *   rejected    Build() returns an error — a removed-feature error or a failed
 *               validation — and the config does not load at all
 *
 * "absent" is the quiet bug (a switch that does nothing); "rejected" is the
 * loud one (a node that will not start). The editor needs both.
 *
 * Every entry names the source it was read from as `tag:file:line`, and the
 * tests hold the table to the version list, so a line added to CORE_VERSIONS
 * without a column here fails rather than defaulting silently.
 */
import type { CoreVersionId } from './index';
import { byLine, onEveryLine } from './by-line';
import { GENERATED_FEATURES } from './features.data';
import { FINALMASK_FEATURES, FINALMASK_VALUE_SETS } from './features.finalmask';
import { TRANSPORT_FEATURES, TRANSPORT_VALUE_SETS } from './features.transport';
import { INBOUND_FEATURES, INBOUND_VALUE_SETS, SS_2022, SS_CLASSIC } from './features.inbound';
import { MASQUE_FEATURES } from './features.masque';
import { V2610_FEATURES, V2610_VALUE_SETS } from './features.v2610';

export type FeatureStatus = 'accepted' | 'deprecated' | 'absent' | 'rejected';

/** Where in a config a feature lives. */
export type FeatureScope = 'config' | 'inbound' | 'outbound' | 'rule' | 'balancer' | 'dnsServer';

export interface CoreFeature {
    id: string;
    scope: FeatureScope;
    /** Inbound/outbound only: the protocols this applies to. */
    protocol?: string[];
    /**
     * Dotted path inside the scoped object. `[]` walks every element of an
     * array: `settings.servers[].uot`.
     */
    path: string;
    /**
     * Set when the feature is one value of the field rather than the field
     * itself — `streamSettings.network` = `quic`. Matched case-insensitively,
     * as the core lower-cases these before its switch.
     */
    value?: string;
    /**
     * Count only a non-empty value: not `""`, `[]` or `{}`. For the keys the
     * core refuses only when they say something — a trojan `flow` of `""` and
     * a top-level `transport: {}` both load fine.
     */
    nonEmpty?: boolean;
    /**
     * The id of the row for the object this key sits in. When that row is
     * reported at the same place, this one is left out of the diagnostics: a
     * config that holds a whole object a line does not know gets one finding,
     * not one per key. Editors still ask this row for the key's own status.
     */
    coveredBy?: string;
    status: Record<CoreVersionId, FeatureStatus>;
    /** What to use instead, when the core names something. */
    replacement?: string;
    /** One English sentence; the user-facing wording is built in check.ts. */
    detail: string;
    evidence: string[];
}

/**
 * 26.9.30 and 26.10 follow 26.9 unless a row says otherwise — and a row whose
 * 26.9 and 26.10 differ has to say, for both (see by-line.ts).
 */
const s = byLine<FeatureStatus>;

/**
 * Rows written by hand: the ones the editors ask about by id, and the ones
 * the findings could not state as a single path. They win over a generated
 * row for the same place — see mergeFeatures below.
 */
const HAND_FEATURES: CoreFeature[] = [
    // ── outbound wrapper ────────────────────────────────────────────────
    {
        id: 'outbound.proxySettings',
        scope: 'outbound',
        path: 'proxySettings',
        status: s('accepted', 'accepted', 'rejected'),
        replacement: 'streamSettings.sockopt.dialerProxy',
        detail: 'Proxy chaining through proxySettings became a removed feature; the core refuses the config.',
        evidence: ['v26.9.9:infra/conf/xray.go:262', 'v26.10.10:infra/conf/xray.go:268'],
    },

    // ── protocols ───────────────────────────────────────────────────────
    {
        id: 'outbound.protocol.masque',
        scope: 'outbound',
        path: 'protocol',
        value: 'masque',
        status: s('rejected', 'rejected', 'rejected', 'accepted', 'accepted'),
        detail: 'MASQUE is registered as an outbound protocol from v26.9.30; before that the loader fails on an unknown protocol.',
        evidence: ['v26.9.9:infra/conf/xray.go:38', 'v26.9.30:infra/conf/xray.go:53', 'v26.10.10:infra/conf/xray.go:53'],
    },
    {
        id: 'inbound.protocol.masque',
        scope: 'inbound',
        path: 'protocol',
        value: 'masque',
        status: s('rejected', 'rejected', 'rejected', 'accepted', 'accepted'),
        detail: 'MASQUE is registered as an inbound protocol from v26.9.30; before that the loader fails on an unknown protocol.',
        evidence: ['v26.9.9:infra/conf/xray.go:23', 'v26.9.30:infra/conf/xray.go:36', 'v26.10.10:infra/conf/xray.go:36'],
    },

    // ── shadowsocks ─────────────────────────────────────────────────────
    // The line reads the keys or not; what 26.3 then does with them depends on
    // the cipher (only the 2022 builder passes them on), which is a rule —
    // core/xray/shadowsocks-outbound — and not a row. So 26.3 says `accepted`.
    {
        id: 'outbound.shadowsocks.uot',
        scope: 'outbound',
        protocol: ['shadowsocks', 'shadowsocks-2022'],
        path: 'settings.uot',
        status: s('accepted', 'absent', 'absent'),
        detail: 'UDP over TCP was dropped from the shadowsocks client config after 26.3, where only the 2022 builder passes it on.',
        evidence: ['v26.3.27:infra/conf/shadowsocks.go:179-180', 'v26.3.27:infra/conf/shadowsocks.go:223-224', 'v26.7.28:infra/conf/shadowsocks.go:188-196', 'v26.10.10:infra/conf/shadowsocks.go:189-197'],
    },
    {
        id: 'outbound.shadowsocks.servers.uot',
        scope: 'outbound',
        protocol: ['shadowsocks', 'shadowsocks-2022'],
        path: 'settings.servers[].uot',
        status: s('accepted', 'absent', 'absent'),
        detail: 'UDP over TCP was dropped from shadowsocks server entries after 26.3, where only the 2022 builder passes it on.',
        evidence: ['v26.3.27:infra/conf/shadowsocks.go:168-169', 'v26.3.27:infra/conf/shadowsocks.go:223-224', 'v26.7.28:infra/conf/shadowsocks.go:179-186', 'v26.10.10:infra/conf/shadowsocks.go:180-187'],
    },
    {
        id: 'outbound.shadowsocks.servers.uotVersion',
        scope: 'outbound',
        protocol: ['shadowsocks', 'shadowsocks-2022'],
        path: 'settings.servers[].uotVersion',
        status: s('accepted', 'absent', 'absent'),
        detail: 'The UDP-over-TCP version was dropped from shadowsocks server entries after 26.3, where only the 2022 builder passes it on.',
        evidence: ['v26.3.27:infra/conf/shadowsocks.go:168-169', 'v26.3.27:infra/conf/shadowsocks.go:223-224', 'v26.7.28:infra/conf/shadowsocks.go:179-186', 'v26.10.10:infra/conf/shadowsocks.go:180-187'],
    },

    // ── loopback ────────────────────────────────────────────────────────
    {
        id: 'outbound.loopback.sniffing',
        scope: 'outbound',
        protocol: ['loopback'],
        path: 'settings.sniffing',
        status: s('absent', 'accepted', 'accepted'),
        detail: 'Sniffing on loopback re-entry arrived in 26.7.',
        evidence: ['v26.7.28:infra/conf/loopback.go:11', 'v26.10.10:infra/conf/loopback.go:11'],
    },

    // ── freedom ─────────────────────────────────────────────────────────
    {
        id: 'outbound.freedom.finalRules',
        scope: 'outbound',
        protocol: ['freedom'],
        path: 'settings.finalRules',
        status: s('absent', 'accepted', 'accepted'),
        detail: 'Freedom finalRules arrived in 26.7.',
        evidence: ['v26.7.28:infra/conf/freedom.go:29', 'v26.10.10:infra/conf/freedom.go:29'],
    },

    // ── wireguard ───────────────────────────────────────────────────────
    {
        id: 'outbound.wireguard.workers',
        scope: 'outbound',
        protocol: ['wireguard'],
        path: 'settings.workers',
        status: s('accepted', 'absent', 'absent'),
        detail: 'WireGuard workers was dropped after 26.3.',
        evidence: ['v26.3.27:infra/conf/wireguard.go', 'v26.7.28:infra/conf/wireguard.go', 'v26.10.10:infra/conf/wireguard.go:59-69'],
    },
    {
        id: 'outbound.wireguard.remoteDNS',
        scope: 'outbound',
        protocol: ['wireguard'],
        path: 'settings.remoteDNS',
        status: s('absent', 'absent', 'accepted'),
        detail: 'WireGuard remoteDNS arrived in 26.9.',
        evidence: ['v26.9.9:infra/conf/wireguard.go:69', 'v26.10.10:infra/conf/wireguard.go:68'],
    },

    // ── transports that load with a deprecation warning ─────────────────
    ...(['grpc', 'ws', 'websocket', 'httpupgrade'] as const).flatMap(network =>
        (['outbound', 'inbound'] as const).map(scope => ({
            id: `${scope}.network.${network}`,
            scope,
            path: 'streamSettings.network',
            value: network,
            status: s('deprecated', 'deprecated', 'deprecated'),
            replacement: 'xhttp',
            detail: `The ${network} transport still loads, and every supported core logs that XHTTP should replace it.`,
            evidence: ['v26.3.27:infra/conf/transport_internet.go', 'v26.9.9:infra/conf/transport_internet.go', 'v26.10.10:infra/conf/transport_internet.go:24-32'],
        } satisfies CoreFeature)),
    ),

    // ── trojan ──────────────────────────────────────────────────────────
    {
        id: 'outbound.trojan.servers.flow',
        scope: 'outbound',
        protocol: ['trojan'],
        path: 'settings.servers[].flow',
        nonEmpty: true,
        status: s('rejected', 'rejected', 'rejected'),
        replacement: 'VLESS with flow',
        detail: 'Flow for Trojan is a removed feature; any non-empty flow, flat or in servers[], fails the load.',
        evidence: ['v26.3.27:infra/conf/trojan.go', 'v26.9.9:infra/conf/trojan.go', 'v26.10.10:infra/conf/trojan.go'],
    },

    // ── routing ─────────────────────────────────────────────────────────
    {
        id: 'rule.domainStrategy',
        scope: 'rule',
        path: 'domainStrategy',
        status: s('absent', 'absent', 'absent'),
        replacement: 'routing.domainStrategy (IPIfNonMatch / IPOnDemand) and dns.queryStrategy',
        detail: 'A rule has no domainStrategy of its own; resolution is decided by routing.domainStrategy.',
        evidence: ['v26.3.27:infra/conf/router.go', 'v26.9.9:infra/conf/router.go', 'v26.10.10:infra/conf/router.go'],
    },
    {
        id: 'rule.localOS',
        scope: 'rule',
        path: 'localOS',
        status: s('absent', 'absent', 'accepted'),
        detail: 'Matching on the local operating system arrived in 26.9.',
        evidence: ['v26.9.9:infra/conf/router.go', 'v26.10.10:infra/conf/router.go'],
    },
];

/** Two rows describe the same thing when they look in the same place. */
const samePlace = (a: CoreFeature, b: CoreFeature): boolean =>
    a.scope === b.scope
    && a.path === b.path
    && a.value === b.value
    && (!a.protocol || !b.protocol || a.protocol.some(name => b.protocol!.includes(name)));

const mergeFeatures = (hand: CoreFeature[], generated: CoreFeature[]): CoreFeature[] => [
    ...hand,
    ...generated.filter(row => !hand.some(own => samePlace(own, row))),
];

export const FEATURES: CoreFeature[] = mergeFeatures(
    [...HAND_FEATURES, ...FINALMASK_FEATURES, ...TRANSPORT_FEATURES, ...INBOUND_FEATURES, ...MASQUE_FEATURES, ...V2610_FEATURES],
    GENERATED_FEATURES,
);

/**
 * A field whose accepted values differ between lines.
 *
 * FEATURES answers "is this key, or this one value, known"; a value set
 * answers "which values does this line take here" — the list a chooser offers
 * and the list anything outside of is reported against. One table for both,
 * so the chooser cannot offer what the check then calls broken.
 */
export interface CoreValueSet {
    id: string;
    scope: FeatureScope;
    protocol?: string[];
    /** Where the value sits; `[]` walks arrays. */
    path: string;
    /**
     * Every value each line accepts, in the order a chooser should list them.
     * `null` for a line that has no such field at all — the key is dropped
     * there, so its values are not checked (a FEATURES row says the rest).
     */
    allowed: Record<CoreVersionId, string[] | null>;
    /**
     * What the core does with a value outside the set: `rejected` when it
     * fails the load (an unknown mask type is "unknown config id"), `absent`
     * when it quietly falls back to a default.
     */
    outside: Extract<FeatureStatus, 'rejected' | 'absent'>;
    /** Values the core compares after lower-casing; most do. */
    caseSensitive?: boolean;
    /**
     * The list is what a chooser offers, not what the core accepts: whether a
     * value is accepted depends on other keys, so a rule judges it and
     * `valueUses` leaves the set out. Its `allowed` lists stay the offered
     * values per line.
     */
    offeredOnly?: boolean;
    /** For a value that went away: what took its place. */
    replacedBy?: Record<string, string>;
    detail: string;
    evidence: string[];
}

const both = (a: string[], b: string[]) => [...a, ...b];

/** Mask types each line registers, per list — `transport_finalmask.go`. */
const FINALMASK_TCP_263 = ['header-custom', 'fragment', 'sudoku'];
const FINALMASK_TCP_267 = both(FINALMASK_TCP_263, ['xmc']);
const FINALMASK_UDP_263 = [
    'header-custom', 'header-dns', 'header-dtls', 'header-srtp', 'header-utp', 'header-wechat',
    'header-wireguard', 'mkcp-original', 'mkcp-aes128gcm', 'noise', 'salamander', 'sudoku', 'xdns', 'xicmp',
];
const FINALMASK_UDP_267 = ['header-custom', 'mkcp-legacy', 'noise', 'salamander', 'sudoku', 'xdns', 'xicmp', 'realm'];
const FINALMASK_UDP_269 = both(FINALMASK_UDP_267, ['udphop']);
// v26.9.30 and v26.10.10 register the same types as v26.9.9 (v26.9.9:transport_finalmask.go:72-77 for TCP,
// :79-89 for UDP; v26.9.30:transport_finalmask.go:73-78 and :80-90; v26.10.10 the same lines); a list
// of its own for each, so a later release that changes one has somewhere to do it.
const FINALMASK_TCP_2693 = [...FINALMASK_TCP_267];
const FINALMASK_UDP_2693 = [...FINALMASK_UDP_269];
const FINALMASK_TCP_2610 = [...FINALMASK_TCP_267];
const FINALMASK_UDP_2610 = [...FINALMASK_UDP_269];

/**
 * Transport names `TransportProtocol.Build()` knows — the same on the first
 * three lines (v26.9.30 and 26.10 add two, below). Anything else is "unknown
 * transport protocol" and the config does not
 * load; `h2`/`h3`/`http`/`quic` are removed-feature errors, which amounts to
 * the same thing. `udp` is not a transport name either, though for a while
 * this editor wrote it into every WireGuard and Hysteria endpoint.
 */
const NETWORKS = ['raw', 'tcp', 'xhttp', 'splithttp', 'kcp', 'mkcp', 'grpc', 'ws', 'websocket', 'httpupgrade', 'hysteria'];

/**
 * v26.9.30 registers two more, and v26.10.10 keeps them: `masque`
 * (CONNECT-IP over HTTP/3 or HTTP/2, only for the masque proxy) and `xdrive`
 * (a cloud drive as the carrier)
 * (v26.9.30:infra/conf/transport_internet.go:39-42, v26.10.10:infra/conf/transport_internet.go:39-42).
 */
const NETWORKS_2693 = [...NETWORKS, 'masque', 'xdrive'];

/** The same value list on every line. */
const everywhere = (values: string[]): Record<CoreVersionId, string[]> => onEveryLine(values);

/** Outbound protocol values, read from findings/protocols.json. */
const DOMAIN_STRATEGIES = [
    'AsIs', 'UseIP', 'UseIPv4', 'UseIPv6', 'UseIPv4v6', 'UseIPv6v4',
    'ForceIP', 'ForceIPv4', 'ForceIPv6', 'ForceIPv4v6', 'ForceIPv6v4',
];

const OUTBOUND_VALUE_SETS: CoreValueSet[] = [
    {
        id: 'outbound.blackhole.response.type',
        scope: 'outbound',
        protocol: ['blackhole', 'block'],
        path: 'settings.response.type',
        allowed: byLine(['none', 'http'], ['none', 'http'], ['none', 'http', 'custom']),
        outside: 'rejected',
        detail: 'The custom response exists only from 26.9; before that a response type is looked up by id and anything unlisted is "unknown config id".',
        evidence: ['v26.7.28:infra/conf/blackhole.go', 'v26.9.9:infra/conf/blackhole.go', 'v26.10.10:infra/conf/blackhole.go'],
    },
    ...(['settings.method', 'settings.servers[].method'] as const).map((path, i): CoreValueSet => ({
        id: i === 0 ? 'outbound.shadowsocks.method' : 'outbound.shadowsocks.servers.method',
        scope: 'outbound',
        protocol: ['shadowsocks', 'shadowsocks-2022'],
        path,
        allowed: byLine([...SS_2022, ...SS_CLASSIC, 'none', 'plain'], [...SS_2022, ...SS_CLASSIC], [...SS_2022, ...SS_CLASSIC]),
        outside: 'rejected',
        // The list is for the chooser. Whether a config's method is accepted
        // depends on more than the name — a 2022 name is compared exactly up
        // to 26.9 and lower-cased from v26.9.30, the classic ones are
        // lower-cased on every line, and an empty one is refused — none of
        // which a flat list can say. shadowsocksOutboundProblems does.
        offeredOnly: true,
        detail: 'The none and plain ciphers were removed in 26.7 and now fail with "unknown cipher method", as does any other unknown name.',
        evidence: ['v26.3.27:infra/conf/shadowsocks.go:26', 'v26.7.28:infra/conf/shadowsocks.go:17', 'v26.7.28:infra/conf/shadowsocks.go:256-259', 'v26.9.9:infra/conf/shadowsocks.go:256-259', 'v26.9.30:infra/conf/shadowsocks.go:241-244', 'v26.10.10:infra/conf/shadowsocks.go:241-244'],
    })),
    ...(['settings.security', 'settings.vnext[].users[].security'] as const).map((path, i): CoreValueSet => ({
        id: i === 0 ? 'outbound.vmess.security' : 'outbound.vmess.users.security',
        scope: 'outbound',
        protocol: ['vmess'],
        path,
        allowed: byLine(
            ['auto', 'aes-128-gcm', 'chacha20-poly1305', 'none', 'zero'],
            ['auto', 'aes-128-gcm', 'chacha20-poly1305'],
            ['auto', 'aes-128-gcm', 'chacha20-poly1305'],
        ),
        // Not an error: an unlisted value quietly becomes auto.
        outside: 'absent',
        replacedBy: { none: 'auto', zero: 'auto' },
        detail: 'From 26.7 none and zero still load but quietly mean auto.',
        evidence: ['v26.3.27:infra/conf/vmess.go', 'v26.7.28:infra/conf/vmess.go', 'v26.10.10:infra/conf/vmess.go'],
    })),
    ...(['settings.flow', 'settings.vnext[].users[].flow'] as const).map((path, i): CoreValueSet => ({
        id: i === 0 ? 'outbound.vless.flow' : 'outbound.vless.users.flow',
        scope: 'outbound',
        protocol: ['vless'],
        path,
        allowed: everywhere(['', 'xtls-rprx-vision', 'xtls-rprx-vision-udp443']),
        outside: 'rejected',
        caseSensitive: true,
        detail: 'Flow is matched exactly; any other value fails the config.',
        evidence: ['v26.3.27:infra/conf/vless.go', 'v26.9.9:infra/conf/vless.go', 'v26.10.10:infra/conf/vless.go'],
    })),
    {
        id: 'outbound.freedom.noises.type',
        scope: 'outbound',
        protocol: ['freedom', 'direct'],
        path: 'settings.noises[].type',
        allowed: everywhere(['rand', 'str', 'hex', 'base64']),
        outside: 'rejected',
        // No lower-casing here: "Rand" fails the config.
        caseSensitive: true,
        detail: 'Noise types are matched exactly; anything else fails with "Invalid packet".',
        evidence: ['v26.3.27:infra/conf/freedom.go', 'v26.9.9:infra/conf/freedom.go', 'v26.10.10:infra/conf/freedom.go'],
    },
    ...(['settings.targetStrategy', 'settings.domainStrategy'] as const).map((path, i): CoreValueSet => ({
        id: i === 0 ? 'outbound.freedom.targetStrategy' : 'outbound.freedom.domainStrategy',
        scope: 'outbound',
        protocol: ['freedom', 'direct'],
        path,
        allowed: everywhere(['', ...DOMAIN_STRATEGIES]),
        outside: 'rejected',
        detail: 'Any other value fails the config with "unsupported domain strategy".',
        evidence: ['v26.3.27:infra/conf/freedom.go', 'v26.9.9:infra/conf/freedom.go', 'v26.10.10:infra/conf/freedom.go'],
    })),
    {
        id: 'outbound.freedom.finalRules.action',
        scope: 'outbound',
        protocol: ['freedom', 'direct'],
        path: 'settings.finalRules[].action',
        allowed: byLine<string[] | null>(null, ['allow', 'block'], ['allow', 'block']),
        outside: 'rejected',
        detail: 'Required from 26.7; a missing or unlisted action fails with "unknown action".',
        evidence: ['v26.7.28:infra/conf/freedom.go', 'v26.10.10:infra/conf/freedom.go'],
    },
    {
        id: 'outbound.dns.rules.action',
        scope: 'outbound',
        protocol: ['dns'],
        path: 'settings.rules[].action',
        allowed: byLine<string[] | null>(null, ['direct', 'drop', 'return', 'hijack'], ['direct', 'drop', 'return', 'hijack']),
        outside: 'rejected',
        detail: 'Required from 26.7; a missing or unlisted action fails with "unknown action".',
        evidence: ['v26.7.28:infra/conf/dns_proxy.go', 'v26.10.10:infra/conf/dns_proxy.go'],
    },
    {
        id: 'outbound.loopback.sniffing.destOverride',
        scope: 'outbound',
        protocol: ['loopback'],
        path: 'settings.sniffing.destOverride[]',
        allowed: byLine<string[] | null>(
            null,
            ['http', 'tls', 'quic', 'fakedns', 'fakedns+others', 'https', 'ssl'],
            ['http', 'tls', 'quic', 'fakedns', 'fakedns+others', 'https', 'ssl'],
        ),
        outside: 'rejected',
        detail: 'https and ssl mean tls; any other entry fails with "unknown protocol".',
        evidence: ['v26.7.28:infra/conf/loopback.go', 'v26.10.10:infra/conf/loopback.go'],
    },
    {
        // RouterConfig.getDomainStrategy (infra/conf/router.go, every tag)
        // lower-cases and matches ipifnonmatch / ipondemand; anything
        // else — UseIP, UseIPv4, a typo — falls to AsIs without a word.
        id: 'routing.domainStrategy',
        scope: 'config',
        path: 'routing.domainStrategy',
        allowed: everywhere(['AsIs', 'IPIfNonMatch', 'IPOnDemand']),
        outside: 'absent',
        replacedBy: { useip: 'IPIfNonMatch', useipv4: 'IPIfNonMatch + dns.queryStrategy UseIPv4', useipv6: 'IPIfNonMatch + dns.queryStrategy UseIPv6' },
        detail: 'Routing resolves domains for IP rules only with IPIfNonMatch or IPOnDemand; any other value quietly means AsIs.',
        evidence: ['v26.3.27:infra/conf/router.go:83', 'v26.7.28:infra/conf/router.go:77', 'v26.9.9:infra/conf/router.go:77', 'v26.10.10:infra/conf/router.go:79'],
    },
    {
        // Diagnostics only; the WireGuard chooser already offers exactly these.
        id: 'outbound.wireguard.domainStrategy',
        scope: 'outbound',
        protocol: ['wireguard'],
        path: 'settings.domainStrategy',
        // v26.9.30 and 26.10 have no such field, so nothing checks the value (a FEATURES row says the rest).
        allowed: byLine<string[] | null>(
            ['', 'ForceIP', 'ForceIPv4', 'ForceIPv6', 'ForceIPv4v6', 'ForceIPv6v4'],
            ['', 'ForceIP', 'ForceIPv4', 'ForceIPv6', 'ForceIPv4v6', 'ForceIPv6v4'],
            ['', 'ForceIP', 'ForceIPv4', 'ForceIPv6', 'ForceIPv4v6', 'ForceIPv6v4'],
            null,
            null,
        ),
        outside: 'rejected',
        detail: 'Only the ForceIP family is accepted; AsIs and UseIP fail the config. v26.9.30 dropped the key.',
        evidence: ['v26.3.27:infra/conf/wireguard.go', 'v26.9.9:infra/conf/wireguard.go', 'v26.9.30:infra/conf/wireguard.go:59-69', 'v26.10.10:infra/conf/wireguard.go:59-69'],
    },
];

const BASE_VALUE_SETS: CoreValueSet[] = [
    {
        id: 'stream.network',
        scope: 'outbound',
        path: 'streamSettings.network',
        allowed: byLine(NETWORKS, NETWORKS, NETWORKS, NETWORKS_2693, NETWORKS_2693),
        outside: 'rejected',
        replacedBy: { h2: 'xhttp', h3: 'xhttp', http: 'xhttp', quic: 'xhttp', udp: 'raw' },
        detail: 'An unknown transport name fails the load; h2, h3, http and quic are removed features pointing at XHTTP.',
        evidence: ['v26.3.27:infra/conf/transport_internet.go', 'v26.7.28:infra/conf/transport_internet.go', 'v26.9.9:infra/conf/transport_internet.go', 'v26.9.30:infra/conf/transport_internet.go:16-45', 'v26.10.10:infra/conf/transport_internet.go:16-45'],
    },
    {
        id: 'finalmask.tcp.type',
        scope: 'outbound',
        path: 'streamSettings.finalmask.tcp[].type',
        allowed: byLine(FINALMASK_TCP_263, FINALMASK_TCP_267, FINALMASK_TCP_267, FINALMASK_TCP_2693, FINALMASK_TCP_2610),
        outside: 'rejected',
        detail: 'TCP mask types are looked up in their own table; a type missing from it — or one that belongs to the UDP list — fails with "unknown config id".',
        evidence: ['v26.3.27:infra/conf/transport_internet.go:1238', 'v26.7.28:infra/conf/transport_finalmask.go:70', 'v26.9.9:infra/conf/transport_finalmask.go:72', 'v26.9.30:infra/conf/transport_finalmask.go:73', 'v26.10.10:infra/conf/transport_finalmask.go:72'],
    },
    {
        id: 'finalmask.udp.type',
        scope: 'outbound',
        path: 'streamSettings.finalmask.udp[].type',
        allowed: byLine(FINALMASK_UDP_263, FINALMASK_UDP_267, FINALMASK_UDP_269, FINALMASK_UDP_2693, FINALMASK_UDP_2610),
        outside: 'rejected',
        replacedBy: Object.fromEntries(
            ['header-dns', 'header-dtls', 'header-srtp', 'header-utp', 'header-wechat', 'header-wireguard', 'mkcp-original', 'mkcp-aes128gcm']
                .map(type => [type, 'mkcp-legacy']),
        ),
        detail: 'The six header-* masks and both mkcp-* masks were folded into mkcp-legacy in 26.7; an unknown UDP mask type fails the load.',
        evidence: ['v26.3.27:infra/conf/transport_internet.go:1244', 'v26.7.28:infra/conf/transport_finalmask.go:77', 'v26.9.9:infra/conf/transport_finalmask.go:79', 'v26.9.30:infra/conf/transport_finalmask.go:80', 'v26.10.10:infra/conf/transport_finalmask.go:79'],
    },
];

/**
 * Every value set, with the `streamSettings` ones mirrored for inbounds:
 * it is one struct whichever side it sits on, so the lists are the same and
 * only where the checker looks differs. The mirror of `x` is `inbound.x`.
 */
export const VALUE_SETS: CoreValueSet[] = (() => {
    const sets = [...BASE_VALUE_SETS, ...OUTBOUND_VALUE_SETS, ...FINALMASK_VALUE_SETS, ...TRANSPORT_VALUE_SETS, ...INBOUND_VALUE_SETS, ...V2610_VALUE_SETS];
    const mirrored = sets
        .filter(set => set.scope === 'outbound' && set.path.startsWith('streamSettings.'))
        .map(set => ({ ...set, id: `inbound.${set.id}`, scope: 'inbound' as const }));
    return [...sets, ...mirrored];
})();

const VALUE_SETS_BY_ID = new Map(VALUE_SETS.map(set => [set.id, set]));

export const coreValueSet = (id: string): CoreValueSet | undefined => VALUE_SETS_BY_ID.get(id);

/** The values a line accepts for a set, in chooser order; empty for an unknown id. */
export const allowedValues = (version: CoreVersionId, id: string): string[] =>
    VALUE_SETS_BY_ID.get(id)?.allowed[version] ?? [];

const BY_ID = new Map(FEATURES.map(feature => [feature.id, feature]));

export const coreFeature = (id: string): CoreFeature | undefined => BY_ID.get(id);

/**
 * What a core does with a feature. An id nobody registered answers
 * `accepted`: the table lists differences, and the absence of an entry means
 * no difference is known — not that the feature is missing.
 */
export const featureStatus = (version: CoreVersionId, id: string): FeatureStatus =>
    BY_ID.get(id)?.status[version] ?? 'accepted';

/**
 * A feature's status looked up by where it lives rather than by id.
 *
 * Editors know the path they write — `streamSettings.kcpSettings.seed` — and
 * should not have to know what the generator named its row. Protocol-specific
 * rows only answer for a matching protocol; a path nobody has a row for is
 * `accepted`, as with `featureStatus`.
 */
export const featureStatusAt = (
    version: CoreVersionId,
    where: { scope: FeatureScope; path: string; protocol?: string; value?: string },
): FeatureStatus => {
    const row = FEATURES.find(feature =>
        feature.scope === where.scope
        && feature.path === where.path
        && feature.value === where.value
        && (!feature.protocol || (where.protocol !== undefined && feature.protocol.includes(where.protocol))),
    );
    return row?.status[version] ?? 'accepted';
};

/**
 * Whether the editor should offer something new of this kind.
 *
 * Only `accepted`: a deprecated field is shown when a config already has it,
 * never suggested, and an absent or rejected one is never suggested at all.
 */
export const offersFeature = (version: CoreVersionId, id: string): boolean =>
    featureStatus(version, id) === 'accepted';
