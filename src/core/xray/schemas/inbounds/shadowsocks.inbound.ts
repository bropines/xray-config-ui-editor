// ============================================================
// Shadowsocks Inbound Settings — Source: docs/config/inbounds/shadowsocks.md
// ============================================================

import { z } from 'zod';
import { UserLevelSchema, ShadowsocksMethodSchema } from '../primitives';

export const ShadowsocksInboundUserSchema = z.object({
  /** Per-user password (for multi-user mode with 2022-blake3-* methods) */
  password: z.string(),
  /** User email for statistics */
  email: z.string().optional(),
  /** User level for policy */
  level: UserLevelSchema,
}).passthrough();

export const ShadowsocksInboundSettingsSchema = z.object({
  /** Allowed network: "tcp", "udp", "tcp,udp" */
  network: z.string().optional(),
  /** Encryption method */
  method: ShadowsocksMethodSchema.optional(),
  /** Server password */
  password: z.string().optional(),
  /** User level */
  level: UserLevelSchema,
  /** User email */
  email: z.string().optional(),
  /** Additional users (multi-user mode, 2022-blake3-* only) */
  users: z.array(ShadowsocksInboundUserSchema).optional(),
}).passthrough();
