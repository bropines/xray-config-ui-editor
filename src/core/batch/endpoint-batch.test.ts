import { describe, expect, it } from 'bun:test';
import { applyBatch, isEmptyPatch } from './endpoint-batch';

const outbounds: any[] = [
    { tag: 'proxy-1', protocol: 'vless', streamSettings: { network: 'tcp', security: 'reality' } },
    { tag: 'proxy-2', protocol: 'vless', streamSettings: { network: 'tcp', security: 'reality' } },
    { tag: 'warp', protocol: 'wireguard', settings: {} },
    { tag: 'direct', protocol: 'freedom', settings: {} },
];

const inbounds: any[] = [
    { tag: 'socks-in', protocol: 'socks', port: 10808, sniffing: { enabled: false } },
    { tag: 'http-in', protocol: 'http', port: 10809 },
    { tag: 'tun-in', protocol: 'tun', settings: {} },
];

describe('applyBatch', () => {
    it('never mutates the input', () => {
        const before = JSON.stringify(outbounds);
        applyBatch(outbounds, [0, 1], 'outbound', { network: 'ws' });
        expect(JSON.stringify(outbounds)).toBe(before);
    });

    it('changes only the selected items', () => {
        // gRPC, not WebSocket: these outbounds use REALITY, which the core
        // only runs over raw, XHTTP and gRPC. This test used to write `ws`
        // here and so pinned a config that does not load.
        const result = applyBatch(outbounds, [0], 'outbound', { network: 'grpc' });
        expect(result.items[0]!.streamSettings.network).toBe('grpc');
        expect(result.items[1]!.streamSettings.network).toBe('tcp');
        expect(result.changes.map(c => c.tag)).toEqual(['proxy-1']);
    });

    it('keeps positions, because routing order depends on them', () => {
        const result = applyBatch(outbounds, [0, 1, 2, 3], 'outbound', { tagPrefix: 'x-' });
        expect(result.items.map(i => i.tag)).toEqual(['x-proxy-1', 'x-proxy-2', 'x-warp', 'x-direct']);
    });

    it('refuses a transport on protocols that have none, with a reason', () => {
        const result = applyBatch(outbounds, [0, 2, 3], 'outbound', { network: 'grpc' });
        expect(result.changes.map(c => c.tag)).toEqual(['proxy-1']);
        expect(result.skipped.map(s => `${s.tag}:${s.field}`).sort())
            .toEqual(['direct:streamSettings', 'warp:streamSettings']);
        expect(result.skipped[0]!.reason).toContain('no transport');
    });

    it('reports every change as before → after', () => {
        const result = applyBatch(outbounds, [0], 'outbound', { network: 'ws', security: 'tls' });
        expect(result.changes[0]!.fields).toEqual(['network: tcp → ws', 'security: reality → tls']);
    });

    it('records nothing when the value already matches', () => {
        // A no-op must not show up as a change, or a preview of "30 items
        // changed" tells the user nothing about what is actually happening.
        const result = applyBatch(outbounds, [0, 1], 'outbound', { network: 'tcp' });
        expect(result.changes).toEqual([]);
    });

    it('renumbers ports with a step, so a block does not collide', () => {
        const result = applyBatch(inbounds, [0, 1], 'inbound', { port: 20000, portStep: 1 });
        expect(result.items[0]!.port).toBe(20000);
        expect(result.items[1]!.port).toBe(20001);
    });

    it('will not give a port to a protocol that does not listen on one', () => {
        const result = applyBatch(inbounds, [2], 'inbound', { port: 20000 });
        expect(result.items[2]!.port).toBeUndefined();
        expect(result.skipped[0]!.reason).toContain('does not listen');
    });

    it('turns sniffing on without discarding destOverride', () => {
        const withOverride = [{ tag: 'a', protocol: 'socks', sniffing: { enabled: false, destOverride: ['tls'] } }];
        const result = applyBatch(withOverride as any, [0], 'inbound', { sniffing: true });
        expect(result.items[0]!.sniffing).toEqual({ enabled: true, destOverride: ['tls'] });
    });

    it('gives a default destOverride when enabling sniffing on an inbound without one', () => {
        const result = applyBatch(inbounds, [1], 'inbound', { sniffing: true });
        expect(result.items[1]!.sniffing).toEqual({ enabled: true, destOverride: ['http', 'tls'] });
    });

    it('rejects fields that belong to the other direction', () => {
        const asOutbound = applyBatch(outbounds, [0], 'outbound', { sniffing: true });
        expect(asOutbound.skipped[0]!.reason).toContain('belongs to inbounds');

        const asInbound = applyBatch(inbounds, [0], 'inbound', { mux: true });
        expect(asInbound.skipped[0]!.reason).toContain('belongs to outbounds');
    });

    it('refuses to chain an outbound through itself', () => {
        // The core will not run a dialer loop, so writing one only moves the
        // failure to startup.
        const result = applyBatch(outbounds, [0], 'outbound', { dialerProxy: 'proxy-1' });
        expect(result.changes).toEqual([]);
        expect(result.skipped[0]!.reason).toContain('cannot dial through itself');
    });

    it('sets a dialerProxy through sockopt', () => {
        const result = applyBatch(outbounds, [0], 'outbound', { dialerProxy: 'warp' });
        expect(result.items[0]!.streamSettings.sockopt.dialerProxy).toBe('warp');
    });

    it('enables mux with a concurrency', () => {
        const result = applyBatch(outbounds, [0], 'outbound', { mux: true, muxConcurrency: 8 });
        expect(result.items[0]!.mux).toEqual({ enabled: true, concurrency: 8 });
    });

    it('writes arbitrary dotted paths', () => {
        const result = applyBatch(outbounds, [0], 'outbound', {
            set: [{ path: 'streamSettings.sockopt.tcpFastOpen', value: true }],
        });
        expect(result.items[0]!.streamSettings.sockopt.tcpFastOpen).toBe(true);
        expect(result.changes[0]!.fields[0]).toContain('streamSettings.sockopt.tcpFastOpen');
    });

    it('removes a path when the value is undefined', () => {
        const result = applyBatch(outbounds, [0], 'outbound', {
            set: [{ path: 'streamSettings.security', value: undefined }],
        });
        expect('security' in result.items[0]!.streamSettings).toBe(false);
    });

    it('ignores indexes outside the list', () => {
        const result = applyBatch(outbounds, [99, -1, 0], 'outbound', { tagPrefix: 'x-' });
        expect(result.changes).toHaveLength(1);
        expect(result.items).toHaveLength(outbounds.length);
    });

    it('deduplicates a selection', () => {
        const result = applyBatch(outbounds, [0, 0, 0], 'outbound', { tagSuffix: '-a' });
        expect(result.items[0]!.tag).toBe('proxy-1-a');
        expect(result.changes).toHaveLength(1);
    });
});

describe('a transport the protocol cannot run over', () => {
    // The single editor has asked core/xray/transport-networks.ts about this
    // for a while; the batch wrote whatever was chosen onto whatever was
    // selected. These are the combinations that produced a refused config.
    const mixed: any[] = [
        { tag: 'hy', protocol: 'hysteria', streamSettings: { network: 'hysteria', security: 'tls' } },
        { tag: 'reality', protocol: 'vless', streamSettings: { network: 'tcp', security: 'reality' } },
        { tag: 'plain', protocol: 'vless', streamSettings: { network: 'tcp', security: 'tls' } },
    ];

    it('leaves hysteria on its own transport, and says why', () => {
        // v26.7.28:proxy/hysteria/client.go:36 — "not hysteria transport".
        const result = applyBatch(mixed, [0, 2], 'outbound', { network: 'ws' }, '26.7');
        expect(result.items[0]!.streamSettings.network).toBe('hysteria');
        expect(result.items[2]!.streamSettings.network).toBe('ws');
        expect(result.changes.map(change => change.tag)).toEqual(['plain']);
        expect(result.skipped.map(skip => skip.tag)).toEqual(['hy']);
        expect(result.skipped[0]!.reason.length).toBeGreaterThan(0);
    });

    it('lets hysteria move on the one line that has no such check', () => {
        // v26.3.27:proxy/hysteria/client.go has no transport test at all.
        const result = applyBatch(mixed, [0], 'outbound', { network: 'ws' }, '26.3');
        expect(result.items[0]!.streamSettings.network).toBe('ws');
        expect(result.skipped).toEqual([]);
    });

    it('does not put REALITY under a transport it cannot run over', () => {
        const result = applyBatch(mixed, [1], 'outbound', { network: 'ws' }, '26.7');
        expect(result.items[1]!.streamSettings).toEqual({ network: 'tcp', security: 'reality' });
        expect(result.skipped.map(skip => `${skip.tag}:${skip.field}`)).toEqual(['reality:streamSettings']);
    });

    it('judges the pair it would end up with, not each half alone', () => {
        // Changing both at once is fine where changing only the network was not.
        const result = applyBatch(mixed, [1], 'outbound', { network: 'ws', security: 'tls' }, '26.7');
        expect(result.items[1]!.streamSettings).toEqual({ network: 'ws', security: 'tls' });
        expect(result.skipped).toEqual([]);
    });

    it('does not put REALITY onto a transport that is already wrong for it', () => {
        const ws: any[] = [{ tag: 'ws', protocol: 'vless', streamSettings: { network: 'ws', security: 'tls' } }];
        const result = applyBatch(ws, [0], 'outbound', { security: 'reality' }, '26.7');
        expect(result.items[0]!.streamSettings.security).toBe('tls');
        expect(result.skipped).toHaveLength(1);
    });
});

describe('isEmptyPatch', () => {
    it('sees a patch that asks for nothing', () => {
        expect(isEmptyPatch({})).toBe(true);
        expect(isEmptyPatch({ network: '' })).toBe(true);
        // A step on its own changes nothing without a starting port.
        expect(isEmptyPatch({ portStep: 2 })).toBe(true);
    });

    it('sees a patch that asks for something', () => {
        expect(isEmptyPatch({ network: 'ws' })).toBe(false);
        expect(isEmptyPatch({ sniffing: false })).toBe(false);
        expect(isEmptyPatch({ set: [{ path: 'a', value: 1 }] })).toBe(false);
    });
});
