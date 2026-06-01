// ============================================================
// Inbound Schema (wrapper) — src/core/xray/schemas/inbound.schema.ts
// Source: docs/config/inbound.md
// ============================================================

import { z } from 'zod';
import { PortSchema, DestOverrideSchema, InboundProtocolSchema } from './primitives';
import { StreamSettingsSchema } from './transport/stream.schema';

// --- Sniffing ---
export const SniffingSchema = z.object({
  /** Enable content sniffing */
  enabled: z.boolean().optional(),
  /** Override destination based on sniffed protocol */
  destOverride: z.array(z.union([DestOverrideSchema, z.string()])).optional(),
  /** Only use metadata for sniffing (no deep inspection) */
  metadataOnly: z.boolean().optional(),
  /** Excluded domains from sniffing */
  domainsExcluded: z.array(z.string()).optional(),
  /** Excluded IPs from sniffing */
  ipsExcluded: z.array(z.string()).optional(),
  /** Only route, don't override destination */
  routeOnly: z.boolean().optional(),
}).passthrough();

// --- Allocate ---
export const AllocateSchema = z.object({
  /** Allocation strategy: "always" or "random" */
  strategy: z.enum(['always', 'random']).optional(),
  /** Refresh interval in minutes */
  refresh: z.number().int().optional(),
  /** Number of concurrent ports to use */
  concurrency: z.number().int().optional(),
}).passthrough();

// --- Inbound Object ---
// Settings are intentionally z.record for maximum flexibility.
// Protocol-specific validation should use the individual inbound schemas.
export const InboundSchema = z.object({
  /** Inbound tag for routing identification */
  tag: z.string().optional(),
  /** Listen port. Supports: number, string (range "1080-1090"), env ("env:PORT") */
  port: PortSchema.optional(),
  /** Listen address. Default: "0.0.0.0" */
  listen: z.string().optional(),
  /** Protocol name */
  protocol: z.union([InboundProtocolSchema, z.string()]),
  /** Protocol-specific settings (passthrough to avoid dropping unknown fields) */
  settings: z.record(z.string(), z.unknown()).optional(),
  /** Transport settings */
  streamSettings: StreamSettingsSchema.optional(),
  /** Content sniffing configuration */
  sniffing: SniffingSchema.optional(),
  /** Port allocation settings */
  allocate: AllocateSchema.optional(),
}).passthrough();

export type InboundConfig = z.infer<typeof InboundSchema>;
