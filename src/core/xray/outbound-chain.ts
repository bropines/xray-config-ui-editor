/**
 * An outbound that reaches the network through another outbound.
 *
 * Xray has two ways to say it, and they are not two spellings of one thing:
 *
 *   L4 — `streamSettings.sockopt.dialerProxy: "tag"`
 *        The outbound dials as usual (`internet.Dial`, the whole transport
 *        stack: network, TLS or REALITY, sockopt, finalmask), and the raw
 *        socket underneath is obtained from the other outbound. Every
 *        supported core has it.
 *
 *   L7 — `proxySettings: { "tag": "tag" }`
 *        The outbound does not dial at all. The other outbound's handler is
 *        asked to carry a stream to the destination, and of this outbound's
 *        own stream settings only TLS is laid on top
 *        (v26.7.28:app/proxyman/outbound/handler.go:275-298 — `Dispatch` on
 *        the other handler, then `tls.ConfigFromStreamSettings`). Its
 *        network, REALITY, sockopt and finalmask are never consulted.
 *        26.3 and 26.7 run it; 26.9 answers `PrintRemovedFeatureError` for
 *        any `proxySettings` and refuses the config
 *        (v26.9.9:infra/conf/xray.go:261).
 *
 * `proxySettings.transportLayer: true` is the old way to ask for L4: on 26.3
 * and 26.7 the loader copies the tag into `sockopt.dialerProxy` and throws the
 * `proxySettings` away (v26.7.28:infra/conf/xray.go:330-340), so it runs
 * identically to L4 there — and is refused with the rest of `proxySettings`
 * on 26.9.
 *
 * Both keys naming an outbound at once is an error on 26.3 and 26.7
 * ("proxySettings.tag is conflicted with sockopt.dialerProxy",
 * v26.7.28:infra/conf/xray.go:224-231, returned from Build at :297), so the
 * writers below always clear the one they are not setting.
 */

import { isSnippetRef } from '../snippets';

export type ChainLayer = 'L4' | 'L7';

export interface OutboundChain {
    /** The outbound this one's connections go through. */
    via: string;
    layer: ChainLayer;
    /** The key that says so. */
    field: 'sockopt.dialerProxy' | 'proxySettings';
    /** Both keys name an outbound, which 26.3 and 26.7 refuse outright. */
    conflict: boolean;
}

type Json = Record<string, any>;

const isObject = (value: unknown): value is Json =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const tagOf = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** How this outbound is chained, if it is. */
export const chainOf = (outbound: unknown): OutboundChain | null => {
    if (!isObject(outbound)) return null;
    const sockopt = isObject(outbound.streamSettings) && isObject(outbound.streamSettings.sockopt)
        ? outbound.streamSettings.sockopt
        : undefined;
    const dialer = tagOf(sockopt?.dialerProxy);
    const legacy = isObject(outbound.proxySettings) ? tagOf(outbound.proxySettings.tag) : '';

    // `proxySettings` is read first by the handler (handler.go:275), so when
    // both are present it is the one that would have run.
    if (legacy) {
        const transport = (outbound.proxySettings as Json).transportLayer === true;
        return { via: legacy, layer: transport ? 'L4' : 'L7', field: 'proxySettings', conflict: dialer !== '' };
    }
    if (dialer) return { via: dialer, layer: 'L4', field: 'sockopt.dialerProxy', conflict: false };
    return null;
};

/** `streamSettings` without a dialerProxy, and without the objects that held nothing else. */
const withoutDialer = (streamSettings: unknown): Json | undefined => {
    if (!isObject(streamSettings)) return undefined;
    if (!isObject(streamSettings.sockopt)) return streamSettings;
    const sockopt = { ...streamSettings.sockopt };
    delete sockopt.dialerProxy;
    const next = { ...streamSettings };
    if (Object.keys(sockopt).length === 0) delete next.sockopt;
    else next.sockopt = sockopt;
    return Object.keys(next).length === 0 ? undefined : next;
};

/**
 * This outbound, chained through `via` at `layer`.
 *
 * L4 is written as `sockopt.dialerProxy`, never as `transportLayer: true`:
 * the two run the same on 26.3 and 26.7, and only the first loads on 26.9.
 * Whichever key is not being set is cleared, because the core refuses both.
 * Pure — the outbound it was given is left alone.
 */
export const withChain = <T extends Json>(outbound: T, via: string, layer: ChainLayer): T => {
    const next: Json = { ...outbound };
    if (layer === 'L4') {
        delete next.proxySettings;
        const streamSettings = isObject(outbound.streamSettings) ? outbound.streamSettings : {};
        const sockopt = isObject(streamSettings.sockopt) ? streamSettings.sockopt : {};
        next.streamSettings = { ...streamSettings, sockopt: { ...sockopt, dialerProxy: via } };
        return next as T;
    }
    next.proxySettings = { tag: via };
    const streamSettings = withoutDialer(outbound.streamSettings);
    if (streamSettings === undefined) delete next.streamSettings;
    else next.streamSettings = streamSettings;
    return next as T;
};

/** This outbound, dialling for itself again. */
export const withoutChain = <T extends Json>(outbound: T): T => {
    const next: Json = { ...outbound };
    delete next.proxySettings;
    const streamSettings = withoutDialer(outbound.streamSettings);
    if (streamSettings === undefined) delete next.streamSettings;
    else next.streamSettings = streamSettings;
    return next as T;
};

/**
 * What an L7 chain leaves out of this outbound's own stream settings.
 *
 * Only TLS survives it, so anything else configured here is carried in the
 * config and never used — worth saying, because nothing fails: the outbound
 * simply connects as something other than what its transport block shows.
 */
export const ignoredByL7 = (outbound: unknown): string[] => {
    if (!isObject(outbound) || !isObject(outbound.streamSettings)) return [];
    const stream = outbound.streamSettings;
    const ignored: string[] = [];
    const network = tagOf(stream.network).toLowerCase();
    if (network && network !== 'raw' && network !== 'tcp') ignored.push(`network: ${network}`);
    const security = tagOf(stream.security).toLowerCase();
    if (security && security !== 'none' && security !== 'tls') ignored.push(`security: ${security}`);
    if (isObject(stream.sockopt) && Object.keys(stream.sockopt).length > 0) ignored.push('sockopt');
    if (isObject(stream.finalmask) && Object.keys(stream.finalmask).length > 0) ignored.push('finalmask');
    return ignored;
};

/** Tags of the outbounds whose connections go through `tag`. */
export const carriedBy = (outbounds: unknown, tag: string): string[] => {
    if (!Array.isArray(outbounds) || tag === '') return [];
    return outbounds
        .filter(outbound => chainOf(outbound)?.via === tag)
        .map(outbound => (isObject(outbound) ? tagOf(outbound.tag) : ''))
        .filter(name => name !== '');
};

export interface ChainProblem {
    /** The outbound the problem is on. */
    tag: string;
    kind: 'conflict' | 'missing' | 'self' | 'loop';
    via: string;
}

/**
 * Chains the core will not run.
 *
 * `conflict` and a missing target are refusals the source spells out: the
 * first at load (v26.7.28:infra/conf/xray.go:224), the second on every
 * connection — "failed to get outbound handler with tag" for L7
 * (app/proxyman/outbound/handler.go:301) and "there is no outbound handler
 * for dialerProxy" for L4 (transport/internet/dialer.go:276). A chain back to
 * itself, directly or through others, has nothing at the end of it to open a
 * socket.
 *
 * `knownElsewhere` is for tags this list cannot show: the ones a panel
 * snippet contributes once it is expanded. A `{ "snippet": … }` placeholder is
 * skipped rather than read, as everywhere else.
 */
export const chainProblems = (outbounds: unknown, knownElsewhere: Iterable<string> = []): ChainProblem[] => {
    if (!Array.isArray(outbounds)) return [];
    const chains = new Map<string, OutboundChain>();
    const known = new Set<string>(knownElsewhere);
    for (const outbound of outbounds) {
        if (!isObject(outbound) || isSnippetRef(outbound)) continue;
        const tag = tagOf(outbound.tag);
        if (tag === '') continue;
        known.add(tag);
        const chain = chainOf(outbound);
        if (chain) chains.set(tag, chain);
    }

    const problems: ChainProblem[] = [];
    for (const [tag, chain] of chains) {
        if (chain.conflict) problems.push({ tag, kind: 'conflict', via: chain.via });
        if (chain.via === tag) {
            problems.push({ tag, kind: 'self', via: chain.via });
            continue;
        }
        if (!known.has(chain.via)) {
            problems.push({ tag, kind: 'missing', via: chain.via });
            continue;
        }
        // Follow the chain; coming back to where it started is a loop.
        const seen = new Set<string>([tag]);
        let at: string | undefined = chain.via;
        while (at !== undefined && !seen.has(at)) {
            seen.add(at);
            at = chains.get(at)?.via;
        }
        if (at === tag) problems.push({ tag, kind: 'loop', via: chain.via });
    }
    return problems;
};
