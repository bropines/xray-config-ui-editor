/**
 * WARP over MASQUE: a Cloudflare WARP device reached with HTTP/3 CONNECT-IP
 * instead of WireGuard, as the official client does in its MASQUE mode.
 *
 * Xray 26.10 does this itself (v26.10.10:transport/internet/masque/warp.go):
 * given the device's ECDSA key, Cloudflare's key for the device and the
 * device's tunnel addresses, its masque transport builds the client
 * certificate, pins the server to that key, and speaks Cloudflare's
 * `cf-connect-ip` dialect. 26.9.30 has masque without any of that and cannot
 * reach Cloudflare; earlier lines have no masque at all.
 *
 * Getting the three values takes two calls through the relay:
 *   1. register a device, as for WireGuard (the WireGuard key it carries is
 *      never used and is thrown away here, as usque does — api/cloudflare.go);
 *   2. enrol an ECDSA P-256 public key on it with `key_type: "secp256r1"`,
 *      `tunnel_type: "masque"` (usque api/cloudflare.go:136-160).
 * The answer to the second carries Cloudflare's key as PEM and the MASQUE
 * endpoint (162.159.198.x / 2606:4700:103::x, port given as 0 — every client
 * dials 443). The ECDSA private key is made here and never leaves the page.
 */
import { generateWireguardKeyPair } from './crypto';
import { generateMasqueKeyPair } from './masque-keys';
import { BUILT_IN_RELAY, RelayError, updateDevice, type WarpRelay } from './warp-relay';
import { readWarpDevice, registerWarpDevice, type WarpDevice } from './warp';

/** The SNI the official client sends to the MASQUE edge (usque internal/consts.go:6). */
export const WARP_MASQUE_SNI = 'consumer-masque.cloudflareclient.com';

/** Every client dials 443; the API's endpoint carries port 0 as a placeholder. */
export const WARP_MASQUE_PORT = 443;

/** Used when an answer has no MASQUE endpoint: Cloudflare's, as Throne lists it (include/scanner/WarpPresets.h). */
export const WARP_MASQUE_FALLBACK = '162.159.198.2';

export interface WarpMasqueAccount {
    id: string;
    token: string;
    /** Standard base64 PKCS #8 DER: `masqueSettings.warp.privateKey`. */
    privateKey: string;
    /** Standard base64 SPKI DER of our key: what was enrolled. */
    publicKey: string;
    /** Cloudflare's key for this device, PEM: `masqueSettings.warp.publicKey`. */
    peerPublicKey: string;
    /** The MASQUE edge address, no port. */
    endpointV4: string;
    endpointV6: string;
    ipv4: string;
    ipv6: string;
}

/** `162.159.198.2:0` → `162.159.198.2`; `[2606:4700:103::2]:0` → `2606:4700:103::2`. */
export const endpointAddress = (endpoint: string): string => {
    const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(endpoint);
    if (bracketed) return bracketed[1]!;
    return endpoint.replace(/:\d+$/, '');
};

/** What the enrolment answer says, checked for the parts a masque outbound cannot do without. */
export const masqueAccountFrom = (device: WarpDevice, keys: { privateKey: string; publicKey: string }): WarpMasqueAccount => {
    if (!device.peerPublicKey.includes('BEGIN')) {
        throw new RelayError('bad_response', 'Cloudflare did not send a MASQUE key for the device.');
    }
    if (!device.ipv4 && !device.ipv6) {
        throw new RelayError('bad_response', 'Cloudflare did not send tunnel addresses for the device.');
    }
    return {
        id: device.id,
        token: device.token,
        privateKey: keys.privateKey,
        publicKey: keys.publicKey,
        peerPublicKey: device.peerPublicKey,
        endpointV4: endpointAddress(device.endpointV4) || WARP_MASQUE_FALLBACK,
        endpointV6: endpointAddress(device.endpointV6),
        ipv4: device.ipv4,
        ipv6: device.ipv6,
    };
};

/** Register a device and enrol a fresh MASQUE key on it. */
export const generateWarpMasqueAccount = async (relay: WarpRelay = BUILT_IN_RELAY): Promise<WarpMasqueAccount> => {
    const registered = await registerWarpDevice(relay, generateWireguardKeyPair().publicKey);
    const keys = await generateMasqueKeyPair();
    const enrolled = readWarpDevice(await updateDevice(relay, registered.id, registered.token, {
        key: keys.publicKey,
        key_type: 'secp256r1',
        tunnel_type: 'masque',
    }));
    return masqueAccountFrom({ ...enrolled, id: registered.id, token: registered.token }, keys);
};

/** The device's tunnel addresses as `warp.address` takes them: one of each family at most. */
export const masqueWarpAddress = (account: Pick<WarpMasqueAccount, 'ipv4' | 'ipv6'>): string[] => [
    ...(account.ipv4 ? [`${account.ipv4}/32`] : []),
    ...(account.ipv6 ? [`${account.ipv6}/128`] : []),
];

/**
 * `streamSettings` for WARP over MASQUE, keeping whatever else the stream
 * already holds (sockopt, finalmask, a chosen ALPN). TLS is required — the
 * masque client refuses to start without it (v26.10.10:proxy/masque/
 * client.go:57-62) — and the server name is set because without one Go sends
 * no SNI to an IP address (v26.10.10:transport/internet/tls/config.go:489-499).
 * `host` and `path` are left out: with `warp` set the core defaults them to
 * what Cloudflare expects (v26.10.10:infra/conf/transport_method.go:833-840).
 */
export const withWarpMasqueStream = (stream: any, account: WarpMasqueAccount) => {
    const current = stream && typeof stream === 'object' ? stream : {};
    const { user: _user, pass: _pass, ...masque } = current.masqueSettings ?? {};
    return {
        ...current,
        network: 'masque',
        security: 'tls',
        tlsSettings: { ...(current.tlsSettings ?? {}), serverName: current.tlsSettings?.serverName || WARP_MASQUE_SNI },
        masqueSettings: {
            ...masque,
            warp: {
                privateKey: account.privateKey,
                publicKey: account.peerPublicKey,
                address: masqueWarpAddress(account),
            },
        },
    };
};

/** A whole masque outbound for a freshly registered account. */
export const buildWarpMasqueOutbound = (account: WarpMasqueAccount, tag: string) => ({
    tag,
    protocol: 'masque',
    settings: { address: account.endpointV4, port: WARP_MASQUE_PORT },
    streamSettings: withWarpMasqueStream({}, account),
});

/** An existing masque outbound, given a new account: the server and the warp block change, nothing else. */
export const withWarpMasqueAccount = (outbound: any, account: WarpMasqueAccount) => ({
    ...outbound,
    settings: { ...(outbound?.settings ?? {}), address: account.endpointV4, port: WARP_MASQUE_PORT },
    streamSettings: withWarpMasqueStream(outbound?.streamSettings, account),
});
