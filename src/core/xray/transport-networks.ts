import { t } from '../../i18n';
import {
    DEFAULT_CORE_VERSION,
    compareCoreVersions,
    coreVersion,
    type CoreVersionId,
} from './versions';
import {
    FEATURES,
    allowedValues,
    featureStatusAt,
    type CoreFeature,
    type FeatureScope,
    type FeatureStatus,
} from './versions/features';

export interface NetworkOption {
    value: string;
    label: string;
    description?: string;
    /** Shown because the config holds it, not offered: picking it again changes nothing for the better. */
    disabled?: boolean;
}

/**
 * Transports the core still builds, plus whatever the config already says.
 *
 * `transport_internet.go` maps a network name to a transport and answers with
 * a removed-feature error for two of them:
 *
 *   case "h2", "h3", "http": PrintRemovedFeatureError("HTTP transport", "XHTTP stream-one H2 & H3")
 *   case "quic":             PrintRemovedFeatureError("QUIC transport",  "XHTTP stream-one H3")
 *
 * Those are not ignored the way an unknown field is — the config does not
 * load, on any supported line (v26.3.27:infra/conf/transport_internet.go:1016,
 * v26.7.28 and v26.9.9 :34-36). They appear only when a config already has
 * one, disabled and labelled for what they are, so an imported config still
 * shows what it holds instead of an empty chooser.
 *
 * `masque` is the other way round: from 26.10 the core allows the masque
 * transport only on the masque proxy (inbound or outbound), and that proxy uses
 * no other, so it is offered there and nowhere else. Lines before 26.10 do not
 * register it at all.
 */
const REMOVED: Record<string, string> = {
    http: 'XHTTP (stream-one H2/H3)',
    h2: 'XHTTP (stream-one H2/H3)',
    h3: 'XHTTP (stream-one H3)',
    quic: 'XHTTP (stream-one H3)',
};

export const isRemovedNetwork = (network: string | undefined): boolean =>
    !!network && network.toLowerCase() in REMOVED;

export const removedNetworkReplacement = (network: string): string | undefined =>
    REMOVED[network.toLowerCase()];

/**
 * The section of the editor a network name opens.
 *
 * `TransportProtocol.Build()` treats raw/tcp, xhttp/splithttp, kcp/mkcp and
 * ws/websocket as one transport each, and lower-cases the name first
 * (v26.7.28:infra/conf/transport_internet.go:17). A config that says
 * `websocket` or `mkcp` is the same config as one that says `ws` or `kcp`, and
 * should get the same fields rather than none.
 */
const SECTION: Record<string, string> = {
    raw: 'tcp', tcp: 'tcp',
    xhttp: 'xhttp', splithttp: 'xhttp',
    kcp: 'kcp', mkcp: 'kcp',
    ws: 'ws', websocket: 'ws',
};

export const networkSection = (network: string): string => {
    const lower = network.toLowerCase();
    return SECTION[lower] ?? lower;
};

/**
 * The transport a stream settings object selects on a given line.
 *
 * 26.7 added `method` as an alias of `network`, and when both are there
 * `method` wins (v26.7.28:infra/conf/transport_internet.go:75); 26.3 does not
 * know the key and uses `network`. Nothing set means raw.
 */
export const effectiveNetwork = (stream: any, version: CoreVersionId = DEFAULT_CORE_VERSION): string => {
    const methodRead = featureStatusAt(version, { scope: 'outbound', path: 'streamSettings.method' }) === 'accepted';
    const method = typeof stream?.method === 'string' && stream.method !== '' ? stream.method : undefined;
    const network = typeof stream?.network === 'string' && stream.network !== '' ? stream.network : undefined;
    return ((methodRead ? method ?? network : network) ?? 'tcp').toLowerCase();
};

const BASE_NETWORKS = (): NetworkOption[] => [
    { value: 'tcp', label: 'TCP', description: t("Standard reliable stream") },
    { value: 'raw', label: t("RAW"), description: t("Raw socket access") },
    { value: 'xhttp', label: t("XHTTP"), description: t("Next-gen HTTP transport") },
    { value: 'splithttp', label: t("SplitHTTP"), description: t("High-performance split stream") },
    { value: 'ws', label: t("WebSocket"), description: t("Standard web transport") },
    { value: 'httpupgrade', label: t("HTTP Upgrade"), description: t("Modern WebSocket alternative") },
    { value: 'grpc', label: t("gRPC"), description: t("Modern RPC framework") },
    { value: 'kcp', label: t("mKCP"), description: t("Aggressive UDP transport") },
    { value: 'hysteria', label: t("Hysteria"), description: t("QUIC-based, with its own congestion control") },
];

/**
 * The pairing between a masque proxy and the masque transport, from the network
 * side: a proxy of another kind on the transport is refused by the loader
 * (v26.10.10:infra/conf/xray.go:209-211 inbound, :351-353 outbound), and a
 * masque proxy on any other transport does not start — "not masque transport"
 * (v26.10.10:proxy/masque/client.go:58-60, server.go:126-128).
 * `network` is lower-case. Only meaningful on a line that registers the
 * transport; the caller has already asked.
 */
const masqueNetworkProblem = (protocol: string | undefined, network: string, tag: string): string | undefined => {
    if (protocol === 'masque' && network !== 'masque') {
        return t("A masque proxy runs only on the masque transport — Xray {tag} refuses to start it on anything else.", { tag });
    }
    if (protocol !== 'masque' && network === 'masque') {
        return t("The masque transport can only be used by a masque proxy — Xray {tag} refuses the config otherwise.", { tag });
    }
    return undefined;
};

/** Both halves of MASQUE need TLS (v26.10.10:proxy/masque/client.go:61-63, server.go:129-131). */
const masqueNeedsTls = (protocol: string | undefined, network: string): boolean =>
    protocol === 'masque' || network.toLowerCase() === 'masque';

export const networkOptions = (
    protocol: string | undefined,
    current: string | undefined,
    version: CoreVersionId = DEFAULT_CORE_VERSION,
): NetworkOption[] => {
    let options = BASE_NETWORKS();

    // A hysteria proxy checks its transport when the handler is created —
    // see the `hysteria.stream.network` value set. Where the line narrows the
    // list, offer only what it keeps.
    if (protocol === 'hysteria') {
        const allowed = allowedValues(version, 'hysteria.stream.network');
        options = options.filter(option => allowed.includes(option.value));
    }

    // A masque proxy runs on the masque transport and on nothing else, and the
    // transport belongs to it alone (see `masqueNetworkProblem`). Offered only
    // where the line registers the transport; elsewhere the protocol itself is
    // refused and the list stays as it was.
    if (protocol === 'masque' && allowedValues(version, 'stream.network').includes('masque')) {
        options = [{ value: 'masque', label: 'MASQUE', description: t("CONNECT-IP over HTTP/3 or HTTP/2 — only a masque proxy may use it") }];
    }

    if (current && !options.some(option => option.value === current)) {
        const problem = networkProblem(protocol, current, version);
        options.push({
            value: current,
            label: removedNetworkReplacement(current) ? current.toUpperCase() : current,
            description: problem,
            disabled: !!problem,
        });
    }

    return options;
};

/** Why the chosen line will not run this network for this protocol, or nothing. */
export const networkProblem = (
    protocol: string | undefined,
    network: string,
    version: CoreVersionId = DEFAULT_CORE_VERSION,
): string | undefined => {
    const replacement = removedNetworkReplacement(network);
    if (replacement) return t("Removed from Xray — use {replacement}", { replacement });
    const lower = network.toLowerCase();
    const { tag } = coreVersion(version);
    if (!allowedValues(version, 'stream.network').includes(lower)) {
        return statusMessage('rejected', `network = "${network}"`, tag);
    }
    const masque = masqueNetworkProblem(protocol, lower, tag);
    if (masque) return masque;
    if (protocol === 'hysteria' && !allowedValues(version, 'hysteria.stream.network').includes(lower)) {
        return t("A hysteria proxy runs only on the hysteria transport — Xray {tag} refuses to start it on anything else.", { tag });
    }
    return undefined;
};

/** Which section each transport settings object belongs to. */
const SETTINGS_SECTION: Record<string, string> = {
    rawSettings: 'tcp',
    tcpSettings: 'tcp',
    xhttpSettings: 'xhttp',
    splithttpSettings: 'xhttp',
    kcpSettings: 'kcp',
    grpcSettings: 'grpc',
    wsSettings: 'ws',
    httpupgradeSettings: 'httpupgrade',
    hysteriaSettings: 'hysteria',
};

/**
 * Settings objects for transports the config does not run.
 *
 * `StreamConfig.Build()` builds every one that is present, whatever `network`
 * says (v26.7.28:infra/conf/transport_internet.go:120-195), so a leftover is
 * not inert: a `kcpSettings` with a `seed` beside `network: "ws"` still fails
 * the load on 26.3 and 26.7. `quicSettings` is not in the list — no supported
 * line has the key, so it is dropped unread.
 */
export const leftoverTransportSettings = (stream: any, network: string): string[] => {
    if (!stream || typeof stream !== 'object') return [];
    const running = networkSection(network);
    return Object.keys(SETTINGS_SECTION).filter(key =>
        stream[key] !== undefined && stream[key] !== null && SETTINGS_SECTION[key] !== running);
};

/**
 * REALITY is built only over RAW, XHTTP and gRPC — every other transport is
 * "REALITY only supports RAW, XHTTP and gRPC for now" and the config does not
 * load (v26.3.27:infra/conf/transport_internet.go:1778,
 * v26.7.28 and v26.9.9 :infra/conf/transport_internet.go:100). The check runs
 * on the canonical name, so the aliases count too.
 */
export const REALITY_NETWORKS = ['raw', 'tcp', 'xhttp', 'splithttp', 'grpc'];

/** Protocols this editor offers REALITY to at all. */
const REALITY_PROTOCOLS = ['vless', 'vmess', 'trojan', 'shadowsocks'];

/**
 * Whether the line ties a hysteria *proxy* to the hysteria transport, read
 * from the `hysteria.stream.network` value set so the two cannot disagree.
 */
const hysteriaProxyNeedsItsTransport = (version: CoreVersionId): boolean =>
    allowedValues(version, 'hysteria.stream.network').every(network => network === 'hysteria');

/**
 * Where hysteria demands TLS, which is two different things.
 *
 * The hysteria *transport* listens and dials only with TLS — "tls config is
 * nil" otherwise. A security of none builds no TLS settings at all
 * (`case "", "none":` — v26.3.27:infra/conf/transport_internet.go:1763,
 * v26.7.28 and v26.9.9 :86, v26.10.10 :92), and the listener and the dialer
 * both stop on that:
 *
 *   v26.3.27:transport/internet/hysteria/hub.go:317, dialer.go:442
 *   v26.7.28 :hub.go:200, dialer.go:324      v26.9.9  :hub.go:202, dialer.go:297
 *   v26.10.10:hub.go:202, dialer.go:317
 *
 * That holds on every line, for any proxy riding that transport.
 *
 * The hysteria *proxy* is not the transport. From 26.7 it refuses to be
 * created on any other transport — "not hysteria transport"
 * (v26.7.28:proxy/hysteria/client.go:37 and server.go:36, the same lines at
 * v26.9.9 and v26.10.10) — so there it inherits the transport's TLS. 26.3
 * never looks (v26.3.27:proxy/hysteria/client.go:32-47, server.go:30-51): a
 * hysteria proxy runs over RAW, WebSocket or anything else the core builds,
 * with whatever security that transport takes, and needs no TLS of its own.
 */
const needsTls = (protocol: string | undefined, network: string, version: CoreVersionId): boolean =>
    (typeof network === 'string' && network.toLowerCase() === 'hysteria')
    || (protocol === 'hysteria' && hysteriaProxyNeedsItsTransport(version));

/**
 * Why this security cannot carry hysteria on this line, or nothing. The
 * diagnostics ask the same question for an inbound (versions/rules.ts), so a
 * field and the panel save say it in the same words.
 */
export const hysteriaTlsProblem = (
    protocol: string | undefined,
    network: string,
    security: string,
    version: CoreVersionId = DEFAULT_CORE_VERSION,
): string | undefined =>
    needsTls(protocol, network, version) && security.toLowerCase() !== 'tls'
        ? t("The hysteria transport runs only with TLS: without it an inbound does not start and an outbound cannot connect.")
        : undefined;

export const securityOptions = (
    protocol: string | undefined,
    network: string,
    current: string | undefined,
    version: CoreVersionId = DEFAULT_CORE_VERSION,
): NetworkOption[] => {
    const tlsOnly = needsTls(protocol, network, version) || (masqueNeedsTls(protocol, network) && allowedValues(version, 'stream.network').includes('masque'));
    const options: NetworkOption[] = [];
    if (!tlsOnly) options.push({ value: 'none', label: t("NONE"), description: t("Plaintext (unsafe)") });
    options.push({ value: 'tls', label: 'TLS', description: t("Standard SSL/TLS encryption") });
    if (!tlsOnly && REALITY_PROTOCOLS.includes(protocol || '') && REALITY_NETWORKS.includes(network.toLowerCase())) {
        options.push({ value: 'reality', label: t("REALITY"), description: t("Next-gen stealth encryption") });
    }
    if (current && !options.some(option => option.value === current)) {
        const problem = securityProblem(protocol, network, current, version);
        options.push({ value: current, label: current.toUpperCase(), description: problem, disabled: !!problem });
    }
    return options;
};

/** Why this security layer will not run over this transport, or nothing. */
export const securityProblem = (
    protocol: string | undefined,
    network: string,
    security: string,
    version: CoreVersionId = DEFAULT_CORE_VERSION,
): string | undefined => {
    const lower = security.toLowerCase();
    const { tag } = coreVersion(version);
    if (lower === 'xtls') {
        return t("Removed from Xray — use {replacement}", { replacement: 'tls / reality + xtls-rprx-vision' });
    }
    if (!allowedValues(version, 'stream.security').includes(lower)) {
        return statusMessage('rejected', `security = "${security}"`, tag);
    }
    const tlsProblem = hysteriaTlsProblem(protocol, network, security, version);
    if (tlsProblem) return tlsProblem;
    if (lower !== 'tls' && masqueNeedsTls(protocol, network) && allowedValues(version, 'stream.network').includes('masque')) {
        return t("MASQUE runs only with TLS — Xray {tag} refuses to start it without.", { tag });
    }
    if (lower === 'reality' && !REALITY_NETWORKS.includes(network.toLowerCase())) {
        return t("REALITY runs only over RAW, XHTTP or gRPC — Xray {tag} refuses it over {network}.", { tag, network });
    }
    return undefined;
};

/**
 * What a line does with a key, in the same words the diagnostics use — the
 * literals are check.ts's, so the notice beside a field and the finding in the
 * diagnostics panel read the same.
 */
export const statusMessage = (status: FeatureStatus, what: string, tag: string): string => {
    switch (status) {
        case 'rejected':
            return t("{what} is refused by Xray {tag} — the config will not load.", { what, tag });
        case 'absent':
            return t("{what} does not exist in Xray {tag}, which drops it silently — it does nothing there.", { what, tag });
        case 'deprecated':
            return t("{what} is deprecated in Xray {tag}. It still works, and the log will ask you to move off it.", { what, tag });
        case 'accepted':
            return '';
    }
};

/** The feature row for a place, matched the way featureStatusAt matches. */
export const featureRowAt = (
    where: { scope: FeatureScope; path: string; protocol?: string; value?: string },
): CoreFeature | undefined =>
    FEATURES.find(feature =>
        feature.scope === where.scope
        && feature.path === where.path
        && (feature.value ?? '') === (where.value ?? '')
        && (!feature.protocol || (where.protocol !== undefined && feature.protocol.includes(where.protocol))),
    );

/** A key a settings object holds that the chosen line does not simply accept. */
export interface KeyNotice {
    key: string;
    status: FeatureStatus;
    replacement?: string;
}

const holds = (value: unknown): boolean => value !== undefined && value !== null;

/**
 * Keys present in `settings` whose row says something other than `accepted`
 * on this line. `settingsPath` is where `settings` sits under the scoped
 * object — `streamSettings.kcpSettings`.
 */
export const keyNotices = (
    settings: Record<string, unknown> | undefined,
    keys: string[],
    where: { scope: FeatureScope; settingsPath: string; protocol?: string },
    version: CoreVersionId = DEFAULT_CORE_VERSION,
): KeyNotice[] => {
    if (!settings || typeof settings !== 'object') return [];
    return keys
        .filter(key => holds(settings[key]))
        .map(key => {
            const place = { scope: where.scope, path: `${where.settingsPath}.${key}`, protocol: where.protocol };
            return {
                key,
                status: featureStatusAt(version, place),
                replacement: featureRowAt(place)?.replacement,
            };
        })
        .filter(notice => notice.status !== 'accepted');
};

// ── mKCP ────────────────────────────────────────────────────────────────

/**
 * `header` and `seed` are a removed feature: 26.3 and 26.7 refuse the config
 * when either key is there at all (`if c.HeaderConfig != nil || c.Seed != nil`,
 * v26.3.27:infra/conf/transport_internet.go:110, v26.7.28:infra/conf/transport_method.go:537),
 * and 26.9 still declares them but never reads them. Their job moved to
 * finalmask UDP masks. Never offered; an existing one gets a notice.
 */
export const KCP_RETIRED_KEYS = ['header', 'seed'];

/** Keys only some lines read; each is offered only where its row says accepted. */
export const KCP_VERSIONED_KEYS = ['congestion', 'readBufferSize', 'writeBufferSize', 'maxSendingWindow', 'cwndMultiplier'];

/** 26.7 and later: the defaults `kcp/config.go` seeds before Build() checks. */
const KCP_DEFAULT_MTU = 1350;

/**
 * The TTI range. 26.3 takes 10-5000 ms (v26.3.27:infra/conf/transport_internet.go:80);
 * 26.7 tightened it to 10-1000 (v26.7.28:infra/conf/transport_method.go:565,
 * v26.9.9 :560) — its in-flight maths divides by `1000 / tti`.
 */
export const kcpTtiRange = (version: CoreVersionId): { min: number; max: number } =>
    ({ min: 10, max: compareCoreVersions(version, '26.7') < 0 ? 5000 : 1000 });

/**
 * The smallest MTU a line takes. 26.3 has the check commented out
 * (v26.3.27:infra/conf/transport_internet.go:73); 26.7 refuses anything
 * under 21 (v26.7.28:infra/conf/transport_method.go:562).
 */
export const kcpMtuMin = (version: CoreVersionId): number | undefined =>
    compareCoreVersions(version, '26.7') < 0 ? undefined : 21;

const num = (value: unknown): number | undefined =>
    typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/**
 * Per-field reasons the line's kcp Build() would fail. These are numeric
 * limits the feature table cannot state, so the form says them itself.
 */
export const kcpProblems = (kcp: any, version: CoreVersionId = DEFAULT_CORE_VERSION): Record<string, string> => {
    const out: Record<string, string> = {};
    const { tag } = coreVersion(version);
    const tti = num(kcp?.tti);
    const range = kcpTtiRange(version);
    if (tti !== undefined && (tti < range.min || tti > range.max)) {
        out.tti = t("Xray {tag} takes {min}–{max} ms.", { tag, min: range.min, max: range.max });
    }
    if (compareCoreVersions(version, '26.7') < 0) return out;

    const mtu = num(kcp?.mtu);
    const mtuMin = kcpMtuMin(version)!;
    if (mtu !== undefined && mtu < mtuMin) {
        out.mtu = t("Xray {tag} refuses an MTU below {min}.", { tag, min: mtuMin });
    }
    // CwndMultiplier < 1 and MaxSendingWindow / Mtu == 0 are both load
    // failures (v26.7.28:infra/conf/transport_method.go:569, :571).
    const cwnd = num(kcp?.cwndMultiplier);
    if (cwnd !== undefined && cwnd < 1) {
        out.cwndMultiplier = t("Xray {tag} refuses a value below {min}.", { tag, min: 1 });
    }
    const window = num(kcp?.maxSendingWindow);
    const effectiveMtu = mtu ?? KCP_DEFAULT_MTU;
    if (window !== undefined && window < effectiveMtu) {
        out.maxSendingWindow = t("Xray {tag} refuses a window smaller than the MTU ({mtu} bytes).", { tag, mtu: effectiveMtu });
    }
    return out;
};

// ── Hysteria ────────────────────────────────────────────────────────────

/**
 * `congestion`, `up`, `down` and `udphop` moved to finalmask: 26.3 and 26.7
 * decode them, log that they moved to quicParams and never use them; 26.9
 * dropped them from the struct (v26.7.28:infra/conf/transport_method.go:780,
 * v26.9.9:infra/conf/transport_method.go:752). Never offered.
 */
export const HYSTERIA_RETIRED_KEYS = ['congestion', 'up', 'down', 'udphop'];

/**
 * `udpIdleTimeout` is 0 (the default, 60) or 2-600 seconds; anything else
 * fails the load on every line (v26.7.28:infra/conf/transport_method.go:784).
 */
export const HYSTERIA_UDP_IDLE = { min: 2, max: 600, fallback: 60 };

export const hysteriaUdpIdleProblem = (value: unknown, version: CoreVersionId = DEFAULT_CORE_VERSION): string | undefined => {
    const n = num(value);
    if (n === undefined || n === 0) return undefined;
    if (n >= HYSTERIA_UDP_IDLE.min && n <= HYSTERIA_UDP_IDLE.max) return undefined;
    return t("Xray {tag} takes 0 (default {fallback}) or {min}–{max} s.", {
        tag: coreVersion(version).tag,
        fallback: HYSTERIA_UDP_IDLE.fallback,
        min: HYSTERIA_UDP_IDLE.min,
        max: HYSTERIA_UDP_IDLE.max,
    });
};

/**
 * The UDP masks that took over mKCP's header and seed on a line, read from
 * the finalmask value set: the `header-*` family and `mkcp-*` on 26.3, one
 * `mkcp-legacy` from 26.7. `header-custom` is a general mask, not a KCP one.
 */
export const kcpReplacementMasks = (version: CoreVersionId = DEFAULT_CORE_VERSION): string[] =>
    allowedValues(version, 'finalmask.udp.type')
        .filter(type => type.startsWith('mkcp-') || (type.startsWith('header-') && type !== 'header-custom'));
