// ============================================================
// Shadowsocks Outbound Settings — Source: docs/config/outbounds/shadowsocks.md
// ============================================================
import { z } from 'zod';
import { UserLevelSchema, ShadowsocksMethodSchema } from '../primitives';

/** One server in the grouped form. */
export const ShadowsocksServerSchema = z.object({
  address: z.string().optional(),
  port: z.number().int().optional(),
  method: ShadowsocksMethodSchema.optional(),
  password: z.string().optional(),
  email: z.string().optional(),
  level: UserLevelSchema,
  uot: z.boolean().optional(),
  UoTVersion: z.number().int().optional(),
}).passthrough();

export const ShadowsocksOutboundSettingsSchema = z.object({
  /** Servers in grouped form. The flat fields below are the newer spelling. */
  servers: z.array(ShadowsocksServerSchema).optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  port: z.number().int().optional(),
  method: ShadowsocksMethodSchema.optional(),
  password: z.string().optional(),
  uot: z.boolean().optional(),
  UoTVersion: z.number().int().optional(),
  level: UserLevelSchema,
}).passthrough();
