// ============================================================
// Sockopt Schema — Source: docs/config/transports/sockopt.md
// ============================================================
import { z } from 'zod';
import { DomainStrategyFullSchema, TproxySchema, AddressPortStrategySchema } from '../primitives';

export const HappyEyeballsSchema = z.object({
  tryDelayMs: z.number().optional(),
  prioritizeIPv6: z.boolean().optional(),
  interleave: z.number().int().optional(),
  maxConcurrentTry: z.number().int().optional(),
}).passthrough();

export const CustomSockoptSchema = z.object({
  system: z.string().optional(),
  type: z.string().optional(),
  level: z.string().optional(),
  opt: z.string().optional(),
  value: z.string().optional(),
}).passthrough();

export const SockoptSchema = z.object({
  mark: z.number().int().optional(),
  tcpMaxSeg: z.number().int().optional(),
  tcpFastOpen: z.union([z.boolean(), z.number()]).optional(),
  tproxy: TproxySchema.optional(),
  domainStrategy: DomainStrategyFullSchema.optional(),
  happyEyeballs: HappyEyeballsSchema.optional(),
  dialerProxy: z.string().optional(),
  acceptProxyProtocol: z.boolean().optional(),
  trustedXForwardedFor: z.array(z.string()).optional(),
  tcpKeepAliveInterval: z.number().optional(),
  tcpKeepAliveIdle: z.number().optional(),
  tcpUserTimeout: z.number().optional(),
  tcpcongestion: z.string().optional(),
  interface: z.string().optional(),
  V6Only: z.boolean().optional(),
  tcpWindowClamp: z.number().int().optional(),
  tcpMptcp: z.boolean().optional(),
  addressPortStrategy: AddressPortStrategySchema.optional(),
  customSockopt: z.array(CustomSockoptSchema).optional(),
  /** Override download sockopt with upload sockopt when true */
  penetrate: z.boolean().optional(),
}).passthrough();
