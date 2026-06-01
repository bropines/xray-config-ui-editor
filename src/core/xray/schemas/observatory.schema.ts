// ============================================================
// Observatory Schema — src/core/xray/schemas/observatory.schema.ts
// Source: docs/config/observatory.md
// ============================================================

import { z } from 'zod';

// --- Observatory (background probing) ---
export const ObservatorySchema = z.object({
  /** Prefix-match selectors for outbound tags to observe */
  subjectSelector: z.array(z.string()).optional(),
  /** URL used for probing outbound connectivity */
  probeUrl: z.string().optional(),
  /** Probe interval (e.g. "10s", "2h45m"). Supports: ns, us, ms, s, m, h */
  probeInterval: z.string().optional(),
  /** true = concurrent probing all matched outbounds, false = sequential */
  enableConcurrency: z.boolean().optional(),
}).passthrough();

// --- PingConfig for BurstObservatory ---
export const PingConfigSchema = z.object({
  /** URL for probing, should return HTTP 204. Default: "https://connectivitycheck.gstatic.com/generate_204" */
  destination: z.string().optional(),
  /** URL for local connectivity check. Empty = disabled */
  connectivity: z.string().optional(),
  /** Average probe interval per outbound. Min "10s". Default: "1m" */
  interval: z.string().optional(),
  /** Number of recent probe results to keep. Default: 10 */
  sampling: z.number().int().optional(),
  /** Probe timeout. Default: "5s" */
  timeout: z.string().optional(),
  /** HTTP method for probing. Default: "HEAD" */
  httpMethod: z.string().optional(),
}).passthrough();

// --- BurstObservatory ---
export const BurstObservatorySchema = z.object({
  /** Prefix-match selectors for outbound tags to observe */
  subjectSelector: z.array(z.string()).optional(),
  /** Ping configuration */
  pingConfig: PingConfigSchema.optional(),
}).passthrough();

export type ObservatoryConfig = z.infer<typeof ObservatorySchema>;
export type BurstObservatoryConfig = z.infer<typeof BurstObservatorySchema>;
