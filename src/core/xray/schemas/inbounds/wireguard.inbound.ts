// ============================================================
// WireGuard Inbound Settings — Source: docs/config/inbounds/wireguard.md
// ============================================================

import { z } from 'zod';

export const WireguardInboundPeerSchema = z.object({
  /** Peer public key */
  publicKey: z.string(),
  /** Allowed source IPs */
  allowedIPs: z.array(z.string()).optional(),
}).passthrough();

export const WireguardInboundSettingsSchema = z.object({
  /** Server private key */
  secretKey: z.string().optional(),
  /** Peer configurations */
  peers: z.array(WireguardInboundPeerSchema).optional(),
  /** MTU size. Default: 1420 */
  mtu: z.number().int().optional(),
}).passthrough();
