// ============================================================
// TUN Inbound Settings — Source: docs/config/inbounds/tun.md
// ============================================================

import { z } from 'zod';
import { UserLevelSchema } from '../primitives';

export const TunInboundSettingsSchema = z.object({
  /** TUN device name */
  name: z.string().optional(),
  /** MTU size */
  mtu: z.number().int().optional(),
  /** Gateway addresses */
  gateway: z.array(z.string()).optional(),
  /** DNS server addresses */
  dns: z.array(z.string()).optional(),
  /** User level for policy */
  userLevel: UserLevelSchema,
  /** Auto-configure system routing table entries */
  autoSystemRoutingTable: z.array(z.string()).optional(),
  /** Auto-set outbound interface */
  autoOutboundsInterface: z.boolean().optional(),
}).passthrough();
