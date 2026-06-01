// ============================================================
// Xray-core Zod Schema — DRY Primitives
// Reusable atomic types shared across all schema files
// ============================================================

import { z } from 'zod';

// --- Port / Port Range ---
// Used in: inbound.port, routing.port, routing.sourcePort, routing.localPort, etc.
// Supports: number (0-65535), string "env:VAR", string "1080", string "1080-1090"
export const PortSchema = z.union([
  z.number().int().min(0).max(65535),
  z.string(),
]);

// --- Domain Strategy (full set) ---
// Used in: freedom.domainStrategy, sockopt.domainStrategy, outbound.targetStrategy, wireguard.domainStrategy
export const DomainStrategyFullSchema = z.enum([
  'AsIs',
  'UseIP', 'UseIPv6v4', 'UseIPv6', 'UseIPv4v6', 'UseIPv4',
  'ForceIP', 'ForceIPv6v4', 'ForceIPv6', 'ForceIPv4v6', 'ForceIPv4',
]);

// --- Routing Domain Strategy ---
// Used in: routing.domainStrategy
export const RoutingDomainStrategySchema = z.enum([
  'AsIs',
  'IPIfNonMatch',
  'IPOnDemand',
]);

// --- DNS Query Strategy ---
// Used in: dns.queryStrategy, dns.servers[].queryStrategy
export const QueryStrategySchema = z.enum([
  'UseIP',
  'UseIPv4',
  'UseIPv6',
]);

// --- Network Type ---
// Used in: routing.rules.network, shadowsocks.network, etc.
export const NetworkTypeSchema = z.enum(['tcp', 'udp', 'tcp,udp']);

// --- User Level ---
// Reused in every protocol's user/level field
export const UserLevelSchema = z.number().int().min(0).optional();

// --- Domain List ---
// Reused in: routing.rules.domain, dns.servers.domains, sniffing.domainsExcluded
export const DomainListSchema = z.array(z.string());

// --- IP List ---
// Reused in: routing.rules.ip, dns.servers.expectIPs, dns.servers.unexpectedIPs
export const IPListSchema = z.array(z.string());

// --- Int32Range ---
// Reused in: fragment (length, delay, maxSplit), finalmask noises, etc.
// Can be a number or a range string like "100-200"
export const Int32RangeSchema = z.union([z.number(), z.string()]);

// --- Log Level ---
export const LogLevelSchema = z.enum([
  'debug', 'info', 'warning', 'error', 'none',
]);

// --- VLESS Flow ---
export const VlessFlowSchema = z.enum([
  '', 'xtls-rprx-vision', 'xtls-rprx-vision-udp443',
]);

// --- VMess Security ---
export const VmessSecuritySchema = z.enum([
  'auto', 'aes-128-gcm', 'chacha20-poly1305', 'none', 'zero',
]);

// --- Shadowsocks Methods ---
export const ShadowsocksMethodSchema = z.enum([
  '2022-blake3-aes-128-gcm',
  '2022-blake3-aes-256-gcm',
  '2022-blake3-chacha20-poly1305',
  'aes-256-gcm',
  'aes-128-gcm',
  'chacha20-poly1305',
  'chacha20-ietf-poly1305',
  'xchacha20-poly1305',
  'xchacha20-ietf-poly1305',
  'none',
  'plain',
]);

// --- Transport Network ---
// Used in: streamSettings.network
export const TransportNetworkSchema = z.enum([
  'raw', 'tcp', // tcp is alias for raw
  'xhttp', 'splithttp', // splithttp is alias for xhttp
  'mkcp', 'kcp', // kcp is alias for mkcp
  'grpc',
  'websocket', 'ws', // ws is alias for websocket
  'httpupgrade',
  'hysteria',
]);

// --- Transport Security ---
// Used in: streamSettings.security
export const TransportSecuritySchema = z.enum([
  'none', 'tls', 'reality',
]);

// --- TLS Fingerprint ---
export const TlsFingerprintSchema = z.enum([
  '', 'chrome', 'firefox', 'safari', 'ios', 'android',
  'edge', '360', 'qq',
  'random', 'randomized',
  'unsafe',
]);

// --- Certificate Usage ---
export const CertificateUsageSchema = z.enum([
  'encipherment', 'verify', 'issue',
]);

// --- Inbound Protocol Names ---
// Supports both new and legacy names
export const InboundProtocolSchema = z.enum([
  'vless', 'vmess', 'trojan', 'shadowsocks',
  'socks', 'http',
  'dokodemo-door', 'tunnel', // tunnel is new name for dokodemo-door
  'hysteria', 'wireguard', 'tun',
]);

// --- Outbound Protocol Names ---
// Supports both new and legacy names
export const OutboundProtocolSchema = z.enum([
  'vless', 'vmess', 'trojan', 'shadowsocks',
  'socks', 'http',
  'freedom', 'blackhole',
  'dns', 'loopback',
  'hysteria', 'wireguard',
]);

// --- Sniffing destOverride ---
export const DestOverrideSchema = z.enum([
  'http', 'tls', 'quic', 'fakedns', 'fakedns+others',
]);

// --- Routing Protocol ---
export const RoutingProtocolSchema = z.enum([
  'http', 'tls', 'bittorrent', 'quic',
]);

// --- API Services ---
export const ApiServiceSchema = z.enum([
  'HandlerService', 'LoggerService', 'StatsService',
  'RoutingService', 'ReflectionService',
]);

// --- Balancer Strategy Type ---
export const BalancerStrategyTypeSchema = z.enum([
  'random', 'roundRobin', 'leastPing', 'leastLoad',
]);

// --- WireGuard Domain Strategy (subset without AsIs/Use*) ---
export const WireguardDomainStrategySchema = z.enum([
  'ForceIPv6v4', 'ForceIPv6', 'ForceIPv4v6', 'ForceIPv4', 'ForceIP',
]);

// --- Sockopt tproxy ---
export const TproxySchema = z.enum(['redirect', 'tproxy', 'off']);

// --- Sockopt addressPortStrategy ---
export const AddressPortStrategySchema = z.enum([
  'none',
  'SrvPortOnly', 'SrvAddressOnly', 'SrvPortAndAddress',
  'TxtPortOnly', 'TxtAddressOnly', 'TxtPortAndAddress',
]);

// --- XHTTP Mode ---
export const XhttpModeSchema = z.enum([
  'auto', 'packet-up', 'stream-up', 'stream-one',
]);

// --- Hysteria Masquerade Type ---
export const HysteriaMasqueradeTypeSchema = z.enum([
  '', 'file', 'proxy', 'string',
]);

// --- FinalMask TCP Mask Type ---
export const TcpMaskTypeSchema = z.enum([
  'header-custom', 'fragment', 'sudoku',
]);

// --- FinalMask UDP Mask Type ---
export const UdpMaskTypeSchema = z.enum([
  'header-custom', 'header-dns', 'header-dtls', 'header-srtp',
  'header-utp', 'header-wechat', 'header-wireguard',
  'mkcp-original', 'mkcp-aes128gcm',
  'noise', 'salamander', 'sudoku', 'xdns', 'xicmp', 'realm',
]);

// --- FinalMask QUIC Congestion ---
export const QuicCongestionSchema = z.enum([
  'reno', 'bbr', 'brutal', 'force-brutal',
]);

// --- FinalMask BBR Profile ---
export const BbrProfileSchema = z.enum([
  'conservative', 'standard', 'aggressive',
]);
