// ============================================================
// Socks Outbound — Source: docs/config/outbounds/socks.md
// ============================================================
import { z } from 'zod';
import { UserLevelSchema } from '../primitives';

export const SocksOutboundSettingsSchema = z.object({
  address: z.string().optional(),
  port: z.number().int().optional(),
  user: z.string().optional(),
  pass: z.string().optional(),
  level: UserLevelSchema,
  email: z.string().optional(),
}).passthrough();
