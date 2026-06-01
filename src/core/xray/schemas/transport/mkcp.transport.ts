// ============================================================
// mKCP Transport — Source: docs/config/transports/mkcp.md
// ============================================================
import { z } from 'zod';

export const MkcpTransportSchema = z.object({
  /** MTU 576-1460. Default: 1350 */
  mtu: z.number().int().optional(),
  /** Transmission time interval in ms, 10-100. Default: 50 */
  tti: z.number().int().optional(),
  /** Uplink capacity in MB/s. Default: 5 */
  uplinkCapacity: z.number().optional(),
  /** Downlink capacity in MB/s. Default: 20 */
  downlinkCapacity: z.number().optional(),
  /** Enable congestion control */
  congestion: z.boolean().optional(),
  /** Read buffer size in MB. Default: 2 */
  readBufferSize: z.number().optional(),
  /** Write buffer size in MB. Default: 2 */
  writeBufferSize: z.number().optional(),
}).passthrough();
