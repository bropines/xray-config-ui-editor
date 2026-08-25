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
  /**
   * EXPERIMENTAL — not in a tagged Xray-core release yet (landed on main
   * 2026-08-25, commit c7e569b0, "WireGuard outbound: Add `remoteDNS` &
   * honor TTL"). DNS server(s) the WireGuard tunnel itself resolves through,
   * distinct from the outer Xray DNS module — useful when the WG peer's
   * network has internal-only DNS. json:"remoteDNS" -> []string.
   */
  remoteDNS: z.array(z.string()).optional(),
}).passthrough();
