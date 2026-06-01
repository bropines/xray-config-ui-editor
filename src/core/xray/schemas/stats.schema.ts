// ============================================================
// Stats Schema — src/core/xray/schemas/stats.schema.ts
// Source: docs/config/stats.md
// ============================================================

import { z } from 'zod';

// Stats requires no parameters — its mere presence enables statistics
export const StatsSchema = z.object({}).passthrough();

export type StatsConfig = z.infer<typeof StatsSchema>;
