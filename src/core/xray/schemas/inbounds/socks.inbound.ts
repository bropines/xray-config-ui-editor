// ============================================================
// Socks Inbound Settings — Source: docs/config/inbounds/socks.md
// ============================================================

import { z } from 'zod';
import { UserLevelSchema } from '../primitives';

export const SocksInboundUserSchema = z.object({
  /** Username */
  user: z.string(),
  /** Password */
  pass: z.string(),
}).passthrough();

export const SocksInboundSettingsSchema = z.object({
  /** Authentication method: "noauth" or "password". Default: "noauth" */
  auth: z.enum(['noauth', 'password']).optional(),
  /** List of users for password authentication */
  users: z.array(SocksInboundUserSchema).optional(),
  /** Enable UDP relay. Default: false */
  udp: z.boolean().optional(),
  /** IP address for UDP relay responses. Default: "127.0.0.1" */
  ip: z.string().optional(),
  /** User level for policy */
  userLevel: UserLevelSchema,
}).passthrough();
