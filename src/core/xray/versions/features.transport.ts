/**
 * Hand-written feature rows and value sets for the transport editors.
 *
 * Kept apart from features.ts so each editor area owns its own rows; they are
 * merged there and win over generated rows for the same place. Same rules as
 * the rest of the table: every row cites `tag:file:line`.
 *
 * What lives here is what the generated rows could not say: a key spelled the
 * way this editor used to write it (`headers.Host`, capital H — the checker
 * compares keys exactly, the core does not), a key the generator skipped
 * (`echForceQuery`), and the value lists the transport choosers offer.
 */
import type { CoreFeature, CoreValueSet, FeatureStatus } from './features';
import type { CoreVersionId } from './index';

/** The 26.10 column follows 26.9 unless a row says otherwise — and a row says so wherever v26.10.10 differs. */
const s = (
    v263: FeatureStatus,
    v267: FeatureStatus,
    v269: FeatureStatus,
    v2610: FeatureStatus = v269,
): Record<CoreVersionId, FeatureStatus> =>
    ({ '26.3': v263, '26.7': v267, '26.9': v269, '26.10': v2610 });

const SIDES = ['outbound', 'inbound'] as const;

/**
 * A `Host` entry in a transport's `headers`.
 *
 * The core lower-cases header names before it looks (`strings.ToLower(k) ==
 * "host"`), so `Host`, `host` and `HOST` are the same entry to it; the checker
 * matches keys exactly, so each spelling people write needs a row. WebSocket
 * moves the entry into `host` with a deprecation warning; HTTPUpgrade and
 * XHTTP refuse the config. The generated table already has ws `host`, and
 * this editor wrote ws `Host` for as long as it had a Host box.
 */
const HOST_IN_HEADERS: { settings: string; spellings: string[]; status: FeatureStatus; evidence: string[] }[] = [
    {
        settings: 'wsSettings',
        spellings: ['Host'],
        status: 'deprecated',
        evidence: ['v26.3.27:infra/conf/transport_internet.go:166', 'v26.7.28:infra/conf/transport_method.go:637', 'v26.9.9:infra/conf/transport_method.go:632', 'v26.10.10:infra/conf/transport_method.go:642'],
    },
    {
        settings: 'httpupgradeSettings',
        spellings: ['host', 'Host'],
        status: 'rejected',
        evidence: ['v26.3.27:infra/conf/transport_internet.go:207', 'v26.7.28:infra/conf/transport_method.go:678', 'v26.9.9:infra/conf/transport_method.go:673', 'v26.10.10:infra/conf/transport_method.go:683'],
    },
    {
        settings: 'xhttpSettings',
        spellings: ['host', 'Host'],
        status: 'rejected',
        evidence: ['v26.3.27:infra/conf/transport_internet.go:291', 'v26.7.28:infra/conf/transport_method.go:330', 'v26.9.9:infra/conf/transport_method.go:329', 'v26.10.10:infra/conf/transport_method.go:339'],
    },
];

const hostInHeadersRows = (): CoreFeature[] =>
    HOST_IN_HEADERS.flatMap(({ settings, spellings, status, evidence }) =>
        spellings.flatMap(spelling => SIDES.map(scope => ({
            id: `${scope}.${settings}.headers.${spelling}`,
            scope,
            path: `streamSettings.${settings}.headers.${spelling}`,
            status: s(status, status, status),
            replacement: `streamSettings.${settings}.host`,
            detail: status === 'deprecated'
                ? 'A Host entry in WebSocket headers is moved into host (only when host is empty), with a deprecation warning.'
                : `A Host entry in ${settings} headers fails the load; the host field is where it goes.`,
            evidence,
        } satisfies CoreFeature))),
    );

export const TRANSPORT_FEATURES: CoreFeature[] = [
    ...hostInHeadersRows(),

    // ── TLS ─────────────────────────────────────────────────────────────
    ...SIDES.map(scope => ({
        id: `${scope}.tlsSettings.echForceQuery`,
        scope,
        path: 'streamSettings.tlsSettings.echForceQuery',
        status: s('accepted', 'absent', 'absent'),
        detail: 'Only 26.3 reads echForceQuery (none, half or full; anything else fails the load there); 26.7 removed it from the struct, so it is dropped without a word.',
        evidence: [
            'v26.3.27:infra/conf/transport_internet.go:665',
            'v26.3.27:infra/conf/transport_internet.go:756',
            'v26.7.28:infra/conf/transport_security.go:300',
            'v26.10.10:infra/conf/transport_security.go:300',
        ],
    } satisfies CoreFeature)),
];

/** `DomainStrategy` as `transport_sockopt.go` matches it, lower-cased. */
const DOMAIN_STRATEGIES = [
    'AsIs', 'UseIP', 'UseIPv4', 'UseIPv6', 'UseIPv4v6', 'UseIPv6v4',
    'ForceIP', 'ForceIPv4', 'ForceIPv6', 'ForceIPv4v6', 'ForceIPv6v4',
];

/** `AddressPortStrategy`, same file; `none` is also the empty default. */
const ADDRESS_PORT_STRATEGIES = [
    'none', 'SrvPortOnly', 'SrvAddressOnly', 'SrvPortAndAddress', 'TxtPortOnly', 'TxtAddressOnly', 'TxtPortAndAddress',
];

/**
 * Every set below that takes an empty string lists it last. The core maps
 * `""` to the default in each of these switches, so a config that says `""`
 * loads — leaving it out would report a working config as refused. Choosers
 * drop it; it is only here for the check.
 */
const EMPTY = '';

/** Transport names `TransportProtocol.Build()` knows — see features.ts. */
const NETWORKS = ['raw', 'tcp', 'xhttp', 'splithttp', 'kcp', 'mkcp', 'grpc', 'ws', 'websocket', 'httpupgrade', 'hysteria'];

/**
 * uTLS fingerprints `tls.go` resolves on 26.3; 26.7 added three. Lower-cased
 * before the lookup, and `unsafe` is let through for TLS by the Build() check
 * itself (REALITY refuses it, and `hellogolang`, so this list is TLS-only).
 */
const TLS_FINGERPRINTS_263 = [
    'chrome', 'firefox', 'safari', 'ios', 'android', 'edge', '360', 'qq',
    'random', 'randomized', 'randomizednoalpn', 'unsafe',
    'hello360_11_0', 'hello360_7_5', 'hello360_auto', 'helloandroid_11_okhttp',
    'hellochrome_100', 'hellochrome_100_psk', 'hellochrome_102', 'hellochrome_106_shuffle',
    'hellochrome_112_psk_shuf', 'hellochrome_114_padding_psk_shuf', 'hellochrome_115_pq', 'hellochrome_115_pq_psk',
    'hellochrome_120', 'hellochrome_120_pq', 'hellochrome_131', 'hellochrome_58', 'hellochrome_62', 'hellochrome_70',
    'hellochrome_72', 'hellochrome_83', 'hellochrome_87', 'hellochrome_96', 'hellochrome_auto',
    'helloedge_106', 'helloedge_85', 'helloedge_auto',
    'hellofirefox_102', 'hellofirefox_105', 'hellofirefox_120', 'hellofirefox_55', 'hellofirefox_56',
    'hellofirefox_63', 'hellofirefox_65', 'hellofirefox_99', 'hellofirefox_auto',
    'hellogolang', 'helloios_11_1', 'helloios_12_1', 'helloios_13', 'helloios_14', 'helloios_auto',
    'helloqq_11_1', 'helloqq_auto', 'hellorandomized', 'hellorandomizedalpn', 'hellorandomizednoalpn',
    'hellosafari_16_0', 'hellosafari_auto',
];
const TLS_FINGERPRINTS_267 = [...TLS_FINGERPRINTS_263, 'hellochrome_133', 'hellofirefox_148', 'hellosafari_26_3'];

const same = (values: string[]): Record<CoreVersionId, string[]> => ({ '26.3': values, '26.7': values, '26.9': values, '26.10': values });

export const TRANSPORT_VALUE_SETS: CoreValueSet[] = [
    // ── security ────────────────────────────────────────────────────────
    {
        id: 'stream.security',
        scope: 'outbound',
        path: 'streamSettings.security',
        allowed: same(['none', 'tls', 'reality', EMPTY]),
        outside: 'rejected',
        replacedBy: { xtls: 'tls or reality with flow xtls-rprx-vision' },
        detail: 'Lower-cased and matched against none, tls and reality; legacy xtls is a removed feature and any other name is "Unknown security".',
        evidence: ['v26.3.27:infra/conf/transport_internet.go:1764', 'v26.7.28:infra/conf/transport_internet.go:86', 'v26.7.28:infra/conf/transport_internet.go:114', 'v26.9.9:infra/conf/transport_internet.go:116', 'v26.10.10:infra/conf/transport_internet.go:122'],
    },

    // ── hysteria ────────────────────────────────────────────────────────
    {
        // The proxy half checks the transport half when the handler is
        // created: from 26.7 a hysteria inbound or outbound on anything but
        // the hysteria transport answers "not hysteria transport" and does
        // not start. 26.3 does not look.
        id: 'hysteria.stream.network',
        scope: 'outbound',
        protocol: ['hysteria'],
        path: 'streamSettings.network',
        allowed: { '26.3': NETWORKS, '26.7': ['hysteria'], '26.9': ['hysteria'], '26.10': ['hysteria'] },
        outside: 'rejected',
        detail: 'From 26.7 a hysteria proxy refuses to start on any transport but hysteria.',
        evidence: ['v26.7.28:proxy/hysteria/client.go:37', 'v26.7.28:proxy/hysteria/server.go:36', 'v26.9.9:proxy/hysteria/client.go:37', 'v26.10.10:proxy/hysteria/client.go:37', 'v26.9.9:proxy/hysteria/server.go:36', 'v26.10.10:proxy/hysteria/server.go:36'],
    },
    // The hysteria transport's TLS requirement is not a value set: it is
    // keyed on the transport in use (any proxy riding it), and on 26.3 a
    // hysteria *proxy* is not tied to that transport at all — a set on
    // `protocol: hysteria` refused `security: none` over RAW there, which
    // v26.3.27 runs. It is `streamRules` in rules.ts, with the citations in
    // transport-networks.ts (`hysteriaTlsProblem`).
    {
        // Server side only: the dialer never reads masquerade.
        id: 'hysteria.masquerade.type',
        scope: 'inbound',
        path: 'streamSettings.hysteriaSettings.masquerade.type',
        allowed: same(['404', 'file', 'proxy', 'string', EMPTY]),
        outside: 'rejected',
        detail: 'Build() takes any string, but the listener answers "unknown masq type" and does not start.',
        evidence: ['v26.3.27:transport/internet/hysteria/hub.go:371', 'v26.7.28:transport/internet/hysteria/hub.go:253', 'v26.9.9:transport/internet/hysteria/hub.go:277', 'v26.10.10:transport/internet/hysteria/hub.go:277'],
    },

    // ── sockopt ─────────────────────────────────────────────────────────
    {
        id: 'stream.sockopt.domainStrategy',
        scope: 'outbound',
        path: 'streamSettings.sockopt.domainStrategy',
        allowed: same([...DOMAIN_STRATEGIES, EMPTY]),
        outside: 'rejected',
        detail: 'Lower-cased and matched against the eleven strategies; anything else is "unsupported domain strategy".',
        evidence: ['v26.3.27:infra/conf/transport_internet.go:1134', 'v26.7.28:infra/conf/transport_sockopt.go:120', 'v26.9.9:infra/conf/transport_sockopt.go:120', 'v26.10.10:infra/conf/transport_sockopt.go:120'],
    },
    {
        id: 'stream.sockopt.addressPortStrategy',
        scope: 'outbound',
        path: 'streamSettings.sockopt.addressPortStrategy',
        allowed: same([...ADDRESS_PORT_STRATEGIES, EMPTY]),
        outside: 'rejected',
        detail: 'SRV/TXT lookups of the destination; lower-cased, and anything else is "unsupported address and port strategy".',
        evidence: ['v26.3.27:infra/conf/transport_internet.go:1168', 'v26.7.28:infra/conf/transport_sockopt.go:154', 'v26.9.9:infra/conf/transport_sockopt.go:154', 'v26.10.10:infra/conf/transport_sockopt.go:154'],
    },
    {
        id: 'freedom.stream.sockopt.addressPortStrategy',
        scope: 'outbound',
        protocol: ['freedom'],
        path: 'streamSettings.sockopt.addressPortStrategy',
        allowed: { '26.3': [...ADDRESS_PORT_STRATEGIES, EMPTY], '26.7': [...ADDRESS_PORT_STRATEGIES, EMPTY], '26.9': ['none', EMPTY], '26.10': ['none', EMPTY] },
        outside: 'rejected',
        detail: '26.9 refuses a freedom outbound whose sockopt sets any addressPortStrategy but none.',
        evidence: ['v26.9.9:infra/conf/xray.go:344', 'v26.10.10:infra/conf/xray.go:358', 'v26.9.9:infra/conf/xray.go:345', 'v26.10.10:infra/conf/xray.go:359'],
    },

    // ── TLS ─────────────────────────────────────────────────────────────
    {
        id: 'stream.tls.fingerprint',
        scope: 'outbound',
        path: 'streamSettings.tlsSettings.fingerprint',
        allowed: { '26.3': [...TLS_FINGERPRINTS_263, EMPTY], '26.7': [...TLS_FINGERPRINTS_267, EMPTY], '26.9': [...TLS_FINGERPRINTS_267, EMPTY], '26.10': [...TLS_FINGERPRINTS_267, EMPTY] },
        outside: 'rejected',
        detail: 'Lower-cased and looked up in the uTLS table; an unknown name fails the load. 26.7 added hellochrome_133, hellofirefox_148 and hellosafari_26_3.',
        evidence: ['v26.3.27:infra/conf/transport_internet.go:703', 'v26.7.28:infra/conf/transport_security.go:355', 'v26.7.28:transport/internet/tls/tls.go:225', 'v26.9.9:infra/conf/transport_security.go:355', 'v26.10.10:infra/conf/transport_security.go:356'],
    },

    // ── transport settings ──────────────────────────────────────────────
    ...(['xhttpSettings', 'splithttpSettings'] as const).map(settings => ({
        id: `stream.${settings}.mode`,
        scope: 'outbound' as const,
        path: `streamSettings.${settings}.mode`,
        allowed: same(['auto', 'packet-up', 'stream-up', 'stream-one', EMPTY]),
        outside: 'rejected' as const,
        // Compared as written — the switch does not lower-case it.
        caseSensitive: true,
        detail: 'Empty means auto; any other mode fails the load.',
        evidence: ['v26.3.27:infra/conf/transport_internet.go:283', 'v26.7.28:infra/conf/transport_method.go:322', 'v26.9.9:infra/conf/transport_method.go:321', 'v26.10.10:infra/conf/transport_method.go:331'],
    } satisfies CoreValueSet)),
    ...(['tcpSettings', 'rawSettings'] as const).map(settings => ({
        id: `stream.${settings}.header.type`,
        scope: 'outbound' as const,
        path: `streamSettings.${settings}.header.type`,
        allowed: same(['none', 'http']),
        outside: 'rejected' as const,
        detail: 'A RAW header object is loaded by its type; an unknown type fails the load.',
        evidence: ['v26.3.27:infra/conf/transport_internet.go:50', 'v26.7.28:infra/conf/transport_method.go:228', 'v26.9.9:infra/conf/transport_method.go:227', 'v26.10.10:infra/conf/transport_method.go:237'],
    } satisfies CoreValueSet)),
];
