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
        outbound: ctx => ({
            settings: {
                vnext: [{
                    address: ctx.address,
                    port: ctx.port,
                    users: [{ id: ctx.uuid, encryption: 'none', flow: 'xtls-rprx-vision', level: 0 }],
                }],
            },
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
        inbound: ctx => ({
            settings: {
                version: 2,
                up_mbps: 100,
                down_mbps: 100,
                users: [{ password: ctx.password }],
            },
            stream: { network: 'udp', security: 'tls', tlsSettings: { certificates: [] } },
        }),
        outbound: ctx => ({
            settings: {
                version: 2,
                servers: [{ address: ctx.address, port: ctx.port, password: ctx.password }],
            },
            stream: { network: 'udp', security: 'tls' },
        }),
    },

    wireguard: {
        inbound: () => ({
            settings: {
                secretKey: '',
                peers: [{ publicKey: '', allowedIPs: ['0.0.0.0/0'] }],
                mtu: 1420,
            },
            stream: { network: 'udp' },
        }),
        outbound: () => ({
            settings: {
                secretKey: '',
                address: ['10.0.0.2/32'],
                peers: [{ publicKey: '', endpoint: '' }],
                mtu: 1420,
            },
            stream: { network: 'udp' },
        }),
    },

    // ── Inbound-only ────────────────────────────────────────────────────────
    tun: {
        inbound: () => ({
            settings: { mtu: 1500, stack: 'system' },
            stream: null,
            omitPort: true,
        }),
    },
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
        outbound: () => ({ settings: { domainStrategy: 'AsIs' } }),
    },
    blackhole: {
        outbound: () => ({ settings: { response: { type: 'none' } } }),
    },
    dns: {
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
