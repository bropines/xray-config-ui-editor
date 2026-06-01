// ============================================================
// Policy Schema — src/core/xray/schemas/policy.schema.ts
// Source: docs/config/policy.md
// ============================================================

import { z } from 'zod';

export const LevelPolicySchema = z.object({
  /** Handshake timeout in seconds. Default: 4 */
  handshake: z.number().optional(),
  /** Connection idle timeout in seconds. Default: 300 */
  connIdle: z.number().optional(),
  /** Time to wait after downlink closes, in seconds. Default: 2 */
  uplinkOnly: z.number().optional(),
  /** Time to wait after uplink closes, in seconds. Default: 5 */
  downlinkOnly: z.number().optional(),
  /** Enable per-user uplink traffic statistics */
  statsUserUplink: z.boolean().optional(),
  /** Enable per-user downlink traffic statistics */
  statsUserDownlink: z.boolean().optional(),
  /** Enable per-user online count statistics (active within 20s) */
  statsUserOnline: z.boolean().optional(),
  /** Internal buffer size per request in KB. Platform-dependent defaults */
  bufferSize: z.number().int().optional(),
}).passthrough();

export const SystemPolicySchema = z.object({
  /** Enable inbound uplink traffic statistics */
  statsInboundUplink: z.boolean().optional(),
  /** Enable inbound downlink traffic statistics */
  statsInboundDownlink: z.boolean().optional(),
  /** Enable outbound uplink traffic statistics */
  statsOutboundUplink: z.boolean().optional(),
  /** Enable outbound downlink traffic statistics */
  statsOutboundDownlink: z.boolean().optional(),
}).passthrough();

export const PolicySchema = z.object({
  /** Per-level policy settings. Key is string number, e.g. "0", "1" */
  levels: z.record(z.string(), LevelPolicySchema).optional(),
  /** System-wide policy settings */
  system: SystemPolicySchema.optional(),
}).passthrough();

export type PolicyConfig = z.infer<typeof PolicySchema>;
