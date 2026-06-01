// ============================================================
// FakeDNS Schema — src/core/xray/schemas/fakedns.schema.ts
// Source: docs/config/fakedns.md
// ============================================================

import { z } from 'zod';

export const FakeDnsPoolSchema = z.object({
  /** CIDR for FakeIP address pool, e.g. "198.18.0.0/16" */
  ipPool: z.string(),
  /** Maximum number of domain-IP mappings (LRU eviction). Default: 65535 */
  poolSize: z.number().int().optional(),
}).passthrough();

// FakeDNS can be a single pool object OR an array of pools
export const FakeDnsSchema = z.union([
  FakeDnsPoolSchema,
  z.array(FakeDnsPoolSchema),
]);

export type FakeDnsConfig = z.infer<typeof FakeDnsSchema>;
