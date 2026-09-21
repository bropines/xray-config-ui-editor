// ============================================================
// Trojan Outbound Settings — Source: docs/config/outbounds/trojan.md
// ============================================================
import { z } from 'zod';
import { UserLevelSchema } from '../primitives';

/** One server in the grouped form. */
export const TrojanServerSchema = z.object({
  address: z.string().optional(),
  port: z.number().int().optional(),
  password: z.string().optional(),
  email: z.string().optional(),
  level: UserLevelSchema,
  flow: z.string().optional(),
}).passthrough();

export const TrojanOutboundSettingsSchema = z.object({
  /** Servers in grouped form. The flat fields below are the newer spelling. */
  servers: z.array(TrojanServerSchema).optional(),
  address: z.string().optional(),
  port: z.number().int().optional(),
  password: z.string().optional(),
  email: z.string().optional(),
  level: UserLevelSchema,
  /** XTLS flow control */
  flow: z.string().optional(),
}).passthrough();
