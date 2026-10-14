// ============================================================
// MASQUE Inbound Settings — Source: infra/conf/masque.go (MasqueServerConfig)
// ============================================================

import { z } from 'zod';
import { UserLevelSchema } from '../primitives';

/**
 * A user of the masque server, signed in with Basic credentials: the email is
 * the user name and `pass` the password.
 *
 * Build() refuses an empty `email`, one with a colon in it (the colon is the
 * separator in the sign-in), a repeated one (compared in lower case) and an
 * empty `pass` (v26.10.10:infra/conf/masque.go:63-77).
 */
export const MasqueInboundUserSchema = z.object({
  /** Required, non-empty. */
  pass: z.string().optional(),
  /** Required, unique without regard to case, and may not contain a colon. */
  email: z.string().optional(),
  level: UserLevelSchema,
}).passthrough();

/**
 * 0 or absent is the default (1280); anything else has to be 1280–65535.
 * v26.10.10:infra/conf/masque.go:99-101.
 */
const MasqueMtuSchema = z.number().int().refine(
  value => value === 0 || (value >= 1280 && value <= 65535),
  { message: 'mtu must be 0 (the default) or between 1280 and 65535' },
);

/**
 * The server end of CONNECT-IP over HTTP/3 or HTTP/2, from 26.10.
 *
 * `address` is the prefix pool handed to clients, not a listen address: at
 * least one, at most one IPv4 and one IPv6 prefix, each a valid CIDR (:84-98).
 * The server keeps the prefix's own address for itself, so it has to be a host
 * address inside the network — not the network address, and for IPv4 not the
 * broadcast address — with an address left over for a client
 * (v26.10.10:proxy/masque/pool.go:20-45). `10.250.0.1/24` is the shape.
 *
 * It listens on an IP address (the `listen` of the inbound), never a name, and
 * needs `streamSettings` of network masque with security tls.
 */
export const MasqueInboundSettingsSchema = z.object({
  /** Same list as `users`; when both are present `clients` wins, even empty. */
  clients: z.array(MasqueInboundUserSchema).optional(),
  users: z.array(MasqueInboundUserSchema).optional(),
  /** CIDR prefixes assigned to clients — one IPv4 and/or one IPv6. */
  address: z.array(z.string()).optional(),
  /** 0 or absent for the default, otherwise 1280–65535. */
  mtu: MasqueMtuSchema.optional(),
}).passthrough();
