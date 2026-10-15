// ============================================================
// VLESS Inbound Settings — Source: docs/config/inbounds/vless.md
// ============================================================

import { z } from 'zod';
import { UserLevelSchema } from '../primitives';
import { FallbackObjectSchema } from '../fallback.schema';

/**
 * Flows a VLESS *inbound* takes, compared exactly on every line
 * (v26.3.27:infra/conf/vless.go:65, v26.9.9:infra/conf/vless.go:77).
 * `xtls-rprx-vision-udp443` is a client-side value; on an inbound it fails
 * the load.
 */
export const VlessInboundFlowSchema = z.enum(['', 'xtls-rprx-vision']);

export const VlessInboundUserSchema = z.object({
  /** User UUID */
  id: z.string(),
  /** User level for policy. Default: 0 */
  level: UserLevelSchema,
  /** User email for statistics */
  email: z.string().optional(),
  /** XTLS flow control: "" or "xtls-rprx-vision" */
  flow: VlessInboundFlowSchema.optional(),
  /** VLESS reverse proxy config */
  reverse: z.object({
    tag: z.string().optional(),
    sniffing: z.object({
      enabled: z.boolean().optional(),
      destOverride: z.array(z.string()).optional(),
    }).passthrough().optional(),
  }).passthrough().optional(),
}).passthrough();

export const VlessInboundSettingsSchema = z.object({
  /**
   * Authorized users. The only spelling 26.3 reads, and on 26.7+ it wins over
   * `users` whenever present, even empty (v26.7.28:infra/conf/vless.go:46).
   */
  clients: z.array(VlessInboundUserSchema).optional(),
  /** 26.7+ alias of `clients`; 26.3 ignores it and loads the inbound with no users. */
  users: z.array(VlessInboundUserSchema).optional(),
  /** Default flow applied to clients that do not set their own. */
  flow: VlessInboundFlowSchema.optional(),
  /**
   * "none", or a VLESS Encryption string (what `xray vlessenc` prints) - see
   * core/xray/vless-encryption.ts. Every supported line refuses a VLESS inbound
   * without one, so it is never left out.
   */
  decryption: z.string().optional(),
  /** Fallback configurations for active probing resistance */
  fallbacks: z.array(FallbackObjectSchema).optional(),
}).passthrough();
