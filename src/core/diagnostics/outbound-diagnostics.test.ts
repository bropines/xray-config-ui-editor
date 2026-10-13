import { describe, expect, it } from 'bun:test';
import { runFullDiagnostics } from './index';
import { fragmentProblems } from '../xray/freedom-fragment';

/**
 * Two ways an outbound stops a config loading, or stops working once it has,
 * that nothing used to report: a chain the core will not run, and a freedom
 * fragment missing the two values it insists on.
 */

const critical = (config: any, snippets: any[] = []) =>
    runFullDiagnostics(config, snippets, '26.7')
        .filter(diagnostic => diagnostic.severity === 'critical' && diagnostic.section === 'outbounds')
        .map(diagnostic => `${diagnostic.itemIndex}:${diagnostic.field}`);

const base = (outbounds: any[]) => ({ inbounds: [], outbounds, routing: { rules: [] } });

describe('chains', () => {
    it('says nothing about a chain that ends at a real outbound', () => {
        expect(critical(base([
            { tag: 'wg', protocol: 'wireguard', streamSettings: { sockopt: { dialerProxy: 'obfs' } } },
            { tag: 'obfs', protocol: 'freedom' },
        ]))).toEqual([]);
    });

    it('refuses both chaining keys on one outbound, as the core does', () => {
        // v26.7.28:infra/conf/xray.go:224 — "proxySettings.tag is conflicted
        // with sockopt.dialerProxy", returned from Build.
        expect(critical(base([
            { tag: 'a', protocol: 'vless', proxySettings: { tag: 'b' }, streamSettings: { sockopt: { dialerProxy: 'b' } } },
            { tag: 'b', protocol: 'freedom' },
        ]))).toEqual(['0:proxySettings']);
    });

    it('catches a chain to an outbound that does not exist', () => {
        expect(critical(base([
            { tag: 'a', protocol: 'vless', streamSettings: { sockopt: { dialerProxy: 'ghost' } } },
        ]))).toEqual(['0:dialerProxy']);
    });

    it('does not call a snippet-provided outbound missing', () => {
        const config = base([
            { tag: 'a', protocol: 'vless', streamSettings: { sockopt: { dialerProxy: 'node-1' } } },
            { snippet: 'NODES' },
        ]);
        const snippets = [{ name: 'NODES', snippet: [{ tag: 'node-1', protocol: 'freedom' }], source: 'panel' }];
        expect(critical(config)).toEqual(['0:dialerProxy']);
        expect(critical(config, snippets)).toEqual([]);
    });

    it('catches a chain that comes back to where it started', () => {
        expect(critical(base([
            { tag: 'a', protocol: 'vless', streamSettings: { sockopt: { dialerProxy: 'b' } } },
            { tag: 'b', protocol: 'vless', streamSettings: { sockopt: { dialerProxy: 'a' } } },
        ]))).toEqual(['0:dialerProxy', '1:dialerProxy']);
    });
});

describe('a freedom fragment', () => {
    it('is fine with a length and an interval', () => {
        expect(fragmentProblems({ packets: 'tlshello', length: '100-200', interval: '10-20' })).toEqual([]);
        expect(fragmentProblems(undefined)).toEqual([]);
    });

    it('needs a length, and one that does not start at zero', () => {
        // freedom.go:119 "Length can't be empty", :124 "LengthMin can't be 0".
        expect(fragmentProblems({ interval: '10' }).map(problem => problem.field)).toEqual(['length']);
        expect(fragmentProblems({ length: '', interval: '10' }).map(problem => problem.field)).toEqual(['length']);
        expect(fragmentProblems({ length: '0-5', interval: '10' }).map(problem => problem.field)).toEqual(['length']);
    });

    it('needs an interval, which may be zero', () => {
        // freedom.go:130 "Interval can't be empty"; no check on its value.
        expect(fragmentProblems({ length: '100' }).map(problem => problem.field)).toEqual(['interval']);
        expect(fragmentProblems({ length: '100', interval: '0' })).toEqual([]);
        expect(fragmentProblems({ length: '100', interval: 0 })).toEqual([]);
    });

    it('stops a save when either is missing', () => {
        expect(critical(base([
            { tag: 'direct', protocol: 'freedom', settings: { fragment: { packets: 'tlshello' } } },
        ]))).toEqual(['0:fragment.length', '0:fragment.interval']);
    });

    it('is not looked for on anything but freedom', () => {
        expect(critical(base([
            { tag: 'x', protocol: 'vless', settings: { fragment: {} } },
        ]))).toEqual([]);
    });
});
