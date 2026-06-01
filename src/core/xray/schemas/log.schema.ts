// ============================================================
// Log Schema — src/core/xray/schemas/log.schema.ts
// Source: docs/config/log.md
// ============================================================

import { z } from 'zod';
import { LogLevelSchema } from './primitives';

export const LogSchema = z.object({
  /** Path to access log file. Empty = stdout, "none" = discard */
  access: z.string().optional(),
  /** Path to error log file. Empty = stdout, "none" = discard */
  error: z.string().optional(),
  /** Log level: debug, info, warning, error, none */
  loglevel: LogLevelSchema.optional(),
  /** Enable DNS query logging (requires debug level) */
  dnsLog: z.boolean().optional(),
  /** Mask IP addresses in logs. "quarter"=mask 1/4, "half"=mask 1/2, "full"=mask all, or custom mask string */
  maskAddress: z.string().optional(),
}).passthrough();

export type LogConfig = z.infer<typeof LogSchema>;
