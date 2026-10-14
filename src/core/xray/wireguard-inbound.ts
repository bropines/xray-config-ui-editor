/**
 * What a WireGuard inbound has to hold before a core will run it.
 *
 * One struct serves both directions: the loader hands the same
 * WireGuardConfig to an inbound and to an outbound and tells them apart with
 * a flag it sets itself (`IsClient`, v26.3.27:infra/conf/xray.go:35 and :54,
 * v26.7.28:infra/conf/xray.go:32 and :51, v26.9.9:infra/conf/xray.go:33 and
 * :52). The editor only ever drew the client half, so an inbound could be
 * chosen and never completed — the factory wrote an empty `secretKey`, and
 * Build() refuses that before it looks at anything else.
 *
 * What a server reads of the struct, per line:
 *
 *   secretKey, address, mtu, peers   every line
 *   workers                          26.3 only (v26.3.27:proxy/wireguard/server.go:52);
 *                                    not a field of the struct after that
 *   peers[]: publicKey, preSharedKey,
 *            allowedIPs, keepAlive   every line
 *   peers[]: email, level            from 26.7, where an inbound's peer became
 *                                    a user (v26.7.28:infra/conf/wireguard.go:97-110)
 *   peers[].endpoint                 26.3 passes it on to the device
 *                                    (v26.3.27:proxy/wireguard/wireguard.go:79);
 *                                    from 26.7 the server keeps nothing of it
 *                                    (v26.7.28:proxy/wireguard/config.go:26-31)
 *
 * `reserved`, `domainStrategy`, `noKernelTun` and, on 26.9, `remoteDNS` are
 * decoded for an inbound as well and used by the client alone — see
 * CLIENT_ONLY_KEYS. Two of them still have to be valid, because Build()
 * checks them before it knows which side it is building.
 */

import validator from 'validator';
import { t } from '../../i18n';
import { compareCoreVersions, coreVersion, type CoreVersionId } from './versions';
// What both directions judge the same way — keys, interface addresses,
// allowedIPs, `reserved` — is in wireguard-config.ts; the wording stays here.
import {
    KEY_SHAPE,
    addressIssues,
    allowedIpIssues,
    isBlank,
    isObject,
    keyShape,
    reservedIssue,
    type Json,
} from './wireguard-config';

const { isIP } = validator;

/**
 * What Build() gives the interface when `address` is left out — the same pair
 * on every line (v26.3.27:infra/conf/wireguard.go:73-75,
 * v26.7.28:infra/conf/wireguard.go:80-82, v26.9.9:infra/conf/wireguard.go:81-83).
 * The core writes the IPv6 one out in full; this is the same address.
 */
export const WIREGUARD_DEFAULT_ADDRESSES = ['10.0.0.1', 'fd59:7153:2388:b5fd::1'] as const;

/**
 * Keys the struct has that only an outbound uses.
 *
 *   reserved        bytes written into each packet by the client's bind
 *                   (v26.3.27:proxy/wireguard/client.go:129, v26.7.28:proxy/wireguard/client.go:316)
 *   domainStrategy  how a peer's endpoint name is resolved (v26.7.28:proxy/wireguard/client.go:345)
 *   noKernelTun     a server is on gVisor whatever this says
 *                   (v26.3.27:proxy/wireguard/config.go:34-38, v26.7.28:proxy/wireguard/server.go:98)
 *   remoteDNS       the tunnel's own resolver, 26.9 (v26.9.9:proxy/wireguard/client.go:113)
 *
 * The inbound editor does not offer them. One a config already holds is
 * shown, with what it is, and stays until someone removes it.
 */
export const CLIENT_ONLY_KEYS = ['reserved', 'domainStrategy', 'noKernelTun', 'remoteDNS'] as const;

/** Whether a server on this line does anything with a peer's `endpoint` — see the table above. */
export const serverReadsPeerEndpoint = (version: CoreVersionId): boolean =>
    compareCoreVersions(version, '26.7') < 0;

export type WireguardInboundProblemKind =
    | 'secretKey.empty' | 'secretKey.invalid' | 'secretKey.length'
    | 'publicKey.empty' | 'publicKey.invalid' | 'publicKey.length'
    | 'preSharedKey.invalid' | 'preSharedKey.length'
    | 'allowedIPs' | 'address' | 'reserved';

export interface WireguardInboundProblem {
    kind: WireguardInboundProblemKind;
    /** Where it is, from the inbound down: `settings.peers[1].publicKey`. */
    field: string;
    /** Which peer, when it is one peer's. */
    peer?: number;
    message: string;
    suggestion?: string;
}

export const isWireguardInbound = (inbound: unknown): boolean =>
    // The loader lower-cases the protocol before looking it up (v26.7.28:infra/conf/loader.go:46).
    isObject(inbound) && typeof inbound.protocol === 'string' && inbound.protocol.toLowerCase() === 'wireguard';

/** A key that is there but is not one: undecodable, or the wrong size. */
const keyProblem = (
    value: unknown,
    name: 'secretKey' | 'publicKey' | 'preSharedKey',
    field: string,
    peer?: number,
): WireguardInboundProblem | null => {
    const shape = keyShape(value);
    if (shape.ok) return null;
    if (shape.reason === 'invalid') {
        return {
            kind: `${name}.invalid`, field, peer,
            message: t("{what} is not a WireGuard key: Xray cannot decode it, and the config will not load.", { what: field }),
            suggestion: KEY_SHAPE(),
        };
    }
    return {
        kind: `${name}.length`, field, peer,
        message: t("{what} decodes to {bytes} bytes and a WireGuard key is 32, so the inbound will not start.", { what: field, bytes: shape.bytes }),
        suggestion: KEY_SHAPE(),
    };
};

/**
 * Everything about a WireGuard inbound that stops a core running it.
 *
 * Refused by Build(), the same on all three lines — the config does not load:
 *
 *   secretKey empty        ParseWireGuardKey answers "key must not be empty" and
 *                          Build() returns "invalid WireGuard secret key"
 *                          (v26.3.27:infra/conf/wireguard.go:68-71 and :129-131,
 *                          v26.7.28:infra/conf/wireguard.go:75-78 and :151-153,
 *                          v26.9.9:infra/conf/wireguard.go:76-79 and :153-155)
 *   secretKey undecodable  "failed to deserialize key", by the same route
 *                          (v26.3.27:infra/conf/wireguard.go:151, v26.7.28:infra/conf/wireguard.go:173,
 *                          v26.9.9:infra/conf/wireguard.go:175)
 *   a peer's publicKey or  parsed only when not empty, and then it has to parse
 *   preSharedKey           (v26.3.27:infra/conf/wireguard.go:25-37,
 *   undecodable            v26.7.28:infra/conf/wireguard.go:32-44,
 *                          v26.9.9:infra/conf/wireguard.go:32-44)
 *   reserved               "should be empty or 3 bytes" (v26.3.27:infra/conf/wireguard.go:100-102,
 *                          v26.7.28:infra/conf/wireguard.go:122-124, v26.9.9:infra/conf/wireguard.go:123-125)
 *   domainStrategy         "unsupported domain strategy" — a value set, not a rule:
 *                          `inbound.wireguard.domainStrategy` in versions/features.inbound.ts
 *
 * Refused when the inbound is created — Build() passes, the core does not start:
 *
 *   a key that is not      26.7 and 26.9 decode the hex themselves and want 32
 *   32 bytes               bytes: the secret key through `common.Must2`, which
 *                          panics (v26.7.28:proxy/wireguard/server.go:103, ParseKey
 *                          at :390-398), a peer's public key as an error
 *                          (v26.7.28:proxy/wireguard/config.go:12-15). 26.3, and
 *                          every line for a pre-shared key, hand the hex to
 *                          wireguard-go's IpcSet (v26.3.27:proxy/wireguard/tun.go:75,
 *                          v26.7.28:proxy/wireguard/server.go:309 and :316), which
 *                          takes exactly 32 — that check is in the dependency
 *                          (pinned at v26.3.27:go.mod:29, the same commit on all
 *                          three tags), not in this repository.
 *   a peer with no         26.7 and 26.9: ParseKey("") is zero bytes, so the peer's
 *   publicKey              account fails and NewServer returns the error
 *                          (v26.7.28:proxy/wireguard/server.go:108-112,
 *                          v26.7.28:proxy/wireguard/config.go:12-15).
 *                          26.3 builds it, then leaves `public_key=` out of the
 *                          device request and sends the peer's allowed IPs anyway
 *                          (v26.3.27:proxy/wireguard/wireguard.go:71-85) — lines
 *                          with no peer of their own. Not a working peer on any line.
 *   allowedIPs             26.7 and 26.9: each one through netip.ParsePrefix
 *                          (v26.7.28:proxy/wireguard/config.go:17-23), so a bare
 *                          address is refused. 26.3 passes them to IpcSet unread
 *                          (v26.3.27:proxy/wireguard/wireguard.go:83-85), which
 *                          parses a prefix too.
 *   address                26.7 and 26.9: an address or any prefix
 *                          (v26.7.28:proxy/wireguard/server.go:83-96). 26.3: an
 *                          address, or a prefix that is exactly one host — /32 or
 *                          /128 (v26.3.27:proxy/wireguard/wireguard.go:29-46). So
 *                          `10.0.0.1/24` starts on 26.7 and not on 26.3; that one
 *                          is only reported when a line is given.
 *
 * Without `version` the answer is what holds on every line. Not a WireGuard
 * inbound: nothing.
 */
export const wireguardInboundProblems = (inbound: unknown, version?: CoreVersionId): WireguardInboundProblem[] => {
    if (!isWireguardInbound(inbound)) return [];
    const settings = isObject((inbound as Json).settings) ? (inbound as Json).settings as Json : {};
    const tag = version ? coreVersion(version).tag : undefined;
    const problems: WireguardInboundProblem[] = [];

    if (isBlank(settings.secretKey)) {
        problems.push({
            kind: 'secretKey.empty',
            field: 'settings.secretKey',
            message: t("{what} is empty. Every supported Xray refuses a WireGuard inbound without its secret key — the config will not load.", { what: 'settings.secretKey' }),
            suggestion: t("Generate one in the WireGuard card, or paste the key this server already uses."),
        });
    } else {
        const problem = keyProblem(settings.secretKey, 'secretKey', 'settings.secretKey');
        if (problem) problems.push(problem);
    }

    if (Array.isArray(settings.address)) {
        for (const issue of addressIssues(settings.address, version)) {
            problems.push({
                kind: 'address',
                field: 'settings.address',
                message: issue.why === 'not-ip'
                    ? t("{what} lists \"{value}\", which is not an IP address — the inbound will not start.", { what: 'settings.address', value: issue.value })
                    : t("{what} lists \"{value}\": Xray {tag} takes an interface address only as a single host — /32 for IPv4, /128 for IPv6 — and refuses any other prefix.", { what: 'settings.address', value: issue.value, tag }),
            });
        }
    }

    // `[]byte` takes a JSON array of numbers or a base64 string.
    const reserved = reservedIssue(settings.reserved);
    if (reserved === 'length') {
        problems.push({
            kind: 'reserved',
            field: 'settings.reserved',
            message: t("{what} must be empty or exactly 3 bytes; Xray refuses any other length and the config will not load.", { what: 'settings.reserved' }),
            suggestion: t("An inbound does not use it — only a WireGuard outbound does — so it can simply be removed."),
        });
    } else if (reserved === 'range') {
        problems.push({
            kind: 'reserved',
            field: 'settings.reserved',
            message: t("{what} holds a value that is not a byte (a whole number from 0 to 255); Xray cannot decode it and the config will not load.", { what: 'settings.reserved' }),
            suggestion: t("An inbound does not use it — only a WireGuard outbound does — so it can simply be removed."),
        });
    }

    const peers = Array.isArray(settings.peers) ? settings.peers : [];
    peers.forEach((peer, index) => {
        if (!isObject(peer)) return;
        const at = `settings.peers[${index}]`;

        if (isBlank(peer.publicKey)) {
            const what = `${at}.publicKey`;
            problems.push({
                kind: 'publicKey.empty',
                field: what,
                peer: index,
                message: version === undefined
                    ? t("{what} is empty. A peer is known by its public key, so nothing can connect as this one.", { what })
                    : compareCoreVersions(version, '26.7') >= 0
                        ? t("{what} is empty. A peer is known by its public key, and Xray {tag} refuses the inbound without one — the config will not load.", { what, tag })
                        : t("{what} is empty. A peer is known by its public key; Xray {tag} leaves the key out and sends the peer's other settings on their own.", { what, tag }),
                suggestion: t("Paste the public key the client shows for its own interface, or remove the peer."),
            });
        } else {
            const problem = keyProblem(peer.publicKey, 'publicKey', `${at}.publicKey`, index);
            if (problem) problems.push(problem);
        }

        if (!isBlank(peer.preSharedKey)) {
            const problem = keyProblem(peer.preSharedKey, 'preSharedKey', `${at}.preSharedKey`, index);
            if (problem) problems.push(problem);
        }

        if (Array.isArray(peer.allowedIPs)) {
            for (const issue of allowedIpIssues(peer.allowedIPs)) {
                problems.push({
                    kind: 'allowedIPs',
                    field: `${at}.allowedIPs`,
                    peer: index,
                    message: t("{what} lists \"{value}\", which is not a network written as address/prefix — the inbound will not start.", { what: `${at}.allowedIPs`, value: issue.value }),
                    suggestion: issue.example ? t("Write a single address as {example}.", { example: issue.example }) : undefined,
                });
            }
        }
    });

    return problems;
};

const ipv4Hosts = (entries: unknown): string[] =>
    (Array.isArray(entries) ? entries : [])
        .filter((entry): entry is string => typeof entry === 'string')
        .map(entry => entry.split('/')[0] ?? '')
        .filter(host => isIP(host, 4));

/**
 * An `allowedIPs` entry for a peer that is about to be added: the first host
 * of the interface's /24 that nothing uses yet.
 *
 * A peer left without `allowedIPs` is given everything — "0.0.0.0/0" and
 * "::0/0" (v26.7.28:infra/conf/wireguard.go:50-54). That is right for a
 * client, whose one peer is the way out, and wrong for a server with several:
 * every peer would claim every address, WireGuard sends an address to one
 * peer only, and from 26.7 Xray names the user behind a connection by the
 * first peer whose list contains its source
 * (v26.7.28:proxy/wireguard/server.go:195-207). So a new peer starts with one
 * address of its own, which is also the address the client has to be given.
 *
 * Undefined when the /24 is full or the interface has no IPv4 at all.
 */
export const nextPeerAllowedIP = (settings: unknown): string | undefined => {
    const node = isObject(settings) ? settings : {};
    const own = ipv4Hosts(node.address);
    // An IPv6-only interface gets no IPv4 guess; an unset one gets the core's default.
    if (Array.isArray(node.address) && node.address.length > 0 && own.length === 0) return undefined;
    const base = own[0] ?? WIREGUARD_DEFAULT_ADDRESSES[0];
    const peers = Array.isArray(node.peers) ? node.peers : [];
    const taken = new Set([base, ...own, ...peers.flatMap(peer => ipv4Hosts(isObject(peer) ? peer.allowedIPs : undefined))]);
    const net = base.split('.').slice(0, 3).join('.');
    for (let host = 1; host < 255; host++) {
        if (!taken.has(`${net}.${host}`)) return `${net}.${host}/32`;
    }
    return undefined;
};
