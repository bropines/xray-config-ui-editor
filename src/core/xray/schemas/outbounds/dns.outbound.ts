// ============================================================
// DNS Outbound — Source: docs/config/outbounds/dns.md
// ============================================================
import { z } from 'zod';
import { UserLevelSchema } from '../primitives';

export const DnsOutboundRuleSchema = z.object({
  /** Action: direct, hijack, drop, return */
  action: z.enum(['direct', 'hijack', 'drop', 'return']).optional(),
  /** Match DNS query type (number or range string "5-10" or "11,13,15-17") */
  qType: z.union([z.number(), z.string()]).optional(),
  /** DNS RCODE for return action (0-65535). Default: 0 */
  rCode: z.number().int().optional(),
  /** Domain match list (same as routing rule domain) */
  domain: z.array(z.string()).optional(),
}).passthrough();

export const DnsOutboundSettingsSchema = z.object({
  /** Rewrite transport protocol: "tcp" or "udp" */
  rewriteNetwork: z.enum(['tcp', 'udp']).optional(),
  /** Rewrite DNS server address */
  rewriteAddress: z.string().optional(),
  /** Rewrite DNS server port */
  rewritePort: z.number().int().optional(),
  /** User level for policy */
  userLevel: UserLevelSchema,
  /** DNS query rules */
  rules: z.array(DnsOutboundRuleSchema).optional(),
}).passthrough();
