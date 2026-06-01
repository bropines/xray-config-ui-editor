// ============================================================
// gRPC Transport — Source: docs/config/transports/grpc.md
// ============================================================
import { z } from 'zod';

export const GrpcTransportSchema = z.object({
  authority: z.string().optional(),
  serviceName: z.string().optional(),
  multiMode: z.boolean().optional(),
  user_agent: z.string().optional(),
  idle_timeout: z.number().optional(),
  health_check_timeout: z.number().optional(),
  permit_without_stream: z.boolean().optional(),
  initial_windows_size: z.number().int().optional(),
}).passthrough();
