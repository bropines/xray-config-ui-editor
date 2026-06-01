// ============================================================
// Metrics Schema — src/core/xray/schemas/metrics.schema.ts
// Source: docs/config/metrics.md
// ============================================================

import { z } from 'zod';

export const MetricsSchema = z.object({
  /** Outbound tag for metrics, auto-set to "Metrics" if listen is set and tag is empty */
  tag: z.string().optional(),
  /** Listen address:port for metrics HTTP server, e.g. "127.0.0.1:11111" */
  listen: z.string().optional(),
}).passthrough();

export type MetricsConfig = z.infer<typeof MetricsSchema>;
