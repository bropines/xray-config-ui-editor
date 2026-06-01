import { z } from 'zod';
import { FakeDnsPoolSchema } from '../xray/schemas/fakedns.schema';
import { LevelPolicySchema } from '../xray/schemas/policy.schema';
import {
    type XrayConfig,
    type InboundConfig,
    type OutboundConfig,
    type RoutingRule,
    type Balancer,
    type RoutingConfig,
    type DnsConfig,
    type DnsServerObject,
    type LogConfig,
    type ApiConfig,
    type PolicyConfig,
    type StatsConfig,
    type ReverseConfig,
    type ObservatoryConfig,
    type BurstObservatoryConfig
} from '../xray/schemas';

export type {
    XrayConfig,
    RoutingRule,
    Balancer,
    RoutingConfig,
    DnsConfig,
    DnsServerObject,
    LogConfig,
    ApiConfig,
    PolicyConfig,
    StatsConfig,
    ReverseConfig,
    ObservatoryConfig,
    BurstObservatoryConfig
};

export type Inbound = InboundConfig;
export type Outbound = OutboundConfig;
export type FakednsPool = z.infer<typeof FakeDnsPoolSchema>;
export type PolicyLevel = z.infer<typeof LevelPolicySchema>;

export type { RemnawaveProfile, RemnawaveConnectionState } from './remnawave.types';
