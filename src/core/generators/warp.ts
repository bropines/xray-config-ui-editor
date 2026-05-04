import nacl from 'tweetnacl';

const generateRandomString = (length: number): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
};

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 5000): Promise<Response> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

export interface WarpAccount {
    privateKey: string;
    ipv4: string;
    ipv6: string;
    peerPublicKey: string;
    endpoint: string;
}

/**
 * Tries multiple endpoints to generate a WARP Wireguard account.
 * Falls back through specialized generators → CORS proxies → throws.
 */
export const generateWarpAccount = async (): Promise<WarpAccount> => {
    const keyPair = nacl.box.keyPair();
    const publicKey = btoa(String.fromCharCode(...keyPair.publicKey));
    const privateKey = btoa(String.fromCharCode(...keyPair.secretKey));

    // --- Attempt 1: Specialized generators (no rate-limits) ---
    const installId = generateRandomString(22);
    const fcmToken = `${installId}:APA91b${generateRandomString(134)}`;

    const generatorEndpoints = [
        'https://www.warp-generator.workers.dev/wg',
        'https://warp.sub-aggregator.workers.dev/wg',
        'https://warp-generation.vercel.app/wg',
    ];

    for (const endpoint of generatorEndpoints) {
        try {
            console.log(`[WARP] Trying specialized generator: ${endpoint}`);
            const response = await fetchWithTimeout(
                endpoint,
                {
                    method: 'POST',
                    headers: {
                        'User-Agent': 'okhttp/3.12.1',
                        'CF-Client-Version': 'a-6.10-2158',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        key: publicKey,
                        install_id: installId,
                        fcm_token: fcmToken,
                        tos: new Date().toISOString(),
                        model: 'PC',
                        serial_number: installId,
                        locale: 'de_DE',
                    }),
                },
                5000,
            );

            if (response.ok) {
                const data = await response.json();
                console.log(`[WARP] Successfully generated via: ${endpoint}`);
                return {
                    privateKey,
                    ipv4: data.config.interface.addresses.v4,
                    ipv6: data.config.interface.addresses.v6,
                    peerPublicKey: data.config.peers[0].public_key,
                    endpoint: data.config.peers[0].endpoint.host,
                };
            }
        } catch {
            console.warn(`[WARP] Generator ${endpoint} failed, trying next...`);
        }
    }

    // --- Attempt 2: CORS proxies + official Cloudflare API ---
    console.log('[WARP] Specialized generators failed. Falling back to CORS proxies...');

    const targetUrl = 'https://api.cloudflareclient.com/v0a884/reg';
    const payloadData = JSON.stringify({
        install_id: '',
        tos: new Date().toISOString(),
        key: publicKey,
        fcm_token: '',
        type: 'Android',
        locale: 'en_US',
    });

    const fallbackProxies = [
        'https://crs.bropines.workers.dev/',
        'https://corsproxy.io/?',
        'https://api.allorigins.win/raw?url=',
    ];

    for (const proxy of fallbackProxies) {
        try {
            const url =
                proxy.includes('?') && !proxy.includes('crs.bropines')
                    ? `${proxy}${encodeURIComponent(targetUrl)}`
                    : `${proxy}${targetUrl}`;

            console.log(`[WARP] Trying fallback proxy: ${proxy}`);
            const response = await fetchWithTimeout(
                url,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-custom-user-agent': 'okhttp/3.12.1',
                    },
                    body: payloadData,
                },
                6000,
            );

            if (response.ok) {
                const data = await response.json();
                console.log(`[WARP] Successfully generated via proxy: ${proxy}`);
                return {
                    privateKey,
                    ipv4: data.config.interface.addresses.v4,
                    ipv6: data.config.interface.addresses.v6,
                    peerPublicKey: data.config.peers[0].public_key,
                    endpoint: data.config.peers[0].endpoint.host,
                };
            }
        } catch {
            console.warn(`[WARP] Proxy ${proxy} failed, trying next...`);
        }
    }

    throw new Error('Failed to generate WARP account. All generators and proxies are blocked or offline.');
};
