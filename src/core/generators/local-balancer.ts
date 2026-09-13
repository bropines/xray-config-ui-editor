// ============================================================
// Local balancer builder — src/core/generators/local-balancer.ts
// ============================================================
//
// Builds the kind of *client* config people hand-write today: a local SOCKS/HTTP
// inbound, a handful of proxy outbounds to the same location, a balancer that
// picks the fastest of them, a probe that measures them, and a bypass rule so
// local traffic never leaves through the tunnel.
//
// Writing one by hand means keeping five things in sync: every proxy tag has to
// share the prefix the balancer's `selector` matches, the probe's
// `subjectSelector` has to match that same prefix, the catch-all rule has to
// name the balancer's tag, and the bypass domain list has to be repeated in
// both `routing.rules` and the DNS server entry. Get one wrong and the config
// still starts — it just quietly stops balancing, or leaks. This module makes
// those five follow from one set of options.
//
// Everything here is pure: same inputs, same output, no store and no clock.
// ============================================================

import { DEFAULT_BYPASS_DOMAINS } from '../presets/bypass-domains';

/** One proxy the balancer can pick, as parsed from a link or an existing config. */
export interface LocalBalancerNode {
    /** A complete outbound object. Its tag is rewritten by the builder. */
    outbound: any;
    /** Human label, typically a link's `#fragment` ("🇳🇱 ⚡ Нидерланды #2"). */
    label?: string;
}

export type BalancerStrategyType = 'leastLoad' | 'leastPing' | 'roundRobin' | 'random';

/** How the balancer learns which node is fastest. */
export type ProbeKind = 'burst' | 'observatory' | 'none';

export interface LocalBalancerOptions {
    /** Tag prefix shared by every proxy — also the balancer/probe selector. */
    proxyTagPrefix: string;
    /**
     * How the per-node tags are built off that prefix:
     *   numbered    — `proxy`, `proxy-2`, `proxy-3`
     *   zeroIndexed — `fb3-0`, `fb3-1`, `fb3-2` (prefix usually ends in `-`)
     *   labelled    — `proxy-Amsterdam-1`, keeping the location readable
     * All three keep the prefix at the front, which is what the balancer's
     * prefix-matching selector relies on.
     */
    tagStyle: 'numbered' | 'zeroIndexed' | 'labelled';
    balancerTag: string;
    /**
     * Outbound used when the balancer has nothing healthy to pick.
     *   none  — omit the field (Xray then fails the connection)
     *   first — the first proxy, so a dead probe degrades to "just use node 1"
     *   or an explicit tag.
     */
    fallbackTag: 'none' | 'first' | string;
    strategy: BalancerStrategyType;
    /** leastLoad tuning. Omitted keys are left out of the output. */
    strategySettings: { maxRTT?: string; expected?: number; tolerance?: number; baselines?: string[] };
    probe: ProbeKind;
    probeInterval: string;
    probeTimeout: string;
    probeSampling: number;
    probeURL: string;
    /** Local listeners. Null disables that inbound. */
    socksPort: number | null;
    httpPort: number | null;
    listen: string;
    sniffing: boolean;
    /** Domains that must never go through the tunnel. */
    bypassDomains: string[];
    /** Extra domains for the DNS bypass entry only (e.g. your own panel). */
    dnsExtraDomains: string[];
    /** Send bittorrent straight out instead of through the proxy. */
    bypassBittorrent: boolean;
    dns: boolean;
    dnsUpstream: string[];
    queryStrategy: string;
    domainMatcher: string;
    domainStrategy: string;
    /** Subscription label for this config. */
    remarks?: string;
    /**
     * Build the balancer even for a single node. Off by default: with one
     * proxy a balancer adds a probe and a moving part for no choice to make,
     * so the config falls back to "first outbound wins", which is what
     * hand-written single-node configs do.
     */
    forceBalancer: boolean;
}

export const DEFAULT_LOCAL_BALANCER_OPTIONS: LocalBalancerOptions = {
    proxyTagPrefix: 'proxy',
    tagStyle: 'numbered',
    balancerTag: 'entry-balancer',
    fallbackTag: 'none',
    strategy: 'leastLoad',
    strategySettings: { maxRTT: '4s', expected: 1 },
    probe: 'burst',
    probeInterval: '10s',
    probeTimeout: '5s',
    probeSampling: 2,
    probeURL: 'https://www.gstatic.com/generate_204',
    socksPort: 10808,
    httpPort: 10809,
    listen: '127.0.0.1',
    sniffing: true,
    bypassDomains: DEFAULT_BYPASS_DOMAINS,
    dnsExtraDomains: [],
    bypassBittorrent: true,
    dns: true,
    dnsUpstream: ['1.1.1.1', '8.8.8.8'],
    queryStrategy: 'UseIP',
    domainMatcher: 'hybrid',
    domainStrategy: 'AsIs',
    forceBalancer: false,
};

/**
 * Ready-made option sets for the two shapes these configs come in.
 *
 * `simple` is the everyday one: two or three nodes in a single location,
 * readable tags, a quick probe. `fleet` is what a large pool is written as —
 * zero-indexed tags behind a short prefix, a fallback so a dead probe still
 * routes, baselines that stop leastLoad from flapping between similar nodes,
 * and a slower probe so a dozen nodes are not pinged every ten seconds.
 */
export const LOCAL_BALANCER_PRESETS: Record<string, { label: string; description: string; options: Partial<LocalBalancerOptions> }> = {
    simple: {
        label: 'Simple',
        description: 'proxy / proxy-2 tags, one balancer, 10s burst probe. Good for 2-4 nodes in one location.',
        options: {
            proxyTagPrefix: 'proxy',
            tagStyle: 'numbered',
            balancerTag: 'entry-balancer',
            fallbackTag: 'none',
            strategy: 'leastLoad',
            strategySettings: { maxRTT: '4s', expected: 1 },
            probe: 'burst',
            probeInterval: '10s',
            probeTimeout: '5s',
            probeSampling: 2,
        },
    },
    fleet: {
        label: 'Fleet',
        description: 'fb-0 / fb-1 tags, fallback to the first node, baselines, 60s probe. Built for large pools.',
        options: {
            proxyTagPrefix: 'fb-',
            tagStyle: 'zeroIndexed',
            balancerTag: 'bal-fb',
            fallbackTag: 'first',
            strategy: 'leastLoad',
            strategySettings: { baselines: ['450ms', '600ms'], expected: 1, maxRTT: '1s', tolerance: 0 },
            probe: 'burst',
            probeInterval: '60s',
            probeTimeout: '5s',
            probeSampling: 1,
        },
    },
};

/**
 * How a Remnawave subscription template picks the hosts it injects as
 * outbounds. Mirrors the panel's own injector schema:
 *   sameTagAsRecipient — the hosts sharing the tag of the host being rendered
 *   tagRegex / remarkRegex — hosts whose tag/remark matches a pattern
 *   uuids — an explicit list of hosts
 */
export type InjectSelector =
    | { type: 'sameTagAsRecipient' }
    | { type: 'tagRegex'; pattern: string }
    | { type: 'remarkRegex'; pattern: string }
    | { type: 'uuids'; values: string[] };

export interface InjectOptions {
    selector: InjectSelector;
    /** Which pool to take hosts from. HIDDEN is the usual one: the nodes are
     *  hidden rows, and the visible host is the balancer entry the user sees. */
    selectFrom: 'ALL' | 'HIDDEN' | 'NOT_HIDDEN';
    /** Also inject the visible host itself as one of the balanced outbounds. */
    addVirtualHostAsOutbound: boolean;
}

export const DEFAULT_INJECT_OPTIONS: InjectOptions = {
    selector: { type: 'sameTagAsRecipient' },
    selectFrom: 'HIDDEN',
    addVirtualHostAsOutbound: false,
};

/** A named set of nodes that becomes one config in the output. */
export interface LocalBalancerGroup {
    name: string;
    nodes: LocalBalancerNode[];
}

const PROXY_PROTOCOLS = ['vless', 'vmess', 'trojan', 'shadowsocks', 'socks', 'http', 'wireguard', 'hysteria2'];

/** True for an outbound that can actually carry traffic to a remote server. */
export const isProxyOutbound = (outbound: any): boolean =>
    !!outbound &&
    typeof outbound === 'object' &&
    typeof outbound.protocol === 'string' &&
    PROXY_PROTOCOLS.includes(outbound.protocol);

/**
 * Turn a label into a tag-safe slug: Xray tags are compared as plain strings,
 * and a tag carrying spaces or emoji is a foot-gun in every place that has to
 * be typed by hand (a rule's `outboundTag`, a selector, a log line).
 */
export const slugifyLabel = (label: string): string =>
    (label || '')
        .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '')      // flag regional indicators
        .replace(/[^\p{L}\p{N}]+/gu, '-')            // anything else -> dash
        .replace(/^-+|-+$/g, '')
        .slice(0, 40);

/**
 * Tag for the n-th proxy. The first one carries the bare prefix, which is what
 * makes `selector: ["proxy"]` a prefix match over the whole set rather than an
 * exact match on one node.
 */
export const proxyTagFor = (
    index: number,
    options: Pick<LocalBalancerOptions, 'proxyTagPrefix' | 'tagStyle'>,
    label?: string
): string => {
    const prefix = options.proxyTagPrefix || 'proxy';
    if (options.tagStyle === 'zeroIndexed') return `${prefix}${index}`;
    if (options.tagStyle === 'labelled') {
        const slug = slugifyLabel(stripTrailingIndex(label || ''));
        return slug ? `${prefix}-${slug}-${index + 1}` : (index === 0 ? prefix : `${prefix}-${index + 1}`);
    }
    return index === 0 ? prefix : `${prefix}-${index + 1}`;
};

/**
 * Drop a label's trailing numbering ("… #2", "… - 3"). Both the grouping key
 * and the tag builder need the location without its index, or "Amsterdam #2"
 * groups apart from "Amsterdam #1" and tags come out as "…-2-2".
 */
const stripTrailingIndex = (label: string): string =>
    (label || '').trim().replace(/[\s\-–—|]*#?\d+\s*$/u, '').trim();

/**
 * Group nodes by the location their label names, so a subscription of
 * "🇳🇱 … #1 / 🇳🇱 … #2 / 🇫🇮 … #1" becomes one config per country — the layout
 * these client configs are normally published in.
 *
 * The key is the label with trailing numbering removed, flag emoji included:
 * the flag alone would merge two different Dutch providers, and the raw label
 * would split "#1" from "#2".
 */
export const groupNodesByLabel = (nodes: LocalBalancerNode[]): LocalBalancerGroup[] => {
    const groups: LocalBalancerGroup[] = [];
    const byKey = new Map<string, LocalBalancerGroup>();

    nodes.forEach(node => {
        const key = stripTrailingIndex(node.label || '') || 'Config';
        let group = byKey.get(key);
        if (!group) {
            group = { name: key, nodes: [] };
            byKey.set(key, group);
            groups.push(group);
        }
        group.nodes.push(node);
    });

    return groups;
};

const buildInbounds = (options: LocalBalancerOptions): any[] => {
    const sniffing = {
        enabled: true,
        routeOnly: false,
        destOverride: ['http', 'tls', 'quic'],
    };

    const inbounds: any[] = [];
    if (options.socksPort !== null) {
        inbounds.push({
            tag: 'socks',
            port: options.socksPort,
            listen: options.listen,
            protocol: 'socks',
            settings: { udp: true, auth: 'noauth' },
            ...(options.sniffing ? { sniffing } : {}),
        });
    }
    if (options.httpPort !== null) {
        inbounds.push({
            tag: 'http',
            port: options.httpPort,
            listen: options.listen,
            protocol: 'http',
            settings: { allowTransparent: false },
            ...(options.sniffing ? { sniffing } : {}),
        });
    }
    return inbounds;
};

const buildStrategy = (options: LocalBalancerOptions) => {
    const settings: Record<string, unknown> = {};
    // leastPing/roundRobin/random take no tuning; carrying leastLoad's numbers
    // over to them would write fields Xray ignores and readers misread.
    if (options.strategy === 'leastLoad') {
        const { baselines, expected, maxRTT, tolerance } = options.strategySettings;
        if (baselines && baselines.length > 0) settings.baselines = [...baselines];
        if (typeof expected === 'number') settings.expected = expected;
        if (maxRTT) settings.maxRTT = maxRTT;
        if (typeof tolerance === 'number') settings.tolerance = tolerance;
    }
    return Object.keys(settings).length > 0
        ? { type: options.strategy, settings }
        : { type: options.strategy };
};

const buildProbe = (options: LocalBalancerOptions) => {
    const selector = [options.proxyTagPrefix];
    if (options.probe === 'burst') {
        return {
            burstObservatory: {
                pingConfig: {
                    timeout: options.probeTimeout,
                    interval: options.probeInterval,
                    sampling: options.probeSampling,
                    destination: options.probeURL,
                },
                subjectSelector: selector,
            },
        };
    }
    if (options.probe === 'observatory') {
        return {
            observatory: {
                subjectSelector: selector,
                probeInterval: options.probeInterval,
                probeURL: options.probeURL,
                enableConcurrency: true,
            },
        };
    }
    return {};
};

export interface BuildResult {
    config: any;
    /** What the builder decided, for the UI to explain rather than hide. */
    summary: {
        nodeCount: number;
        balanced: boolean;
        proxyTags: string[];
        balancerTag: string | null;
        probe: ProbeKind;
    };
}

/**
 * Build one client config from a set of nodes.
 *
 * The balancer is only wired up when there is a choice to make (2+ nodes, or
 * `forceBalancer`). With a single node the catch-all rule, the balancer and the
 * probe are all left out, and traffic falls through to the first outbound —
 * fewer moving parts for identical behaviour.
 */
export const buildLocalBalancerConfig = (
    nodes: LocalBalancerNode[],
    overrides: Partial<LocalBalancerOptions> = {}
): BuildResult => {
    const options: LocalBalancerOptions = { ...DEFAULT_LOCAL_BALANCER_OPTIONS, ...overrides };
    const usable = (nodes || []).filter(n => isProxyOutbound(n?.outbound));

    if (usable.length === 0) {
        throw new Error('No proxy outbounds to build a config from');
    }

    const balanced = usable.length > 1 || options.forceBalancer;

    const proxies = usable.map((node, i) => {
        const tag = proxyTagFor(i, options, node.label);
        // Tag first so it reads as the first key, like a hand-written config.
        const { tag: _dropped, ...rest } = node.outbound;
        return { tag, ...rest };
    });

    const rules: any[] = [];
    if (options.bypassDomains.length > 0) {
        rules.push({ type: 'field', domain: [...options.bypassDomains], outboundTag: 'direct' });
    }
    if (options.bypassBittorrent) {
        rules.push({ type: 'field', protocol: ['bittorrent'], outboundTag: 'direct' });
    }
    if (balanced) {
        rules.push({ type: 'field', network: 'tcp,udp', balancerTag: options.balancerTag });
    }

    const routing: any = { rules };
    if (balanced) {
        const balancer: any = {
            tag: options.balancerTag,
            selector: [options.proxyTagPrefix],
            strategy: buildStrategy(options),
        };
        if (options.fallbackTag !== 'none') {
            balancer.fallbackTag = options.fallbackTag === 'first'
                ? proxies[0].tag
                : options.fallbackTag;
        }
        routing.balancers = [balancer];
    }
    routing.domainMatcher = options.domainMatcher;
    routing.domainStrategy = options.domainStrategy;

    const config: any = {};

    if (options.dns) {
        const dnsDomains = [...options.bypassDomains, ...options.dnsExtraDomains];
        config.dns = {
            servers: [
                // `localhost` resolves through the system resolver, so bypassed
                // domains get answers from the local network's DNS rather than
                // from an upstream that sees them coming from the exit node.
                // skipFallback keeps a failure here from silently retrying
                // through the proxied servers below.
                ...(dnsDomains.length > 0
                    ? [{ address: 'localhost', domains: dnsDomains, skipFallback: true }]
                    : []),
                ...options.dnsUpstream,
            ],
            queryStrategy: options.queryStrategy,
        };
    }

    config.routing = routing;
    config.inbounds = buildInbounds(options);
    config.outbounds = [
        ...proxies,
        { tag: 'direct', protocol: 'freedom' },
        { tag: 'block', protocol: 'blackhole' },
    ];

    if (balanced) Object.assign(config, buildProbe(options));
    if (options.remarks) config.remarks = options.remarks;

    return {
        config,
        summary: {
            nodeCount: proxies.length,
            balanced,
            proxyTags: proxies.map(p => p.tag),
            balancerTag: balanced ? options.balancerTag : null,
            probe: balanced ? options.probe : 'none',
        },
    };
};

/**
 * Build the same config as a Remnawave **subscription template**: identical
 * routing, balancer, probe and bypass, but with no proxy outbounds of its own.
 * The panel fills those in per subscriber from the hosts the injector selects,
 * tagging them with `tagPrefix` — which is why that prefix has to be the one
 * the balancer's selector matches.
 *
 * This is the difference between "a config file for one person" and "a thing
 * the panel hands to every subscriber": the template carries no user id and no
 * node addresses, so it stays correct as nodes come and go.
 */
export const buildLocalBalancerTemplate = (
    overrides: Partial<LocalBalancerOptions> = {},
    inject: Partial<InjectOptions> = {}
): any => {
    const options: LocalBalancerOptions = { ...DEFAULT_LOCAL_BALANCER_OPTIONS, ...overrides };
    const injectOptions: InjectOptions = { ...DEFAULT_INJECT_OPTIONS, ...inject };

    // One placeholder node stands in while the skeleton is assembled, then the
    // proxies are dropped: it keeps the balancer/probe/catch-all wiring in the
    // single code path that already gets it right.
    const placeholder = {
        outbound: { tag: 'placeholder', protocol: 'vless', settings: { vnext: [] } },
    };
    const { config } = buildLocalBalancerConfig([placeholder], {
        ...options,
        forceBalancer: true,
    });

    config.outbounds = config.outbounds.filter((o: any) => o.tag === 'direct' || o.tag === 'block');
    config.remnawave = {
        injectHosts: [{
            selector: injectOptions.selector,
            selectFrom: injectOptions.selectFrom,
            tagPrefix: options.proxyTagPrefix,
        }],
        addVirtualHostAsOutbound: injectOptions.addVirtualHostAsOutbound,
    };

    // `remarks` belongs to a rendered client config, not to a template.
    delete config.remarks;
    return config;
};

export interface ParsedLocalBalancer {
    /** Whether the input carries its own proxies or expects injected ones. */
    kind: 'config' | 'template';
    options: Partial<LocalBalancerOptions>;
    inject?: InjectOptions;
    /** What could not be read back, so the UI can say so instead of guessing. */
    notes: string[];
}

/**
 * Read a config or template produced by this builder (or hand-written in the
 * same shape) back into the options that would produce it.
 *
 * This is what makes an existing balancer editable: without it, changing one
 * probe interval on a live template means retyping every field, and the risk
 * of a mismatch between the balancer selector, the probe selector and the
 * injector prefix comes straight back.
 *
 * Unreadable parts are reported in `notes` rather than silently defaulted,
 * because a default that looks like a read value is the dangerous outcome.
 */
export const parseLocalBalancer = (input: any): ParsedLocalBalancer => {
    const notes: string[] = [];
    if (!input || typeof input !== 'object') {
        throw new Error('Not a JSON object');
    }

    const routing = input.routing || {};
    const rules: any[] = Array.isArray(routing.rules) ? routing.rules : [];
    const balancer = Array.isArray(routing.balancers) ? routing.balancers[0] : undefined;
    const injector = input.remnawave;
    const injectEntry = Array.isArray(injector?.injectHosts) ? injector.injectHosts[0] : undefined;
    const kind: 'config' | 'template' = injector ? 'template' : 'config';

    const proxies = (input.outbounds || []).filter(
        (o: any) => o && o.tag !== 'direct' && o.tag !== 'block' && o.protocol !== 'freedom' && o.protocol !== 'blackhole'
    );

    const proxyTagPrefix =
        injectEntry?.tagPrefix ||
        balancer?.selector?.[0] ||
        proxies[0]?.tag ||
        DEFAULT_LOCAL_BALANCER_OPTIONS.proxyTagPrefix;

    // `fb-0` style numbering is visible in the tags themselves; a bare prefix
    // on the first proxy is the numbered style.
    let tagStyle: LocalBalancerOptions['tagStyle'] = DEFAULT_LOCAL_BALANCER_OPTIONS.tagStyle;
    if (proxies.length > 0) {
        if (proxies[0].tag === `${proxyTagPrefix}0`) tagStyle = 'zeroIndexed';
        else if (proxies[0].tag !== proxyTagPrefix) tagStyle = 'labelled';
    }

    const options: Partial<LocalBalancerOptions> = { proxyTagPrefix, tagStyle };

    if (balancer) {
        options.balancerTag = balancer.tag;
        if (balancer.strategy?.type) options.strategy = balancer.strategy.type;
        options.strategySettings = { ...(balancer.strategy?.settings || {}) };
        if (typeof balancer.fallbackTag === 'string') {
            options.fallbackTag = balancer.fallbackTag === proxies[0]?.tag ? 'first' : balancer.fallbackTag;
        } else {
            options.fallbackTag = 'none';
        }
    } else {
        // A template can route its catch-all straight to one injected outbound
        // instead of balancing across several. That is a different thing from
        // what this builder writes, so say so rather than quietly adding a
        // balancer on the next save.
        const catchAllTarget = rules.at(-1)?.outboundTag;
        notes.push(catchAllTarget
            ? `This one routes to "${catchAllTarget}" directly, with no balancer — saving from here adds one`
            : 'No balancer found — options were read from the rest of it');
    }

    // --- probe ---
    if (input.burstObservatory?.pingConfig) {
        const ping = input.burstObservatory.pingConfig;
        options.probe = 'burst';
        if (ping.interval) options.probeInterval = ping.interval;
        if (ping.timeout) options.probeTimeout = ping.timeout;
        if (typeof ping.sampling === 'number') options.probeSampling = ping.sampling;
        if (ping.destination) options.probeURL = ping.destination;
    } else if (input.observatory) {
        options.probe = 'observatory';
        if (input.observatory.probeInterval) options.probeInterval = input.observatory.probeInterval;
        if (input.observatory.probeURL) options.probeURL = input.observatory.probeURL;
    } else {
        options.probe = 'none';
    }

    // --- local listeners ---
    const inbounds: any[] = Array.isArray(input.inbounds) ? input.inbounds : [];
    const socks = inbounds.find(i => i.protocol === 'socks');
    const http = inbounds.find(i => i.protocol === 'http');
    options.socksPort = socks ? socks.port : null;
    options.httpPort = http ? http.port : null;
    const listen = socks?.listen || http?.listen;
    if (listen) options.listen = listen;
    options.sniffing = !!(socks?.sniffing?.enabled || http?.sniffing?.enabled);
    if (inbounds.some(i => i.protocol !== 'socks' && i.protocol !== 'http')) {
        notes.push('Inbounds other than SOCKS/HTTP were dropped — the builder only writes those two');
    }

    // --- bypass & DNS ---
    const bypassRule = rules.find(r => Array.isArray(r?.domain) && r.outboundTag === 'direct');
    options.bypassDomains = bypassRule ? [...bypassRule.domain] : [];
    options.bypassBittorrent = rules.some(
        r => Array.isArray(r?.protocol) && r.protocol.includes('bittorrent') && r.outboundTag === 'direct'
    );

    const dnsServers: any[] = Array.isArray(input.dns?.servers) ? input.dns.servers : [];
    options.dns = dnsServers.length > 0;
    const localEntry = dnsServers.find(srv => typeof srv === 'object' && srv?.address === 'localhost');
    options.dnsUpstream = dnsServers.filter(srv => typeof srv === 'string');
    if (localEntry && Array.isArray(localEntry.domains)) {
        const bypassSet = new Set(options.bypassDomains);
        const domains: string[] = localEntry.domains;
        options.dnsExtraDomains = domains.filter(d => !bypassSet.has(d));
        // The builder always writes the bypass list first and the extras after
        // it. Matching sets, different order — worth saying, since saving will
        // rewrite the list in that order.
        const lastBypassAt = domains.reduce((acc, d, i) => (bypassSet.has(d) ? i : acc), -1);
        const firstExtraAt = domains.findIndex(d => !bypassSet.has(d));
        if (firstExtraAt !== -1 && firstExtraAt < lastBypassAt) {
            notes.push('Extra DNS domains will be rewritten after the bypass list (same set, different order)');
        }
    } else {
        options.dnsExtraDomains = [];
    }
    if (dnsServers.some(srv => typeof srv === 'object' && srv?.address !== 'localhost')) {
        notes.push('Custom DNS server entries were dropped — the builder writes one localhost entry plus plain upstreams');
    }

    if (input.routing?.domainMatcher) options.domainMatcher = input.routing.domainMatcher;
    if (input.routing?.domainStrategy) options.domainStrategy = input.routing.domainStrategy;
    if (typeof input.remarks === 'string') options.remarks = input.remarks;

    const inject: InjectOptions | undefined = injectEntry
        ? {
            selector: injectEntry.selector || DEFAULT_INJECT_OPTIONS.selector,
            selectFrom: injectEntry.selectFrom || DEFAULT_INJECT_OPTIONS.selectFrom,
            addVirtualHostAsOutbound: !!injector.addVirtualHostAsOutbound,
        }
        : undefined;

    if (injector && !injectEntry) {
        notes.push('The template has a remnawave block with no injectHosts entry');
    }

    return { kind, options, inject, notes };
};

/**
 * Build one config per group — the array shape a JSON subscription is served
 * in, each entry carrying its group name as `remarks`.
 */
export const buildLocalBalancerSubscription = (
    groups: LocalBalancerGroup[],
    overrides: Partial<LocalBalancerOptions> = {}
): BuildResult[] =>
    groups
        .filter(g => g.nodes.some(n => isProxyOutbound(n?.outbound)))
        .map(group => buildLocalBalancerConfig(group.nodes, { ...overrides, remarks: group.name }));
