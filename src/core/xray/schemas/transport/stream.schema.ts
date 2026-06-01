// ============================================================
// StreamSettings Schema (wrapper) — Source: docs/config/transport.md
// ============================================================
import { z } from 'zod';
import { TransportNetworkSchema, TransportSecuritySchema } from '../primitives';
import { RawTransportSchema } from './raw.transport';
import { WebSocketTransportSchema } from './websocket.transport';
import { GrpcTransportSchema } from './grpc.transport';
import { HttpUpgradeTransportSchema } from './httpupgrade.transport';
import { MkcpTransportSchema } from './mkcp.transport';
import { XhttpTransportSchema } from './xhttp.transport';
import { HysteriaTransportSchema } from './hysteria.transport';
import { TlsSchema } from './tls.schema';
import { RealitySchema } from './reality.schema';
import { SockoptSchema } from './sockopt.schema';
import { FinalMaskSchema } from './finalmask.schema';

export const StreamSettingsSchema = z.object({
  // --- Transport ---
  /** Transport type: raw, xhttp, mkcp, grpc, websocket, httpupgrade, hysteria (+ aliases) */
  network: z.union([TransportNetworkSchema, z.string()]).optional(),
  rawSettings: RawTransportSchema.optional(),
  /** Alias: tcpSettings maps to rawSettings */
  tcpSettings: RawTransportSchema.optional(),
  xhttpSettings: XhttpTransportSchema.optional(),
  /** Alias: splithttpSettings maps to xhttpSettings */
  splithttpSettings: XhttpTransportSchema.optional(),
  kcpSettings: MkcpTransportSchema.optional(),
  grpcSettings: GrpcTransportSchema.optional(),
  wsSettings: WebSocketTransportSchema.optional(),
  httpupgradeSettings: HttpUpgradeTransportSchema.optional(),
  hysteriaSettings: HysteriaTransportSchema.optional(),

  // --- Security ---
  /** Transport security: none, tls, reality */
  security: TransportSecuritySchema.optional(),
  tlsSettings: TlsSchema.optional(),
  realitySettings: RealitySchema.optional(),

  // --- Additional ---
  finalmask: FinalMaskSchema.optional(),
  sockopt: SockoptSchema.optional(),
}).passthrough();

export type StreamSettings = z.infer<typeof StreamSettingsSchema>;
