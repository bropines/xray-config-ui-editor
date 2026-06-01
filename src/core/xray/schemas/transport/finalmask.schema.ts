// ============================================================
// FinalMask Schema — Source: docs/config/transports/finalmask.md
// ============================================================
import { z } from 'zod';
import {
  TcpMaskTypeSchema, UdpMaskTypeSchema,
  QuicCongestionSchema, BbrProfileSchema, Int32RangeSchema,
} from '../primitives';

// --- TCP Mask Item ---
export const TcpMaskItemSchema = z.object({
  type: TcpMaskTypeSchema.optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

// --- UDP Mask Item ---
export const UdpMaskItemSchema = z.object({
  type: UdpMaskTypeSchema.optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

// --- UDP Hop ---
export const UdpHopSchema = z.object({
  ports: z.string().optional(),
  interval: Int32RangeSchema.optional(),
}).passthrough();

// --- QUIC Params ---
export const QuicParamsSchema = z.object({
  congestion: QuicCongestionSchema.optional(),
  bbrProfile: BbrProfileSchema.optional(),
  debug: z.boolean().optional(),
  brutalUp: z.union([z.string(), z.number()]).optional(),
  brutalDown: z.union([z.string(), z.number()]).optional(),
  udpHop: UdpHopSchema.optional(),
  initStreamReceiveWindow: z.number().int().optional(),
  maxStreamReceiveWindow: z.number().int().optional(),
  initConnectionReceiveWindow: z.number().int().optional(),
  maxConnectionReceiveWindow: z.number().int().optional(),
  maxIdleTimeout: z.number().optional(),
  keepAlivePeriod: z.number().optional(),
  disablePathMTUDiscovery: z.boolean().optional(),
  maxIncomingStreams: z.number().int().optional(),
}).passthrough();

// --- FinalMask Object ---
export const FinalMaskSchema = z.object({
  tcp: z.array(TcpMaskItemSchema).optional(),
  udp: z.array(UdpMaskItemSchema).optional(),
  quicParams: QuicParamsSchema.optional(),
}).passthrough();
