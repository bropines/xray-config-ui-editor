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

    // 3. Проверка клиентов (VLESS/VMess/Trojan)
    if (['vless', 'vmess', 'trojan'].includes(data.protocol)) {
        // Раньше мы проверяли .length === 0, теперь разрешаем пустой массив для панелей
        if (!data.settings?.clients) {
            errors.push({ field: "clients", message: "Clients array is missing in settings" });
        }
        // Если массив есть, но он пустой — это ОК для динамического управления пользователями (Remnawave)
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

    // 2. Проверка прокси-протоколов
    if (['vless', 'vmess', 'trojan', 'shadowsocks', 'socks', 'http'].includes(data.protocol)) {
        const settings = data.settings || {};
        
        // Ищем адрес и порт везде, где они могут быть
        let addr = "";
        let port: number | string = 0;

        if (Array.isArray(settings.vnext) && settings.vnext[0]) {
            // Стандарт VLESS/VMess
            addr = settings.vnext[0].address;
            port = settings.vnext[0].port;
        } else if (Array.isArray(settings.servers) && settings.servers[0]) {
            // Стандарт Trojan/SS/Socks
            addr = settings.servers[0].address;
            port = settings.servers[0].port;
        } else {
            // ПЛОСКИЙ ФОРМАТ (твой случай)
            addr = settings.address;
            port = settings.port;
        }

        // Сама проверка накопленных данных
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
        errors.push({ field: "selector", message: "Selector cannot be empty (Node will crash!)" });
    }

    return errors;
};