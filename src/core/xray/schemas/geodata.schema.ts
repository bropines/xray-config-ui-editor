// ============================================================
// Geodata Schema — src/core/xray/schemas/geodata.schema.ts
// Source: docs/config/geodata.md
// ============================================================

import { z } from 'zod';

export const AssetObjectSchema = z.object({
  /** Download URL for the geodata file (must be HTTPS) */
  url: z.string(),
  /** Target filename, e.g. "geoip.dat", "geosite.dat" */
  file: z.string(),
}).passthrough();

export const GeodataSchema = z.object({
  /** Standard 5-field cron expression, local timezone. E.g. "0 4 * * *" */
  cron: z.string().optional(),
  /** Outbound tag to use for downloading geodata files */
  outbound: z.string().optional(),
  /** List of geodata files to download and replace */
  assets: z.array(AssetObjectSchema).optional(),
}).passthrough();

export type GeodataConfig = z.infer<typeof GeodataSchema>;
