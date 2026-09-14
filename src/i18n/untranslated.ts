/**
 * Strings that render the same in every language, so `ru.ts` deliberately has
 * no entry for them. Two kinds live here:
 *
 *  - Names: brands, protocol vocabulary, config keys, units.
 *  - Examples: placeholder text inside inputs that shows the *shape* of a value
 *    (`geoip:cn...`, `nl.example.com`), which stays in its literal form because
 *    that is what the user has to type.
 *
 * `i18n.test.ts` asserts that every rendered string is either translated or
 * listed here, so nothing is missed by accident — the list is an explicit
 * decision per string, not a blanket exemption.
 */
export const UNTRANSLATED = new Set([
    // Brands, products, protocol and config vocabulary
    'Xray GUI', 'Xray Docs', 'Xray Config Editor', 'Remnawave', 'Telegram', 'WARP',
    'HEAD', 'RAW JSON', 'BEYOND REALITY', 'Fallback', 'Host', 'Authority', 'Seed',
    'ASCII', 'ID', 'MTU', 'Endpoint', 'Flow', 'Email', 'GeoSite', 'GeoIP',
    'Observatory', 'Burst Observatory', 'FakeDNS', 'Keep-Alive', 'Branch',
    'TCP Fast Open', 'TCP MPTCP', 'TCP User Timeout', 'gRPC API', 'Fingerprint',
    'Telegram Channel (@xcue_dev)', 'Bridge:', 'Portal:', 'Linux 5.6+',
    'Block Private',

    // Enum values written straight into the config — translating a dropdown
    // option would stop it matching what the JSON says.
    'AsIs', 'UseIP', 'UseIPv4', 'UseIPv6', 'UseIPv4v6', 'UseIPv6v4',
    'ForceIP', 'ForceIPv4', 'ForceIPv6', 'ForceIPv4v6', 'ForceIPv6v4',
    'IPIfNonMatch', 'IPOnDemand', 'vlessRoute',
    'leastLoad', 'leastPing', 'roundRobin', 'random',
    'aes-256-gcm', 'aes-128-gcm', 'chacha20-ietf-poly1305',
    'xchacha20-ietf-poly1305', '2022-blake3-aes-128-gcm',
    '2022-blake3-aes-256-gcm', '2022-blake3-chacha20-poly1305', 'xtls-rprx-vision',
    'AES-128-GCM', 'ChaCha20', 'HEX', 'RAND', 'BBR', 'Brutal', 'Reno', 'AUTO',

    // Transport and protocol names
    'WebSocket', 'XHTTP', 'SplitHTTP', 'gRPC', 'QUIC', 'mKCP', 'RAW',
    'HTTP Upgrade', 'NONE', 'REALITY', 'SRTP', 'WeChat', 'DTLS', 'WireGuard',
    'TProxy', 'Redirect', 'Packet-Up', 'Stream-Up', 'Stream-One',

    // Client names in the emulated-client list
    'Happ (iOS / Android)', 'v2rayNG (Android)', 'Shadowrocket (iOS)',
    'Clash.Meta / Mihomo', 'sing-box', 'FoXray', 'NekoBox',

    // Resolver brands
    'Cloudflare + Google', 'Quad9', 'AdGuard DNS', 'GeoIP (.dat)', 'GeoSite (.dat)',

    // Example values shown inside inputs
    '9bed733f-b58f-4d23-9ca2-6397e8debedf', 'NL-Fast-Balancer', 'NLMAIN', '^NL',
    'nl.example.com', 'cdn.example.com', 'host.com', 'example.com',
    'grpc.example.com', 'GunService', 'domain:mypanel.io', 'eth0 or wg0',
    'domain:mybank.example, regexp:.+\\.local$, geosite:category-ads',
    'geosite:cn, google.com...', 'geoip:cn...', '8.8.8.8 or https://...',
    '8.8.8.8, geoip:cn...', 'google, geosite:netflix...', '10.0.0.1/24, fd00::1/64',
    'engage.cloudflareclient.com:2408', 'another-cdn.com or IP', 'bbr, cubic...',
    'e.g. reverse-tag', 'e.g. portal.example.com', 'e.g. bypass-telegram',
    'e.g. Windows, iOS, Android', 'e.g. 10.0.26220 or 18.3',
    'e.g. MS-7E06 / iPhone 16 Pro', 'e.g. FoXray/1.4.2 (iPhone; iOS 17.5)',
    "e.g. 'vless-', 'node-', 'direct'...",
    'http, tls, fakedns', 'e.g. inbound-socks', 'e.g. bypass.com, internal.lan',
    'ads.x5.ru:443', 'e.g. ads.x5.ru, x5.ru', 'e.g. 392562c0c3f46bbe',
    'xNz35zN9FfsM7e27mvyPdLIEuzKnSpoqd7qjjJJHxIw', 'xNz35zN9FfsM...',
    'e.g. /var/log/xray/sslkey.log', 'e.g. bypass-direct', 'geoip:cn',
    'e.g. TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384',
    'e.g. 1.2.3.4 or 1.2.3.0/24', 'dns_inbound', 'e.g. google-dns',
    'e.g. user@xray.com', 'e.g. curl, self/', 'e.g. windows, linux',
    'e.g. Authorization: Bearer token', 'e.g. half',
    'e.g. HandlerService, LoggerService, StatsService',
    'proxy, proxy-2, proxy-3', 'fb-0, fb-1, fb-2', 'proxy-Amsterdam-1',
    'e.g. 100, 200...',
]);
