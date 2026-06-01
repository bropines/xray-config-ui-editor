// ============================================================
// API Schema — src/core/xray/schemas/api.schema.ts
// Source: docs/config/api.md
// ============================================================

import { z } from 'zod';
import { ApiServiceSchema } from './primitives';

export const ApiSchema = z.object({
  /** Outbound proxy tag for API */
  tag: z.string().optional(),
  /** API service listen address, e.g. "127.0.0.1:8080" */
  listen: z.string().optional(),
  /** List of enabled API services */
  services: z.array(ApiServiceSchema).optional(),
}).passthrough();

export type ApiConfig = z.infer<typeof ApiSchema>;
