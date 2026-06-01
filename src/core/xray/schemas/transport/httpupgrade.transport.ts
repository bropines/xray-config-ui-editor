// ============================================================
// HTTPUpgrade Transport — Source: docs/config/transports/httpupgrade.md
// ============================================================
import { z } from 'zod';

export const HttpUpgradeTransportSchema = z.object({
  acceptProxyProtocol: z.boolean().optional(),
  path: z.string().optional(),
  host: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
}).passthrough();
