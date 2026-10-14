// ============================================================
// MASQUE Outbound — Source: infra/conf/masque.go (MasqueClientConfig)
// ============================================================
import { z } from 'zod';

/**
 * MASQUE: CONNECT-IP over HTTP/3 (or HTTP/2, by the TLS ALPN), so the tunnel
 * is an ordinary web request as far as anything watching is concerned.
 * Registered from 26.10 only (v26.10.10:infra/conf/xray.go:53).
 *
 * Three fields, all of them checked at load: the core refuses the config when
 * `address` or `port` is missing, and when any `remoteDNS` entry is not an IP
 * literal (`netip.ParseAddr`) — a hostname there does not fail later, it fails
 * immediately (v26.10.10:infra/conf/masque.go:20-39).
 *
 * What it needs around it, enforced as the handler is created or the config
 * loaded (core/xray/masque.ts holds each rule with its source):
 *   - `streamSettings.network: "masque"` — the only transport it runs on, and
 *     the only proxy that may use it;
 *   - `security: "tls"` — without it the outbound does not start;
 *   - no Mux: "masque outbound does not support mux"
 *     (v26.10.10:infra/conf/xray.go:347-350). Other outbounds that cannot carry
 *     Mux simply have no use for it; this one is refused by name.
 */
export const MasqueOutboundSettingsSchema = z.object({
  /** Server address. Required. */
  address: z.string().optional(),
  /** Server port, 1–65535. Required. */
  port: z.number().int().optional(),
  /**
   * Resolvers reachable through the tunnel. IP literals only; empty means the
   * four Cloudflare ones (v26.10.10:proxy/masque/client.go:72-75).
   */
  remoteDNS: z.array(z.string()).optional(),
}).passthrough();
