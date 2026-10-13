/**
 * Which parts of an outbound a protocol actually uses.
 *
 * The editor used to draw the same four blocks for every protocol — server
 * address, proxy chain, mux, and the whole transport stack — which is how a
 * loopback outbound ended up offering a TLS fingerprint and a UUID box while
 * hiding the one field it has. This table says what each protocol can use, and
 * the editor draws only that.
 *
 * "Cannot use" is not an opinion here. An outbound handler is handed an
 * `internet.Dialer`; a protocol that never touches it can have no transport,
 * no sendThrough and nothing to multiplex, because there is no connection for
 * any of that to apply to:
 *
 *   proxy/loopback/loopback.go   Process(ctx, link, _ internet.Dialer)
 *   proxy/blackhole/blackhole.go takes `dialer` and never references it
 *
 * Both hand the traffic back to the router or drop it on the spot. Everything
 * else here dials, so the transport stack applies to it.
 */

export interface OutboundShape {
    /** A remote address and credentials of its own. */
    server: boolean;
    /** Dials out, so `streamSettings` (transport, security, sockopt) applies. */
    transport: boolean;
    /** Can carry a Mux.Cool stream to an Xray on the far end. */
    mux: boolean;
    /**
     * `targetStrategy` does something. The handler resolves the target before
     * the protocol runs (v26.7.28:app/proxyman/outbound/handler.go:185-205),
     * so this is true of everything that then uses the target — including
     * loopback, which hands the rewritten one back to the router.
     */
    strategy: boolean;
}

/**
 * Mux is not a property of the protocol. The wrapper builds `mux` for any of
 * them with no check (v26.7.28:infra/conf/xray.go:345-351), and every Xray
 * inbound, whatever it speaks, has a mux server behind it
 * (app/proxyman/inbound/always.go:89). What it needs is an Xray on the far end
 * and a proxy able to carry a stream addressed to `v1.mux.cool`
 * (common/mux/client.go:153,185).
 *
 * So socks, http and hysteria get it: against an Xray inbound of the same
 * protocol it works, and whether the far end is one is the user's knowledge,
 * not this table's. Freedom, dns and wireguard do not — they would try to
 * reach that name for real — and nothing that never dials has a stream at all.
 *
 * This column once said false for socks, http and hysteria, on the grounds
 * that "a plain SOCKS proxy does not speak Mux.Cool". True of a plain proxy;
 * the table then hid a working setting from everyone whose proxy was not one.
 */
const SHAPES: Record<string, OutboundShape> = {
    vless: { server: true, transport: true, mux: true, strategy: true },
    vmess: { server: true, transport: true, mux: true, strategy: true },
    trojan: { server: true, transport: true, mux: true, strategy: true },
    shadowsocks: { server: true, transport: true, mux: true, strategy: true },
    'shadowsocks-2022': { server: true, transport: true, mux: true, strategy: true },
    socks: { server: true, transport: true, mux: true, strategy: true },
    http: { server: true, transport: true, mux: true, strategy: true },
    hysteria: { server: true, transport: true, mux: true, strategy: true },
    // Not a protocol on any supported tag — none of v26.3.27, v26.7.28 or
    // v26.9.9 registers it, and the version table refuses it outright. The
    // development branch that has it answers `masque outbound does not support
    // "mux"` from Build(), which is why this column says false.
    masque: { server: true, transport: true, mux: false, strategy: true },
    // Its own device and peers rather than a server card, and its own
    // encrypted transport underneath.
    wireguard: { server: false, transport: true, mux: false, strategy: true },
    // Dials the destination itself. No protocol of its own to multiplex, but
    // sockopt — mark, interface, dialerProxy — is exactly how it is steered.
    freedom: { server: false, transport: true, mux: false, strategy: true },
    // Dials the DNS server it forwards to, so sockopt applies here too.
    dns: { server: false, transport: true, mux: false, strategy: true },
    // Drops what it is given, so there is no target left to resolve.
    blackhole: { server: false, transport: false, mux: false, strategy: false },
    // Never dials, but re-dispatches the target — after the handler has
    // already resolved it, so the second routing pass sees what
    // targetStrategy made of it (proxy/loopback/loopback.go:29,46).
    loopback: { server: false, transport: false, mux: false, strategy: true },
};

/** Anything unknown is assumed to be a full proxy — better too much than a hidden field. */
const DEFAULT_SHAPE: OutboundShape = { server: true, transport: true, mux: true, strategy: true };

export const outboundShape = (protocol: unknown): OutboundShape =>
    (typeof protocol === 'string' ? SHAPES[protocol] : undefined) ?? DEFAULT_SHAPE;

/** The protocols this table knows, for the test that keeps it beside the schema. */
export const shapedProtocols = (): string[] => Object.keys(SHAPES);
