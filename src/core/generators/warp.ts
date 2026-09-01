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

/**
 * Default Cloudflare WARP registration worker.
 */
const DEFAULT_WARP_ENDPOINTS = [
    'https://xcui.bropines.workers.dev/',
];

/**
 * Registers a new WARP device and returns account credentials.
 * Supports custom Cloudflare Workers and includes automatic retry with backoff on rate limits.
 */
export async function generateWarpAccount(customWorkerUrl?: string): Promise<WarpAccount> {
    const endpoints = customWorkerUrl?.trim() ? [customWorkerUrl.trim()] : DEFAULT_WARP_ENDPOINTS;
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
                        endpoint: data.peer_endpoint || 'engage.cloudflareclient.com:2408',
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

