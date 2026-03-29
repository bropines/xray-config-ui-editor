import nacl from 'tweetnacl';

export const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export const generateShortId = (length: number = 8): string => {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export const generateRealityKeyPair = () => {
    const keypair = nacl.box.keyPair();
    const privateKey = btoa(String.fromCharCode(...keypair.secretKey)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const publicKey = btoa(String.fromCharCode(...keypair.publicKey)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return { privateKey, publicKey };
};

// --- Вспомогательные функции для WARP ---

const generateRandomString = (length: number): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
};

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 5000) => {
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

export const generateWarpAccount = async () => {
    const keyPair = nacl.box.keyPair();
    const publicKey = btoa(String.fromCharCode(...keyPair.publicKey));
    const privateKey = btoa(String.fromCharCode(...keyPair.secretKey));
    
    // --- ПОПЫТКА 1: Метод "тех ребят" (Специализированные генераторы без лимитов) ---
    const installId = generateRandomString(22);
    const fcmToken = `${installId}:APA91b${generateRandomString(134)}`;
    
    const generatorEndpoints =[
        'https://www.warp-generator.workers.dev/wg',
        'https://warp.sub-aggregator.workers.dev/wg',
        'https://warp-generation.vercel.app/wg'
    ];

    for (const endpoint of generatorEndpoints) {
        try {
            console.log(`[WARP] Trying specialized generator: ${endpoint}`);
            const response = await fetchWithTimeout(endpoint, {
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
            }, 5000); // 5 секунд таймаут на каждый

            if (response.ok) {
                const data = await response.json();
                console.log(`[WARP] Successfully generated via: ${endpoint}`);
                return {
                    privateKey,
                    ipv4: data.config.interface.addresses.v4,
                    ipv6: data.config.interface.addresses.v6,
                    peerPublicKey: data.config.peers[0].public_key,
                    endpoint: data.config.peers[0].endpoint.host
                };
            }
        } catch (e) {
            console.warn(`[WARP] Generator ${endpoint} failed, trying next...`);
        }
    }

    // --- ПОПЫТКА 2: Резервные CORS-прокси + Оф. API Cloudflare ---
    console.log("[WARP] Specialized generators failed. Falling back to CORS proxies...");
    
    const targetUrl = "https://api.cloudflareclient.com/v0a884/reg";
    const payloadData = JSON.stringify({
        install_id: "",
        tos: new Date().toISOString(),
        key: publicKey,
        fcm_token: "",
        type: "Android",
        locale: "en_US"
    });

    const fallbackProxies =[
        `https://crs.bropines.workers.dev/`,              // Твой воркер
        `https://corsproxy.io/?`,                         // Популярный публичный
        `https://api.allorigins.win/raw?url=`,            // AllOrigins (raw mode)
    ];

    for (const proxy of fallbackProxies) {
        try {
            // Формируем правильный URL в зависимости от прокси
            const url = proxy.includes('?') && !proxy.includes('crs.bropines') 
                ? `${proxy}${encodeURIComponent(targetUrl)}` 
                : `${proxy}${targetUrl}`;

            console.log(`[WARP] Trying fallback proxy: ${proxy}`);
            const response = await fetchWithTimeout(url, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    // Для твоего воркера передаем кастомный юзер-агент, для чужих он проигнорируется
                    "x-custom-user-agent": "okhttp/3.12.1" 
                },
                body: payloadData
            }, 6000);

            if (response.ok) {
                const data = await response.json();
                console.log(`[WARP] Successfully generated via proxy: ${proxy}`);
                return {
                    privateKey,
                    ipv4: data.config.interface.addresses.v4,
                    ipv6: data.config.interface.addresses.v6,
                    peerPublicKey: data.config.peers[0].public_key,
                    endpoint: data.config.peers[0].endpoint.host
                };
            }
        } catch (e) {
            console.warn(`[WARP] Proxy ${proxy} failed, trying next...`);
        }
    }

    throw new Error("Failed to generate WARP account. All generators and proxies are blocked or offline.");
};