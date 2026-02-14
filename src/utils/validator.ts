export interface ValidationError {
    field: string;
    message: string;
}

export const validateInbound = (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];
    if (!data.tag || data.tag.trim() === "") {
        errors.push({ field: "tag", message: "Tag is required" });
    }
    if (!data.port || data.port === 0) {
        errors.push({ field: "port", message: "Port is required" });
    } else if (typeof data.port === 'number' && (data.port < 1 || data.port > 65535)) {
        errors.push({ field: "port", message: "Port must be between 1 and 65535" });
    }
    if (['vless', 'vmess', 'trojan'].includes(data.protocol)) {
        if (!data.settings?.clients) {
            errors.push({ field: "clients", message: "Clients array is missing" });
        }
    }
    if (data.protocol === 'shadowsocks') {
        if (!data.settings?.password) {
            errors.push({ field: "password", message: "Password is required for Shadowsocks" });
        }
    }
    return errors;
};

export const validateOutbound = (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!data.tag || data.tag.trim() === "") {
        errors.push({ field: "tag", message: "Tag is required" });
    }

    const VALID_PROTOCOLS = [
        "vless", "vmess", "trojan", "shadowsocks", "socks", "http",
        "freedom", "blackhole", "dns", "wireguard", "loopback", "dokodemo-door"
    ];

    if (!data.protocol || !VALID_PROTOCOLS.includes(data.protocol)) {
        errors.push({ 
            field: "protocol", 
            message: `Invalid protocol: "${data.protocol}". Supported: ${VALID_PROTOCOLS.join(', ')}` 
        });
        return errors; 
    }
    // ----------------------------------------------------

    if (['vless', 'vmess', 'trojan', 'shadowsocks', 'socks', 'http'].includes(data.protocol)) {
        const settings = data.settings || {};
        let addr = "";
        let port: number | string = 0;

        if (Array.isArray(settings.vnext) && settings.vnext[0]) {
            addr = settings.vnext[0].address;
            port = settings.vnext[0].port;
        } else if (Array.isArray(settings.servers) && settings.servers[0]) {
            addr = settings.servers[0].address;
            port = settings.servers[0].port;
        } else {
            addr = settings.address;
            port = settings.port;
        }

        if (!addr || addr.toString().trim() === "") {
            errors.push({ field: "address", message: "Remote address is required" });
        }
        if (!port || port === 0 || port === "0") {
            errors.push({ field: "port", message: "Remote port is required" });
        }
    }

    return errors;
};

export const validateBalancer = (balancer: any): ValidationError[] => {
    const errors: ValidationError[] = [];
    if (!balancer.tag || balancer.tag.trim() === "") {
        errors.push({ field: "tag", message: "Balancer tag is required" });
    }
    if (!balancer.selector || balancer.selector.length === 0) {
        errors.push({ field: "selector", message: "Selector cannot be empty" });
    }
    return errors;
};

// --- ПРОВЕРКА ДУБЛИКАТОВ ---
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
            key = srv.user || srv.pass || "";
        }
        return `${ob.protocol}_${addr}_${key}`.toLowerCase();
    };

    const currentId = getIdentity(current);
    for (let i = 0; i < all.length; i++) {
        if (currentIndex !== null && i === currentIndex) continue;
        if (getIdentity(all[i]) === currentId) {
            return all[i].tag || `Outbound #${i + 1}`;
        }
    }
    return null;
};