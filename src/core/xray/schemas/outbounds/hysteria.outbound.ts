// ============================================================
// Hysteria Outbound — Source: docs/config/outbounds/hysteria.md
// ============================================================
import { z } from 'zod';

export const HysteriaOutboundSettingsSchema = z.object({
  /** Hysteria version, must be 2 */
  version: z.literal(2).optional(),
  /** Server address */
  address: z.string().optional(),
  /** Server port */
  port: z.number().int().optional(),
}).passthrough();
