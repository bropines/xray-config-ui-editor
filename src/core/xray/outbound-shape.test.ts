import { describe, expect, it } from 'bun:test';
import { outboundShape, shapedProtocols } from './outbound-shape';
import { OutboundProtocolSchema } from './schemas/primitives';

/**
 * The table decides what the outbound editor draws, so a protocol missing from
 * it silently gets the full set of blocks again — which is the bug the table
 * exists to fix.
 */

describe('the table against the protocol list', () => {
    it('has an entry for every protocol the editor offers', () => {
        const offered = OutboundProtocolSchema.options as unknown as string[];
        const missing = offered.filter(protocol => !shapedProtocols().includes(protocol));
        expect(missing).toEqual([]);
    });

    it('names no protocol the editor cannot produce', () => {
        const offered = new Set<string>(OutboundProtocolSchema.options as unknown as string[]);
        // `shadowsocks-2022` is this app's name for shadowsocks with the 2022
        // ciphers, not a protocol of its own, so it is the one exception.
        const extra = shapedProtocols().filter(p => !offered.has(p) && p !== 'shadowsocks-2022');
        expect(extra).toEqual([]);
    });
});

describe('a protocol that never dials', () => {
    // proxy/loopback/loopback.go: Process(ctx, link, _ internet.Dialer)
    // proxy/blackhole/blackhole.go: takes `dialer`, never references it
    it.each(['loopback', 'blackhole'])('has no transport, server or mux: %s', protocol => {
        expect(outboundShape(protocol)).toMatchObject({ server: false, transport: false, mux: false });
    });

    it('still has a targetStrategy when it hands the target back to the router', () => {
        // handler.go:185-205 resolves the target before the protocol runs, and
        // loopback re-dispatches it — so the setting is live there. Hiding it
        // with the transport block was a regression.
        expect(outboundShape('loopback').strategy).toBe(true);
        // Blackhole drops the traffic; there is nothing left to resolve for.
        expect(outboundShape('blackhole').strategy).toBe(false);
    });
});

describe('a protocol that dials', () => {
    it.each(['vless', 'vmess', 'trojan', 'shadowsocks', 'socks', 'http', 'hysteria', 'freedom', 'dns', 'wireguard'])(
        'keeps its transport block: %s',
        protocol => {
            expect(outboundShape(protocol).transport).toBe(true);
        },
    );

    it('offers a server card only where there is a server to describe', () => {
        // freedom dials the destination, dns dials the resolver, wireguard has
        // peers — none of them has an address-and-credentials card.
        for (const protocol of ['freedom', 'dns', 'wireguard']) {
            expect(outboundShape(protocol).server).toBe(false);
        }
        for (const protocol of ['vless', 'vmess', 'trojan', 'shadowsocks', 'socks', 'http', 'hysteria']) {
            expect(outboundShape(protocol).server).toBe(true);
        }
    });

    it('offers mux wherever a proxy can carry it to an Xray', () => {
        // xray.go:345 builds mux for any protocol and always.go:89 puts a mux
        // server behind every inbound, so socks, http and hysteria belong here.
        // They were once left out because a *plain* SOCKS proxy cannot answer —
        // which hid a working setting from anyone whose far end was Xray.
        for (const protocol of ['vless', 'vmess', 'trojan', 'shadowsocks', 'socks', 'http', 'hysteria']) {
            expect(outboundShape(protocol).mux).toBe(true);
        }
        // These would try to reach `v1.mux.cool` for real (mux/client.go:185).
        for (const protocol of ['freedom', 'dns', 'wireguard']) {
            expect(outboundShape(protocol).mux).toBe(false);
        }
    });
});

describe('masque', () => {
    it('is never offered mux', () => {
        // No supported tag registers masque at all; the branch that does
        // refuses mux for it by name.
        expect(outboundShape('masque')).toMatchObject({ server: true, transport: true, mux: false });
    });
});

describe('a protocol nobody told it about', () => {
    it('is drawn in full rather than losing a field to a missing entry', () => {
        expect(outboundShape('something-new')).toEqual({ server: true, transport: true, mux: true, strategy: true });
        expect(outboundShape(undefined)).toEqual({ server: true, transport: true, mux: true, strategy: true });
    });
});
