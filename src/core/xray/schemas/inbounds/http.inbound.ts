// ============================================================
// HTTP Inbound Settings — Source: docs/config/inbounds/http.md
// ============================================================

import { z } from 'zod';
import { UserLevelSchema } from '../primitives';

export const HttpInboundUserSchema = z.object({
  /** Username */
  user: z.string(),
  /** Password */
  pass: z.string(),
}).passthrough();

export const HttpInboundSettingsSchema = z.object({
  /** List of users for authentication */
  users: z.array(HttpInboundUserSchema).optional(),
  /** Allow transparent proxy. Default: false */
  allowTransparent: z.boolean().optional(),
  /** User level for policy */
  userLevel: UserLevelSchema,
}).passthrough();
