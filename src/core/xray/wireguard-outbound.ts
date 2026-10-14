/**
 * What a WireGuard outbound has to hold before a core will run it, or before
 * it can carry anything.
 *
 * The factory hands back an outbound with an empty `secretKey` and a peer
 * with an empty `publicKey` and `endpoint` — incomplete on purpose, as a key
 * is not the factory's to invent — and a WARP profile added before its
 * registration is keyless on purpose too (generators/warp.ts, the Generate
 * WARP button). Neither was reported anywhere but by the form on save, so the
 * panel save could push an outbound no core runs. This is the list the
 * diagnostics and the form both read; the inbound's half is
 * wireguard-inbound.ts, and what the two judge alike is wireguard-config.ts.
 *
 * Which kind of failure it is matters, and it differs from the inbound's:
 *
 * Refused by Build(), the same on every line — the config does not load:
 *
 *   secretKey empty or      v26.3.27:infra/conf/wireguard.go:68-71 and :129-131,
 *   undecodable             v26.7.28:infra/conf/wireguard.go:75-78 and :151-153,
 *                           v26.9.9:infra/conf/wireguard.go:76-79 and :153-155,
 *                           v26.10.10:infra/conf/wireguard.go:75-78 and :137-159
 *   a peer's publicKey or   parsed only when not empty, and then it has to parse
 *   preSharedKey            (v26.3.27:infra/conf/wireguard.go:25-37,
 *   undecodable             v26.7.28:infra/conf/wireguard.go:32-44,
 *                           v26.9.9:infra/conf/wireguard.go:32-44,
 *                           v26.10.10:infra/conf/wireguard.go:32-44)
 *   reserved                "should be empty or 3 bytes" (see wireguard-config.ts)
 *   domainStrategy          26.3 to 26.9: "unsupported domain strategy" — a value
 *                           set, not a rule: `outbound.wireguard.domainStrategy`
 *                           in versions/features.ts. 26.10 has no such field
 *                           (below), so nothing is checked there.
 *
 * Refused when the outbound is created, so the core does not start (every
 * outbound is added while the instance is built, and an error there ends it:
 * v26.7.28:core/xray.go:140-145 and :249-251):
 *
 *   address                 not an address or a prefix, and on 26.3 a prefix that
 *                           is not one host (see wireguard-config.ts;
 *                           v26.3.27:proxy/wireguard/client.go:64)
 *   no peer                 26.7 and 26.9: "empty peers" (v26.7.28:proxy/wireguard/client.go:74-76,
 *                           v26.9.9:proxy/wireguard/client.go:85-87). 26.3 checks
 *                           nothing here (v26.3.27:proxy/wireguard/client.go:61-78),
 *                           builds the tunnel on the first connection with no
 *                           peer in it, and has nowhere to send anything.
 *   a peer with no          26.7 and 26.9: "peer without publickey"
 *   publicKey               (v26.7.28:proxy/wireguard/client.go:77-80,
 *                           v26.9.9:proxy/wireguard/client.go:88-91). 26.3 leaves
 *                           `public_key=` out of the device request and sends the
 *                           peer's endpoint and allowed IPs after it anyway
 *                           (v26.3.27:proxy/wireguard/client.go:289-291 and
 *                           :330-336) — lines with no peer of their own. Not a
 *                           working peer.
 *   a peer with no          26.7 and 26.9: "peer without endpoint"
 *   endpoint                (v26.7.28:proxy/wireguard/client.go:81-83,
 *                           v26.9.9:proxy/wireguard/client.go:92-94). 26.3 leaves
 *                           `endpoint=` out (v26.3.27:proxy/wireguard/client.go:330-332):
 *                           a client with no address to send its handshake to.
 *   remoteDNS (26.9+)       every entry through netip.MustParseAddr, which panics
 *                           on anything that is not an IP address
 *                           (v26.9.9:proxy/wireguard/client.go:121-124,
 *                           v26.10.10:proxy/wireguard/client.go:105-108). The one
 *                           entry "local" is the exception on v26.9.9 only
 *                           (v26.9.9:proxy/wireguard/client.go:117-120); 26.9.30
 *                           and later dropped it. 26.3 and 26.7 do not read the
 *                           key at all.
 *
 * Refused when the tunnel first comes up — the core starts, and every
 * connection through the outbound fails with the device's error:
 *
 *   a key that is not       the device is configured through wireguard-go's IpcSet
 *   32 bytes                (v26.3.27:proxy/wireguard/tun.go:75 on the first
 *                           connection, v26.7.28:proxy/wireguard/client.go:332,
 *                           v26.9.9:proxy/wireguard/client.go:361), which takes
 *                           exactly 32 — that check is in the dependency (pinned at
 *                           v26.3.27:go.mod:29, the same commit on all three tags),
 *                           not in this repository, and was not read for this.
 *   allowedIPs              each one is an `allowed_ip=` line for the same IpcSet
 *                           (v26.3.27:proxy/wireguard/client.go:334-336,
 *                           v26.7.28:proxy/wireguard/client.go:325-327), which
 *                           parses a prefix; a bare address fails it.
 *   endpoint not host:port  `endpoint=` goes through the bind's ParseEndpoint, which
 *                           splits host from port and reads the port as a number
 *                           (v26.3.27:proxy/wireguard/bind.go:40-48,
 *                           v26.7.28:proxy/wireguard/bind.go:128-138, the same file
 *                           at v26.9.9).
 *
 * v26.10.10 asks the same of a client: the peer and address checks are at
 * proxy/wireguard/client.go:74-99, the device is configured at :328, and
 * ParseEndpoint reads host:port at proxy/wireguard/bind.go:138-148. Its
 * WireGuardConfig no longer has `domainStrategy` at all
 * (v26.10.10:infra/conf/wireguard.go:59-69), so that key is dropped there.
 *
 * Without `version` the answer is what holds on every line, and what only some
 * lines read (`remoteDNS`, the host-only address rule) is left out.
 */

import { t } from '../../i18n';
import { WARP_ENDPOINT } from '../presets';
import { DEFAULT_DNS_UPSTREAM } from '../presets/dns';
import { compareCoreVersions, coreVersion, type CoreVersionId } from './versions';
import {
    KEY_SHAPE,
    addressFamily,
    addressIssues,
    allowedIpIssues,
    isBlank,
    isObject,
    keyShape,
    reservedIssue,
    type Json,
} from './wireguard-config';

export type WireguardOutboundProblemKind =
    | 'secretKey.empty' | 'secretKey.invalid' | 'secretKey.length'
    | 'peers.none'
    | 'publicKey.empty' | 'publicKey.invalid' | 'publicKey.length'
    | 'preSharedKey.invalid' | 'preSharedKey.length'
    | 'endpoint.empty' | 'endpoint.form'
    | 'allowedIPs' | 'address' | 'reserved' | 'remoteDNS';

export interface WireguardOutboundProblem {
    kind: WireguardOutboundProblemKind;
    /** Where it is, from the outbound down: `settings.peers[1].publicKey`. */
    field: string;
    /** Which peer, when it is one peer's. */
    peer?: number;
    message: string;
    suggestion?: string;
}

export const isWireguardOutbound = (outbound: unknown): boolean =>
    // The loader lower-cases the protocol before looking it up (v26.7.28:infra/conf/loader.go:46).
    isObject(outbound) && typeof outbound.protocol === 'string' && outbound.protocol.toLowerCase() === 'wireguard';

/** The host part of `host:port` or `[v6]:port`; the whole text when there is no port. */
const hostOf = (endpoint: string): string => {
    const bracketed = /^\[([^\]]*)\]/.exec(endpoint);
    if (bracketed) return bracketed[1]!;
    const colons = endpoint.split(':').length - 1;
    return colons === 1 ? endpoint.slice(0, endpoint.indexOf(':')) : endpoint;
};

/**
 * Whether an endpoint is Cloudflare's WARP — the one kind of peer whose key
 * the app can fetch for you. The name WARP's registration hands back, or one
 * of the address ranges it also gives.
 */
export const isWarpEndpoint = (endpoint: unknown): boolean => {
    if (typeof endpoint !== 'string') return false;
    const host = hostOf(endpoint.trim()).toLowerCase();
    return host === 'cloudflareclient.com'
        || host.endsWith('.cloudflareclient.com')
        || host.startsWith('162.159.')
        || host.startsWith('188.114.')
        || host.startsWith('2606:4700:');
};

/**
 * `host:port`, as ParseEndpoint reads it: one host, a colon, a number up to
 * 65535. An IPv6 literal has to be in brackets for the same reason it does
 * in a URL.
 */
const isEndpointForm = (endpoint: string): boolean => {
    const match = /^\[[^[\]]+\]:(\d+)$/.exec(endpoint) ?? /^[^:[\]\s]+:(\d+)$/.exec(endpoint);
    return !!match && Number(match[1]) <= 65535;
};

/** Everything about a WireGuard outbound that stops a core running it, or stops it carrying anything. */
export const wireguardOutboundProblems = (outbound: unknown, version?: CoreVersionId): WireguardOutboundProblem[] => {
    if (!isWireguardOutbound(outbound)) return [];
    const settings = isObject((outbound as Json).settings) ? (outbound as Json).settings as Json : {};
    const tag = version ? coreVersion(version).tag : undefined;
    const refusesIncomplete = version !== undefined && compareCoreVersions(version, '26.7') >= 0;
    const problems: WireguardOutboundProblem[] = [];

    const peers = Array.isArray(settings.peers) ? settings.peers : [];
    const warp = peers.some(peer => isObject(peer) && isWarpEndpoint(peer.endpoint));
    const generateWarp = () => t("Press Generate WARP in the WireGuard card: it registers a device with Cloudflare and fills in the key, the peer's public key and the addresses.");

    if (isBlank(settings.secretKey)) {
        problems.push({
            kind: 'secretKey.empty',
            field: 'settings.secretKey',
            message: t("{what} is empty. Every supported Xray refuses a WireGuard outbound without its secret key — the config will not load.", { what: 'settings.secretKey' }),
            suggestion: warp
                ? generateWarp()
                : t("Paste the private key this client was given; the matching public key is what the server lists for its peer."),
        });
    } else {
        const shape = keyShape(settings.secretKey);
        if (!shape.ok && shape.reason === 'invalid') {
            problems.push({
                kind: 'secretKey.invalid',
                field: 'settings.secretKey',
                message: t("{what} is not a WireGuard key: Xray cannot decode it, and the config will not load.", { what: 'settings.secretKey' }),
                suggestion: KEY_SHAPE(),
            });
        } else if (!shape.ok) {
            problems.push({
                kind: 'secretKey.length',
                field: 'settings.secretKey',
                message: t("{what} decodes to {bytes} bytes and a WireGuard key is 32, so the tunnel cannot come up and every connection through this outbound fails.", { what: 'settings.secretKey', bytes: shape.bytes }),
                suggestion: KEY_SHAPE(),
            });
        }
    }

    if (Array.isArray(settings.address)) {
        for (const issue of addressIssues(settings.address, version)) {
            problems.push({
                kind: 'address',
                field: 'settings.address',
                message: issue.why === 'not-ip'
                    ? t("{what} lists \"{value}\", which is not an IP address — the outbound will not start.", { what: 'settings.address', value: issue.value })
                    : t("{what} lists \"{value}\": Xray {tag} takes an interface address only as a single host — /32 for IPv4, /128 for IPv6 — and refuses any other prefix.", { what: 'settings.address', value: issue.value, tag }),
                suggestion: issue.host ? t("Write it as {example}.", { example: issue.host }) : undefined,
            });
        }
    }

    const reserved = reservedIssue(settings.reserved);
    if (reserved) {
        problems.push({
            kind: 'reserved',
            field: 'settings.reserved',
            message: reserved === 'length'
                ? t("{what} must be empty or exactly 3 bytes; Xray refuses any other length and the config will not load.", { what: 'settings.reserved' })
                : t("{what} holds a value that is not a byte (a whole number from 0 to 255); Xray cannot decode it and the config will not load.", { what: 'settings.reserved' }),
            suggestion: t("Three numbers from 0 to 255, such as {example} — or remove it.", { example: '[0, 0, 0]' }),
        });
    }

    // The tunnel's own resolver exists from 26.9 and is parsed strictly there.
    if (version !== undefined && compareCoreVersions(version, '26.9') >= 0 && Array.isArray(settings.remoteDNS)) {
        const onlyLocal = version === '26.9' && settings.remoteDNS.length === 1 && settings.remoteDNS[0] === 'local';
        if (!onlyLocal) {
            for (const entry of settings.remoteDNS) {
                if (typeof entry === 'string' && addressFamily(entry)) continue;
                problems.push({
                    kind: 'remoteDNS',
                    field: 'settings.remoteDNS',
                    message: t("{what} lists \"{value}\", which is not an IP address. Xray {tag} reads every entry as one and stops the core from starting on anything else.", { what: 'settings.remoteDNS', value: String(entry), tag }),
                    suggestion: t("Use an IP address, for example {example}.", { example: DEFAULT_DNS_UPSTREAM[0] ?? '1.1.1.1' }),
                });
            }
        }
    }

    if (peers.length === 0) {
        problems.push({
            kind: 'peers.none',
            field: 'settings.peers',
            message: version === undefined
                ? t("{what} has no peer. A WireGuard outbound has nothing to send through without one: Xray 26.7 and later refuse the config, and 26.3 starts an outbound that fails every connection.", { what: 'settings.peers' })
                : refusesIncomplete
                    ? t("{what} has no peer. Xray {tag} refuses a WireGuard outbound without one — the config will not load.", { what: 'settings.peers', tag })
                    : t("{what} has no peer. Xray {tag} starts the outbound, but it has nothing to send through, so every connection fails.", { what: 'settings.peers', tag }),
            suggestion: t("Add the peer your provider or server gave you: its public key and its endpoint."),
        });
    }

    peers.forEach((peer, index) => {
        if (!isObject(peer)) return;
        const at = `settings.peers[${index}]`;
        const cloudflare = isWarpEndpoint(peer.endpoint);

        if (isBlank(peer.publicKey)) {
            const what = `${at}.publicKey`;
            problems.push({
                kind: 'publicKey.empty',
                field: what,
                peer: index,
                message: version === undefined
                    ? t("{what} is empty. A peer is known by its public key, so this one can never connect.", { what })
                    : refusesIncomplete
                        ? t("{what} is empty. A peer is known by its public key, and Xray {tag} refuses the outbound without one — the config will not load.", { what, tag })
                        : t("{what} is empty. A peer is known by its public key; Xray {tag} leaves it out of the device request, so this peer never connects.", { what, tag }),
                suggestion: cloudflare
                    ? generateWarp()
                    : t("Paste the server's public key — the one that goes with its secret key."),
            });
        } else {
            const shape = keyShape(peer.publicKey);
            if (!shape.ok) problems.push(keyProblem(shape, `${at}.publicKey`, 'publicKey', index));
        }

        if (!isBlank(peer.preSharedKey)) {
            const shape = keyShape(peer.preSharedKey);
            if (!shape.ok) problems.push(keyProblem(shape, `${at}.preSharedKey`, 'preSharedKey', index));
        }

        const example = cloudflare ? WARP_ENDPOINT : 'vpn.example.com:51820';
        if (isBlank(peer.endpoint)) {
            const what = `${at}.endpoint`;
            problems.push({
                kind: 'endpoint.empty',
                field: what,
                peer: index,
                message: version === undefined
                    ? t("{what} is empty. A client has to be told where its peer is: Xray 26.7 and later refuse the config, and 26.3 never connects.", { what })
                    : refusesIncomplete
                        ? t("{what} is empty. Xray {tag} refuses a WireGuard peer without an endpoint — the config will not load.", { what, tag })
                        : t("{what} is empty. Xray {tag} leaves it out of the device request, so a client has nowhere to send its handshake and never connects.", { what, tag }),
                suggestion: t("Write it as host:port, for example {example}.", { example }),
            });
        } else if (typeof peer.endpoint !== 'string' || !isEndpointForm(peer.endpoint)) {
            problems.push({
                kind: 'endpoint.form',
                field: `${at}.endpoint`,
                peer: index,
                message: t("{what} is \"{value}\", which is not host:port, so Xray cannot connect to it and every connection through this outbound fails.", { what: `${at}.endpoint`, value: String(peer.endpoint) }),
                suggestion: t("Write it as host:port, for example {example}.", { example }),
            });
        }

        if (Array.isArray(peer.allowedIPs)) {
            for (const issue of allowedIpIssues(peer.allowedIPs)) {
                problems.push({
                    kind: 'allowedIPs',
                    field: `${at}.allowedIPs`,
                    peer: index,
                    message: t("{what} lists \"{value}\", which is not a network written as address/prefix — the tunnel cannot come up and every connection through this outbound fails.", { what: `${at}.allowedIPs`, value: issue.value }),
                    suggestion: issue.example ? t("Write a single address as {example}.", { example: issue.example }) : undefined,
                });
            }
        }
    });

    return problems;
};

/** A peer's key that is there but is not one — the same two ways as the secret key's. */
const keyProblem = (
    shape: Exclude<ReturnType<typeof keyShape>, { ok: true }>,
    field: string,
    name: 'publicKey' | 'preSharedKey',
    peer: number,
): WireguardOutboundProblem => (shape.reason === 'invalid'
    ? {
        kind: `${name}.invalid`, field, peer,
        message: t("{what} is not a WireGuard key: Xray cannot decode it, and the config will not load.", { what: field }),
        suggestion: KEY_SHAPE(),
    }
    : {
        kind: `${name}.length`, field, peer,
        message: t("{what} decodes to {bytes} bytes and a WireGuard key is 32, so the tunnel cannot come up and every connection through this outbound fails.", { what: field, bytes: shape.bytes }),
        suggestion: KEY_SHAPE(),
    });
