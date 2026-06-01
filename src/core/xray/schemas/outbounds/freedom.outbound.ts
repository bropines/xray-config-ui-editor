// ============================================================
// Freedom Outbound — Source: docs/config/outbounds/freedom.md
// ============================================================
import { z } from 'zod';
import { DomainStrategyFullSchema, UserLevelSchema, Int32RangeSchema } from '../primitives';

export const FreedomFinalRuleSchema = z.object({
  action: z.enum(['allow', 'block']).optional(),
  network: z.string().optional(),
  port: z.number().int().optional(),
  ip: z.array(z.string()).optional(),
}).passthrough();

export const FreedomNoiseSchema = z.object({
  /** Noise type: "rand", "str", or custom */
  type: z.string().optional(),
  /** Fixed packet data */
  packet: z.string().optional(),
  /** Delay in ms before sending (Int32Range) */
  delay: Int32RangeSchema.optional(),
}).passthrough();

export const FreedomFragmentSchema = z.object({
  /** "tlshello" or "1-3" style TCP stream slice */
  packets: z.string().optional(),
  /** Fragment size in bytes (Int32Range) */
  length: Int32RangeSchema.optional(),
  /** Delay between fragments in ms (Int32Range) */
  interval: Int32RangeSchema.optional(),
}).passthrough();

export const FreedomOutboundSettingsSchema = z.object({
  /** Domain resolution strategy */
  domainStrategy: DomainStrategyFullSchema.optional(),
  /** Redirect destination "addr:port" */
  redirect: z.string().optional(),
  /** User level for policy */
  userLevel: UserLevelSchema,
  /** TLS fragment settings */
  fragment: FreedomFragmentSchema.optional(),
  /** Noise packets to send */
  noises: z.array(FreedomNoiseSchema).optional(),
  /** Send PROXY protocol (0=disabled, 1=v1, 2=v2) */
  proxyProtocol: z.number().int().optional(),
  /** Final rules for allowlisting/blocking */
  finalRules: z.array(FreedomFinalRuleSchema).optional(),
}).passthrough();
