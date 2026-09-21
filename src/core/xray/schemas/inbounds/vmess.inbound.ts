// ============================================================
// VMess Inbound Settings — Source: docs/config/inbounds/vmess.md
// ============================================================

import { z } from 'zod';
import { UserLevelSchema } from '../primitives';

export const VmessInboundUserSchema = z.object({
  /** User UUID */
  id: z.string(),
  /** User level for policy. Default: 0 */
  level: UserLevelSchema,
  /** User email for statistics */
  email: z.string().optional(),
}).passthrough();

export const VmessInboundSettingsSchema = z.object({
  /** List of authorized users. The documented spelling; `users` is an alias. */
  clients: z.array(VmessInboundUserSchema).optional(),
  /** Alias for clients, accepted by the core. */
  users: z.array(VmessInboundUserSchema).optional(),
  /** Default policy settings */
  default: z.object({
    level: UserLevelSchema,
  }).passthrough().optional(),
}).passthrough();
