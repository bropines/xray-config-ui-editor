// ============================================================
// HTTP Outbound — Source: docs/config/outbounds/http.md
// ============================================================
import { z } from 'zod';
import { UserLevelSchema } from '../primitives';

export const HttpOutboundSettingsSchema = z.object({
  address: z.string().optional(),
  port: z.number().int().optional(),
  user: z.string().optional(),
  pass: z.string().optional(),
  level: UserLevelSchema,
  email: z.string().optional(),
  /** Custom HTTP headers (key → value) */
  headers: z.record(z.string(), z.string()).optional(),
}).passthrough();
