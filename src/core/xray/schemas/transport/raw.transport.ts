// ============================================================
// RAW Transport — Source: docs/config/transports/raw.md
// ============================================================
import { z } from 'zod';

export const HttpRequestObjectSchema = z.object({
  version: z.string().optional(),
  method: z.string().optional(),
  path: z.array(z.string()).optional(),
  headers: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
}).passthrough();

export const HttpResponseObjectSchema = z.object({
  version: z.string().optional(),
  status: z.string().optional(),
  reason: z.string().optional(),
  headers: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
}).passthrough();

export const RawHeaderSchema = z.union([
  z.object({ type: z.literal('none') }).passthrough(),
  z.object({
    type: z.literal('http'),
    request: HttpRequestObjectSchema.optional(),
    response: HttpResponseObjectSchema.optional(),
  }).passthrough(),
]);

export const RawTransportSchema = z.object({
  acceptProxyProtocol: z.boolean().optional(),
  header: RawHeaderSchema.optional(),
}).passthrough();
