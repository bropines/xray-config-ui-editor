// ============================================================
// Shadowsocks Outbound Settings — Source: docs/config/outbounds/shadowsocks.md
// ============================================================
import { z } from 'zod';
import { UserLevelSchema, ShadowsocksMethodSchema } from '../primitives';

/** One server in the grouped form. */
export const ShadowsocksServerSchema = z.object({
  address: z.string().optional(),
  port: z.number().int().optional(),
  method: ShadowsocksMethodSchema.optional(),
  password: z.string().optional(),
  email: z.string().optional(),
  level: UserLevelSchema,
  /**
   * UDP over TCP: read by Xray 26.3, gone from 26.7 on.
   *
   * v26.3.27 declares `uot` and `uotVersion` on the server entry
   * (infra/conf/shadowsocks.go:168-169) and on the flat client config, which
   * copies them into `servers[0]` when `address` is set (:179-180 and
   * :187-199). Only the Shadowsocks 2022 builder passes them on (:223-224); the
   * builder for the classic ciphers (:229-263) never looks at them. v26.7.28
   * and v26.9.9 have neither: their structs are address, port, level, email,
   * method, password and, on the client, servers
   * (v26.7.28:infra/conf/shadowsocks.go:179-186 and :188-196), so the keys are
   * dropped without a word. Declared so a config that carries them reads as
   * understood; the server card offers `uot` only on the line that reads it,
   * and nothing writes `uotVersion`.
   *
   * The spelling: the tag is `uotVersion`. Go's decoder matches keys without
   * regard to case (encoding/json, imported at v26.7.28:infra/conf/loader.go:4),
   * so a config that said `UoTVersion` was read by 26.3 all the same. What
   * this schema used to say, `UoTVersion`, did not match the key a config
   * actually holds, so the editor saw nothing where the core saw a value.
   */
  uot: z.boolean().optional(),
  uotVersion: z.number().int().optional(),
}).passthrough();

export const ShadowsocksOutboundSettingsSchema = z.object({
  /**
   * Servers in grouped form. Both spellings are read on every line, and a
   * `servers` list is replaced by the flat fields whenever `address` is set
   * (v26.3.27:infra/conf/shadowsocks.go:187-200,
   * v26.7.28:infra/conf/shadowsocks.go:201-212), and "exactly one server"
   * holds either way (v26.3.27 :201-203, v26.7.28 :213-215).
   */
  servers: z.array(ShadowsocksServerSchema).optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  port: z.number().int().optional(),
  method: ShadowsocksMethodSchema.optional(),
  password: z.string().optional(),
  level: UserLevelSchema,
}).passthrough();
