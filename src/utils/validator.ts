import validator from 'validator';

// Распаковываем функции из основного пакета для совместимости со сборщиком
const { isIP, isFQDN, isPort, isUUID } = validator;

export interface ValidationError {
    field: string;
    message: string;
}

// --- БАЗОВЫЕ ПРОВЕРКИ ---

export const isValidDomain = (domain: string) => {
    // require_tld: false позволяет использовать локальные домены типа "localhost" или "node-1"
    return isFQDN(domain, { require_tld: false, allow_underscores: true });
};

export const isValidIP = (ip: string) => {
    return isIP(ip) !== 0; // Возвращает 4, 6 или 0
};

// Проверка адреса (может быть как IP, так и Домен)
export const isValidAddress = (addr: string) => {
    if (!addr) return false;
    const cleanAddr = String(addr).trim();
    return isValidIP(cleanAddr) || isValidDomain(cleanAddr);
};

// Алиас для обратной совместимости в DnsHosts.tsx
export const isValidHostDestination = isValidAddress;

export const isValidPort = (port: any) => {
    return isPort(String(port));
};

// --- ВАЛИДАТОРЫ МОДУЛЕЙ ---

export const validateInbound = (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];

    // 1. Проверка Тега
    if (!data.tag || data.tag.trim().length < 1) {
        errors.push({ field: "tag", message: "Tag is required" });
    }

    // 2. Проверка Порта (пропускаем для протокола TUN)
    if (data.protocol !== 'tun') {
        if (!isValidPort(data.port)) {
            errors.push({ field: "port", message: "Invalid port (1-65535)" });
        }
    }

    // 3. Проверка Listen IP (если указан)
    if (data.listen && !isValidIP(data.listen)) {
        errors.push({ field: "listen", message: "Listen address must be a valid IP" });
    }

    // 4. Специфичные проверки протоколов
    const settings = data.settings || {};
    if (['vless', 'vmess', 'trojan'].includes(data.protocol)) {
        // Проверяем наличие массива клиентов (даже пустого для панелей типа Remnawave)
        if (!settings.clients) {
            errors.push({ field: "clients", message: "Clients settings missing" });
        } else {
            // Если клиенты есть, проверяем их UUID
            settings.clients.forEach((c: any, i: number) => {
                const id = c.id || c.password;
                if (id && data.protocol !== 'trojan' && !isUUID(String(id))) {
                    errors.push({ field: "clients", message: `Client #${i+1}: Invalid UUID format` });
                }
            });
        }
    }

    if (data.protocol === 'shadowsocks' && !settings.password) {
        errors.push({ field: "password", message: "Shadowsocks password is required" });
    }

    return errors;
};

export const validateOutbound = (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];

    // 1. Проверка Тега
    if (!data.tag || data.tag.trim() === "") {
        errors.push({ field: "tag", message: "Tag is required" });
    }
    
    // 2. Проверка валидности протокола Xray (Актуализировано для 2024-2025)
    const VALID_PROTOCOLS = [
        "vless", "vmess", "trojan", "shadowsocks", "socks", "http",
        "freedom", "blackhole", "dns", "wireguard", "loopback", 
        "dokodemo-door", "tun", "hysteria2", "shadowsocks-2022"
    ];

    if (!data.protocol || !VALID_PROTOCOLS.includes(data.protocol)) {
        errors.push({ 
            field: "protocol", 
            message: `Invalid protocol: "${data.protocol}".` 
        });
        return errors; 
    }

    // 3. Проверка настроек удаленного сервера (адрес и порт)
    if (['vless', 'vmess', 'trojan', 'shadowsocks', 'socks', 'http'].includes(data.protocol)) {
        const s = data.settings || {};
        let addr = "";
        let port: any = 0;

        // Ищем данные в любой структуре (vnext, servers или flat)
        if (Array.isArray(s.vnext) && s.vnext[0]) {
            addr = s.vnext[0].address;
            port = s.vnext[0].port;
        } else if (Array.isArray(s.servers) && s.servers[0]) {
            addr = s.servers[0].address;
            port = s.servers[0].port;
        } else {
            addr = s.address;
            port = s.port;
        }

        if (!isValidAddress(addr)) {
            errors.push({ field: "address", message: "Valid remote address (IP/Domain) is required" });
        }
        if (!isValidPort(port)) {
            errors.push({ field: "port", message: "Valid remote port is required" });
        }
    }

    // 4. Проверка REALITY и Vision
    const stream = data.streamSettings || {};
    const reality = stream.security === 'reality' ? (stream.realitySettings || {}) : null;
    const tls = stream.security === 'tls' ? (stream.tlsSettings || {}) : null;

    if (reality) {
        if (!reality.publicKey) {
            errors.push({ field: "reality", message: "Reality Public Key is required" });
        }
        if (reality.shortId && reality.shortId.length % 2 !== 0) {
            errors.push({ field: "reality", message: "ShortID must be hex string with even length" });
        }
    }

    // Проверка XTLS Vision
    const flow = (data.settings?.vnext?.[0]?.users?.[0]?.flow) || (data.settings?.flow);
    if (flow === 'xtls-rprx-vision') {
        if (stream.security !== 'tls' && stream.security !== 'reality') {
            errors.push({ field: "flow", message: "Vision flow requires TLS or REALITY security" });
        }
    }

    // --- XHTTP VALIDATION (BEYOND REALITY) ---
    if (stream.network === 'xhttp') {
        const x = stream.xhttpSettings || {};
        const mode = x.mode || "auto";
        const extra = x.extra || {};

        // Hard Errors (Crash prevention)
        if (extra.downloadSettings) {
            const dl = extra.downloadSettings;
            if (dl.address && !isValidAddress(dl.address)) {
                errors.push({ field: "xhttp_dl", message: "Download address must be a valid IP or Domain" });
            }
            if (dl.port && !isValidPort(dl.port)) {
                errors.push({ field: "xhttp_dl", message: "Download port is invalid" });
            }
        }

        // Semantic Warnings (Logic & Performance)
        if (mode === 'stream-up' && stream.security === 'none') {
            errors.push({ field: "xhttp", message: "WARNING: stream-up mode is intended for TLS/REALITY. Plain HTTP may be unstable." });
        }

        if (mode === 'packet-up' && extra.scMaxBufferedPosts > 100) {
            errors.push({ field: "xhttp", message: "WARNING: scMaxBufferedPosts > 100 may consume too much memory on server." });
        }

        if (extra.xmux?.maxConcurrency === "1") {
            errors.push({ field: "xmux", message: "INFO: maxConcurrency=1 is good for speedtests, but bad for web browsing." });
        }
    }

    return errors;
};

export const validateWireguard = (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];
    const s = data.settings || {};
 
    // 1. Приватный ключ обязателен
    if (!s.secretKey || String(s.secretKey).trim() === "") {
        errors.push({ field: "secretKey", message: "WireGuard Secret Key is required" });
    }
 
    // 2. Нужен хотя бы один пир
    const peers: any[] = s.peers || [];
    if (peers.length === 0) {
        errors.push({ field: "peers", message: "At least one WireGuard peer is required" });
    }
 
    // 3. В каждом пире — обязательны publicKey и endpoint
    peers.forEach((peer: any, i: number) => {
        if (!peer.publicKey || String(peer.publicKey).trim() === "") {
            errors.push({ field: `peer_${i}_publicKey`, message: `Peer #${i + 1}: Public Key is required` });
        }
        if (!peer.endpoint || String(peer.endpoint).trim() === "") {
            errors.push({ field: `peer_${i}_endpoint`, message: `Peer #${i + 1}: Endpoint is required` });
        }
    });
 
    return errors;
};


export const validateRule = (rule: any): ValidationError[] => {
    const errors: ValidationError[] = [];
 
    // ── 1. Обязательный destination (краш) ───────────────────────────────────
    if (!rule.outboundTag && !rule.balancerTag) {
        errors.push({
            field: "target",
            message: "No destination tag (outboundTag / balancerTag) — Xray will crash"
        });
    }
 
    // ── 2. Нет матчеров (краш) ────────────────────────────────────────────────
    const hasMatchers = !!(
        rule.domain?.length    ||
        rule.ip?.length        ||
        rule.port              ||
        rule.network           ||
        rule.protocol?.length  ||
        rule.inboundTag?.length ||
        rule.source?.length    ||
        rule.sourcePort        ||
        rule.user?.length      ||
        rule.process?.length
    );
    if (!hasMatchers) {
        errors.push({
            field: "matchers",
            message: 'Rule has no matchers — Xray will crash. Add "network: tcp,udp" for a proper catch-all.'
        });
    }
 
    // ── 3. Пустые / незаконченные записи в domain[] (краш) ───────────────────
    const domains: string[] = rule.domain || [];
    domains.forEach((d, i) => {
        const clean = String(d).trim();
        if (!clean) {
            errors.push({ field: `domain_${i}`, message: `Domain entry #${i + 1} is empty` });
            return;
        }
        if (/^geosite:\s*$/i.test(clean)) {
            errors.push({ field: `domain_${i}`, message: `Domain #${i + 1}: "geosite:" without a name` });
        }
    });
 
    // ── 4. Пустые / незаконченные записи в ip[] (краш) ───────────────────────
    const ips: string[] = rule.ip || [];
    ips.forEach((ip, i) => {
        const clean = String(ip).trim();
        if (!clean) {
            errors.push({ field: `ip_${i}`, message: `IP entry #${i + 1} is empty` });
            return;
        }
        if (/^(!?geoip:)\s*$/i.test(clean)) {
            errors.push({ field: `ip_${i}`, message: `IP #${i + 1}: "geoip:" without a name` });
        }
    });
 
    return errors;
};
 
// Lint-предупреждения: не блокируют, просто стилистика
export const lintRule = (rule: any): ValidationError[] => {
    const warnings: ValidationError[] = [];
 
    const domains: string[] = rule.domain || [];
    domains.forEach((d, i) => {
        const clean = String(d).trim();
        const m = clean.match(/^(geosite:|domain:|full:|regexp:)(.+)$/i);
        if (m && m[2] !== m[2].toLowerCase()) {
            warnings.push({
                field: `domain_${i}`,
                message: `Domain #${i + 1}: "${clean}" — convention is lowercase (e.g. "${clean.toLowerCase()}")`
            });
        }
    });
 
    const ips: string[] = rule.ip || [];
    ips.forEach((ip, i) => {
        const clean = String(ip).trim();
        const m = clean.match(/^(!?geoip:)(.+)$/i);
        if (m && m[2] !== m[2].toLowerCase()) {
            warnings.push({
                field: `ip_${i}`,
                message: `IP #${i + 1}: "${clean}" — convention is lowercase (e.g. "${clean.toLowerCase()}")`
            });
        }
    });
 
    return warnings;
};
 
// Алиас — только блокирующие ошибки
export const getCriticalRuleErrors = (rule: any): ValidationError[] =>
    validateRule(rule);


export const validateBalancer = (balancer: any): ValidationError[] => {
    const errors: ValidationError[] = [];
    if (!balancer.tag || balancer.tag.trim() === "") {
        errors.push({ field: "tag", message: "Balancer tag is required" });
    }
    // Критическая проверка селектора
    if (!balancer.selector || balancer.selector.length === 0) {
        errors.push({ field: "selector", message: "Selector cannot be empty (Node will crash!)" });
    }
    return errors;
};

// --- СИСТЕМНЫЕ УТИЛИТЫ ---

// Проверка на дубликаты Тегов (Xray вылетает при дублировании тегов инбаундов/аутбаундов)
export const getDuplicateTags = (config: any): string[] => {
    const tags: string[] = [];
    if (config.inbounds) config.inbounds.forEach((i: any) => i.tag && tags.push(i.tag));
    if (config.outbounds) config.outbounds.forEach((o: any) => o.tag && tags.push(o.tag));
    
    const seen = new Set();
    const duplicates = new Set<string>();
    tags.forEach(t => {
        const lowerTag = t.toLowerCase();
        if (seen.has(lowerTag)) duplicates.add(t);
        seen.add(lowerTag);
    });
    return Array.from(duplicates);
};

// Проверка на дубликаты самих настроек прокси (чтобы не добавлять один и тот же сервер дважды)
export const checkOutboundDuplication = (current: any, all: any[], currentIndex: number | null): string | null => {
    const getIdentity = (ob: any) => {
        const s = ob.settings || {};
        let addr = "";
        let key = "";
        
        if (ob.protocol === 'shadowsocks') {
            const srv = s.servers?.[0] || s;
            addr = `${srv.address}:${srv.port}`;
            key = srv.password || "";
        } else if (['vless', 'vmess', 'trojan'].includes(ob.protocol)) {
            const vn = s.vnext?.[0] || s;
            addr = `${vn.address}:${vn.port}`;
            key = vn.users?.[0]?.id || vn.id || vn.password || "";
        } else if (['socks', 'http'].includes(ob.protocol)) {
            const srv = s.servers?.[0] || s;
            addr = `${srv.address}:${srv.port}`;
            key = srv.user || "";
        }
        return `${ob.protocol}_${addr}_${key}`.toLowerCase();
    };

    const currentId = getIdentity(current);
    // Если важные поля не заполнены, проверку на дубли не делаем
    if (currentId.includes("undefined") || currentId.split('_')[1] === ":") return null;

    for (let i = 0; i < all.length; i++) {
        if (currentIndex !== null && i === currentIndex) continue;
        if (getIdentity(all[i]) === currentId) {
            return all[i].tag || `Outbound #${i + 1}`;
        }
    }
    return null;
};