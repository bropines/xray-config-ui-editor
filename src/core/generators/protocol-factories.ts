import type { RoutingRule, Balancer } from '../types';

/**
 * Inbound and outbound construction moved to `endpoint-factory`, where both
 * sides of a protocol are described together. These re-exports keep the
 * historical import path working.
 */
export {
    createEndpoint,
    createDefaultInbound,
    createDefaultOutbound,
    protocolsFor,
    supportsProtocol,
    bidirectionalProtocols,
} from './endpoint-factory';
export type { EndpointDirection, EndpointOptions, Endpoint } from './endpoint-factory';

export const createDefaultRoutingRule = (): RoutingRule => ({
    type: 'field',
    outboundTag: 'proxy',
    domain: [],
    ip: [],
    protocol: [],
});

export const createDefaultBalancer = (): Balancer => ({
    tag: `balancer-${Math.floor(Math.random() * 1000)}`,
    selector: [],
    strategy: { type: 'random' },
});
