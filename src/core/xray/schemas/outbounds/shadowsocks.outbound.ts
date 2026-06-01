// ============================================================
// Shadowsocks Outbound Settings — Source: docs/config/outbounds/shadowsocks.md
// ============================================================
import { z } from 'zod';
import { UserLevelSchema, ShadowsocksMethodSchema } from '../primitives';

export const ShadowsocksOutboundSettingsSchema = z.object({
  email: z.string().optional(),
  address: z.string().optional(),
  port: z.number().int().optional(),
  method: ShadowsocksMethodSchema.optional(),
  password: z.string().optional(),
  uot: z.boolean().optional(),
  UoTVersion: z.number().int().optional(),
  level: UserLevelSchema,
}).passthrough();
