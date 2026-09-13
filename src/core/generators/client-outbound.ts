// ============================================================
// Server inbound -> client outbound — src/core/generators/client-outbound.ts
// ============================================================
//
// A Remnawave panel holds the *server* side: an inbound with a REALITY private
// key, a list of shortIds and serverNames, plus a "host" row saying which
// public address, port and SNI clients should use for that inbound. A client
// needs the mirror image of that: an outbound with the matching public key,
// one shortId, the SNI, and its own user id.
//
// Doing this by hand means copying five fields per node and deriving a public
// key with `xray x25519` — which is why people end up pasting links instead.
// This module performs that mirroring, so a balancer can be built out of the
// nodes a panel already has.
//
// Pure: no network, no store. The caller fetches hosts and profiles.
// ============================================================

import { publicKeyFromPrivateKey } from './crypto';

/** The subset of a Remnawave host row this builder reads. */
export interface PanelHost {
    uuid?: string;
    remark?: string;
    address: string;
    port: number;
    /** Per-host overrides; null means "take it from the inbound". */
    sni?: string | null;
    host?: string | null;
    path?: string | null;
    alpn?: string | null;
    fingerprint?: string | null;
    allowInsecure?: boolean;
    /** DEFAULT = keep the inbound's security, otherwise force this one. */
    securityLayer?: string | null;
    xHttpExtraParams?: Record<string, unknown> | null;
    muxParams?: Record<string, unknown> | null;
    sockoptParams?: Record<string, unknown> | null;
    isDisabled?: boolean;
    inbound?: { configProfileUuid?: string; configProfileInboundUuid?: string } | null;
}

/** The server inbound a host points at (a config profile's `rawInbound`). */
export type PanelInbound = any;

export interface ClientOutboundOptions {
    host: PanelHost;
    inbound: PanelInbound;
    /** The client's own id — the UUID from that user's vless:// link. */
    userId: string;
    /** Tag for the produced outbound. */
    tag: string;
}

export interface ClientOutboundResult {
    outbound: any;
    /** Non-fatal notes worth showing: a guessed field, a dropped extra. */
    notes: string[];
}

/** Protocols this mirroring supports; others need per-user secrets. */
const SUPPORTED_PROTOCOLS = ['vless', 'vmess', 'trojan'];

/**
 * Why a host cannot be turned into a client outbound, or null when it can.
 * Reported rather than thrown so a list of hosts can show each row's reason.
 */
export const clientOutboundBlocker = (host: PanelHost, inbound: PanelInbound): string | null => {
    if (!inbound?.protocol) return 'No inbound found for this host';
    if (!SUPPORTED_PROTOCOLS.includes(inbound.protocol)) {
        return `${inbound.protocol} needs a per-user secret the panel does not expose here`;
    }
    if (!host?.address || !host?.port) return 'Host has no address or port';

    const security = effectiveSecurity(host, inbound);
    if (security === 'reality') {
        const reality = inbound.streamSettings?.realitySettings || {};
        if (!reality.privateKey) return 'Inbound has no REALITY private key to derive the public key from';
        if (!publicKeyFromPrivateKey(reality.privateKey)) return 'REALITY private key is not a valid X25519 key';
    }
    return null;
};

/**
 * The security a *client* must use. A host row can override the inbound:
 * `DEFAULT` keeps whatever the inbound runs, anything else wins — that is how
 * an inbound with `security: none` behind a CDN is published as TLS.
 */
const effectiveSecurity = (host: PanelHost, inbound: PanelInbound): string => {
    const layer = (host.securityLayer || 'DEFAULT').toUpperCase();
    if (layer !== 'DEFAULT') return layer.toLowerCase();
    return inbound.streamSettings?.security || 'none';
};

/**
 * Xray renamed the TCP transport `tcp` -> `raw`, and a server config written
 * today says `raw`. Clients in the wild still expect `tcp`, and every current
 * core accepts it, so the mirrored outbound uses the name with the widest
 * reach rather than the newest one.
 */
const clientNetwork = (network: string | undefined): string =>
    !network || network === 'raw' ? 'tcp' : network;

/**
 * XTLS Vision only applies to REALITY/TLS over the raw TCP transport; on
 * xhttp, ws or grpc it must be empty or the client refuses to connect.
 */
const clientFlow = (network: string, security: string): string =>
    security === 'reality' && network === 'tcp' ? 'xtls-rprx-vision' : '';

const firstOf = (value: any): any => (Array.isArray(value) ? value[0] : value);

/**
 * Build the client outbound that talks to `host`, mirroring `inbound`.
 */
export const buildClientOutbound = ({
    host,
    inbound,
    userId,
    tag,
}: ClientOutboundOptions): ClientOutboundResult => {
    const blocker = clientOutboundBlocker(host, inbound);
    if (blocker) throw new Error(blocker);

    const notes: string[] = [];
    const stream = inbound.streamSettings || {};
    const network = clientNetwork(stream.network);
    const security = effectiveSecurity(host, inbound);
    const fingerprint = host.fingerprint || 'chrome';

    const outbound: any = {
        tag,
        protocol: inbound.protocol,
        settings: {},
        streamSettings: { network },
    };

    // --- identity ---
    if (inbound.protocol === 'vless') {
        outbound.settings.vnext = [{
            address: host.address,
            port: host.port,
            users: [{
                id: userId,
                encryption: 'none',
                flow: clientFlow(network, security),
            }],
        }];
    } else if (inbound.protocol === 'vmess') {
        outbound.settings.vnext = [{
            address: host.address,
            port: host.port,
            users: [{ id: userId, security: 'auto' }],
        }];
    } else {
        // trojan: the panel issues the password per user, so the field the
        // caller passed as `userId` is that password.
        outbound.settings.servers = [{ address: host.address, port: host.port, password: userId }];
    }

    // --- security ---
    if (security === 'reality') {
        const reality = stream.realitySettings || {};
        const shortIds: string[] = Array.isArray(reality.shortIds) ? reality.shortIds : [];
        const serverName = host.sni || firstOf(reality.serverNames) || '';
        if (!host.sni && !firstOf(reality.serverNames)) {
            notes.push('No SNI on the host or the inbound — set serverName by hand');
        }
        outbound.streamSettings.security = 'reality';
        outbound.streamSettings.realitySettings = {
            serverName,
            fingerprint,
            publicKey: publicKeyFromPrivateKey(reality.privateKey)!,
            ...(shortIds.length > 0 ? { shortId: shortIds[0] } : {}),
        };
        if (shortIds.length > 1) {
            notes.push(`Inbound offers ${shortIds.length} shortIds — used the first one`);
        }
        if (reality.spiderX) outbound.streamSettings.realitySettings.spiderX = reality.spiderX;
    } else if (security === 'tls') {
        outbound.streamSettings.security = 'tls';
        outbound.streamSettings.tlsSettings = {
            serverName: host.sni || host.host || host.address,
            fingerprint,
            ...(host.alpn ? { alpn: String(host.alpn).split(',').map(a => a.trim()).filter(Boolean) } : {}),
            ...(host.allowInsecure ? { allowInsecure: true } : {}),
        };
    } else {
        outbound.streamSettings.security = 'none';
    }

    // --- transport ---
    if (network === 'xhttp') {
        const xhttp = stream.xhttpSettings || {};
        outbound.streamSettings.xhttpSettings = {
            ...(xhttp.mode ? { mode: xhttp.mode } : {}),
            ...(host.host ? { host: host.host } : {}),
            ...(host.path || xhttp.path ? { path: host.path || xhttp.path } : {}),
            // The host's extra params are what the panel publishes to clients;
            // they mirror the inbound's own `extra` but can be overridden per
            // host, so they win when present.
            ...(host.xHttpExtraParams || xhttp.extra ? { extra: host.xHttpExtraParams || xhttp.extra } : {}),
        };
    } else if (network === 'ws') {
        const ws = stream.wsSettings || {};
        outbound.streamSettings.wsSettings = {
            path: host.path || ws.path || '/',
            ...(host.host ? { headers: { Host: host.host } } : {}),
        };
    } else if (network === 'grpc') {
        const grpc = stream.grpcSettings || {};
        const serviceName = host.path || grpc.serviceName || '';
        outbound.streamSettings.grpcSettings = {
            serviceName,
            ...(grpc.multiMode ? { multiMode: true } : {}),
        };
        if (!serviceName) notes.push('gRPC serviceName is empty — set it by hand');
    } else if (network === 'httpupgrade') {
        const hu = stream.httpupgradeSettings || {};
        outbound.streamSettings.httpupgradeSettings = {
            path: host.path || hu.path || '/',
            ...(host.host ? { host: host.host } : {}),
        };
    }

    // --- per-host extras the panel publishes ---
    if (host.sockoptParams && Object.keys(host.sockoptParams).length > 0) {
        outbound.streamSettings.sockopt = host.sockoptParams;
    }
    if (host.muxParams && Object.keys(host.muxParams).length > 0) {
        outbound.mux = host.muxParams;
    }

    return { outbound, notes };
};
