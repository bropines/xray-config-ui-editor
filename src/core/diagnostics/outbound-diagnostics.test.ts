import { describe, expect, it } from 'bun:test';
import { runFullDiagnostics } from './index';
import { fragmentProblems, noiseProblem } from '../xray/freedom-fragment';

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

describe('a freedom noise', () => {
    const field = (noise: unknown) => noiseProblem(noise)?.field ?? null;

    it('is fine when the core can parse it', () => {
        expect(field({ type: 'rand', packet: '50-100' })).toBeNull();
        expect(field({ type: 'rand', packet: '64' })).toBeNull();
        expect(field({ type: 'str', packet: 'anything at all' })).toBeNull();
        expect(field({ type: 'hex', packet: 'deadBEEF' })).toBeNull();
        expect(field({ type: 'base64', packet: 'aGVsbG8=' })).toBeNull();
    });

    it('needs one of the four types, spelled exactly', () => {
        // freedom.go:199 switches on the string as written; "Rand" and a
        // missing type both land in the default case, which is an error.
        expect(field({ packet: '50-100' })).toBe('type');
        expect(field({ type: 'Rand', packet: '50-100' })).toBe('type');
        expect(field({ type: 'array', packet: '50-100' })).toBe('type');
    });

    it('refuses a rand with no length, which is what an emptied box is', () => {
        // ParseRangeString("") is 0, and freedom.go:207 refuses a LengthMin of 0.
        expect(field({ type: 'rand' })).toBe('packet');
        expect(field({ type: 'rand', packet: '' })).toBe('packet');
        expect(field({ type: 'rand', packet: '0-10' })).toBe('packet');
        expect(field({ type: 'rand', packet: 'lots' })).toBe('packet');
    });

    it('refuses hex and base64 that will not decode', () => {
        expect(field({ type: 'hex', packet: 'abc' })).toBe('packet');
        expect(field({ type: 'hex', packet: 'zz' })).toBe('packet');
        expect(field({ type: 'base64', packet: 'not base64!' })).toBe('packet');
    });

    it('takes both base64 alphabets, as the core folds one into the other', () => {
        expect(field({ type: 'base64', packet: '-_-_' })).toBeNull();
        expect(field({ type: 'base64', packet: '+/+/' })).toBeNull();
    });

    it('lets an empty hex or base64 through: that is an empty packet, not an error', () => {
        expect(field({ type: 'hex', packet: '' })).toBeNull();
        expect(field({ type: 'base64' })).toBeNull();
    });

    it('stops a save, naming the entry that is wrong', () => {
        expect(critical(base([
            { tag: 'direct', protocol: 'freedom', settings: { noises: [
                { type: 'rand', packet: '50-100' },
                { type: 'rand', packet: '' },
                { packet: 'aa' },
            ] } },
        ]))).toEqual(['0:noises.1.packet', '0:noises.2.type']);
    });

    it('leaves a misspelt type to the version table, which already reports it', () => {
        // One refusal, one line in the list: `settings.noises[].type` is a
        // value set, and saying it again from here would show it twice.
        expect(critical(base([
            { tag: 'direct', protocol: 'freedom', settings: { noises: [{ type: 'Hex', packet: 'aa' }] } },
        ]))).toEqual(['0:settings.noises[].type']);
    });

    it('is not looked for on anything but freedom', () => {
        expect(critical(base([
            { tag: 'x', protocol: 'vless', settings: { noises: [{ type: 'nope' }] } },
        ]))).toEqual([]);
    });
});
