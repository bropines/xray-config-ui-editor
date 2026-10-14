/**
 * Hand-written feature rows and value sets for the inbound editors.
 *
 * Kept apart from features.ts so each editor area owns its own rows; they are
 * merged there and win over generated rows for the same place. Same rules as
 * the rest of the table: every row cites `tag:file:line`.
 *
 * Most inbound facts are already generated from the findings (the 26.7 `users`
 * aliases, `allocate`, `sniffing.ipsExcluded`, the tun and dokodemo fields).
 * What is here is what the editors used to write themselves and no core ever
 * read, plus the value lists the choosers are built from.
 */
import type { CoreFeature, CoreValueSet } from './features';
import type { CoreVersionId } from './index';

type Status = CoreFeature['status'];

const everywhere = (status: Status['26.3']): Status => ({ '26.3': status, '26.7': status, '26.9': status, '26.10': status });

const same = (values: string[]): Record<CoreVersionId, string[]> => ({ '26.3': values, '26.7': values, '26.9': values, '26.10': values });

/** HysteriaServerConfig is {version, clients} on 26.3 and {version, users, clients} after. */
const HYSTERIA_SERVER = ['v26.3.27:infra/conf/hysteria.go:39', 'v26.7.28:infra/conf/hysteria.go:39', 'v26.9.9:infra/conf/hysteria.go:39', 'v26.10.10:infra/conf/hysteria.go:39'];
/** HysteriaUserConfig is {auth, level, email} on every line. */
const HYSTERIA_USER = ['v26.3.27:infra/conf/hysteria.go:33', 'v26.7.28:infra/conf/hysteria.go:33', 'v26.9.9:infra/conf/hysteria.go:33', 'v26.10.10:infra/conf/hysteria.go:33'];
/** TunConfig: {name, MTU, userLevel} on 26.3; eight keys from 26.7; no `stack` anywhere. */
const TUN_CONFIG = ['v26.3.27:infra/conf/tun.go:8', 'v26.7.28:infra/conf/tun.go:14', 'v26.9.9:infra/conf/tun.go:14', 'v26.10.10:infra/conf/tun.go:18'];

export const INBOUND_FEATURES: CoreFeature[] = [
    // ── hysteria: the Hysteria 1 shape this editor used to write ────────
    // `up_mbps`/`down_mbps`/`ignore_client_bandwidth` have zero hits in
    // infra/conf on any tag. Bandwidth moved to the transport's finalmask
    // (`quicParams.brutalUp`/`brutalDown`, v26.7.28:infra/conf/transport_finalmask.go:934).
    ...(['up_mbps', 'down_mbps', 'ignore_client_bandwidth'] as const).map((key): CoreFeature => ({
        id: `inbound.hysteria.${key}`,
        scope: 'inbound',
        protocol: ['hysteria'],
        path: `settings.${key}`,
        status: everywhere('absent'),
        replacement: key === 'ignore_client_bandwidth' ? undefined : 'streamSettings.finalmask.quicParams.brutalUp / brutalDown',
        detail: 'Hysteria 1 bandwidth keys; the Hysteria 2 server config has only version, clients and (26.7+) users.',
        evidence: HYSTERIA_SERVER,
    })),
    ...(['clients', 'users'] as const).map((list): CoreFeature => ({
        id: `inbound.hysteria.${list}.password`,
        scope: 'inbound',
        protocol: ['hysteria'],
        path: `settings.${list}[].password`,
        status: everywhere('absent'),
        replacement: `settings.${list}[].auth`,
        detail: 'A Hysteria user authenticates with `auth`; `password` is not a key, so such a user has an empty auth.',
        evidence: HYSTERIA_USER,
    })),

    // ── tun ─────────────────────────────────────────────────────────────
    {
        id: 'inbound.tun.stack',
        scope: 'inbound',
        protocol: ['tun'],
        path: 'settings.stack',
        status: everywhere('absent'),
        detail: 'The tun inbound has no network-stack switch in any supported release; the key is dropped.',
        evidence: TUN_CONFIG,
    },
    // `autoOutboundsInterface` is a *string ("auto", an interface name, or
    // "" to switch it off). A JSON boolean cannot decode into it, and a
    // decoding error fails the whole config. This editor's schema used to
    // declare it a boolean and draw a switch for it.
    ...(['true', 'false'] as const).map((value): CoreFeature => ({
        id: `inbound.tun.autoOutboundsInterface.${value}`,
        scope: 'inbound',
        protocol: ['tun'],
        path: 'settings.autoOutboundsInterface',
        value,
        status: { '26.3': 'absent', '26.7': 'rejected', '26.9': 'rejected', '26.10': 'rejected' },
        replacement: 'settings.autoOutboundsInterface: "auto"',
        detail: 'autoOutboundsInterface is a string; a boolean fails to decode on the lines that read it.',
        evidence: ['v26.7.28:infra/conf/tun.go:22', 'v26.9.9:infra/conf/tun.go:22', 'v26.10.10:infra/conf/tun.go:26'],
    })),

    // ── wrapper ─────────────────────────────────────────────────────────
    // An empty listen decodes as an empty domain, and the listen check
    // indexes its first byte: an index-out-of-range panic before 26.9, which
    // treats it as "no listen". The editor omits the key instead.
    {
        id: 'inbound.listen.empty',
        scope: 'inbound',
        path: 'listen',
        value: '',
        status: { '26.3': 'rejected', '26.7': 'rejected', '26.9': 'accepted', '26.10': 'accepted' },
        detail: 'An empty listen string crashes the loader before 26.9; leave the key out to listen on every address.',
        evidence: ['v26.3.27:infra/conf/xray.go:152', 'v26.7.28:infra/conf/xray.go:152', 'v26.9.9:infra/conf/xray.go:144', 'v26.10.10:infra/conf/xray.go:147'],
    },
];

/**
 * Classic cipher names are lower-cased before the switch; the 2022 names are
 * looked up case-sensitively in sing-shadowsocks' list up to 26.9 and
 * lower-cased first from 26.10. Canonical spellings come first — the choosers
 * show those and hide the `aead_*` and `plain` aliases, which the core still
 * accepts. These are what a chooser offers; whether a config's method is
 * accepted depends on more than the name, and is judged by
 * core/xray/shadowsocks-inbound.
 */
export const SS_2022 = ['2022-blake3-aes-128-gcm', '2022-blake3-aes-256-gcm', '2022-blake3-chacha20-poly1305'];
export const SS_CLASSIC = [
    'aes-128-gcm', 'aes-256-gcm', 'chacha20-poly1305', 'chacha20-ietf-poly1305',
    'xchacha20-poly1305', 'xchacha20-ietf-poly1305',
    'aead_aes_128_gcm', 'aead_aes_256_gcm', 'aead_chacha20_poly1305', 'aead_xchacha20_poly1305',
];
/** Aliases a chooser should not list alongside the names they stand for. */
export const SHADOWSOCKS_METHOD_ALIASES = new Set([
    'aead_aes_128_gcm', 'aead_aes_256_gcm', 'aead_chacha20_poly1305', 'aead_xchacha20_poly1305', 'plain',
]);

/** Flow values a VLESS *inbound* takes; the udp443 variant is client-only. */
const VLESS_INBOUND_FLOWS = ['', 'xtls-rprx-vision'];
const VLESS_FLOW_EVIDENCE = [
    'v26.3.27:infra/conf/vless.go:44', 'v26.3.27:infra/conf/vless.go:65',
    'v26.7.28:infra/conf/vless.go:50', 'v26.7.28:infra/conf/vless.go:72',
    'v26.9.9:infra/conf/vless.go:53', 'v26.10.10:infra/conf/vless.go:53', 'v26.9.9:infra/conf/vless.go:77', 'v26.10.10:infra/conf/vless.go:77',
];

/** `https`/`ssl` are the core's own aliases of `tls`; kept last so a chooser can drop them. */
export const DEST_OVERRIDE_ALIASES = new Set(['https', 'ssl']);

export const INBOUND_VALUE_SETS: CoreValueSet[] = [
    {
        id: 'inbound.shadowsocks.method',
        scope: 'inbound',
        protocol: ['shadowsocks', 'shadowsocks-2022'],
        path: 'settings.method',
        allowed: {
            '26.3': [...SS_2022, ...SS_CLASSIC, 'none', 'plain'],
            '26.7': [...SS_2022, ...SS_CLASSIC],
            '26.9': [...SS_2022, ...SS_CLASSIC],
            '26.10': [...SS_2022, ...SS_CLASSIC],
        },
        outside: 'rejected',
        // The list is for the chooser. `method` is not read at all by a
        // multi-user classic server, is compared exactly for 2022 names up to
        // 26.9, and may not be empty for one account — none of which a flat
        // list can say. shadowsocksInboundProblems does.
        offeredOnly: true,
        detail: '"none"/"plain" were removed in 26.7 and fail with "unknown cipher method", as does any other unknown name.',
        evidence: ['v26.3.27:infra/conf/shadowsocks.go:26', 'v26.7.28:infra/conf/shadowsocks.go:17', 'v26.7.28:infra/conf/shadowsocks.go:101', 'v26.9.9:infra/conf/shadowsocks.go:101', 'v26.10.10:infra/conf/shadowsocks.go:99'],
    },
    ...([
        ['inbound.vless.flow', 'settings.flow'],
        ['inbound.vless.clients.flow', 'settings.clients[].flow'],
        ['inbound.vless.users.flow', 'settings.users[].flow'],
    ] as const).map(([id, path]): CoreValueSet => ({
        id,
        scope: 'inbound',
        protocol: ['vless'],
        path,
        allowed: same(VLESS_INBOUND_FLOWS),
        outside: 'rejected',
        caseSensitive: true,
        replacedBy: { 'xtls-rprx-vision-udp443': 'xtls-rprx-vision' },
        detail: 'A VLESS inbound takes only "" or "xtls-rprx-vision", compared exactly; anything else, the udp443 variant included, fails the load.',
        evidence: VLESS_FLOW_EVIDENCE,
    })),
    {
        id: 'inbound.sniffing.destOverride',
        scope: 'inbound',
        path: 'sniffing.destOverride[]',
        allowed: same(['http', 'tls', 'quic', 'fakedns', 'fakedns+others', 'https', 'ssl']),
        outside: 'rejected',
        detail: 'Lower-cased and switched on; any other name fails the load with "unknown protocol".',
        evidence: ['v26.3.27:infra/conf/xray.go:71', 'v26.7.28:infra/conf/xray.go:68', 'v26.9.9:infra/conf/xray.go:79', 'v26.10.10:infra/conf/xray.go:82'],
    },
    {
        id: 'inbound.socks.auth',
        scope: 'inbound',
        protocol: ['socks', 'mixed'],
        path: 'settings.auth',
        allowed: same(['noauth', 'password']),
        outside: 'absent',
        caseSensitive: true,
        detail: 'Compared exactly; any other value, "Password" included, quietly falls back to noauth.',
        evidence: ['v26.3.27:infra/conf/socks.go:40', 'v26.7.28:infra/conf/socks.go:41', 'v26.9.9:infra/conf/socks.go:41', 'v26.10.10:infra/conf/socks.go:41'],
    },
    {
        // A WireGuard server never resolves anything with it — the strategy is
        // for a client's peer endpoint — but WireGuardConfig.Build() is one
        // function for both sides and switches on it before it knows which it
        // is building. So the inbound editor does not offer the key, and a
        // value left in one still has to be one of these.
        id: 'inbound.wireguard.domainStrategy',
        scope: 'inbound',
        protocol: ['wireguard'],
        path: 'settings.domainStrategy',
        // 26.10 has no such field, so nothing checks the value.
        allowed: { ...same(['', 'ForceIP', 'ForceIPv4', 'ForceIPv6', 'ForceIPv4v6', 'ForceIPv6v4']), '26.10': null },
        outside: 'rejected',
        detail: 'Lower-cased and switched on for an inbound too; anything outside the ForceIP family fails with "unsupported domain strategy". 26.10 dropped the key.',
        evidence: ['v26.3.27:infra/conf/wireguard.go:105', 'v26.7.28:infra/conf/wireguard.go:127', 'v26.9.9:infra/conf/wireguard.go:128', 'v26.10.10:infra/conf/wireguard.go:59-69'],
    },
];
