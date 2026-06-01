// ============================================================
// REALITY Schema — Source: docs/config/transports/reality.md
// ============================================================
import { z } from 'zod';

export const RealityLimitSchema = z.object({
  afterBytes: z.number().optional(),
  bytesPerSec: z.number().optional(),
  burstBytesPerSec: z.number().optional(),
}).passthrough();

// Combined server + client fields (core distinguishes by presence of "target")
export const RealitySchema = z.object({
  // --- Server fields ---
  show: z.boolean().optional(),
  /** Fallback target (presence = server mode). Format like fallback dest */
  target: z.string().optional(),
  /** Alias for target (legacy) */
  dest: z.string().optional(),
  xver: z.number().int().optional(),
  serverNames: z.array(z.string()).optional(),
  privateKey: z.string().optional(),
  minClientVer: z.string().optional(),
  maxClientVer: z.string().optional(),
  maxTimeDiff: z.number().optional(),
  shortIds: z.array(z.string()).optional(),
  mldsa65Seed: z.string().optional(),
  limitFallbackUpload: RealityLimitSchema.optional(),
  limitFallbackDownload: RealityLimitSchema.optional(),

  // --- Client fields ---
  serverName: z.string().optional(),
  fingerprint: z.string().optional(),
  /** Public key (renamed from publicKey to password) */
  password: z.string().optional(),
  /** Legacy alias for password */
  publicKey: z.string().optional(),
  shortId: z.string().optional(),
  mldsa65Verify: z.string().optional(),
  spiderX: z.string().optional(),
}).passthrough();
