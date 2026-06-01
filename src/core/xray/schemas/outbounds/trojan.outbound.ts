// ============================================================
// Trojan Outbound Settings — Source: docs/config/outbounds/trojan.md
// ============================================================
import { z } from 'zod';
import { UserLevelSchema } from '../primitives';

export const TrojanOutboundSettingsSchema = z.object({
  address: z.string().optional(),
  port: z.number().int().optional(),
  password: z.string().optional(),
  email: z.string().optional(),
  level: UserLevelSchema,
}).passthrough();
