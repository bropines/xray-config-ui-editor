// ============================================================
// What reaches each outbound, and at which layer
// ============================================================

import type { XrayConfig, RoutingRule } from '../types';

/**
 * The layer a routing rule decides at.
 *
 * This matters operationally, not academically: an L7 rule matches on
 * something that only exists once the payload has been inspected — a domain
 * from a TLS SNI, an application protocol — so it needs sniffing enabled on
 * the inbound that carries the traffic. An L4 rule matches on addresses and
 * ports, which are in the packet headers and always available.
 *
 * A config whose rules are all L7 while sniffing is off routes nothing the way
 * its author expected, and nothing in the UI used to say so.
 */
export type RoutingLayer = 'L4' | 'L7' | 'mixed' | 'none';

/** Rule fields that match on headers alone. */
export const L4_MATCHERS = ['ip', 'port', 'sourcePort', 'source', 'network', 'inboundTag', 'user', 'localIp', 'localPort'] as const;

/** Rule fields that need the payload inspected, so they depend on sniffing. */
export const L7_MATCHERS = ['domain', 'protocol', 'attrs', 'vlessRoute', 'processName', 'localOs'] as const;

export interface OutboundRoute {
    /** Position in `routing.rules`, so the UI can jump to it. */
    index: number;
    /** What the rule calls itself, or a positional fallback. */
    label: string;
    layer: RoutingLayer;
    /** Matcher fields the rule actually sets. */
    matchers: string[];
    /** Straight to the outbound, or through a balancer that selects it. */
    via: string | null;
}

export interface OutboundRoutingSummary {
    tag: string;
    /** Rules that can send traffic here, in rule order. */
    routes: OutboundRoute[];
    /** Combined layer across every route. */
    layer: RoutingLayer;
    /** Balancer tags whose selector matches this outbound. */
    balancers: string[];
    /**
     * True when no rule names it and it is not the first outbound — Xray sends
     * unmatched traffic to the first outbound, so everything else with no rule
     * is dead weight in the config.
     */
    unreachable: boolean;
    /** It is the first outbound, so it catches everything no rule matched. */
    isDefault: boolean;
}

const asArray = (value: unknown): unknown[] =>
    Array.isArray(value) ? value : value === undefined || value === null || value === '' ? [] : [value];

/** Matcher fields a rule actually sets, ignoring empty arrays. */
export const rulematchers = (rule: RoutingRule): string[] => {
    const all = [...L4_MATCHERS, ...L7_MATCHERS];
    return all.filter(field => asArray((rule as any)[field]).length > 0);
};

export const layerOf = (rule: RoutingRule): RoutingLayer => {
    const used = rulematchers(rule);
    const hasL4 = used.some(field => (L4_MATCHERS as readonly string[]).includes(field));
    const hasL7 = used.some(field => (L7_MATCHERS as readonly string[]).includes(field));
    if (hasL4 && hasL7) return 'mixed';
    if (hasL7) return 'L7';
    if (hasL4) return 'L4';
    // No matchers at all is a catch-all, which decides at no layer: it takes
    // everything that reached it regardless of what the traffic looks like.
    return 'none';
};

const combineLayers = (layers: RoutingLayer[]): RoutingLayer => {
    const meaningful = layers.filter(l => l !== 'none');
    if (meaningful.length === 0) return 'none';
    if (meaningful.every(l => l === 'L4')) return 'L4';
    if (meaningful.every(l => l === 'L7')) return 'L7';
    return 'mixed';
};

/**
 * Xray matches a balancer selector by prefix, not equality: a selector of
 * `["proxy"]` picks up `proxy`, `proxy-2` and `proxy-Amsterdam` alike. Getting
 * this wrong would under-report which outbounds a balancer feeds.
 */
export const balancerSelects = (selector: unknown, tag: string): boolean =>
    asArray(selector).some(prefix => typeof prefix === 'string' && prefix !== '' && tag.startsWith(prefix));

const ruleLabel = (rule: RoutingRule, index: number): string =>
    (rule as any).ruleTag || (rule as any).outboundTag || (rule as any).balancerTag || `#${index + 1}`;

/** Everything that can send traffic to one outbound tag. */
export const describeOutboundRouting = (
    config: XrayConfig | null | undefined,
    tag: string,
): OutboundRoutingSummary => {
    const rules = (config?.routing?.rules || []) as RoutingRule[];
    const balancers = (config?.routing?.balancers || []) as any[];
    const outbounds = (config?.outbounds || []) as any[];

    const feeding = balancers
        .filter(b => balancerSelects(b?.selector, tag))
        .map(b => b?.tag)
        .filter((t): t is string => typeof t === 'string' && t !== '');

    const routes: OutboundRoute[] = [];
    rules.forEach((rule, index) => {
        // A `{ "snippet": "NAME" }` placeholder is not a rule; the panel
        // replaces it before a node ever sees the config.
        if (!rule || typeof rule !== 'object' || 'snippet' in (rule as any)) return;

        const direct = (rule as any).outboundTag === tag;
        const viaBalancer = (rule as any).balancerTag && feeding.includes((rule as any).balancerTag);
        if (!direct && !viaBalancer) return;

        routes.push({
            index,
            label: ruleLabel(rule, index),
            layer: layerOf(rule),
            matchers: rulematchers(rule),
            via: direct ? null : (rule as any).balancerTag,
        });
    });

    const isDefault = outbounds.length > 0 && outbounds[0]?.tag === tag;

    return {
        tag,
        routes,
        layer: combineLayers(routes.map(r => r.layer)),
        balancers: feeding,
        unreachable: routes.length === 0 && !isDefault,
        isDefault,
    };
};

/** The same summary for every outbound, keyed by tag. */
export const summariseOutboundRouting = (
    config: XrayConfig | null | undefined,
): Map<string, OutboundRoutingSummary> => {
    const map = new Map<string, OutboundRoutingSummary>();
    for (const outbound of (config?.outbounds || []) as any[]) {
        const tag = outbound?.tag;
        if (typeof tag !== 'string' || tag === '') continue;
        map.set(tag, describeOutboundRouting(config, tag));
    }
    return map;
};
