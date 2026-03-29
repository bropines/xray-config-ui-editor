import nacl from 'tweetnacl';

export const generateUUID = (): string => {
    // Используем нативный метод, если он доступен (https:// или localhost)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    
    // Fallback для небезопасных контекстов (например, доступ по HTTP в локальной сети)
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
    // Convert to base64url format for Xray
    const privateKey = btoa(String.fromCharCode(...keypair.secretKey)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const publicKey = btoa(String.fromCharCode(...keypair.publicKey)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return { privateKey, publicKey };
};

export const generateWarpAccount = async () => {
    try {
        const keyPair = nacl.box.keyPair();
        const publicKey = btoa(String.fromCharCode(...keyPair.publicKey));
        const privateKey = btoa(String.fromCharCode(...keyPair.secretKey));
        
        const targetUrl = "https://api.cloudflareclient.com/v0a884/reg";
        const proxyUrl = `https://crs.bropines.workers.dev/${targetUrl}`;

        const payloadData = JSON.stringify({
            install_id: "",
            tos: new Date().toISOString(),
            key: publicKey,
            fcm_token: "",
            type: "Android",
            locale: "en_US"
        });

        let response;

        // ПОПЫТКА 1: Через CORS-прокси (воркер)
        try {
            response = await fetch(proxyUrl, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "x-custom-user-agent": "okhttp/3.12.1"
                },
                body: payloadData
            });
            
            if (!response.ok) throw new Error(`Proxy failed with status: ${response.status}`);
        } catch (proxyError) {
            console.warn("Proxy attempt failed (possibly 429), trying direct...", proxyError);
            
            // ПОПЫТКА 2: Напрямую без прокси
            response = await fetch(targetUrl, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json"
                    // Мы не шлем кастомный User-Agent, так как браузеры
                    // категорически запрещают его переопределять в прямых fetch-запросах.
                },
                body: payloadData
            });
        }
        
        if (!response.ok) throw new Error(`WARP API failed: ${response.statusText}`);
        
        const data = await response.json();
        
        return {
            privateKey,
            ipv4: data.config.interface.addresses.v4,
            ipv6: data.config.interface.addresses.v6,
            peerPublicKey: data.config.peers[0].public_key,
            endpoint: data.config.peers[0].endpoint.host
        };
    } catch (e) {
        console.error("WARP Generation Error:", e);
        throw new Error("Failed to generate WARP config due to network or CORS issues");
    }
};