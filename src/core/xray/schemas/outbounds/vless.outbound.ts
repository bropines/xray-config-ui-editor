// ============================================================
// VLESS Outbound Settings — Source: docs/config/outbounds/vless.md
// ============================================================

import { z } from 'zod';
import { UserLevelSchema, VlessFlowSchema } from '../primitives';

export const VlessOutboundSettingsSchema = z.object({
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
  /** VLESS reverse proxy config */
  reverse: z.object({
    tag: z.string().optional(),
    sniffing: z.object({
      enabled: z.boolean().optional(),
      destOverride: z.array(z.string()).optional(),
    }).passthrough().optional(),
  }).passthrough().optional(),
}).passthrough();
