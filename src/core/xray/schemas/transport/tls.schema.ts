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

export const TlsSchema = z.object({
  serverName: z.string().optional(),
  verifyPeerCertByName: z.string().optional(),
  rejectUnknownSni: z.boolean().optional(),
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
  echSockopt: z.record(z.string(), z.unknown()).optional(),
}).passthrough();
