import validator from 'validator';
import {
    XrayConfigSchema,
    InboundSchema,
    OutboundSchema,
    WireguardOutboundSettingsSchema,
} from '../xray/schemas';
// The protocol -> settings-schema table these validators used to carry as a
// switch. Shared with the JSON editors' linter, so a form and a JSON view
// cannot disagree about what a settings block may hold.
import {
    inboundSettingsSchemaFor,
    outboundSettingsSchemaFor,
} from '../xray/schemas/settings-by-protocol';

import { isSnippetRef } from '../snippets';
import { t } from '../../i18n';

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
    const settingsSchema = inboundSettingsSchemaFor(protocol);
    const settingsResult = settingsSchema ? settingsSchema.safeParse(settings) : null;

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

    // A Remnawave snippet reference ({ "snippet": "NAME" }) is a placeholder
    // the panel replaces with real outbounds before a node ever sees it — it
    // has no tag and no protocol of its own, and linting it as an outbound
    // would report errors the user cannot fix here. See core/snippets.
    if (isSnippetRef(data)) return errors;

    if (!data.tag) errors.push({ field: 'tag', message: 'Tag is required' });

    // Exactly the names the loader registers for an outbound
    // (v26.3.27, v26.7.28, v26.9.9: infra/conf/xray.go outboundConfigLoader;
    // masque from v26.9.30/v26.10.10), compared lower-cased as the loader
    // does (infra/conf/loader.go:46). Anything else stops the config at
    // "unknown config id". This list used to accept `shadowsocks-2022` and
    // `hysteria2` — names no core knows — and inbound-only `tun`, `tunnel`
    // and `dokodemo-door`, while refusing `direct` and `block`, which every
    // line registers. Which line has masque is the version table's question.
    const OUTBOUND_PROTOCOLS = [
        'block', 'blackhole', 'loopback', 'direct', 'freedom', 'http', 'shadowsocks',
        'socks', 'vless', 'vmess', 'trojan', 'hysteria', 'masque', 'dns', 'wireguard',
    ];

    const protocolName = typeof data.protocol === 'string' ? data.protocol.toLowerCase() : '';
    if (protocolName === 'shadowsocks-2022') {
        errors.push({
            field: 'protocol',
            message: t("{name} is not a protocol Xray knows — its loader stops at \"unknown config id\" and the config will not load. The 2022 ciphers are methods of shadowsocks.", { name: data.protocol }),
        });
    } else if (!OUTBOUND_PROTOCOLS.includes(protocolName)) {
        errors.push({
            field: 'protocol',
            message: t("Xray has no outbound called \"{name}\": its loader stops at \"unknown config id\" and the config will not load.", { name: String(data.protocol ?? '') }),
        });
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
    // masque is here because the core checks it itself: Build() refuses the
    // config outright when `address` or `port` is missing.
    if (['vless', 'vmess', 'trojan', 'shadowsocks', 'socks', 'http', 'hysteria', 'masque'].includes(protocol)) {
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
    const settingsSchema = outboundSettingsSchemaFor(protocol);
    const settingsResult = settingsSchema ? settingsSchema.safeParse(settings) : null;

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
                    field: `peer_${index}_${String(fieldName)}`,
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
    // Remnawave profiles commonly reference a snippet from routing.balancers.
    // Such an entry has neither tag nor selector of its own, and reporting it
    // as an invalid balancer used to block the cloud push outright (see
    // configStore.saveToRemnawave). See core/snippets.
    if (isSnippetRef(balancer)) return [];
    if (balancer.tag === 'TORRENT') return [];
    const errors: string[] = [];
    if (!balancer.tag) errors.push('Balancer tag is missing');
    if (!balancer.selector || balancer.selector.length === 0) {
        errors.push(`Balancer [${balancer.tag}] has no selectors`);
    }
    return errors;
};

const RULE_CONDITIONS = [
    'domain', 'domains', 'ip', 'port', 'sourcePort', 'localPort', 'network',
    'source', 'sourceIP', 'localIP', 'user', 'inboundTag', 'protocol', 'attrs',
    'process', 'vlessRoute', 'localOS',
];

const isCondition = (value: unknown): boolean => {
    if (value === undefined || value === null || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value as object).length > 0;
    return true;
};

export const getCriticalRuleErrors = (rule: any): ValidationError[] => {
    const errs: ValidationError[] = [];

    // Same reasoning as validateOutbound: a snippet reference is a
    // placeholder, not a rule. Before this check it tripped both critical
    // rule errors ("no matchers", "no destination") at once, which painted
    // every imported Remnawave profile red and blocked the Routing modal
    // from closing. See core/snippets.
    if (isSnippetRef(rule)) return errs;

    // The conditions BuildCondition() counts (app/router/config.go, all
    // three supported tags; localOS from 26.9). A rule with none of them is
    // refused with "this rule has no effective fields" — but one with only
    // `process`, `localPort` or `vlessRoute` is perfectly good, and an empty
    // `domain: []` counts for nothing.
    const hasMatcher = RULE_CONDITIONS.some(key => isCondition(rule[key]));

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
