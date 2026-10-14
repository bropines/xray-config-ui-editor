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
import { MasqueTransportSchema } from './masque.transport';
import { TlsSchema } from './tls.schema';
import { RealitySchema } from './reality.schema';
import { SockoptSchema } from './sockopt.schema';
import { FinalMaskSchema } from './finalmask.schema';

export const StreamSettingsSchema = z.object({
  // --- Transport ---
  /** Transport type: raw, xhttp, mkcp, grpc, websocket, httpupgrade, hysteria, masque (+ aliases) */
  network: z.union([TransportNetworkSchema, z.string()]).optional(),
  /**
   * 26.7's alias of network, and the one that wins when both are set
   * (v26.7.28:infra/conf/transport_internet.go:75); 26.3 ignores it. The
   * editor never writes it — it shows one a config has, see TransportSettings.
   */
  method: z.union([TransportNetworkSchema, z.string()]).optional(),
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
  /** 26.10. Only a masque proxy may carry this, and only this. */
  masqueSettings: MasqueTransportSchema.optional(),

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
