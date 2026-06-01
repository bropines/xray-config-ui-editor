// ============================================================
// WireGuard Outbound — Source: docs/config/outbounds/wireguard.md
// ============================================================
import { z } from 'zod';
import { WireguardDomainStrategySchema } from '../primitives';

export const WireguardOutboundPeerSchema = z.object({
  /** Server endpoint "addr:port" */
  endpoint: z.string(),
  /** Server public key */
  publicKey: z.string(),
  /** Pre-shared key for additional encryption */
  preSharedKey: z.string().optional(),
  /** KeepAlive interval in seconds. Default: 0 */
  keepAlive: z.number().int().optional(),
  /** Allowed destination IPs. Default: ["0.0.0.0/0", "::/0"] */
  allowedIPs: z.array(z.string()).optional(),
}).passthrough();

export const WireguardOutboundSettingsSchema = z.object({
  /** Client private key (required) */
  secretKey: z.string().optional(),
  /** Virtual TUN addresses (IPv4/IPv6 CIDR) */
  address: z.array(z.string()).optional(),
  /** Peer server configurations */
  peers: z.array(WireguardOutboundPeerSchema).optional(),
  /** Disable kernel TUN, use gVisor instead */
  noKernelTun: z.boolean().optional(),
  /** MTU size. Default: 1420 */
  mtu: z.number().int().optional(),
  /** WireGuard reserved bytes */
  reserved: z.array(z.number()).optional(),
  /** Number of worker threads. Default: runtime.NumCPU() */
  workers: z.number().int().optional(),
  /** Domain resolution strategy for endpoints and proxied traffic */
  domainStrategy: WireguardDomainStrategySchema.optional(),
}).passthrough();
