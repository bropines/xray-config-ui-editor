import isIP from 'validator/lib/isIP';
import isFQDN from 'validator/lib/isFQDN';
import isPort from 'validator/lib/isPort';
import isUUID from 'validator/lib/isUUID';

export interface ValidationError {
    field: string;
    message: string;
}

// --- БАЗОВЫЕ ПРОВЕРКИ ---

export const isValidDomain = (domain: string) => {
    return isFQDN(domain, { require_tld: false, allow_underscores: true });
};

export const isValidIP = (ip: string) => {
    return isIP(ip) !== 0;
};

// Проверка адреса (IP или Домен)
export const isValidAddress = (addr: string) => {
    if (!addr) return false;
    return isValidIP(addr) || isValidDomain(addr);
};

// Экспортируем алиас для DnsHosts.tsx
export const isValidHostDestination = isValidAddress;

// Проверка порта
export const isValidPort = (port: any) => {
    return isPort(String(port));
};

// --- ВАЛИДАТОРЫ МОДУЛЕЙ ---

export const validateInbound = (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!data.tag || data.tag.trim().length < 1) {
        errors.push({ field: "tag", message: "Tag is required" });
    }

    if (data.protocol !== 'tun') {
        if (!isValidPort(data.port)) {
            errors.push({ field: "port", message: "Invalid port (1-65535)" });
        }
    }

    if (data.listen && !isValidIP(data.listen)) {
        errors.push({ field: "listen", message: "Listen address must be a valid IP" });
    }

    const settings = data.settings || {};
    if (['vless', 'vmess'].includes(data.protocol)) {
        settings.clients?.forEach((c: any, i: number) => {
            if (c.id && !isUUID(c.id)) {
                errors.push({ field: "clients", message: `Client #${i+1}: Invalid UUID` });
            }
        });
    }

    if (data.protocol === 'shadowsocks' && !settings.password) {
        errors.push({ field: "password", message: "Shadowsocks password is required" });
    }

    return errors;
};

export const validateOutbound = (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!data.tag) errors.push({ field: "tag", message: "Tag is required" });
    
    const VALID_PROTOCOLS = ["vless", "vmess", "trojan", "shadowsocks", "socks", "http", "freedom", "blackhole", "dns", "wireguard", "loopback", "dokodemo-door", "tun"];
    if (!data.protocol || !VALID_PROTOCOLS.includes(data.protocol)) {
        errors.push({ field: "protocol", message: `Invalid protocol: ${data.protocol}` });
    }

    if (['vless', 'vmess', 'trojan', 'shadowsocks', 'socks', 'http'].includes(data.protocol)) {
        const s = data.settings || {};
        const addr = s.vnext?.[0]?.address || s.servers?.[0]?.address || s.address;
        const port = s.vnext?.[0]?.port || s.servers?.[0]?.port || s.port;

        if (!isValidAddress(addr)) {
            errors.push({ field: "address", message: "Valid remote address (IP/FQDN) is required" });
        }
        if (!isValidPort(port)) {
            errors.push({ field: "port", message: "Valid remote port is required" });
        }
    }

    const stream = data.streamSettings || {};
    if (stream.security === 'reality') {
        const r = stream.realitySettings || {};
        if (!r.publicKey) errors.push({ field: "reality", message: "Reality Public Key is missing" });
        if (r.shortId && r.shortId.length % 2 !== 0) {
            errors.push({ field: "reality", message: "ShortID must be hex (even length)" });
        }
    }

    return errors;
};

export const validateBalancer = (balancer: any): ValidationError[] => {
    const errors: ValidationError[] = [];
    if (!balancer.tag) errors.push({ field: "tag", message: "Balancer tag is required" });
    if (!balancer.selector || balancer.selector.length === 0) {
        errors.push({ field: "selector", message: "At least one selector prefix is required" });
    }
    return errors;
};

export const getDuplicateTags = (config: any): string[] => {
    const tags: string[] = [];
    if (config.inbounds) config.inbounds.forEach((i: any) => i.tag && tags.push(i.tag));
    if (config.outbounds) config.outbounds.forEach((o: any) => o.tag && tags.push(o.tag));
    
    const seen = new Set();
    const duplicates = new Set<string>();
    tags.forEach(t => {
        if (seen.has(t)) duplicates.add(t);
        seen.add(t);
    });
    return Array.from(duplicates);
};

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
        }
        return `${ob.protocol}_${addr}_${key}`.toLowerCase();
    };

    const currentId = getIdentity(current);
    if (currentId.includes("undefined")) return null;

    for (let i = 0; i < all.length; i++) {
        if (currentIndex !== null && i === currentIndex) continue;
        if (getIdentity(all[i]) === currentId) {
            return all[i].tag || `Outbound #${i + 1}`;
        }
    }
    return null;
};