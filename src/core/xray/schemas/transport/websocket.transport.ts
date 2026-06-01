// ============================================================
// WebSocket Transport — Source: docs/config/transports/websocket.md
// ============================================================
import { z } from 'zod';

export const WebSocketTransportSchema = z.object({
  acceptProxyProtocol: z.boolean().optional(),
  path: z.string().optional(),
  host: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  heartbeatPeriod: z.number().int().optional(),
}).passthrough();
