import { WARP_ENDPOINT } from '../presets';
import { generateWireguardKeyPair } from './crypto';
import { BUILT_IN_RELAY, RelayError, registerDevice, updateDevice, type WarpRelay } from './warp-relay';

export interface WarpAccount {
    id: string;
    token: string;
    privateKey: string;
    publicKey: string;
    peerPublicKey: string;
    endpoint: string;
    ipv4: string;
    ipv6: string;
    reserved: number[];
}

/** What a registration says about the device, whichever way the API wraps it. */
export interface WarpDevice {
    id: string;
    token: string;
    /** The three bytes WARP expects in WireGuard's reserved field, from `config.client_id`. */
    reserved: number[];
    /** `config.peers[0].public_key`: Cloudflare's key for this tunnel type. */
    peerPublicKey: string;
    /** `config.peers[0].endpoint`: the host name form, and the v4/v6 address forms. */
    endpointHost: string;
    endpointV4: string;
    endpointV6: string;
    ipv4: string;
    ipv6: string;
    /** False until WARP is switched on for the device; undefined when the answer does not say. */
    warpEnabled?: boolean;
    accountType: string;
}

const text = (value: unknown): string => typeof value === 'string' ? value : '';

/** `client_id` is base64 of three bytes; anything else gives the zeros WireGuard would send anyway. */
export const reservedFromClientId = (clientId: unknown): number[] => {
    if (typeof clientId !== 'string' || clientId === '') return [0, 0, 0];
    try {
        const bytes = Array.from(atob(clientId), char => char.charCodeAt(0));
        return bytes.length === 3 ? bytes : [0, 0, 0];
    } catch {
        return [0, 0, 0];
    }
};

/**
 * Read a registration or device answer. The v0a API returns the device
 * itself; older paths wrapped it in `result`. Both are taken.
 */
export const readWarpDevice = (raw: any): WarpDevice => {
    const device = raw && typeof raw === 'object' && raw.result && typeof raw.result === 'object' ? raw.result : raw ?? {};
    const config = device.config ?? {};
    const peer = Array.isArray(config.peers) ? config.peers[0] ?? {} : {};
    const endpoint = peer.endpoint ?? {};
    const addresses = config.interface?.addresses ?? {};
    return {
        id: text(device.id),
        token: text(device.token),
        reserved: reservedFromClientId(config.client_id),
        peerPublicKey: text(peer.public_key),
        endpointHost: text(endpoint.host),
        endpointV4: text(endpoint.v4),
        endpointV6: text(endpoint.v6),
        ipv4: text(addresses.v4),
        ipv6: text(addresses.v6),
        warpEnabled: typeof device.warp_enabled === 'boolean' ? device.warp_enabled : undefined,
        accountType: text(device.account?.account_type),
    };
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Retry what Cloudflare rate limits, a couple of times, then give up with its message. */
export const withRateLimitRetry = async <T>(attempt: () => Promise<T>, tries = 3, wait = sleep): Promise<T> => {
    for (let n = 1; ; n++) {
        try {
            return await attempt();
        } catch (error) {
            if (!(error instanceof RelayError) || error.code !== 'rate_limited' || n >= tries) throw error;
            await wait(1500 * n);
        }
    }
};

/**
 * Register a device and switch WARP on for it, through `relay`. The device
 * answer is returned with the id and token kept (a PATCH answer may carry
 * neither).
 */
export const registerWarpDevice = async (relay: WarpRelay, publicKey: string): Promise<WarpDevice> => {
    const registered = readWarpDevice(await withRateLimitRetry(() => registerDevice(relay, publicKey)));
    if (!registered.id || !registered.token) {
        throw new RelayError('bad_response', 'The registration came back without a device id or token.');
    }
    if (registered.warpEnabled !== false && registered.peerPublicKey) return registered;
    const enabled = readWarpDevice(await updateDevice(relay, registered.id, registered.token, { warp_enabled: true }));
    return { ...enabled, id: registered.id, token: registered.token };
};

/**
 * Register a new WARP device for a WireGuard outbound.
 *
 * The key pair is made here, in the browser; the relay is sent the public key
 * only. A custom URL that does not answer as a v2 relay is tried the old way
 * — a bare GET that hands back a whole account — so a Worker set up for an
 * earlier version of this editor keeps working.
 */
export async function generateWarpAccount(relay: WarpRelay = BUILT_IN_RELAY): Promise<WarpAccount> {
    const { secretKey, publicKey } = generateWireguardKeyPair();
    let device: WarpDevice;
    try {
        device = await registerWarpDevice(relay, publicKey);
    } catch (error) {
        if (!relay.builtIn && error instanceof RelayError && error.code === 'not_relay') {
            return legacyWarpAccount(relay.url);
        }
        throw error;
    }
    if (!device.peerPublicKey) throw new RelayError('bad_response', 'The registration came back without a peer key.');
    return {
        id: device.id,
        token: device.token,
        privateKey: secretKey,
        publicKey,
        peerPublicKey: device.peerPublicKey,
        endpoint: device.endpointHost || WARP_ENDPOINT,
        ipv4: device.ipv4,
        ipv6: device.ipv6,
        reserved: device.reserved,
    };
}

/**
 * A Worker written for the editor before 1.29: GET returns a whole account,
 * private key included. Only reached for a URL the user entered.
 */
async function legacyWarpAccount(url: string): Promise<WarpAccount> {
    const endpoints = [url];
    let lastError: any;

    for (const url of endpoints) {
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // By default use GET for standard workers, fallback to POST if needed
                let method = 'GET';
                if (url.includes('warp-generator') || url.includes('sub-aggregator')) {
                    method = 'POST';
                }

                const response = await fetch(url, {
                    method,
                    headers: {
                        'Accept': 'application/json',
                    },
                    signal: AbortSignal.timeout(12000),
                });

                const responseText = await response.text();
                let rawData: any;
                try {
                    rawData = JSON.parse(responseText);
                } catch {
                    rawData = null;
                }

                // Check for Cloudflare rate limits (HTTP 429 or CF 1015 error in 500 response)
                const isRateLimit =
                    response.status === 429 ||
                    (response.status === 500 && (responseText.includes('429') || responseText.includes('1015')));

                if (isRateLimit) {
                    if (attempt < maxRetries) {
                        // Exponential backoff
                        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
                        continue;
                    }
                    throw new Error('Cloudflare WARP API rate limited (Error 1015/429). Please wait a few seconds and try again.');
                }

                if (!response.ok) {
                    const message = rawData?.message || rawData?.error || responseText.substring(0, 50);
                    throw new Error(`Worker returned ${response.status}: ${message}`);
                }

                const data = rawData?.result || (rawData?.success === true ? rawData : rawData);

                if (data && data.privKey && data.peer_pub) {
                    return {
                        id: data.id || '',
                        token: data.token || '',
                        privateKey: data.privKey,
                        publicKey: data.publicKey || '',
                        peerPublicKey: data.peer_pub,
                        endpoint: data.peer_endpoint || WARP_ENDPOINT,
                        ipv4: data.client_ipv4,
                        ipv6: data.client_ipv6,
                        reserved: data.reserved || [0, 0, 0],
                    };
                }

                throw new Error('Invalid worker response format. Missing keys in response.');
            } catch (e: any) {
                console.warn(`[WARP Generator] Attempt ${attempt}/${maxRetries} failed for ${url}:`, e.message);
                lastError = e;

                if (attempt < maxRetries) {
                    await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
                }
            }
        }
    }

    throw lastError || new Error('WARP registration failed. Please try again.');
}

/** The interface addresses a registration returned — only the families it returned. */
export const warpAddresses = (warp: Pick<WarpAccount, 'ipv4' | 'ipv6'>): string[] => [
    ...(warp.ipv4 ? [`${warp.ipv4}/32`] : []),
    ...(warp.ipv6 ? [`${warp.ipv6}/128`] : []),
];

const firstPeer = (settings: any): [any, any[]] => {
    const peers = Array.isArray(settings?.peers) && settings.peers.length > 0 ? settings.peers : [{}];
    const [first, ...rest] = peers;
    return [first && typeof first === 'object' ? first : {}, rest];
};

/**
 * WireGuard `settings` with a registered WARP account in them: the key, the
 * addresses, `reserved`, and the first peer's endpoint and public key. Only
 * what the registration decides is written — the first peer keeps its
 * allowedIPs (a profile that leaves local networks out stays that way),
 * other peers and the rest of settings (mtu, workers…) stay as they were.
 */
export const withWarpAccount = (settings: any, warp: WarpAccount) => {
    const [first, rest] = firstPeer(settings);
    return {
        ...settings,
        secretKey: warp.privateKey,
        address: warpAddresses(warp),
        reserved: warp.reserved,
        peers: [{ keepAlive: 15, ...first, endpoint: warp.endpoint, publicKey: warp.peerPublicKey }, ...rest],
    };
};

/**
 * WireGuard `settings` for a WARP profile whose registration failed: no key
 * and no peer key — the outbound's Generate WARP button registers it and
 * fills them — but Cloudflare's endpoint, so the peer is not left blank.
 */
export const withoutWarpAccount = (settings: any) => {
    const [first, rest] = firstPeer(settings);
    return {
        ...settings,
        secretKey: '',
        peers: [{ keepAlive: 15, ...first, endpoint: first.endpoint || WARP_ENDPOINT, publicKey: '' }, ...rest],
    };
};
