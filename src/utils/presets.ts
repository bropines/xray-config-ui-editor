import { generateUUID } from './generators';
import { generateX25519Keys } from './crypto';

export const getPresets = () => {
    const keys = generateX25519Keys();

    return [
        {
            name: "Minimal (Skeleton)",
            description: "Basic structure with Direct & Block outbounds. Best for starting from scratch.",
            icon: "Square",
            config: {
                log: { loglevel: "warning" },
                inbounds: [],
                outbounds: [
                    { tag: "direct", protocol: "freedom", settings: {} },
                    { tag: "block", protocol: "blackhole", settings: {} }
                ],
                routing: {
                    domainStrategy: "AsIs",
                    rules: [],
                    balancers: []
                }
            }
        },
        {
            name: "Standard Client",
            description: "Socks5/HTTP inbounds + VLESS Proxy. Includes basic routing rules.",
            icon: "Laptop",
            config: {
                log: { loglevel: "warning" },
                dns: {
                    servers: ["1.1.1.1", "8.8.8.8", "localhost"],
                    queryStrategy: "UseIP"
                },
                inbounds: [
                    {
                        tag: "socks-in",
                        port: 10808,
                        listen: "127.0.0.1",
                        protocol: "socks",
                        sniffing: { enabled: true, destOverride: ["http", "tls"] },
                        settings: { auth: "noauth", udp: true }
                    },
                    {
                        tag: "http-in",
                        port: 10809,
                        listen: "127.0.0.1",
                        protocol: "http",
                        sniffing: { enabled: true, destOverride: ["http", "tls"] },
                        settings: { auth: "noauth", udp: true }
                    }
                ],
                outbounds: [
                    {
                        tag: "proxy",
                        protocol: "vless",
                        settings: {
                            vnext: [{
                                address: "example.com",
                                port: 443,
                                users: [{ id: generateUUID(), encryption: "none", flow: "xtls-rprx-vision" }]
                            }]
                        },
                        streamSettings: {
                            network: "tcp",
                            security: "tls",
                            tlsSettings: { serverName: "example.com", fingerprint: "chrome" }
                        }
                    },
                    { tag: "direct", protocol: "freedom", settings: {} },
                    { tag: "block", protocol: "blackhole", settings: {} }
                ],
                routing: {
                    domainStrategy: "IPIfNonMatch",
                    rules: [
                        { type: "field", outboundTag: "block", domain: ["geosite:category-ads-all"] },
                        { type: "field", outboundTag: "direct", domain: ["geosite:cn"] },
                        { type: "field", outboundTag: "direct", ip: ["geoip:cn", "geoip:private"] },
                        { type: "field", outboundTag: "proxy", network: "tcp,udp" }
                    ]
                }
            }
        },
        {
            name: "Reality Server",
            description: "VLESS-Reality Inbound configuration for server side.",
            icon: "Server",
            config: {
                log: { loglevel: "warning", access: "/var/log/xray/access.log", error: "/var/log/xray/error.log" },
                inbounds: [
                    {
                        tag: "vless-reality",
                        port: 443,
                        protocol: "vless",
                        settings: {
                            clients: [{ id: generateUUID(), flow: "xtls-rprx-vision", email: "user1" }],
                            decryption: "none",
                            fallbacks: []
                        },
                        streamSettings: {
                            network: "tcp",
                            security: "reality",
                            realitySettings: {
                                show: false,
                                dest: "www.google.com:443",
                                serverNames: ["www.google.com", "google.com"],
                                privateKey: keys.privateKey,
                                shortIds: ["", Math.random().toString(16).substring(2, 10)] // random shortId manually logic here as simplified
                            }
                        },
                        sniffing: { enabled: true, destOverride: ["http", "tls", "quic"] }
                    }
                ],
                outbounds: [
                    { tag: "direct", protocol: "freedom", settings: {} },
                    { tag: "block", protocol: "blackhole", settings: {} }
                ]
            }
        }
    ];
};