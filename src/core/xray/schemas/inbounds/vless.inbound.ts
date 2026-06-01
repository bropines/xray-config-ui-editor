// ============================================================
// VLESS Inbound Settings — Source: docs/config/inbounds/vless.md
// ============================================================

import { z } from 'zod';
import { UserLevelSchema, VlessFlowSchema } from '../primitives';
import { FallbackObjectSchema } from '../fallback.schema';

export const VlessInboundUserSchema = z.object({
  /** User UUID */
  id: z.string(),
  /** User level for policy. Default: 0 */
  level: UserLevelSchema,
  /** User email for statistics */
  email: z.string().optional(),
  /** XTLS flow control: "", "xtls-rprx-vision", "xtls-rprx-vision-udp443" */
  flow: VlessFlowSchema.optional(),
  /** VLESS reverse proxy config */
  reverse: z.object({
    tag: z.string().optional(),
    sniffing: z.object({
      enabled: z.boolean().optional(),
      destOverride: z.array(z.string()).optional(),
    }).passthrough().optional(),
  }).passthrough().optional(),
}).passthrough();

export const VlessInboundSettingsSchema = z.object({
  /** List of authorized users */
  users: z.array(VlessInboundUserSchema).optional(),
  /** Decryption method. Must be "none" */
  decryption: z.string().optional(),
  /** Fallback configurations for active probing resistance */
  fallbacks: z.array(FallbackObjectSchema).optional(),
}).passthrough();
