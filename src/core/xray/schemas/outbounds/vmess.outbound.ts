// ============================================================
// VMess Outbound Settings — Source: docs/config/outbounds/vmess.md
// ============================================================

import { z } from 'zod';
import { UserLevelSchema, VmessSecuritySchema } from '../primitives';

export const VmessOutboundSettingsSchema = z.object({
  /** Server address */
  address: z.string().optional(),
  /** Server port */
  port: z.number().int().optional(),
  /** User UUID */
  id: z.string().optional(),
  /** Encryption security method */
  security: VmessSecuritySchema.optional(),
  /** User level for policy */
  level: UserLevelSchema,
  /** Experimental features */
  experiments: z.string().optional(),
}).passthrough();
