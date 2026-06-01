// ============================================================
// Hysteria Inbound Settings — Source: docs/config/inbounds/hysteria.md
// ============================================================

import { z } from 'zod';
import { UserLevelSchema } from '../primitives';

export const HysteriaInboundUserSchema = z.object({
  /** Authentication password */
  auth: z.string().optional(),
  /** User level for policy */
  level: UserLevelSchema,
  /** User email for statistics */
  email: z.string().optional(),
}).passthrough();

export const HysteriaInboundSettingsSchema = z.object({
  /** Hysteria version, must be 2 */
  version: z.literal(2).optional(),
  /** List of authorized users (overrides transport auth) */
  users: z.array(HysteriaInboundUserSchema).optional(),
}).passthrough();
