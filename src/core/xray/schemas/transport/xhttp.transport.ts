// ============================================================
// XHTTP Transport — Source: GitHub discussion #4113
// Full schema based on XHTTP: Beyond REALITY documentation
// ============================================================
import { z } from 'zod';
import { XhttpModeSchema, Int32RangeSchema } from '../primitives';

// --- XMUX (multiplexing control for H2/H3) ---
export const XmuxSchema = z.object({
  /** Max concurrent proxy requests per TCP/QUIC connection. Default when all 0: "16-32" */
  maxConcurrency: Int32RangeSchema.optional(),
  /** Max simultaneous connections. Conflicts with maxConcurrency */
  maxConnections: Int32RangeSchema.optional(),
  /** Max reuse times per connection. Default: 0 (unlimited) */
  cMaxReuseTimes: Int32RangeSchema.optional(),
  /** Max HTTP requests per connection. Default when all 0: "600-900" */
  hMaxRequestTimes: Int32RangeSchema.optional(),
  /** Max reusable seconds per connection. Default when all 0: "1800-3000" */
  hMaxReusableSecs: Int32RangeSchema.optional(),
  /** H2/H3 keep-alive period in seconds. Default: 0 (Chrome H2=45s, quic-go H3=10s) */
  hKeepAlivePeriod: z.number().optional(),
}).passthrough();

// --- Download Settings (for upload/download separation) ---
// This is essentially a recursive StreamSettings-like object
export const XhttpDownloadSettingsSchema = z.object({
  /** Another domain/IP for download path */
  address: z.string().optional(),
  /** Port for download connection */
  port: z.number().int().optional(),
  /** Must be "xhttp" */
  network: z.string().optional(),
  /** Security: "tls" or "reality" */
  security: z.string().optional(),
  /** TLS settings for download */
  tlsSettings: z.record(z.string(), z.unknown()).optional(),
  /** REALITY settings for download */
  realitySettings: z.record(z.string(), z.unknown()).optional(),
  /** XHTTP settings for download (recursive) */
  xhttpSettings: z.record(z.string(), z.unknown()).optional(),
  /** Sockopt for download */
  sockopt: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

// --- Extra (low-frequency parameters, can be shared via link) ---
export const XhttpExtraSchema = z.object({
  /** Custom HTTP headers */
  headers: z.record(z.string(), z.string()).optional(),
  /** Header padding size. Default: "100-1000" */
  xPaddingBytes: Int32RangeSchema.optional(),
  /** Disable gRPC Content-Type header for stream-up/one. Client only */
  noGRPCHeader: z.boolean().optional(),
  /** Disable SSE Content-Type header. Server only */
  noSSEHeader: z.boolean().optional(),

  // --- packet-up specific ---
  /** Max bytes per POST request. Default: 1000000 (1MB). Packet-up only */
  scMaxEachPostBytes: Int32RangeSchema.optional(),
  /** Min interval between POSTs in ms. Default: 30. Packet-up, client only */
  scMinPostsIntervalMs: Int32RangeSchema.optional(),
  /** Max buffered POST requests. Default: 30. Packet-up, server only */
  scMaxBufferedPosts: z.number().int().optional(),

  // --- stream-up specific ---
  /** Server-side keepalive interval for stream-up in seconds. Default: "20-80". Server only */
  scStreamUpServerSecs: Int32RangeSchema.optional(),

  /** XMUX configuration (H2/H3 multiplexing). Client only */
  xmux: XmuxSchema.optional(),

  /** Download settings for upload/download separation. Client only */
  downloadSettings: XhttpDownloadSettingsSchema.optional(),
}).passthrough();

// --- Top-level XHTTP Transport ---
export const XhttpTransportSchema = z.object({
  /** HTTP host header */
  host: z.string().optional(),
  /** HTTP path. Must be same for upload and download */
  path: z.string().optional(),
  /** XHTTP mode: auto, packet-up, stream-up, stream-one */
  mode: XhttpModeSchema.optional(),
  /** Extended parameters (low-frequency, shareable) */
  extra: XhttpExtraSchema.optional(),
}).passthrough();
