// ============================================================
// DNS Schema — src/core/xray/schemas/dns.schema.ts
// Source: docs/config/dns.md
// ============================================================

import { z } from 'zod';
import { QueryStrategySchema } from './primitives';

export const DnsServerObjectSchema = z.object({
  /** DNS server address. Supports: IP, "udp://", "tcp://", "https://", "quic://", "localhost", "fakedns" */
  address: z.string().optional(),
  /** DNS server port. Default: 53 */
  port: z.number().int().optional(),
  /** List of domains to match for this server */
  domains: z.array(z.string()).optional(),
  /** Expected IPs — only accept results matching these IPs/GeoIPs */
  expectIPs: z.array(z.string()).optional(),
  /** Unexpected IPs — reject results matching these IPs/GeoIPs (triggers fallback) */
  unexpectedIPs: z.array(z.string()).optional(),
  /** Skip this server when other servers' expectIPs match failed */
  skipFallback: z.boolean().optional(),
  /** Final query — if enabled, always query even if other servers already matched */
  finalQuery: z.boolean().optional(),
  /** Per-server query timeout in milliseconds */
  timeoutMs: z.number().int().optional(),
  /** Client IP for EDNS Client Subnet */
  clientIp: z.string().optional(),
  /** Per-server query strategy: UseIP, UseIPv4, UseIPv6 */
  queryStrategy: QueryStrategySchema.optional(),
  /** Disable DNS cache for this server */
  disableCache: z.boolean().optional(),
  /** Serve stale cache entries */
  serveStale: z.boolean().optional(),
  /** Extended TTL for stale cache entries, in seconds */
  serveExpiredTTL: z.number().int().optional(),
  /** Tag for this DNS server (used in DNS routing) */
  tag: z.string().optional(),
}).passthrough();

export const DnsSchema = z.object({
  /** Static host mappings. Value can be string IP, array of IPs, or special keywords */
  hosts: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
  /** DNS servers — can be a mix of plain strings and DnsServerObjects */
  servers: z.array(z.union([z.string(), DnsServerObjectSchema])).optional(),
  /** Client IP for EDNS Client Subnet (global) */
  clientIp: z.string().optional(),
  /** Global query strategy: UseIP, UseIPv4, UseIPv6 */
  queryStrategy: QueryStrategySchema.optional(),
  /** Disable DNS cache globally */
  disableCache: z.boolean().optional(),
  /** Serve stale cache entries globally */
  serveStale: z.boolean().optional(),
  /** Extended TTL for stale cache entries globally, in seconds */
  serveExpiredTTL: z.number().int().optional(),
  /** Disable fallback when expectIPs/unexpectedIPs don't match */
  disableFallback: z.boolean().optional(),
  /** Disable fallback if at least one server matched */
  disableFallbackIfMatch: z.boolean().optional(),
  /** Enable parallel querying of all DNS servers */
  enableParallelQuery: z.boolean().optional(),
  /** Use system hosts file */
  useSystemHosts: z.boolean().optional(),
  /** Tag for the DNS module (used for routing DNS queries) */
  tag: z.string().optional(),
}).passthrough();

export type DnsConfig = z.infer<typeof DnsSchema>;
export type DnsServerObject = z.infer<typeof DnsServerObjectSchema>;
