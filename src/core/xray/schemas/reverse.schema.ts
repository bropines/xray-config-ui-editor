// ============================================================
// Reverse Schema — src/core/xray/schemas/reverse.schema.ts
// Source: docs/config/reverse.md (DEPRECATED)
// ============================================================

import { z } from 'zod';

export const BridgeObjectSchema = z.object({
  /** Bridge tag, used in routing inboundTag */
  tag: z.string(),
  /** Domain for bridge-portal communication (doesn't need to exist) */
  domain: z.string(),
}).passthrough();

export const PortalObjectSchema = z.object({
  /** Portal tag, used in routing outboundTag */
  tag: z.string(),
  /** Domain for bridge-portal communication (must match bridge domain) */
  domain: z.string(),
}).passthrough();

/** @deprecated Legacy reverse proxy, use VLESS reverse proxy instead */
export const ReverseSchema = z.object({
  bridges: z.array(BridgeObjectSchema).optional(),
  portals: z.array(PortalObjectSchema).optional(),
}).passthrough();

export type ReverseConfig = z.infer<typeof ReverseSchema>;
