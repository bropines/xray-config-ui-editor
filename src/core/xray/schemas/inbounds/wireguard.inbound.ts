// ============================================================
// WireGuard Inbound Settings — Source: infra/conf/wireguard.go
// (WireGuardConfig with IsClient: false, WireGuardPeerConfig)
// ============================================================

import { z } from 'zod';
import { UserLevelSchema } from '../primitives';

/**
 * One struct serves the inbound and the outbound; this is the part a server
 * reads on at least one supported line. What only a client uses — `reserved`,
 * `domainStrategy`, `noKernelTun`, `remoteDNS`, a peer's `endpoint` — is left
 * undeclared so the JSON editor does not suggest it here, and passes through
 * untouched when a config has it. See core/xray/wireguard-inbound.ts for
 * which line reads what, and for what each of them refuses.
 */
export const WireguardInboundPeerSchema = z.object({
  /**
   * The client's public key. Build() skips an empty one and 26.7+ then refuse
   * the inbound for it (v26.7.28:proxy/wireguard/config.go:12).
   */
  publicKey: z.string(),
  /** Optional symmetric key shared with this one peer. */
  preSharedKey: z.string().optional(),
  /**
   * The tunnel addresses this peer may send from, as prefixes. Left out, the
   * core fills in "0.0.0.0/0" and "::0/0" (v26.7.28:infra/conf/wireguard.go:50).
   */
  allowedIPs: z.array(z.string()).optional(),
  /** Seconds between keep-alives sent to the peer; 0 or absent is off. */
  keepAlive: z.number().int().optional(),
  /** The user this peer is counted and routed as. 26.7+; 26.3 has no such key. */
  email: z.string().optional(),
  /** Policy level of that user. 26.7+; 26.3 has no such key. */
  level: UserLevelSchema,
}).passthrough();

export const WireguardInboundSettingsSchema = z.object({
  /** The server's private key. Required: Build() refuses an empty one on every line. */
  secretKey: z.string().optional(),
  /**
   * The server's own addresses inside the tunnel. Left out, the core uses
   * 10.0.0.1 and fd59:7153:2388:b5fd::1 (v26.7.28:infra/conf/wireguard.go:80).
   */
  address: z.array(z.string()).optional(),
  /** Peer configurations */
  peers: z.array(WireguardInboundPeerSchema).optional(),
  /** MTU size. Default: 1420 */
  mtu: z.number().int().optional(),
  /** Worker count. Read by 26.3 only (v26.3.27:infra/conf/wireguard.go:59); dropped from 26.7. */
  workers: z.number().int().optional(),
}).passthrough();
