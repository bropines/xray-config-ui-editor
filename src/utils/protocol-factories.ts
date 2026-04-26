import type { Inbound, Outbound } from '../store/configStore';

export const createDefaultInbound = (protocol: string = 'vless'): Inbound => {
    const tag = `in-${Math.floor(Math.random() * 1000)}`;
    const uuid = crypto.randomUUID();

    const base: Inbound = {
        tag,
        port: 10808,
        protocol,
        settings: {},
        streamSettings: { network: "tcp", security: "none", tcpSettings: {} },
        sniffing: { enabled: true, destOverride: ["http", "tls"] }
    };

    switch (protocol) {
        case 'vless':
            base.settings = { clients: [{ id: uuid, flow: "xtls-rprx-vision", level: 0 }], decryption: "none" };
            break;
        case 'vmess':
            base.settings = { clients: [{ id: uuid, level: 0 }] };
            break;
        case 'trojan':
            base.settings = { clients: [{ password: "password", level: 0 }] };
            break;
        case 'shadowsocks':
        case 'shadowsocks-2022':
            base.settings = { 
                method: protocol === 'shadowsocks-2022' ? "2022-blake3-aes-128-gcm" : "aes-256-gcm", 
                password: "password", 
                network: "tcp,udp" 
            };
            break;
        case 'hysteria2':
            base.settings = { up_mbps: 100, down_mbps: 100, users: [{ password: "password" }] };
            base.streamSettings = { network: "udp", security: "tls", tlsSettings: { certificates: [] } };
            break;
        case 'socks':
            base.settings = { auth: "noauth", udp: true };
            break;
        case 'tun':
            delete base.port;
            delete base.listen;
            delete base.streamSettings;
            base.settings = { mtu: 1500, stack: "system" };
            break;
    }

    return base;
};

export const createDefaultOutbound = (protocol: string = 'vless'): Outbound => {
    const tag = `out-${Math.floor(Math.random() * 1000)}`;
    
    const base: Outbound = {
        tag,
        protocol,
        settings: {},
        streamSettings: { network: "tcp", security: "none" }
    };

    switch (protocol) {
        case 'freedom':
            base.settings = { domainStrategy: "AsIs" };
            break;
        case 'blackhole':
            base.settings = { response: { type: "none" } };
            break;
        case 'dns':
            base.settings = { network: "tcp", address: "1.1.1.1", port: 53 };
            break;
        case 'wireguard':
            base.settings = {
                secretKey: "",
                address: ["10.0.0.2/32"],
                peers: [{ publicKey: "", endpoint: "" }],
                mtu: 1420
            };
            base.streamSettings = { network: "udp" };
            break;
        default:
            // Standard proxy protocols
            if (['vless', 'vmess', 'trojan', 'shadowsocks', 'shadowsocks-2022', 'socks', 'http', 'hysteria2'].includes(protocol)) {
                base.settings = {
                    vnext: protocol === 'vless' || protocol === 'vmess' ? [{
                        address: "example.com",
                        port: 443,
                        users: [{ id: crypto.randomUUID(), security: "auto" }]
                    }] : undefined,
                    servers: ['trojan', 'socks', 'http', 'shadowsocks', 'shadowsocks-2022'].includes(protocol) ? [{
                        address: "example.com",
                        port: 443,
                        users: [{ password: "password" }]
                    }] : undefined
                };
            }
            break;
    }

    return base;
};

export const createDefaultRoutingRule = () => ({
    type: "field",
    outboundTag: "proxy",
    domain: [] as string[],
    ip: [] as string[],
    protocol: [] as string[]
});

export const createDefaultBalancer = () => ({
    tag: "balancer-" + Math.floor(Math.random() * 1000),
    selector: [] as string[],
    strategy: { type: "random" }
});
