// ============================================================
// Blackhole Outbound — Source: docs/config/outbounds/blackhole.md
// ============================================================
import { z } from 'zod';

export const BlackholeOutboundSettingsSchema = z.object({
  /** Response type: "none" (drop) or "http" (send 403 response) */
  response: z.object({
    type: z.enum(['none', 'http']).optional(),
  }).passthrough().optional(),
}).passthrough();
