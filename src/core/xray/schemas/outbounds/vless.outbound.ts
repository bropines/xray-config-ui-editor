// ============================================================
// VLESS Outbound Settings — Source: docs/config/outbounds/vless.md
// ============================================================

import { z } from 'zod';
import { UserLevelSchema, VlessFlowSchema } from '../primitives';

/** One server in the grouped form. */
export const VlessVnextSchema = z.object({
  address: z.string().optional(),
  port: z.number().int().optional(),
  users: z.array(z.object({
    id: z.string().optional(),
    encryption: z.string().optional(),
    flow: VlessFlowSchema.optional(),
    level: UserLevelSchema,
    email: z.string().optional(),
  }).passthrough()).optional(),
}).passthrough();

export const VlessOutboundSettingsSchema = z.object({
  /** Servers in grouped form. The flat fields below are the newer spelling. */
  vnext: z.array(VlessVnextSchema).optional(),
  /** Server address */
  address: z.string().optional(),
  /** Server port */
  port: z.number().int().optional(),
  /** User UUID */
  id: z.string().optional(),
  /** Encryption (must be "none") */
  encryption: z.string().optional(),
  /** XTLS flow control */
  flow: VlessFlowSchema.optional(),
  /** User level for policy */
  level: UserLevelSchema,
  /** User email for statistics */
  email: z.string().optional(),
  /** Post-quantum key exchange seed */
  seed: z.string().optional(),
  /** VLESS reverse proxy config */
  reverse: z.object({
    tag: z.string().optional(),
    sniffing: z.object({
      enabled: z.boolean().optional(),
      destOverride: z.array(z.string()).optional(),
    }).passthrough().optional(),
  }).passthrough().optional(),
}).passthrough();
