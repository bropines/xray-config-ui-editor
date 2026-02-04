export interface ValidationError {
    field: string;
    message: string;
}

export const validateInbound = (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];

    // 1. Проверка тега
    if (!data.tag || data.tag.trim() === "") {
        errors.push({ field: "tag", message: "Tag is required" });
    }

    // 2. Проверка порта
    if (!data.port || data.port === 0) {
        errors.push({ field: "port", message: "Port is required" });
    } else if (typeof data.port === 'number' && (data.port < 1 || data.port > 65535)) {
        errors.push({ field: "port", message: "Port must be between 1 and 65535" });
    }

    // 3. Проверка клиентов (для VLESS/VMess/Trojan)
    if (['vless', 'vmess', 'trojan'].includes(data.protocol)) {
        if (!data.settings?.clients || data.settings.clients.length === 0) {
            errors.push({ field: "clients", message: "At least one client/user is required" });
        }
    }

    // 4. Проверка пароля (для Shadowsocks)
    if (data.protocol === 'shadowsocks') {
        if (!data.settings?.password) {
            errors.push({ field: "password", message: "Password is required for Shadowsocks" });
        }
    }

    return errors;
};

export const validateOutbound = (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];

    // 1. Проверка тега
    if (!data.tag || data.tag.trim() === "") {
        errors.push({ field: "tag", message: "Tag is required" });
    }

    // 2. Проверка удаленного сервера
    if (['vless', 'vmess', 'trojan', 'shadowsocks', 'socks', 'http'].includes(data.protocol)) {
        const settings = data.settings;
        let server;

        if (data.protocol === 'shadowsocks') {
            server = settings?.servers?.[0];
        } else if (data.protocol === 'socks' || data.protocol === 'http') {
             // Для socks/http outbound настройки плоские или в servers, зависит от версии, но в Xray обычно servers
             server = settings?.servers?.[0] || settings; 
        } else {
            // vless, vmess, trojan
            server = settings?.vnext?.[0];
        }

        if (!server?.address || server.address.trim() === "") {
            errors.push({ field: "address", message: "Remote address is required" });
        }
        if (!server?.port || server.port === 0) {
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
    
    // КРИТИЧЕСКАЯ ПРОВЕРКА: Селектор не должен быть пустым
    if (!balancer.selector || balancer.selector.length === 0) {
        errors.push({ field: "selector", message: "Selector cannot be empty (Node will crash!)" });
    }

    return errors;
};