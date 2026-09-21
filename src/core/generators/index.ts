export {
    generateUUID,
    generateShortId,
    generateRealityKeyPair,
    generateRealityShortIds,
    generateX25519Keys,
    publicKeyFromPrivateKey,
} from './crypto';
// spiderX is a browsing path, not a secret — see spider-path for why it is
// built out of words rather than random characters.
export { generateSpiderPath, parseSpiderPaths, mergeSpiderPaths } from './spider-path';
export type { SpiderPathShape, SpiderPathOptions } from './spider-path';
export { generateWarpAccount } from './warp';
export type { WarpAccount } from './warp';
export {
    createDefaultRoutingRule,
    createDefaultBalancer,
} from './protocol-factories';

// One factory for both sides of a protocol — see endpoint-factory for why.
export {
    createEndpoint,
    createDefaultInbound,
    createDefaultOutbound,
    protocolsFor,
    supportsProtocol,
    bidirectionalProtocols,
} from './endpoint-factory';
export type { EndpointDirection, EndpointOptions, Endpoint } from './endpoint-factory';

// Client-config builder (local balancer over a set of nodes)
export {
    buildLocalBalancerConfig,
    buildLocalBalancerSubscription,
    groupNodesByLabel,
    proxyTagFor,
    slugifyLabel,
    isProxyOutbound,
    LOCAL_BALANCER_PRESETS,
    DEFAULT_LOCAL_BALANCER_OPTIONS,
    buildLocalBalancerTemplate,
    DEFAULT_INJECT_OPTIONS,
} from './local-balancer';
export type {
    LocalBalancerNode,
    LocalBalancerGroup,
    LocalBalancerOptions,
    BalancerStrategyType,
    ProbeKind,
    BuildResult,
    InjectOptions,
    InjectSelector,
} from './local-balancer';

// Server inbound -> client outbound (panel hosts into a client config)
export { buildClientOutbound, clientOutboundBlocker } from './client-outbound';
export type { PanelHost, PanelInbound, ClientOutboundOptions, ClientOutboundResult } from './client-outbound';
