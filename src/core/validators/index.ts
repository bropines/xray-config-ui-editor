import validator from 'validator';
import {
    XrayConfigSchema,
    InboundSchema,
    OutboundSchema,
    VlessInboundSettingsSchema,
    VmessInboundSettingsSchema,
    TrojanInboundSettingsSchema,
    ShadowsocksInboundSettingsSchema,
    SocksInboundSettingsSchema,
    HttpInboundSettingsSchema,
    TunnelInboundSettingsSchema,
    HysteriaInboundSettingsSchema,
    WireguardInboundSettingsSchema,
    TunInboundSettingsSchema,
    VlessOutboundSettingsSchema,
    VmessOutboundSettingsSchema,
    TrojanOutboundSettingsSchema,
    ShadowsocksOutboundSettingsSchema,
    SocksOutboundSettingsSchema,
    HttpOutboundSettingsSchema,
    FreedomOutboundSettingsSchema,
    BlackholeOutboundSettingsSchema,
    DnsOutboundSettingsSchema,
    LoopbackOutboundSettingsSchema,
    HysteriaOutboundSettingsSchema,
    WireguardOutboundSettingsSchema
} from '../xray/schemas';

const { isIP, isFQDN, isPort, isUUID } = validator;

export interface ValidationError {
    field: string;
    message: string;
}

export const isValidIP = (ip: string) => isIP(ip);

export const isValidDomain = (domain: string) => {
    if (!domain) return false;
    return isFQDN(domain, { require_tld: false, allow_underscores: true });
};

export const isValidAddress = (addr: string) => isValidIP(addr) || isValidDomain(addr);

export const isValidPort = (port: number | string) => {
    const p = typeof port === 'string' ? parseInt(port) : port;
    if (p === 0) return false;
    return isPort(p.toString());
};

export const isValidUUID = (id: string) => isUUID(id);

export const isValidHostDestination = (dest: string): boolean => {
    if (!dest) return false;
    if (isValidIP(dest)) return true;
    if (isValidDomain(dest)) return true;
    if (Array.isArray(dest)) return (dest as string[]).every((d) => isValidHostDestination(d));
    return false;
};

// --- Validators ---

export const validateInbound = (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Basic UI Validation checks
    if (!data.tag) errors.push({ field: 'tag', message: 'Tag is required' });
    if (!data.protocol) errors.push({ field: 'protocol', message: 'Protocol is required' });
    if (data.protocol !== 'tun' && !isValidPort(data.port)) {
        errors.push({ field: 'port', message: 'Invalid port number' });
    }

    // Schema Validation via Zod
    const mainResult = InboundSchema.safeParse(data);
    if (!mainResult.success) {
        mainResult.error.issues.forEach(issue => {
            const field = issue.path.join('.');
            if (field === 'tag' || field === 'protocol' || field === 'port') return;
            errors.push({ field, message: issue.message });
        });
    }

    // Protocol settings validation
    const protocol = data.protocol;
    const settings = data.settings || {};
    let settingsResult: any = null;

    switch (protocol) {
        case 'vless':
            settingsResult = VlessInboundSettingsSchema.safeParse(settings);
            break;
        case 'vmess':
            settingsResult = VmessInboundSettingsSchema.safeParse(settings);
            break;
        case 'trojan':
            settingsResult = TrojanInboundSettingsSchema.safeParse(settings);
            break;
        case 'shadowsocks':
        case 'shadowsocks-2022':
            settingsResult = ShadowsocksInboundSettingsSchema.safeParse(settings);
            break;
        case 'socks':
            settingsResult = SocksInboundSettingsSchema.safeParse(settings);
            break;
        case 'http':
            settingsResult = HttpInboundSettingsSchema.safeParse(settings);
            break;
        case 'dokodemo-door':
        case 'tunnel':
            settingsResult = TunnelInboundSettingsSchema.safeParse(settings);
            break;
        case 'hysteria':
            settingsResult = HysteriaInboundSettingsSchema.safeParse(settings);
            break;
        case 'wireguard':
            settingsResult = WireguardInboundSettingsSchema.safeParse(settings);
            break;
        case 'tun':
            settingsResult = TunInboundSettingsSchema.safeParse(settings);
            break;
    }

    if (settingsResult && !settingsResult.success) {
        settingsResult.error.issues.forEach((issue: any) => {
            errors.push({
                field: `settings.${issue.path.join('.')}`,
                message: issue.message
            });
        });
    }

    return errors;
};

export const validateOutbound = (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!data.tag) errors.push({ field: 'tag', message: 'Tag is required' });

    const VALID_PROTOCOLS = [
        'vless', 'vmess', 'trojan', 'shadowsocks', 'socks', 'http',
        'freedom', 'blackhole', 'dns', 'wireguard', 'loopback',
        'dokodemo-door', 'tunnel', 'tun', 'hysteria', 'hysteria2', 'shadowsocks-2022',
    ];

    if (!VALID_PROTOCOLS.includes(data.protocol)) {
        errors.push({ field: 'protocol', message: `Protocol "${data.protocol}" is not supported.` });
    }

    // Schema Validation via Zod
    const mainResult = OutboundSchema.safeParse(data);
    if (!mainResult.success) {
        mainResult.error.issues.forEach(issue => {
            const field = issue.path.join('.');
            if (field === 'tag' || field === 'protocol') return;
            errors.push({ field, message: issue.message });
        });
    }

    const protocol = data.protocol;
    const settings = data.settings || {};

    // Validate server address and port for proxy protocols
    if (['vless', 'vmess', 'trojan', 'shadowsocks', 'shadowsocks-2022', 'socks', 'http', 'hysteria', 'hysteria2'].includes(protocol)) {
        let address = '';
        let port = 0;

        if (settings.vnext?.[0]) {
            address = settings.vnext[0].address;
            port = settings.vnext[0].port;
        } else if (settings.servers?.[0]) {
            address = settings.servers[0].address;
            port = settings.servers[0].port;
        } else if (settings.address) {
            address = settings.address;
            port = settings.port;
        }

        if (!address || !isValidAddress(address)) {
            errors.push({ field: 'address', message: 'Invalid server address' });
        }
        if (!port || !isValidPort(port)) {
            errors.push({ field: 'port', message: 'Invalid server port' });
        }
    }

    // Protocol settings validation
    let settingsResult: any = null;
    switch (protocol) {
        case 'vless':
            settingsResult = VlessOutboundSettingsSchema.safeParse(settings);
            break;
        case 'vmess':
            settingsResult = VmessOutboundSettingsSchema.safeParse(settings);
            break;
        case 'trojan':
            settingsResult = TrojanOutboundSettingsSchema.safeParse(settings);
            break;
        case 'shadowsocks':
        case 'shadowsocks-2022':
            settingsResult = ShadowsocksOutboundSettingsSchema.safeParse(settings);
            break;
        case 'socks':
            settingsResult = SocksOutboundSettingsSchema.safeParse(settings);
            break;
        case 'http':
            settingsResult = HttpOutboundSettingsSchema.safeParse(settings);
            break;
        case 'freedom':
            settingsResult = FreedomOutboundSettingsSchema.safeParse(settings);
            break;
        case 'blackhole':
            settingsResult = BlackholeOutboundSettingsSchema.safeParse(settings);
            break;
        case 'dns':
            settingsResult = DnsOutboundSettingsSchema.safeParse(settings);
            break;
        case 'loopback':
            settingsResult = LoopbackOutboundSettingsSchema.safeParse(settings);
            break;
        case 'hysteria':
        case 'hysteria2':
            settingsResult = HysteriaOutboundSettingsSchema.safeParse(settings);
            break;
        case 'wireguard':
            settingsResult = WireguardOutboundSettingsSchema.safeParse(settings);
            break;
    }

    if (settingsResult && !settingsResult.success) {
        settingsResult.error.issues.forEach((issue: any) => {
            errors.push({
                field: `settings.${issue.path.join('.')}`,
                message: issue.message
            });
        });
    }

    // Stream settings custom rules (matching previous manual logic)
    const stream = data.streamSettings || {};
    const reality = stream.security === 'reality' ? (stream.realitySettings || {}) : null;

    if (reality) {
        if (!reality.publicKey) errors.push({ field: 'reality', message: 'Reality Public Key is required' });
        if (reality.shortId && reality.shortId.length % 2 !== 0) {
            errors.push({ field: 'reality', message: 'ShortID must be hex string with even length' });
        }
    }

    if (stream.network === 'xhttp') {
        const x = stream.xhttpSettings || {};
        if (x.mode === 'stream-up' && stream.security === 'none') {
            errors.push({ field: 'xhttp', message: 'WARNING: stream-up mode is intended for TLS/REALITY.' });
        }
    }

    return errors;
};

export const validateWireguard = (data: any): ValidationError[] => {
    const errors: ValidationError[] = [];
    const settings = data.settings || {};

    if (!settings.secretKey) {
        errors.push({ field: 'secretKey', message: 'Secret Key is required' });
    }

    const result = WireguardOutboundSettingsSchema.safeParse(settings);
    if (!result.success) {
        result.error.issues.forEach(issue => {
            const path = issue.path;
            if (path[0] === 'peers' && typeof path[1] === 'number') {
                const index = path[1];
                const fieldName = path[2];
                errors.push({
                    field: `peer_${index}_${fieldName}`,
                    message: issue.message
                });
            } else {
                errors.push({
                    field: path.join('.'),
                    message: issue.message
                });
            }
        });
    }

    if (!settings.peers || settings.peers.length === 0) {
        errors.push({ field: 'peers', message: 'At least one peer is required' });
    }

    return errors;
};

export const validateBalancer = (balancer: any): string[] => {
    if (balancer.tag === 'TORRENT') return [];
    const errors: string[] = [];
    if (!balancer.tag) errors.push('Balancer tag is missing');
    if (!balancer.selector || balancer.selector.length === 0) {
        errors.push(`Balancer [${balancer.tag}] has no selectors`);
    }
    return errors;
};

export const getCriticalRuleErrors = (rule: any): ValidationError[] => {
    const errs: ValidationError[] = [];
    const hasMatcher =
        rule.domain || rule.ip || rule.port || rule.sourcePort ||
        rule.network || rule.source || rule.user || rule.inboundTag ||
        rule.protocol || rule.attrs;

    if (!hasMatcher) errs.push({ field: 'matchers', message: 'Rule has no matchers.' });
    if (!rule.outboundTag && !rule.balancerTag) errs.push({ field: 'target', message: 'Rule must have a destination.' });
    return errs;
};

export const validateRule = (rule: any): ValidationError[] => getCriticalRuleErrors(rule);

export const lintRule = (_rule: any): ValidationError[] => [];

export const checkOutboundDuplication = (current: any, all: any[], currentIndex: number | null) => {
    const getIdentity = (o: any) => {
        const stream = o.streamSettings || {};
        let address = '';
        let port = 0;
        if (o.settings?.vnext?.[0]) { address = o.settings.vnext[0].address; port = o.settings.vnext[0].port; }
        else if (o.settings?.servers?.[0]) { address = o.settings.servers[0].address; port = o.settings.servers[0].port; }
        else if (o.settings?.address) { address = o.settings.address; port = o.settings.port; }
        return `${o.protocol}-${address}:${port}-${stream.security}-${stream.network}`;
    };
    const currentId = getIdentity(current);
    for (let i = 0; i < all.length; i++) {
        if (currentIndex !== null && i === currentIndex) continue;
        if (getIdentity(all[i]) === currentId) return all[i].tag || `Outbound #${i + 1}`;
    }
    return null;
};

export const checkInboundDuplication = (current: any, all: any[], currentIndex: number | null) => {
    for (let i = 0; i < all.length; i++) {
        if (currentIndex !== null && i === currentIndex) continue;
        if (all[i].tag === current.tag) return all[i].tag;
    }
    return null;
};

export const validateFullConfig = (config: any): ValidationError[] => {
    const errors: ValidationError[] = [];
    if (!config || typeof config !== 'object') {
        errors.push({ field: 'config', message: 'Config must be an object' });
        return errors;
    }

    // 1. Root structure validation via Zod
    const result = XrayConfigSchema.safeParse(config);
    if (!result.success) {
        result.error.issues.forEach(issue => {
            errors.push({
                field: issue.path.join('.'),
                message: issue.message
            });
        });
    }

    // 2. Validate all Inbounds
    const inbounds = config.inbounds;
    if (Array.isArray(inbounds)) {
        inbounds.forEach((inbound: any, index: number) => {
            const inboundErrors = validateInbound(inbound);
            inboundErrors.forEach(err => {
                errors.push({
                    field: `inbounds.[${index}].${err.field}`,
                    message: err.message
                });
            });
        });
    }

    // 3. Validate all Outbounds
    const outbounds = config.outbounds;
    if (Array.isArray(outbounds)) {
        outbounds.forEach((outbound: any, index: number) => {
            const outboundErrors = validateOutbound(outbound);
            const wgErrors = outbound.protocol === 'wireguard' ? validateWireguard(outbound) : [];
            const allOutboundErrors = [...outboundErrors, ...wgErrors];
            
            allOutboundErrors.forEach(err => {
                errors.push({
                    field: `outbounds.[${index}].${err.field}`,
                    message: err.message
                });
            });
        });
    }

    // 4. Validate routing rules and balancers
    const routing = config.routing || {};
    const rules = routing.rules || [];
    rules.forEach((rule: any, index: number) => {
        const ruleErrors = validateRule(rule);
        ruleErrors.forEach(err => {
            errors.push({
                field: `routing.rules.[${index}].${err.field}`,
                message: err.message
            });
        });
    });

    const balancers = routing.balancers || [];
    balancers.forEach((balancer: any, index: number) => {
        const balancerErrors = validateBalancer(balancer);
        balancerErrors.forEach(msg => {
            errors.push({
                field: `routing.balancers.[${index}]`,
                message: msg
            });
        });
    });

    return errors;
};
