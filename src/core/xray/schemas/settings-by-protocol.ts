// ============================================================
// Which settings schema a protocol's `settings` block follows
// ============================================================

import type { z } from 'zod';

import { VlessInboundSettingsSchema } from './inbounds/vless.inbound';
import { VmessInboundSettingsSchema } from './inbounds/vmess.inbound';
import { TrojanInboundSettingsSchema } from './inbounds/trojan.inbound';
import { ShadowsocksInboundSettingsSchema } from './inbounds/shadowsocks.inbound';
import { SocksInboundSettingsSchema } from './inbounds/socks.inbound';
import { HttpInboundSettingsSchema } from './inbounds/http.inbound';
import { TunnelInboundSettingsSchema } from './inbounds/tunnel.inbound';
import { HysteriaInboundSettingsSchema } from './inbounds/hysteria.inbound';
import { WireguardInboundSettingsSchema } from './inbounds/wireguard.inbound';
import { TunInboundSettingsSchema } from './inbounds/tun.inbound';

import { VlessOutboundSettingsSchema } from './outbounds/vless.outbound';
import { VmessOutboundSettingsSchema } from './outbounds/vmess.outbound';
import { TrojanOutboundSettingsSchema } from './outbounds/trojan.outbound';
import { ShadowsocksOutboundSettingsSchema } from './outbounds/shadowsocks.outbound';
import { SocksOutboundSettingsSchema } from './outbounds/socks.outbound';
import { HttpOutboundSettingsSchema } from './outbounds/http.outbound';
import { FreedomOutboundSettingsSchema } from './outbounds/freedom.outbound';
import { BlackholeOutboundSettingsSchema } from './outbounds/blackhole.outbound';
import { DnsOutboundSettingsSchema } from './outbounds/dns.outbound';
import { LoopbackOutboundSettingsSchema } from './outbounds/loopback.outbound';
import { HysteriaOutboundSettingsSchema } from './outbounds/hysteria.outbound';
import { WireguardOutboundSettingsSchema } from './outbounds/wireguard.outbound';

/**
 * `settings` means something different for every protocol, so the wrapper
 * schemas leave it open and the shape is looked up here by the `protocol`
 * beside it.
 *
 * This lookup used to live as a `switch` inside the form validator, which is
 * why the JSON editors never checked a settings block at all: they had no
 * copy of it. One table, two readers — the forms and the linter now agree
 * about what a vless inbound's settings may contain.
 */

const INBOUND: Record<string, z.ZodTypeAny> = {
    vless: VlessInboundSettingsSchema,
    vmess: VmessInboundSettingsSchema,
    trojan: TrojanInboundSettingsSchema,
    shadowsocks: ShadowsocksInboundSettingsSchema,
    // The 2022 ciphers are the same block with different method names.
    'shadowsocks-2022': ShadowsocksInboundSettingsSchema,
    socks: SocksInboundSettingsSchema,
    http: HttpInboundSettingsSchema,
    tunnel: TunnelInboundSettingsSchema,
    // `tunnel` is the current name for what the docs still call dokodemo-door.
    'dokodemo-door': TunnelInboundSettingsSchema,
    hysteria: HysteriaInboundSettingsSchema,
    wireguard: WireguardInboundSettingsSchema,
    tun: TunInboundSettingsSchema,
};

const OUTBOUND: Record<string, z.ZodTypeAny> = {
    vless: VlessOutboundSettingsSchema,
    vmess: VmessOutboundSettingsSchema,
    trojan: TrojanOutboundSettingsSchema,
    shadowsocks: ShadowsocksOutboundSettingsSchema,
    'shadowsocks-2022': ShadowsocksOutboundSettingsSchema,
    socks: SocksOutboundSettingsSchema,
    http: HttpOutboundSettingsSchema,
    freedom: FreedomOutboundSettingsSchema,
    blackhole: BlackholeOutboundSettingsSchema,
    dns: DnsOutboundSettingsSchema,
    loopback: LoopbackOutboundSettingsSchema,
    hysteria: HysteriaOutboundSettingsSchema,
    wireguard: WireguardOutboundSettingsSchema,
};

/** Null for a protocol with no settings shape on record — nothing to check. */
export const inboundSettingsSchemaFor = (protocol: unknown): z.ZodTypeAny | null =>
    (typeof protocol === 'string' ? INBOUND[protocol] : undefined) ?? null;

export const outboundSettingsSchemaFor = (protocol: unknown): z.ZodTypeAny | null =>
    (typeof protocol === 'string' ? OUTBOUND[protocol] : undefined) ?? null;

/** Both directions, for code that only knows which side it is on at runtime. */
export const settingsSchemaFor = (
    direction: 'inbound' | 'outbound',
    protocol: unknown,
): z.ZodTypeAny | null =>
    (direction === 'inbound' ? inboundSettingsSchemaFor : outboundSettingsSchemaFor)(protocol);
