// ============================================================
// Outbound Schema (wrapper) — src/core/xray/schemas/outbound.schema.ts
// Source: docs/config/outbound.md
// ============================================================

import { z } from 'zod';
import { OutboundProtocolSchema, DomainStrategyFullSchema } from './primitives';

// --- Mux ---
export const MuxSchema = z.object({
  /** Enable Mux.Cool multiplexing */
  enabled: z.boolean().optional(),
  /** Max concurrent connections per Mux session */
  concurrency: z.number().int().optional(),
  /** Max concurrent XUDP connections */
  xudpConcurrency: z.number().int().optional(),
  /** XUDP proxy behavior for UDP/443: "reject", "allow", "skip" */
  xudpProxyUDP443: z.string().optional(),
}).passthrough();

// --- Proxy Settings ---
export const ProxySettingsSchema = z.object({
  /** Tag of another outbound to chain through */
  tag: z.string().optional(),
  /** Enable transport layer chaining (vs. application layer) */
  transportLayer: z.boolean().optional(),
}).passthrough();

// --- Outbound Object ---
export const OutboundSchema = z.object({
  /** Outbound tag for routing identification */
  tag: z.string().optional(),
  /** Source address for outgoing connections */
  sendThrough: z.string().optional(),
  /** Protocol name */
  protocol: z.union([OutboundProtocolSchema, z.string()]),
  /** Protocol-specific settings (passthrough) */
  settings: z.record(z.string(), z.unknown()).optional(),
  /** Transport settings */
  streamSettings: z.record(z.string(), z.unknown()).optional(),
  /** Proxy chaining settings */
  proxySettings: ProxySettingsSchema.optional(),
  /** Mux multiplexing settings */
  mux: MuxSchema.optional(),
  /** Domain resolution strategy for target (11 values) */
  targetStrategy: DomainStrategyFullSchema.optional(),
}).passthrough();

export type OutboundConfig = z.infer<typeof OutboundSchema>;
