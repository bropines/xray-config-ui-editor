import { describe, expect, it } from 'bun:test';
import { carriedBy, chainOf, chainProblems, ignoredByL7, withChain, withoutChain } from './outbound-chain';

/**
 * Chaining has two forms that the editor once treated as one. They run
 * different code in the core — only one of them dials — and only one of them
 * loads on every supported line, so which is written, and that the other is
 * cleared, is the whole job of this module.
 */

const plain = { tag: 'proxy', protocol: 'vless', streamSettings: { network: 'ws', security: 'tls' } };

describe('reading a chain', () => {
    it('reads sockopt.dialerProxy as a transport-layer chain', () => {
        const outbound = { ...plain, streamSettings: { sockopt: { dialerProxy: 'warp' } } };
        expect(chainOf(outbound)).toEqual({ via: 'warp', layer: 'L4', field: 'sockopt.dialerProxy', conflict: false });
    });

    it('reads proxySettings as an application-layer chain', () => {
        expect(chainOf({ ...plain, proxySettings: { tag: 'warp' } }))
            .toEqual({ via: 'warp', layer: 'L7', field: 'proxySettings', conflict: false });
    });

    it('reads transportLayer: true as the transport layer it becomes', () => {
        // The loader copies the tag into sockopt.dialerProxy and discards the
        // rest (v26.7.28:infra/conf/xray.go:330), so it runs as L4.
        expect(chainOf({ ...plain, proxySettings: { tag: 'warp', transportLayer: true } }))
            .toMatchObject({ via: 'warp', layer: 'L4', field: 'proxySettings' });
    });

    it('says when both keys name an outbound, which the core refuses', () => {
        const both = { ...plain, proxySettings: { tag: 'a' }, streamSettings: { sockopt: { dialerProxy: 'b' } } };
        expect(chainOf(both)?.conflict).toBe(true);
    });

    it('finds no chain in an outbound that dials for itself', () => {
        expect(chainOf(plain)).toBeNull();
        expect(chainOf({ ...plain, proxySettings: { tag: '' } })).toBeNull();
        expect(chainOf({ ...plain, streamSettings: { sockopt: { mark: 255 } } })).toBeNull();
        expect(chainOf(null)).toBeNull();
        expect(chainOf('nonsense')).toBeNull();
    });
});

describe('writing a chain', () => {
    it('writes the transport layer as dialerProxy, the one spelling every line loads', () => {
        const next = withChain(plain, 'warp', 'L4') as any;
        expect(next.streamSettings).toEqual({ network: 'ws', security: 'tls', sockopt: { dialerProxy: 'warp' } });
        expect('proxySettings' in next).toBe(false);
    });

    it('writes the application layer as proxySettings, without the flag that would undo it', () => {
        const next = withChain(plain, 'warp', 'L7') as any;
        expect(next.proxySettings).toEqual({ tag: 'warp' });
        expect(next.streamSettings).toEqual({ network: 'ws', security: 'tls' });
    });

    it('clears the other key when the layer changes, since the core refuses both', () => {
        const l7 = withChain(withChain(plain, 'warp', 'L4'), 'warp', 'L7') as any;
        expect(chainOf(l7)).toMatchObject({ layer: 'L7', conflict: false });
        expect(l7.streamSettings.sockopt).toBeUndefined();

        const l4 = withChain(l7, 'warp', 'L4') as any;
        expect(chainOf(l4)).toMatchObject({ layer: 'L4', conflict: false });
        expect(l4.proxySettings).toBeUndefined();
    });

    it('keeps the rest of sockopt when it takes the dialerProxy out', () => {
        const outbound = { ...plain, streamSettings: { sockopt: { mark: 255, dialerProxy: 'warp' } } };
        expect((withChain(outbound, 'warp', 'L7') as any).streamSettings.sockopt).toEqual({ mark: 255 });
    });

    it('leaves no empty shells behind when the chain was all there was', () => {
        const outbound = { tag: 'wg', protocol: 'wireguard', streamSettings: { sockopt: { dialerProxy: 'obfs' } } };
        expect(withoutChain(outbound) as any).toEqual({ tag: 'wg', protocol: 'wireguard' });
    });

    it('unchains either form', () => {
        expect(chainOf(withoutChain(withChain(plain, 'warp', 'L4')))).toBeNull();
        expect(chainOf(withoutChain(withChain(plain, 'warp', 'L7')))).toBeNull();
    });

    it('does not touch the outbound it was given', () => {
        const outbound = { ...plain, streamSettings: { sockopt: { dialerProxy: 'a' } } };
        const snapshot = JSON.stringify(outbound);
        withChain(outbound, 'b', 'L7');
        withoutChain(outbound);
        expect(JSON.stringify(outbound)).toBe(snapshot);
    });
});

describe('what an application-layer chain leaves unused', () => {
    it('is everything but TLS', () => {
        // handler.go:293 lays tls.ConfigFromStreamSettings over the other
        // outbound's stream and consults nothing else.
        const outbound = {
            streamSettings: { network: 'xhttp', security: 'reality', sockopt: { mark: 1 }, finalmask: { udp: [{}] } },
        };
        expect(ignoredByL7(outbound)).toEqual(['network: xhttp', 'security: reality', 'sockopt', 'finalmask']);
    });

    it('is nothing for a plain stream with TLS or without it', () => {
        expect(ignoredByL7({ streamSettings: { network: 'raw', security: 'tls' } })).toEqual([]);
        expect(ignoredByL7({ streamSettings: { network: 'tcp', security: 'none' } })).toEqual([]);
        expect(ignoredByL7({})).toEqual([]);
    });
});

describe('who goes through whom', () => {
    const outbounds = [
        { tag: 'wg', streamSettings: { sockopt: { dialerProxy: 'obfs' } } },
        { tag: 'vless', proxySettings: { tag: 'obfs' } },
        { tag: 'obfs', protocol: 'freedom' },
        { tag: 'direct', protocol: 'freedom' },
    ];

    it('lists the outbounds an exit carries, whichever way they name it', () => {
        expect(carriedBy(outbounds, 'obfs')).toEqual(['wg', 'vless']);
        expect(carriedBy(outbounds, 'direct')).toEqual([]);
    });
});

describe('chains the core will not run', () => {
    const kinds = (outbounds: unknown[], known: string[] = []) =>
        chainProblems(outbounds, known).map(problem => `${problem.tag}:${problem.kind}`);

    it('finds nothing wrong with a chain that ends somewhere', () => {
        expect(kinds([
            { tag: 'a', streamSettings: { sockopt: { dialerProxy: 'b' } } },
            { tag: 'b', proxySettings: { tag: 'c' } },
            { tag: 'c' },
        ])).toEqual([]);
    });

    it('catches both keys set at once', () => {
        expect(kinds([
            { tag: 'a', proxySettings: { tag: 'b' }, streamSettings: { sockopt: { dialerProxy: 'b' } } },
            { tag: 'b' },
        ])).toEqual(['a:conflict']);
    });

    it('catches a chain to an outbound that is not there', () => {
        expect(kinds([{ tag: 'a', streamSettings: { sockopt: { dialerProxy: 'ghost' } } }])).toEqual(['a:missing']);
    });

    it('takes a tag a panel snippet will contribute as present', () => {
        const outbounds = [{ tag: 'a', streamSettings: { sockopt: { dialerProxy: 'from-snippet' } } }, { snippet: 'NODES' }];
        expect(kinds(outbounds)).toEqual(['a:missing']);
        expect(kinds(outbounds, ['from-snippet'])).toEqual([]);
    });

    it('catches an outbound chained through itself', () => {
        expect(kinds([{ tag: 'a', proxySettings: { tag: 'a' } }])).toEqual(['a:self']);
    });

    it('catches a loop through others, on every outbound in it', () => {
        expect(kinds([
            { tag: 'a', streamSettings: { sockopt: { dialerProxy: 'b' } } },
            { tag: 'b', streamSettings: { sockopt: { dialerProxy: 'c' } } },
            { tag: 'c', streamSettings: { sockopt: { dialerProxy: 'a' } } },
        ])).toEqual(['a:loop', 'b:loop', 'c:loop']);
    });

    it('does not call an outbound that merely feeds a loop part of it', () => {
        // d → a → b → a: d is not on the cycle, a and b are.
        expect(kinds([
            { tag: 'd', streamSettings: { sockopt: { dialerProxy: 'a' } } },
            { tag: 'a', streamSettings: { sockopt: { dialerProxy: 'b' } } },
            { tag: 'b', streamSettings: { sockopt: { dialerProxy: 'a' } } },
        ])).toEqual(['a:loop', 'b:loop']);
    });
});
