// ============================================================
// Xray-core Complete Zod Schema — Single Source of Truth
// src/core/xray/schemas/index.ts
//
// This file re-exports ALL schemas and types.
// The XrayConfigSchema at the bottom is the root validator.
// ============================================================

import { z } from 'zod';

// --- Primitives ---
export * from './primitives';

// --- Top-level sections ---
export { LogSchema, type LogConfig } from './log.schema';
export { ApiSchema, type ApiConfig } from './api.schema';
export { StatsSchema, type StatsConfig } from './stats.schema';
export { MetricsSchema, type MetricsConfig } from './metrics.schema';
export { GeodataSchema, type GeodataConfig } from './geodata.schema';
export { ReverseSchema, type ReverseConfig } from './reverse.schema';
export { FakeDnsSchema, type FakeDnsConfig } from './fakedns.schema';
export { PolicySchema, type PolicyConfig } from './policy.schema';
export { ObservatorySchema, BurstObservatorySchema, type ObservatoryConfig, type BurstObservatoryConfig } from './observatory.schema';
export { FallbackObjectSchema, type FallbackObject } from './fallback.schema';
export { DnsSchema, DnsServerObjectSchema, type DnsConfig, type DnsServerObject } from './dns.schema';
export { RoutingSchema, RoutingRuleSchema, BalancerSchema, type RoutingConfig, type RoutingRule, type Balancer } from './routing.schema';

// --- Inbound / Outbound wrappers ---
export { InboundSchema, SniffingSchema, AllocateSchema, type InboundConfig } from './inbound.schema';
export { OutboundSchema, MuxSchema, ProxySettingsSchema, type OutboundConfig } from './outbound.schema';

// --- Inbound protocol settings ---
export { VlessInboundSettingsSchema } from './inbounds/vless.inbound';
export { VmessInboundSettingsSchema } from './inbounds/vmess.inbound';
export { TrojanInboundSettingsSchema } from './inbounds/trojan.inbound';
export { ShadowsocksInboundSettingsSchema } from './inbounds/shadowsocks.inbound';
export { SocksInboundSettingsSchema } from './inbounds/socks.inbound';
export { HttpInboundSettingsSchema } from './inbounds/http.inbound';
export { TunnelInboundSettingsSchema } from './inbounds/tunnel.inbound';
export { HysteriaInboundSettingsSchema } from './inbounds/hysteria.inbound';
export { WireguardInboundSettingsSchema } from './inbounds/wireguard.inbound';
export { TunInboundSettingsSchema } from './inbounds/tun.inbound';

// --- Outbound protocol settings ---
export { VlessOutboundSettingsSchema } from './outbounds/vless.outbound';
export { VmessOutboundSettingsSchema } from './outbounds/vmess.outbound';
export { TrojanOutboundSettingsSchema } from './outbounds/trojan.outbound';
export { ShadowsocksOutboundSettingsSchema } from './outbounds/shadowsocks.outbound';
export { SocksOutboundSettingsSchema } from './outbounds/socks.outbound';
export { HttpOutboundSettingsSchema } from './outbounds/http.outbound';
export { FreedomOutboundSettingsSchema } from './outbounds/freedom.outbound';
export { BlackholeOutboundSettingsSchema } from './outbounds/blackhole.outbound';
export { DnsOutboundSettingsSchema } from './outbounds/dns.outbound';
export { LoopbackOutboundSettingsSchema } from './outbounds/loopback.outbound';
export { HysteriaOutboundSettingsSchema } from './outbounds/hysteria.outbound';
export { WireguardOutboundSettingsSchema } from './outbounds/wireguard.outbound';

// --- Transport schemas ---
export { StreamSettingsSchema, type StreamSettings } from './transport/stream.schema';
export { RawTransportSchema } from './transport/raw.transport';
export { WebSocketTransportSchema } from './transport/websocket.transport';
export { GrpcTransportSchema } from './transport/grpc.transport';
export { HttpUpgradeTransportSchema } from './transport/httpupgrade.transport';
export { MkcpTransportSchema } from './transport/mkcp.transport';
export { XhttpTransportSchema, XmuxSchema, XhttpExtraSchema } from './transport/xhttp.transport';
export { HysteriaTransportSchema } from './transport/hysteria.transport';
export { TlsSchema, CertificateObjectSchema } from './transport/tls.schema';
export { RealitySchema } from './transport/reality.schema';
export { SockoptSchema, HappyEyeballsSchema } from './transport/sockopt.schema';
export { FinalMaskSchema, QuicParamsSchema } from './transport/finalmask.schema';

// ============================================================
// Root XrayConfigSchema
// ============================================================

import { LogSchema } from './log.schema';
import { ApiSchema } from './api.schema';
import { StatsSchema } from './stats.schema';
import { MetricsSchema } from './metrics.schema';
import { GeodataSchema } from './geodata.schema';
import { ReverseSchema } from './reverse.schema';
import { FakeDnsSchema } from './fakedns.schema';
import { PolicySchema } from './policy.schema';
import { ObservatorySchema, BurstObservatorySchema } from './observatory.schema';
import { DnsSchema } from './dns.schema';
import { RoutingSchema } from './routing.schema';
import { InboundSchema } from './inbound.schema';
import { OutboundSchema } from './outbound.schema';

export const XrayConfigSchema = z.object({
  log: LogSchema.optional(),
  api: ApiSchema.optional(),
  dns: DnsSchema.optional(),
  routing: RoutingSchema.optional(),
  policy: PolicySchema.optional(),
  inbounds: z.array(InboundSchema).optional(),
  outbounds: z.array(OutboundSchema).optional(),
  stats: StatsSchema.optional(),
  fakedns: FakeDnsSchema.optional(),
  metrics: MetricsSchema.optional(),
  observatory: ObservatorySchema.optional(),
  burstObservatory: BurstObservatorySchema.optional(),
  geodata: GeodataSchema.optional(),
  reverse: ReverseSchema.optional(),
}).passthrough(); // Allow unknown top-level keys to avoid breaking configs

export type XrayConfig = z.infer<typeof XrayConfigSchema>;
