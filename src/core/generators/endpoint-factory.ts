// ============================================================
// One factory for inbounds and outbounds
// ============================================================

import type { Inbound, Outbound } from '../types';
import { DEFAULT_DNS_UPSTREAM } from '../presets/dns';
import { generateUUID, generateShortId } from './crypto';

/**
 * An inbound and an outbound are the same object seen from two ends: the same
 * protocol, the same transport, the same credentials — one listening, one
 * dialling. They used to be built by two functions with two switch statements,
 * so `vless` on one side and `vless` on the other drifted apart without anyone
 * noticing: the outbound learned `vnext`, the inbound kept `clients`, and only
 * one of them ever got a new default.
 *
 * Here a protocol is described once, with a builder per direction, so the two
 * sides of a protocol sit next to each other and a gap is visible in the
 * source rather than in a config someone is debugging.
 */
export type EndpointDirection = 'inbound' | 'outbound';

export type Endpoint<D extends EndpointDirection> = D extends 'inbound' ? Inbound : Outbound;

export interface EndpointOptions {
    /** Overrides the generated `in-###` / `out-###`. */
    tag?: string;
    /** Listening port, or the port to dial. */
    port?: number;
    /** Address to bind (inbound) or dial (outbound). */
    address?: string;
    /** Reuses an existing id instead of generating one — how a client is built from a server. */
    uuid?: string;
    /** Reuses an existing password instead of generating one. */
    password?: string;
    /** Shadowsocks cipher. */
    method?: string;
    /** Transport, if it should differ from the protocol's default. */
    network?: string;
    /** Security layer, if it should differ from the protocol's default. */
    security?: string;
}

/** What a protocol builder is handed: the options, with the blanks filled in. */
interface BuildContext {
    direction: EndpointDirection;
    protocol: string;
    tag: string;
    port: number;
    address: string;
    uuid: string;
    password: string;
    method: string;
}

interface EndpointShape {
    settings?: Record<string, unknown>;
    /** Transport overrides. `null` drops streamSettings entirely (TUN has none). */
    stream?: Record<string, unknown> | null;
    /** Protocols that do not listen on a port. */
    omitPort?: boolean;
    /** Inbound-only: drop the default sniffing block. */
    omitSniffing?: boolean;
}

interface ProtocolSpec {
    /** Absent means the protocol does not exist on that side. */
    inbound?: (ctx: BuildContext) => EndpointShape;
    outbound?: (ctx: BuildContext) => EndpointShape;
}

const ssMethod = (protocol: string, method?: string) =>
    method || (protocol === 'shadowsocks-2022' ? '2022-blake3-aes-128-gcm' : 'aes-256-gcm');

/**
 * The protocol table.
 *
 * Each entry reads as "what this protocol looks like on each side", which is
 * the comparison that matters when adding a field: if only one of the two
 * builders changes, the asymmetry is right there.
 */
const PROTOCOLS: Record<string, ProtocolSpec> = {
    vless: {
        inbound: ctx => ({
            settings: {
                clients: [{ id: ctx.uuid, flow: 'xtls-rprx-vision', level: 0 }],
                decryption: 'none',
            },
        }),
        // TLS by default: 26.7 refuses a plaintext VLESS client to a public
        // address (v26.7.28:infra/conf/xray.go:245), and 26.9 extends that to
        // the vnext form this writes (v26.9.9:infra/conf/vless.go:317). Vision
        // needs TLS or REALITY anyway.
        outbound: ctx => ({
            settings: {
                vnext: [{
                    address: ctx.address,
                    port: ctx.port,
                    users: [{ id: ctx.uuid, encryption: 'none', flow: 'xtls-rprx-vision', level: 0 }],
                }],
            },
            stream: { security: 'tls' },
        }),
    },

    vmess: {
        inbound: ctx => ({ settings: { clients: [{ id: ctx.uuid, level: 0 }] } }),
        outbound: ctx => ({
            settings: {
                vnext: [{
                    address: ctx.address,
                    port: ctx.port,
                    users: [{ id: ctx.uuid, security: 'auto', level: 0 }],
                }],
            },
        }),
    },

    trojan: {
        inbound: ctx => ({ settings: { clients: [{ password: ctx.password, level: 0 }] } }),
        outbound: ctx => ({
            settings: {
                servers: [{
                    address: ctx.address,
                    port: ctx.port,
                    password: ctx.password,
                    email: 'generated@xray',
                    level: 0,
                }],
            },
            // Trojan is TLS by design, and 26.9 refuses it without TLS to a
            // public address, servers[] form included (v26.9.9:infra/conf/xray.go:251).
            stream: { security: 'tls' },
        }),
    },

    shadowsocks: {
        inbound: ctx => ({
            settings: {
                method: ssMethod(ctx.protocol, ctx.method),
                password: ctx.password,
                network: 'tcp,udp',
            },
        }),
        outbound: ctx => ({
            settings: {
                servers: [{
                    address: ctx.address,
                    port: ctx.port,
                    method: ssMethod(ctx.protocol, ctx.method),
                    password: ctx.password,
                    email: 'generated@xray',
                    level: 0,
                }],
            },
        }),
    },

    socks: {
        inbound: () => ({ settings: { auth: 'noauth', udp: true } }),
        outbound: ctx => ({
            settings: { servers: [{ address: ctx.address, port: ctx.port, level: 0 }] },
        }),
    },

    http: {
        // An http inbound is a local proxy listener, same shape as socks.
        inbound: () => ({ settings: { allowTransparent: false } }),
        outbound: ctx => ({
            settings: { servers: [{ address: ctx.address, port: ctx.port, level: 0 }] },
        }),
    },

    hysteria: {
        // HysteriaServerConfig reads `clients` on every line (`users` only
        // from 26.7, v26.7.28:infra/conf/hysteria.go:41) and each user is
        // {auth, level, email} (v26.3.27:infra/conf/hysteria.go:33). The
        // Hysteria 1 keys this used to write — up_mbps, down_mbps,
        // ignore_client_bandwidth, a user `password` — are keys on no line.
        // `version: 2` is required from 26.7 (a missing key fails,
        // v26.7.28:infra/conf/hysteria.go:46) and harmless on 26.3.
        inbound: ctx => ({
            settings: {
                version: 2,
                clients: [{ auth: ctx.password, level: 0 }],
            },
            // `hysteria` is the only network a hysteria endpoint may use — 26.7
            // refuses anything else — and `udp` is no transport name at all.
            stream: { network: 'hysteria', security: 'tls', tlsSettings: { certificates: [] } },
        }),
        // The client is flat {version, address, port} on every line
        // (v26.3.27:infra/conf/hysteria.go:12) — there is no `servers` list —
        // and its password travels in the transport: hysteriaSettings.auth,
        // which also insists on version 2 (v26.7.28:infra/conf/transport_method.go:775).
        outbound: ctx => ({
            settings: {
                version: 2,
                address: ctx.address,
                port: ctx.port,
            },
            stream: {
                network: 'hysteria',
                security: 'tls',
                hysteriaSettings: { version: 2, auth: ctx.password },
            },
        }),
    },

    wireguard: {
        // Incomplete, and it says so rather than looking finished. The secret
        // key is the server's identity and nobody's to invent behind a
        // protocol chooser, so it starts empty: every line refuses that
        // (v26.7.28:infra/conf/wireguard.go:75-78), the editor and the
        // diagnostics report it (core/xray/wireguard-inbound.ts), and the
        // card's Generate button is one press away.
        //
        // No peer either. This used to write one with an empty public key and
        // "0.0.0.0/0", which 26.7 refuses outright
        // (v26.7.28:proxy/wireguard/config.go:12-15) — a second thing wrong
        // that no field in the form could reach. A server with no peers
        // loads on every line; it just has nobody to talk to yet.
        inbound: () => ({
            settings: {
                secretKey: '',
                peers: [],
                mtu: 1420,
            },
            // WireGuard dials UDP itself; the stream only carries finalmask and
            // sockopt. `udp` is not a transport name and fails the load, so this
            // says `raw`, as the WARP presets always have.
            stream: { network: 'raw' },
        }),
        outbound: () => ({
            settings: {
                secretKey: '',
                address: ['10.0.0.2/32'],
                peers: [{ publicKey: '', endpoint: '' }],
                mtu: 1420,
            },
            stream: { network: 'raw' },
        }),
    },

    // ── Inbound-only ────────────────────────────────────────────────────────
    // The socks inbound under its other name: the loader builds both from one
    // struct (v26.3.27:infra/conf/xray.go:30-31, v26.7.28:infra/conf/xray.go:27-28,
    // v26.9.9:infra/conf/xray.go:28-29), and the server it builds already
    // hands whatever does not open as SOCKS 4 or 5 to an HTTP proxy on the
    // same port (v26.7.28:proxy/socks/server.go:87-89). So the default is the
    // socks default. There is no outbound of this name
    // (v26.7.28:infra/conf/xray.go:37-52).
    mixed: {
        inbound: () => ({ settings: { auth: 'noauth', udp: true } }),
    },
    tun: {
        // No line has a `stack` key (v26.3.27:infra/conf/tun.go:8,
        // v26.7.28:infra/conf/tun.go:14). `mtu` is spelled `MTU` in the 26.3
        // struct tag; keys match case-insensitively, so this reads on all three.
        inbound: () => ({
            settings: { mtu: 1500 },
            stream: null,
            omitPort: true,
        }),
    },
    // address/port/network are the only spelling 26.3 reads, and from 26.7
    // they are the legacy aliases of rewriteAddress/rewritePort/allowedNetwork
    // that win whenever set (v26.7.28:infra/conf/dokodemo.go:23) — so the old
    // names are the ones that work on every line.
    'dokodemo-door': {
        inbound: ctx => ({
            settings: { address: ctx.address, port: ctx.port, network: 'tcp,udp' },
        }),
    },
    tunnel: {
        inbound: ctx => ({
            settings: { address: ctx.address, port: ctx.port, network: 'tcp,udp' },
        }),
    },

    // ── Outbound-only ───────────────────────────────────────────────────────
    freedom: {
        // No domainStrategy: AsIs is what an absent one means on every line,
        // and 26.9 deprecates the key (v26.9.9:infra/conf/xray.go:353).
        outbound: () => ({ settings: {} }),
    },
    blackhole: {
        outbound: () => ({ settings: { response: { type: 'none' } } }),
    },
    dns: {
        // network/address/port are the only spelling 26.3 reads; from 26.7
        // they are legacy aliases of rewrite* that win when set
        // (v26.7.28:infra/conf/dns_proxy.go:75), so they work everywhere.
        outbound: () => ({
            settings: { network: 'tcp', address: DEFAULT_DNS_UPSTREAM[0], port: 53 },
        }),
    },
    loopback: {
        outbound: () => ({ settings: { inboundTag: '' } }),
    },
};

// The 2022 ciphers are the same protocol with a different default method, and
// both spellings appear in real configs, so the alias builds the same shapes.
PROTOCOLS['shadowsocks-2022'] = PROTOCOLS.shadowsocks!;

/** Protocols this factory can build for a given side. */
export const protocolsFor = (direction: EndpointDirection): string[] =>
    Object.keys(PROTOCOLS).filter(name => PROTOCOLS[name]![direction]);

/** Whether a protocol exists on a given side. */
export const supportsProtocol = (direction: EndpointDirection, protocol: string): boolean =>
    !!PROTOCOLS[protocol]?.[direction];

/** Protocols that exist on both sides, which is what a client-from-server build needs. */
export const bidirectionalProtocols = (): string[] =>
    Object.keys(PROTOCOLS).filter(name => PROTOCOLS[name]!.inbound && PROTOCOLS[name]!.outbound);

const randomTag = (direction: EndpointDirection) =>
    `${direction === 'inbound' ? 'in' : 'out'}-${Math.floor(Math.random() * 1000)}`;

/**
 * Builds one endpoint.
 *
 * An unknown protocol still produces a valid skeleton rather than throwing:
 * the protocol list moves with xray-core, and refusing to build something the
 * user typed is worse than handing them an object to fill in.
 */
export const createEndpoint = <D extends EndpointDirection>(
    direction: D,
    protocol = 'vless',
    options: EndpointOptions = {},
): Endpoint<D> => {
    const ctx: BuildContext = {
        direction,
        protocol,
        tag: options.tag || randomTag(direction),
        port: options.port ?? (direction === 'inbound' ? 10808 : 443),
        address: options.address || 'example.com',
        uuid: options.uuid || generateUUID(),
        password: options.password || generateShortId(16),
        method: options.method || '',
    };

    const spec = PROTOCOLS[protocol]?.[direction];
    const shape: EndpointShape = spec ? spec(ctx) : { settings: {} };

    const stream = shape.stream === null
        ? undefined
        : {
            network: 'tcp',
            security: 'none',
            ...(direction === 'inbound' ? { tcpSettings: {} } : {}),
            ...shape.stream,
            ...(options.network ? { network: options.network } : {}),
            ...(options.security ? { security: options.security } : {}),
        };

    if (direction === 'inbound') {
        const inbound: Inbound = {
            tag: ctx.tag,
            protocol,
            settings: shape.settings ?? {},
        };
        if (!shape.omitPort) inbound.port = ctx.port;
        if (stream) inbound.streamSettings = stream as Inbound['streamSettings'];
        if (!shape.omitSniffing) {
            inbound.sniffing = { enabled: true, destOverride: ['http', 'tls'] };
        }
        return inbound as Endpoint<D>;
    }

    const outbound: Outbound = {
        tag: ctx.tag,
        protocol,
        settings: shape.settings ?? {},
    };
    if (stream) outbound.streamSettings = stream as Outbound['streamSettings'];
    return outbound as Endpoint<D>;
};

/**
 * Direction-bound wrappers.
 *
 * Kept because most call sites know which side they are on and reading
 * `createDefaultInbound('vless')` at those sites is clearer than passing a
 * direction they can never vary.
 */
export const createDefaultInbound = (protocol = 'vless', options?: EndpointOptions): Inbound =>
    createEndpoint('inbound', protocol, options);

export const createDefaultOutbound = (protocol = 'vless', options?: EndpointOptions): Outbound =>
    createEndpoint('outbound', protocol, options);

// ============================================================
// Spellings every supported line reads
// ============================================================

/**
 * One inbound setting the core reads under two names.
 *
 * 26.7 gave several inbound settings a second spelling — `users` beside
 * `clients`/`accounts`, `rewriteAddress` beside dokodemo's `address` — and
 * made the old one win whenever it is set (`if c.Clients != nil { c.Users =
 * c.Clients }`, v26.7.28:infra/conf/vless.go:46; same shape in vmess.go:73,
 * trojan.go:124, shadowsocks.go:54, hysteria.go:52, http.go:38, socks.go:51,
 * dokodemo.go:23). 26.3 reads only the old one.
 *
 * So the old spelling is the one that means the same thing on every line, and
 * the new one is at best redundant: ignored on 26.3, and ignored on every
 * line once the old key is present — an empty `clients: []` included.
 */
export interface SpellingPair {
    /** What every line reads, and what this editor writes. */
    key: string;
    /** The 26.7+ spelling. */
    alias: string;
    /** A list of users: which of two lists to keep is the user's call. */
    list?: boolean;
    /** The core tests `!= 0` rather than `!= nil` for this one. */
    zeroIsUnset?: boolean;
}

const USERS_AS_CLIENTS: SpellingPair[] = [{ key: 'clients', alias: 'users', list: true }];
const USERS_AS_ACCOUNTS: SpellingPair[] = [{ key: 'accounts', alias: 'users', list: true }];
const DOKODEMO_SPELLINGS: SpellingPair[] = [
    { key: 'address', alias: 'rewriteAddress' },
    { key: 'port', alias: 'rewritePort', zeroIsUnset: true },
    { key: 'network', alias: 'allowedNetwork' },
];

export const INBOUND_SPELLINGS: Readonly<Record<string, SpellingPair[]>> = {
    vless: USERS_AS_CLIENTS,
    vmess: USERS_AS_CLIENTS,
    trojan: USERS_AS_CLIENTS,
    shadowsocks: USERS_AS_CLIENTS,
    'shadowsocks-2022': USERS_AS_CLIENTS,
    hysteria: USERS_AS_CLIENTS,
    http: USERS_AS_ACCOUNTS,
    socks: USERS_AS_ACCOUNTS,
    mixed: USERS_AS_ACCOUNTS,
    'dokodemo-door': DOKODEMO_SPELLINGS,
    tunnel: DOKODEMO_SPELLINGS,
};

type Settings = Record<string, unknown>;

const settingsOf = (inbound: Inbound): Settings | undefined => {
    const settings = inbound.settings as unknown;
    return settings && typeof settings === 'object' && !Array.isArray(settings) ? settings as Settings : undefined;
};

/** Set the way the core's own precedence check sees it: `null` decodes to nil. */
const isSet = (value: unknown, pair: SpellingPair): boolean =>
    value !== undefined && value !== null && !(pair.zeroIsUnset && value === 0);

const spellingsOf = (inbound: Inbound): SpellingPair[] =>
    typeof inbound.protocol === 'string' ? INBOUND_SPELLINGS[inbound.protocol.toLowerCase()] ?? [] : [];

/** Pairs where both spellings are set — the alias is then ignored on every line. */
export const spellingConflicts = (inbound: Inbound): SpellingPair[] => {
    const settings = settingsOf(inbound);
    if (!settings) return [];
    return spellingsOf(inbound).filter(pair => isSet(settings[pair.key], pair) && isSet(settings[pair.alias], pair));
};

/** The pair an alias path such as `settings.users` belongs to, if any. */
export const spellingForPath = (inbound: Inbound, path: string): SpellingPair | undefined =>
    spellingsOf(inbound).find(pair => `settings.${pair.alias}` === path);

const withSettings = (inbound: Inbound, settings: Settings): Inbound => ({ ...inbound, settings });

/** The alias's value moved under the key every line reads; the key's own value, if any, is replaced. */
export const adoptAlias = (inbound: Inbound, pair: SpellingPair): Inbound => {
    const settings = settingsOf(inbound);
    if (!settings || !(pair.alias in settings)) return inbound;
    const { [pair.alias]: value, ...rest } = settings;
    return withSettings(inbound, { ...rest, [pair.key]: value });
};

/** The alias dropped — what nothing reads while the key is set. */
export const dropAlias = (inbound: Inbound, pair: SpellingPair): Inbound => {
    const settings = settingsOf(inbound);
    if (!settings || !(pair.alias in settings)) return inbound;
    const { [pair.alias]: _dropped, ...rest } = settings;
    return withSettings(inbound, rest);
};

/**
 * An inbound brought onto what every supported line reads, before an editor
 * opens it.
 *
 * Only rewrites that keep the meaning on every line that loads the config and
 * make the rest load it too — nothing here is a judgement call:
 *
 *  - a new spelling with no old one beside it moves to the old one (`users` →
 *    `clients`): the same list on 26.7+, and no longer an empty inbound on 26.3;
 *  - hysteria gets `version: 2`, which 26.7+ require and 26.3 never checks, and
 *    a user `password` this editor used to write becomes the `auth` the core
 *    reads (v26.3.27:infra/conf/hysteria.go:34) — `password` is a key on no line;
 *  - `listen: ""` goes: 26.9 reads it as "no listen", and it panics the loader
 *    before that (v26.7.28:infra/conf/xray.go:152);
 *  - a tun `autoOutboundsInterface` boolean, which an older schema here drew as
 *    a switch, becomes the string the core decodes (v26.7.28:infra/conf/tun.go:22):
 *    `true` → "auto", `false` → "" (off). A boolean fails the load on 26.7+.
 *
 * Both spellings at once is left alone — which list the user meant is theirs
 * to say (see spellingConflicts). Returns the same object when nothing changed.
 */
export const normalizeInbound = (inbound: Inbound): Inbound => {
    let next = inbound;

    for (const pair of spellingsOf(next)) {
        const settings = settingsOf(next);
        if (settings && isSet(settings[pair.alias], pair) && !isSet(settings[pair.key], pair)) {
            next = adoptAlias(next, pair);
        }
    }

    if (next.listen === '') {
        const { listen: _empty, ...rest } = next;
        next = rest as Inbound;
    }

    const protocol = typeof next.protocol === 'string' ? next.protocol.toLowerCase() : '';
    const settings = settingsOf(next);

    if (protocol === 'hysteria') {
        const patch: Settings = {};
        if (settings?.version !== 2) patch.version = 2;
        const clients = settings?.clients;
        if (Array.isArray(clients) && clients.some(isPasswordUser)) {
            patch.clients = clients.map(user => (isPasswordUser(user) ? passwordToAuth(user) : user));
        }
        if (Object.keys(patch).length) next = withSettings(next, { ...(settings ?? {}), ...patch });
    }

    if (protocol === 'tun' && typeof settings?.autoOutboundsInterface === 'boolean') {
        next = withSettings(next, { ...settings, autoOutboundsInterface: settings.autoOutboundsInterface ? 'auto' : '' });
    }

    return next;
};

const isPasswordUser = (user: unknown): user is Settings =>
    !!user && typeof user === 'object'
    && typeof (user as Settings).password === 'string'
    && (user as Settings).auth === undefined;

const passwordToAuth = ({ password, ...rest }: Settings): Settings => ({ ...rest, auth: password });
