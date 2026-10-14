// ============================================================
// TLS Schema — Source: docs/config/transports/tls.md
// ============================================================
import { z } from 'zod';
import { CertificateUsageSchema } from '../primitives';

export const CertificateObjectSchema = z.object({
  ocspStapling: z.number().optional(),
  oneTimeLoading: z.boolean().optional(),
  usage: CertificateUsageSchema.optional(),
  buildChain: z.boolean().optional(),
  certificateFile: z.string().optional(),
  keyFile: z.string().optional(),
  certificate: z.array(z.string()).optional(),
  key: z.array(z.string()).optional(),
}).passthrough();

/**
 * One struct on both sides; which half the core reads is in
 * core/xray/field-directions.ts, and what each release does with a key is in
 * core/xray/versions (features.transport.ts and the generated rows).
 *
 * `verifyPeerCertInNames` is deliberately absent — passthrough keeps it when a
 * config has one — because no supported line uses it: 26.3 refuses any value
 * (v26.3.27:infra/conf/transport_internet.go:736) and 26.7 dropped the key.
 * `allowInsecure` stays so an existing value still types, but `true` is
 * refused on every line and the form never offers it.
 */
export const TlsSchema = z.object({
  serverName: z.string().optional(),
  /** Comma-separated names the peer certificate must match; replaced verifyPeerCertInNames. */
  verifyPeerCertByName: z.string().optional(),
  rejectUnknownSni: z.boolean().optional(),
  /** `true` is a removed feature on every supported line; see field-directions. */
  allowInsecure: z.boolean().optional(),
  alpn: z.array(z.string()).optional(),
  minVersion: z.string().optional(),
  maxVersion: z.string().optional(),
  cipherSuites: z.string().optional(),
  certificates: z.array(CertificateObjectSchema).optional(),
  disableSystemRoot: z.boolean().optional(),
  enableSessionResumption: z.boolean().optional(),
  fingerprint: z.string().optional(),
  pinnedPeerCertSha256: z.string().optional(),
  curvePreferences: z.array(z.string()).optional(),
  masterKeyLog: z.string().optional(),
  echServerKeys: z.string().optional(),
  echConfigList: z.string().optional(),
  /** 26.3 only (v26.3.27:infra/conf/transport_internet.go:756); later lines drop it. */
  echForceQuery: z.enum(['none', 'half', 'full']).optional(),
  echSockopt: z.record(z.string(), z.unknown()).optional(),
  /**
   * 26.10 only (v26.10.10:infra/conf/transport_security.go:319). Without it the
   * trust store is the CA bundle compiled into Xray; with it, the operating
   * system's own (transport/internet/tls/config.go:583-616, config_other.go:17-21). Dropped silently
   * by every earlier line, which always used the system store.
   */
  useSystemCA: z.boolean().optional(),
}).passthrough();
