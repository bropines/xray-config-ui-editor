// Auto-generated TypeScript types for Xray-core configuration

export type NameServerConfigOrString = string | NameServerConfig;

export interface APIConfig {
    tag?: string;
    listen?: string;
    services?: string[];
}

export interface NoneResponse {
}

export interface HTTPResponse {
}

export interface BlackholeConfig {
    response?: any;
}

export interface Address {
}

export interface PortRange {
    From?: number;
    To?: number;
}

export interface PortList {
    Range?: (number | string)[];
}

export interface User {
    email?: string;
    level?: number;
}

/**
 * Int32Range deserializes from "1-2" or 1, so can deserialize from both int and number.
 * Negative integers can be passed as sentinel values, but do not parse as ranges.
 * Value will be exchanged if From > To, use .Left and .Right to get original value if need.
 */
export interface Int32Range {
    Left?: number;
    Right?: number;
    From?: number;
    To?: number;
}

export interface NameServerConfig {
    address?: string;
    clientIp?: string;
    port?: number;
    skipFallback?: boolean;
    domains?: string | string[];
    expectedIPs?: string | string[];
    expectIPs?: string | string[];
    queryStrategy?: string;
    tag?: string;
    timeoutMs?: number;
    disableCache?: boolean;
    serveStale?: boolean;
    serveExpiredTTL?: number;
    finalQuery?: boolean;
    unexpectedIPs?: string | string[];
}

/**
 * DNSConfig is a JSON serializable object for dns.Config
 */
export interface DNSConfig {
    servers?: NameServerConfigOrString[];
    hosts?: Record<string, string | string[] | HostAddress>;
    clientIp?: string;
    tag?: string;
    queryStrategy?: string;
    disableCache?: boolean;
    serveStale?: boolean;
    serveExpiredTTL?: number;
    disableFallback?: boolean;
    disableFallbackIfMatch?: boolean;
    enableParallelQuery?: boolean;
    useSystemHosts?: boolean;
}

export interface HostAddress {
    addr?: string;
    addrs?: string[];
}

export interface HostsWrapper {
    Hosts?: Record<string, HostAddress>;
}

export interface DNSOutboundRuleConfig {
    action?: string;
    qType?: number | string;
    domain?: string | string[];
    rCode?: number;
}

export interface DNSOutboundConfig {
    rewriteNetwork?: string;
    rewriteAddress?: string;
    rewritePort?: number;
    network?: string;
    address?: string;
    port?: number;
    userLevel?: number;
    rules?: DNSOutboundRuleConfig[];
    nonIPQuery?: string;
    blockTypes?: number[];
}

export interface DokodemoConfig {
    allowedNetwork?: string | string[];
    rewriteAddress?: string;
    rewritePort?: number;
    network?: string | string[];
    address?: string;
    port?: number;
    portMap?: Record<string, string>;
    followRedirect?: boolean;
    userLevel?: number;
}

export interface FakeDNSPoolElementConfig {
    ipPool?: string;
    poolSize?: number;
}

export type FakeDNSConfig = FakeDNSPoolElementConfig | FakeDNSPoolElementConfig[];

export interface FakeDNSPostProcessingStage {
}

export interface FreedomConfig {
    targetStrategy?: string;
    domainStrategy?: string;
    redirect?: string;
    userLevel?: number;
    fragment?: Fragment;
    noise?: Noise;
    noises?: Noise[];
    proxyProtocol?: number;
    ipsBlocked?: string | string[];
    finalRules?: FreedomFinalRuleConfig[];
}

export interface Fragment {
    packets?: string;
    length?: Int32Range;
    interval?: Int32Range;
    maxSplit?: Int32Range;
}

export interface Noise {
    type?: string;
    packet?: string;
    delay?: Int32Range;
    applyTo?: string;
}

export interface FreedomFinalRuleConfig {
    action?: string;
    network?: string | string[];
    port?: number | string;
    ip?: string | string[];
    blockDelay?: Int32Range;
}

export interface GeodataAssetConfig {
    url?: string;
    file?: string;
}

export interface GeodataConfig {
    cron?: string;
    outbound?: string;
    assets?: GeodataAssetConfig[];
}

export interface HTTPAccount {
    user?: string;
    pass?: string;
}

export interface HTTPServerConfig {
    users?: HTTPAccount[];
    accounts?: HTTPAccount[];
    allowTransparent?: boolean;
    userLevel?: number;
}

export interface HTTPRemoteConfig {
    address?: string;
    port?: number;
    users?: any[];
}

export interface HTTPClientConfig {
    address?: string;
    port?: number;
    level?: number;
    email?: string;
    user?: string;
    pass?: string;
    servers?: HTTPRemoteConfig[];
    headers?: Record<string, string>;
}

export interface HysteriaClientConfig {
    version?: number;
    address?: string;
    port?: number;
}

export interface HysteriaUserConfig {
    auth?: string;
    level?: number;
    email?: string;
}

export interface HysteriaServerConfig {
    version?: number;
    users?: HysteriaUserConfig[];
    clients?: HysteriaUserConfig[];
}

export interface JSONConfigLoader {
    cache?: Record<string, any>;
    idKey?: string;
    configKey?: string;
}

export interface LogConfig {
    access?: string;
    error?: string;
    loglevel?: string;
    dnsLog?: boolean;
    maskAddress?: string;
}

export interface LoopbackConfig {
    inboundTag?: string;
    sniffing?: SniffingConfig;
}

export interface MetricsConfig {
    tag?: string;
    listen?: string;
}

export interface ObservatoryConfig {
    subjectSelector?: string[];
    probeURL?: string;
    probeInterval?: number | string;
    enableConcurrency?: boolean;
}

export interface BurstObservatoryConfig {
    subjectSelector?: string[];
    pingConfig?: healthCheckSettings;
}

export interface Policy {
    handshake?: number;
    connIdle?: number;
    uplinkOnly?: number;
    downlinkOnly?: number;
    statsUserUplink?: boolean;
    statsUserDownlink?: boolean;
    statsUserOnline?: boolean;
    bufferSize?: number;
}

export interface SystemPolicy {
    statsInboundUplink?: boolean;
    statsInboundDownlink?: boolean;
    statsOutboundUplink?: boolean;
    statsOutboundDownlink?: boolean;
}

export interface PolicyConfig {
    levels?: Record<number, Policy>;
    system?: SystemPolicy;
}

export interface BridgeConfig {
    tag?: string;
    domain?: string;
}

export interface PortalConfig {
    tag?: string;
    domain?: string;
}

export interface ReverseConfig {
    bridges?: BridgeConfig[];
    portals?: PortalConfig[];
}

/**
 * StrategyConfig represents a strategy config
 */
export interface StrategyConfig {
    type?: string;
    settings?: any;
}

export interface BalancingRule {
    tag?: string;
    selector?: string | string[];
    strategy?: StrategyConfig;
    fallbackTag?: string;
}

export interface RouterConfig {
    rules?: any[];
    domainStrategy?: string;
    balancers?: BalancingRule[];
}

export interface RouterRule {
    ruleTag?: string;
    outboundTag?: string;
    balancerTag?: string;
}

export interface WebhookRuleConfig {
    url?: string;
    deduplication?: number;
    headers?: Record<string, string>;
}

export interface RawFieldRule {
    RouterRule?: string;
    domains?: string | string[];
    ip?: string | string[];
    port?: number | string;
    network?: string | string[];
    sourceIP?: string | string[];
    source?: string | string[];
    sourcePort?: number | string;
    user?: string | string[];
    vlessRoute?: number | string;
    inboundTag?: string | string[];
    protocol?: string | string[];
    attrs?: Record<string, string>;
    localIP?: string | string[];
    localPort?: number | string;
    process?: string | string[];
    webhook?: WebhookRuleConfig;
}

export interface strategyEmptyConfig {
}

export interface strategyLeastLoadConfig {
    costs?: number[];
    baselines?: (number | string)[];
    expected?: number;
    maxRTT?: number | string;
    tolerance?: number;
}

/**
 * healthCheckSettings holds settings for health Checker
 */
export interface healthCheckSettings {
    destination?: string;
    connectivity?: string;
    interval?: number | string;
    sampling?: number;
    timeout?: number | string;
    httpMethod?: string;
}

export interface ShadowsocksUserConfig {
    method?: string;
    password?: string;
    level?: number;
    email?: string;
    address?: string;
    port?: number;
}

export interface ShadowsocksServerConfig {
    method?: string;
    password?: string;
    level?: number;
    email?: string;
    users?: ShadowsocksUserConfig[];
    clients?: ShadowsocksUserConfig[];
    network?: string | string[];
}

export interface ShadowsocksServerTarget {
    address?: string;
    port?: number;
    level?: number;
    email?: string;
    method?: string;
    password?: string;
}

export interface ShadowsocksClientConfig {
    address?: string;
    port?: number;
    level?: number;
    email?: string;
    method?: string;
    password?: string;
    servers?: ShadowsocksServerTarget[];
}

export interface SocksAccount {
    user?: string;
    pass?: string;
}

export interface SocksServerConfig {
    auth?: string;
    users?: SocksAccount[];
    accounts?: SocksAccount[];
    udp?: boolean;
    ip?: string;
    userLevel?: number;
}

export interface SocksRemoteConfig {
    address?: string;
    port?: number;
    users?: any[];
}

export interface SocksClientConfig {
    address?: string;
    port?: number;
    level?: number;
    email?: string;
    user?: string;
    pass?: string;
    servers?: SocksRemoteConfig[];
}

export interface TCPItem {
    delay?: Int32Range;
    rand?: number;
    randRange?: Int32Range;
    capture?: string;
    type?: string;
    reuse?: string;
    transform?: CustomTransform;
    packet?: any;
}

export interface HeaderCustomTCP {
    clients?: TCPItem[][];
    servers?: TCPItem[][];
    errors?: TCPItem[][];
}

export interface FragmentMask {
    packets?: string;
    length?: Int32Range;
    delay?: Int32Range;
    lengths?: Int32Range[];
    delays?: Int32Range[];
    maxSplit?: Int32Range;
}

export interface NoiseItem {
    rand?: Int32Range;
    randRange?: Int32Range;
    type?: string;
    packet?: any;
    delay?: Int32Range;
}

export interface NoiseMask {
    reset?: Int32Range;
    noise?: NoiseItem[];
}

export interface UDPItem {
    rand?: number;
    randRange?: Int32Range;
    capture?: string;
    type?: string;
    reuse?: string;
    transform?: CustomTransform;
    packet?: any;
}

export interface CustomTransform {
    op?: string;
    args?: CustomTransformArg[];
}

export interface CustomTransformArg {
    type?: string;
    bytes?: any;
    u64?: number;
    reuse?: string;
    metadata?: string;
    transform?: CustomTransform;
}

export interface HeaderCustomUDP {
    mode?: string;
    client?: UDPItem[];
    server?: UDPItem[];
}

export interface MkcpLegacy {
    header?: string;
    value?: string;
}

export interface Salamander {
    password?: string;
    packetSize?: Int32Range;
}

export interface Sudoku {
    password?: string;
    ascii?: string;
    customTable?: string;
    custom_table?: string;
    customTables?: string[];
    custom_tables?: string[];
    paddingMin?: number;
    padding_min?: number;
    paddingMax?: number;
    padding_max?: number;
}

export interface Xdns {
    domain?: any;
    domains?: string[];
    resolvers?: string[];
}

export interface Xicmp {
    dgram?: boolean;
    ips?: string[];
}

export interface Realm {
    url?: string;
    stunServers?: string[];
    tlsConfig?: TLSConfig;
}

export interface Mask {
    type?: string;
    settings?: any;
}

export interface QuicParamsConfig {
    congestion?: string;
    debug?: boolean;
    bbrProfile?: string;
    brutalUp?: string;
    brutalDown?: string;
    udpHop?: UdpHop;
    initStreamReceiveWindow?: number;
    maxStreamReceiveWindow?: number;
    initConnectionReceiveWindow?: number;
    maxConnectionReceiveWindow?: number;
    maxIdleTimeout?: number;
    keepAlivePeriod?: number;
    disablePathMTUDiscovery?: boolean;
    maxIncomingStreams?: number;
}

export interface FinalMask {
    tcp?: Mask[];
    udp?: Mask[];
    quicParams?: QuicParamsConfig;
}

export interface StreamConfig {
    address?: string;
    port?: number;
    method?: string;
    network?: string;
    security?: string;
    finalmask?: FinalMask;
    tlsSettings?: TLSConfig;
    realitySettings?: REALITYConfig;
    rawSettings?: TCPConfig;
    tcpSettings?: TCPConfig;
    xhttpSettings?: SplitHTTPConfig;
    splithttpSettings?: SplitHTTPConfig;
    kcpSettings?: KCPConfig;
    grpcSettings?: GRPCConfig;
    wsSettings?: WebSocketConfig;
    httpupgradeSettings?: HttpUpgradeConfig;
    hysteriaSettings?: HysteriaConfig;
    sockopt?: SocketConfig;
    flow?: string;
}

export interface ProxyConfig {
    tag?: string;
    transportLayer?: boolean;
}

export interface NoOpConnectionAuthenticator {
}

export interface AuthenticatorRequest {
    version?: string;
    method?: string;
    path?: string | string[];
    headers?: Record<string, string | string[]>;
}

export interface AuthenticatorResponse {
    version?: string;
    status?: string;
    reason?: string;
    headers?: Record<string, string | string[]>;
}

export interface Authenticator {
    request?: AuthenticatorRequest;
    response?: AuthenticatorResponse;
}

export interface TCPConfig {
    header?: any;
    acceptProxyProtocol?: boolean;
}

export interface SplitHTTPConfig {
    host?: string;
    path?: string;
    mode?: string;
    headers?: Record<string, string>;
    xPaddingBytes?: Int32Range;
    xPaddingObfsMode?: boolean;
    xPaddingKey?: string;
    xPaddingHeader?: string;
    xPaddingPlacement?: string;
    xPaddingMethod?: string;
    uplinkHTTPMethod?: string;
    sessionIDPlacement?: string;
    sessionIDKey?: string;
    sessionIDTable?: string;
    sessionIDLength?: Int32Range;
    seqPlacement?: string;
    seqKey?: string;
    uplinkDataPlacement?: string;
    uplinkDataKey?: string;
    uplinkChunkSize?: Int32Range;
    noGRPCHeader?: boolean;
    noSSEHeader?: boolean;
    scMaxEachPostBytes?: Int32Range;
    scMinPostsIntervalMs?: Int32Range;
    scMaxBufferedPosts?: number;
    scStreamUpServerSecs?: Int32Range;
    serverMaxHeaderBytes?: number;
    xmux?: XmuxConfig;
    downloadSettings?: StreamConfig;
    extra?: any;
}

export interface XmuxConfig {
    maxConcurrency?: Int32Range;
    maxConnections?: Int32Range;
    cMaxReuseTimes?: Int32Range;
    hMaxRequestTimes?: Int32Range;
    hMaxReusableSecs?: Int32Range;
    hKeepAlivePeriod?: number;
}

export interface KCPConfig {
    mtu?: number;
    tti?: number;
    uplinkCapacity?: number;
    downlinkCapacity?: number;
    cwndMultiplier?: number;
    maxSendingWindow?: number;
    header?: any;
    seed?: string;
}

export interface GRPCConfig {
    authority?: string;
    serviceName?: string;
    multiMode?: boolean;
    idle_timeout?: number;
    health_check_timeout?: number;
    permit_without_stream?: boolean;
    initial_windows_size?: number;
    user_agent?: string;
}

export interface WebSocketConfig {
    host?: string;
    path?: string;
    headers?: Record<string, string>;
    acceptProxyProtocol?: boolean;
    heartbeatPeriod?: number;
}

export interface HttpUpgradeConfig {
    host?: string;
    path?: string;
    headers?: Record<string, string>;
    acceptProxyProtocol?: boolean;
}

export interface UdpHop {
    ports?: number | string;
    interval?: Int32Range;
}

export interface Masquerade {
    type?: string;
    dir?: string;
    url?: string;
    rewriteHost?: boolean;
    insecure?: boolean;
    content?: string;
    headers?: Record<string, string>;
    statusCode?: number;
}

export interface HysteriaConfig {
    version?: number;
    auth?: string;
    congestion?: string;
    up?: string;
    down?: string;
    udphop?: UdpHop;
    udpIdleTimeout?: number;
    masquerade?: Masquerade;
}

export interface LimitFallback {
    AfterBytes?: number;
    BytesPerSec?: number;
    BurstBytesPerSec?: number;
}

export interface REALITYConfig {
    masterKeyLog?: string;
    show?: boolean;
    target?: any;
    dest?: any;
    type?: string;
    xver?: number;
    serverNames?: string[];
    privateKey?: string;
    minClientVer?: string;
    maxClientVer?: string;
    maxTimeDiff?: number;
    shortIds?: string[];
    mldsa65Seed?: string;
    limitFallbackUpload?: LimitFallback;
    limitFallbackDownload?: LimitFallback;
    fingerprint?: string;
    serverName?: string;
    password?: string;
    publicKey?: string;
    shortId?: string;
    mldsa65Verify?: string;
    spiderX?: string;
}

export interface TLSCertConfig {
    certificateFile?: string;
    certificate?: string[];
    keyFile?: string;
    key?: string[];
    usage?: string;
    ocspStapling?: number;
    oneTimeLoading?: boolean;
    buildChain?: boolean;
}

export interface TLSConfig {
    allowInsecure?: boolean;
    certificates?: TLSCertConfig[];
    serverName?: string;
    alpn?: string | string[];
    enableSessionResumption?: boolean;
    disableSystemRoot?: boolean;
    minVersion?: string;
    maxVersion?: string;
    cipherSuites?: string;
    fingerprint?: string;
    rejectUnknownSni?: boolean;
    curvePreferences?: string | string[];
    masterKeyLog?: string;
    pinnedPeerCertSha256?: string;
    verifyPeerCertByName?: string;
    echServerKeys?: string;
    echConfigList?: string;
    echSockopt?: SocketConfig;
}

export interface CustomSockoptConfig {
    system?: string;
    network?: string;
    level?: string;
    opt?: string;
    value?: string;
    type?: string;
}

export interface HappyEyeballsConfig {
    prioritizeIPv6?: boolean;
    tryDelayMs?: number;
    interleave?: number;
    maxConcurrentTry?: number;
}

export interface SocketConfig {
    mark?: number;
    TFO?: any;
}

/**
 * TrojanServerTarget is configuration of a single trojan server
 */
export interface TrojanServerTarget {
    address?: string;
    port?: number;
    level?: number;
    email?: string;
    password?: string;
    flow?: string;
}

/**
 * TrojanClientConfig is configuration of trojan servers
 */
export interface TrojanClientConfig {
    address?: string;
    port?: number;
    level?: number;
    email?: string;
    password?: string;
    flow?: string;
    servers?: TrojanServerTarget[];
}

/**
 * TrojanInboundFallback is fallback configuration
 */
export interface TrojanInboundFallback {
    name?: string;
    alpn?: string;
    path?: string;
    type?: string;
    dest?: any;
    xver?: number;
}

/**
 * TrojanUserConfig is user configuration
 */
export interface TrojanUserConfig {
    password?: string;
    level?: number;
    email?: string;
    flow?: string;
}

/**
 * TrojanServerConfig is Inbound configuration
 */
export interface TrojanServerConfig {
    users?: TrojanUserConfig[];
    clients?: TrojanUserConfig[];
    fallbacks?: TrojanInboundFallback[];
}

export interface TunConfig {
    name?: string;
    mtu?: number;
    gateway?: string[];
    dns?: string[];
    userLevel?: number;
    autoSystemRoutingTable?: string[];
    autoOutboundsInterface?: string;
}

export interface VersionConfig {
    min?: string;
    max?: string;
}

export interface VLessInboundFallback {
    name?: string;
    alpn?: string;
    path?: string;
    type?: string;
    dest?: any;
    xver?: number;
}

export interface VLessInboundConfig {
    users?: any[];
    clients?: any[];
    decryption?: string;
    fallbacks?: VLessInboundFallback[];
    flow?: string;
    testseed?: number[];
}

export interface VLessReverseConfig {
    tag?: string;
    sniffing?: SniffingConfig;
}

export interface VLessOutboundVnext {
    address?: string;
    port?: number;
    users?: any[];
}

export interface VLessOutboundConfig {
    address?: string;
    port?: number;
    level?: number;
    email?: string;
    id?: string;
    flow?: string;
    seed?: string;
    encryption?: string;
    reverse?: VLessReverseConfig;
    testpre?: number;
    testseed?: number[];
    vnext?: VLessOutboundVnext[];
}

export interface VMessAccount {
    id?: string;
    security?: string;
    experiments?: string;
}

export interface VMessDefaultConfig {
    level?: number;
}

export interface VMessInboundConfig {
    users?: any[];
    clients?: any[];
    default?: VMessDefaultConfig;
}

export interface VMessOutboundTarget {
    address?: string;
    port?: number;
    users?: any[];
}

export interface VMessOutboundConfig {
    address?: string;
    port?: number;
    level?: number;
    email?: string;
    id?: string;
    security?: string;
    experiments?: string;
    vnext?: VMessOutboundTarget[];
}

export interface WireGuardPeerConfig {
    publicKey?: string;
    preSharedKey?: string;
    endpoint?: string;
    keepAlive?: number;
    allowedIPs?: string[];
    level?: number;
    email?: string;
}

export interface WireGuardConfig {
    IsClient?: boolean;
    noKernelTun?: boolean;
    secretKey?: string;
    address?: string[];
    peers?: WireGuardPeerConfig[];
    mtu?: number;
    reserved?: number[];
    domainStrategy?: string;
}

export interface SniffingConfig {
    enabled?: boolean;
    destOverride?: string | string[];
    domainsExcluded?: string | string[];
    ipsExcluded?: string | string[];
    metadataOnly?: boolean;
    routeOnly?: boolean;
}

export interface MuxConfig {
    enabled?: boolean;
    concurrency?: number;
    xudpConcurrency?: number;
    xudpProxyUDP443?: string;
}

export interface InboundDetourConfig {
    protocol?: string;
    port?: number | string;
    listen?: string;
    settings?: any;
    tag?: string;
    streamSettings?: StreamConfig;
    sniffing?: SniffingConfig;
}

export interface OutboundDetourConfig {
    protocol?: string;
    sendThrough?: string;
    tag?: string;
    settings?: any;
    streamSettings?: StreamConfig;
    proxySettings?: ProxyConfig;
    mux?: MuxConfig;
    targetStrategy?: string;
}

export interface StatsConfig {
}

export interface Config {
    transport?: Record<string, any>;
    log?: LogConfig;
    routing?: RouterConfig;
    dns?: DNSConfig;
    inbounds?: InboundDetourConfig[];
    outbounds?: OutboundDetourConfig[];
    policy?: PolicyConfig;
    api?: APIConfig;
    metrics?: MetricsConfig;
    stats?: StatsConfig;
    reverse?: ReverseConfig;
    fakeDns?: FakeDNSConfig;
    observatory?: ObservatoryConfig;
    burstObservatory?: BurstObservatoryConfig;
    version?: VersionConfig;
    geodata?: GeodataConfig;
}

export interface XrayConfig {
    log?: LogConfig;
    api?: APIConfig;
    dns?: DNSConfig;
    routing?: RouterConfig;
    policy?: PolicyConfig;
    inbounds?: InboundDetourConfig[];
    outbounds?: OutboundDetourConfig[];
    stats?: StatsConfig;
    reverse?: ReverseConfig;
    fakedns?: FakeDNSConfig | FakeDNSConfig[];
}
