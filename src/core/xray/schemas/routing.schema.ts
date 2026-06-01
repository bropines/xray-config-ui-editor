// ============================================================
// Routing Schema — src/core/xray/schemas/routing.schema.ts
// Source: docs/config/routing.md
// ============================================================

import { z } from 'zod';
import {
  RoutingDomainStrategySchema,
  RoutingProtocolSchema,
  BalancerStrategyTypeSchema,
  DomainListSchema,
  IPListSchema,
} from './primitives';

// --- Webhook ---
export const WebhookObjectSchema = z.object({
  /** URL to POST webhook notifications */
  url: z.string(),
  /** Deduplication interval in seconds */
  deduplication: z.number().optional(),
  /** Custom HTTP headers for the webhook request */
  headers: z.record(z.string(), z.string()).optional(),
}).passthrough();

// --- Routing Rule ---
export const RoutingRuleSchema = z.object({
  /** Rule type. Default: "field" */
  type: z.string().optional(),
  /** Rule tag for identification */
  ruleTag: z.string().optional(),

  // --- Match conditions (AND logic) ---
  /** Domain match list (domain:, full:, regexp:, geosite:, etc.) */
  domain: DomainListSchema.optional(),
  /** IP match list (IP, CIDR, geoip:, etc.) */
  ip: IPListSchema.optional(),
  /** Destination port or port range, e.g. "80", "1-65535", "53,443,1000-2000" */
  port: z.union([z.number(), z.string()]).optional(),
  /** Source port or port range */
  sourcePort: z.union([z.number(), z.string()]).optional(),
  /** Local port (for transparent proxy) */
  localPort: z.union([z.number(), z.string()]).optional(),
  /** Network type: tcp, udp, tcp,udp */
  network: z.string().optional(),
  /** Source IP list (alias: source) */
  source: IPListSchema.optional(),
  /** Local IP list (for transparent proxy) */
  localIP: IPListSchema.optional(),
  /** User email match list */
  user: z.array(z.string()).optional(),
  /** Match VLESS route header */
  vlessRoute: z.string().optional(),
  /** Inbound tag match list */
  inboundTag: z.array(z.string()).optional(),
  /** Sniffed protocol match list */
  protocol: z.array(RoutingProtocolSchema).optional(),
  /** Attribute match (for external rule providers) */
  attrs: z.record(z.string(), z.string()).optional(),
  /** Process name match list */
  process: z.array(z.string()).optional(),

  // --- Actions ---
  /** Target outbound tag */
  outboundTag: z.string().optional(),
  /** Target balancer tag (mutually exclusive with outboundTag) */
  balancerTag: z.string().optional(),
  /** Webhook notification on match */
  webhook: z.union([z.string(), WebhookObjectSchema]).optional(),
}).passthrough();

// --- Balancer Strategy Settings ---
export const CostObjectSchema = z.object({
  /** Regex to match outbound tags */
  regexp: z.string().optional(),
  /** Exact match for outbound tags */
  match: z.string().optional(),
  /** Cost value */
  value: z.number().optional(),
}).passthrough();

export const StrategySettingsSchema = z.object({
  /** Expected RTT in milliseconds */
  expected: z.number().optional(),
  /** Maximum acceptable RTT in milliseconds */
  maxRTT: z.number().optional(),
  /** Tolerance for RTT difference */
  tolerance: z.number().optional(),
  /** Baseline RTT values */
  baselines: z.array(z.number()).optional(),
  /** Cost adjustments for specific outbounds */
  costs: z.array(CostObjectSchema).optional(),
}).passthrough();

// --- Balancer Strategy ---
export const StrategyObjectSchema = z.object({
  /** Strategy type: random, roundRobin, leastPing, leastLoad */
  type: BalancerStrategyTypeSchema.optional(),
  /** Strategy-specific settings */
  settings: StrategySettingsSchema.optional(),
}).passthrough();

// --- Balancer ---
export const BalancerSchema = z.object({
  /** Balancer tag for routing rules */
  tag: z.string(),
  /** Prefix-match selectors for outbound tags */
  selector: z.array(z.string()),
  /** Fallback outbound tag when no selected outbound is available */
  fallbackTag: z.string().optional(),
  /** Balancing strategy */
  strategy: StrategyObjectSchema.optional(),
}).passthrough();

// --- Top-level Routing ---
export const RoutingSchema = z.object({
  /** Domain resolution strategy: AsIs, IPIfNonMatch, IPOnDemand */
  domainStrategy: RoutingDomainStrategySchema.optional(),
  /** Routing rules, matched in order */
  rules: z.array(RoutingRuleSchema).optional(),
  /** Load balancers */
  balancers: z.array(BalancerSchema).optional(),
}).passthrough();

export type RoutingConfig = z.infer<typeof RoutingSchema>;
export type RoutingRule = z.infer<typeof RoutingRuleSchema>;
export type Balancer = z.infer<typeof BalancerSchema>;
