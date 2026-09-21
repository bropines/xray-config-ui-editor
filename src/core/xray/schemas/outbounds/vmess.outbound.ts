// ============================================================
// VMess Outbound Settings — Source: docs/config/outbounds/vmess.md
// ============================================================

import { z } from 'zod';
import { UserLevelSchema, VmessSecuritySchema } from '../primitives';

/** One server in the grouped form. */
export const VmessVnextSchema = z.object({
  address: z.string().optional(),
  port: z.number().int().optional(),
  users: z.array(z.object({
    id: z.string().optional(),
    security: VmessSecuritySchema.optional(),
    level: UserLevelSchema,
    email: z.string().optional(),
  }).passthrough()).optional(),
}).passthrough();

export const VmessOutboundSettingsSchema = z.object({
  /** Servers in grouped form. The flat fields below are the newer spelling. */
  vnext: z.array(VmessVnextSchema).optional(),
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
  /** User email for statistics */
  email: z.string().optional(),
  /** Experimental features */
  experiments: z.string().optional(),
}).passthrough();
