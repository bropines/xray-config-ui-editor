// ============================================================
// MASQUE Transport — Source: infra/conf/transport_method.go (MasqueConfig)
// ============================================================
import { z } from 'zod';

/**
 * Connect to Cloudflare WARP over MASQUE (26.10). The three fields are the
 * device's identity as WARP issued it (v26.10.10:infra/conf/transport_method.go:798-802):
 *
 *   privateKey  ECDSA on P-256, PKCS #8 or SEC 1, as PEM or standard base64
 *   publicKey   the key the WARP endpoint has to present: PKIX, PEM or base64
 *   address     what WARP assigned the device: at most one IPv4 and one IPv6
 *               address (a bare address or a prefix)
 *
 * All three are required when `warp` is there. `host` then defaults to
 * cloudflareaccess.com and `path` to `/`, and `user` / `pass` cannot be used.
 */
export const MasqueWarpSchema = z.object({
  privateKey: z.string().optional(),
  publicKey: z.string().optional(),
  address: z.array(z.string()).optional(),
}).passthrough();

/**
 * How the tunnel dresses itself up as a web request, from 26.10.
 *
 * `path` falls back to the well-known one (/.well-known/masque/ip/ followed by
 * two wildcard segments) when empty; it may use the variables target and
 * ipproto in braces, and has to
 * start with a slash. `user` / `pass` build a Basic Authorization header and
 * are separate from the inbound's own user list. `host` is a host name with an
 * optional port. Headers are text; Host and Capsule-Protocol are refused, and
 * so is Authorization while user or pass is set
 * (v26.10.10:infra/conf/transport_method.go:813-880).
 *
 * Only a masque proxy may carry this transport, and it may carry no other.
 */
export const MasqueTransportSchema = z.object({
  /** Host header sent with the request. */
  host: z.string().optional(),
  /** Request path. Empty means the core's default. */
  path: z.string().optional(),
  user: z.string().optional(),
  pass: z.string().optional(),
  /** Extra request headers. */
  headers: z.record(z.string(), z.string()).optional(),
  /** Connect to Cloudflare WARP. 26.10 only. */
  warp: MasqueWarpSchema.optional(),
}).passthrough();
