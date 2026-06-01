// ============================================================
// Hysteria Transport — Source: docs/config/transports/hysteria.md
// ============================================================
import { z } from 'zod';
import { HysteriaMasqueradeTypeSchema } from '../primitives';

export const HysteriaMasqueradeSchema = z.object({
  type: HysteriaMasqueradeTypeSchema.optional(),
  dir: z.string().optional(),
  url: z.string().optional(),
  rewriteHost: z.boolean().optional(),
  insecure: z.boolean().optional(),
  content: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  statusCode: z.number().int().optional(),
}).passthrough();

export const HysteriaTransportSchema = z.object({
  version: z.literal(2).optional(),
  auth: z.string().optional(),
  udpIdleTimeout: z.number().int().optional(),
  masquerade: HysteriaMasqueradeSchema.optional(),
}).passthrough();
