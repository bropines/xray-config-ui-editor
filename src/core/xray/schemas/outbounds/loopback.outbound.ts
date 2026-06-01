// ============================================================
// Loopback Outbound — Source: docs/config/outbounds/loopback.md
// ============================================================
import { z } from 'zod';

export const LoopbackOutboundSettingsSchema = z.object({
  /** Inbound tag to re-route traffic to */
  inboundTag: z.string().optional(),
}).passthrough();
