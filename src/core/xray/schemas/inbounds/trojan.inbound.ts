// ============================================================
// Trojan Inbound Settings — Source: docs/config/inbounds/trojan.md
// ============================================================

import { z } from 'zod';
import { UserLevelSchema } from '../primitives';
import { FallbackObjectSchema } from '../fallback.schema';

export const TrojanInboundUserSchema = z.object({
  /** User password */
  password: z.string(),
  /** User email for statistics */
  email: z.string().optional(),
  /** User level for policy */
  level: UserLevelSchema,
}).passthrough();

export const TrojanInboundSettingsSchema = z.object({
  /** List of authorized users. The documented spelling; `users` is an alias. */
  clients: z.array(TrojanInboundUserSchema).optional(),
  /** Alias for clients, accepted by the core. */
  users: z.array(TrojanInboundUserSchema).optional(),
  /** Fallback configurations */
  fallbacks: z.array(FallbackObjectSchema).optional(),
}).passthrough();
