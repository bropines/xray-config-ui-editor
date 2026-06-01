// ============================================================
// Tunnel (dokodemo-door) Inbound Settings — Source: docs/config/inbounds/tunnel.md
// ============================================================

import { z } from 'zod';
import { UserLevelSchema } from '../primitives';

export const TunnelInboundSettingsSchema = z.object({
  /** Allowed network types: "tcp", "udp", "tcp,udp" */
  allowedNetwork: z.string().optional(),
  /** Rewrite destination address */
  rewriteAddress: z.string().optional(),
  /** Rewrite destination port */
  rewritePort: z.number().int().optional(),
  /** Port mapping: e.g. {"443": "google.com"} */
  portMap: z.record(z.string(), z.string()).optional(),
  /** Follow redirect target from transparent proxy */
  followRedirect: z.boolean().optional(),
  /** User level for policy */
  userLevel: UserLevelSchema,
}).passthrough();
