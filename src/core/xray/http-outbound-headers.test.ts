import { describe, expect, it } from 'bun:test';
import { httpHeadersProblems, isHttpOutbound, readHttpHeaders } from './http-outbound-headers';
import { createDefaultOutbound } from '../generators/endpoint-factory';
import { runFullDiagnostics } from '../diagnostics';
import { CORE_VERSIONS } from './versions';

/**
 * An HTTP outbound's `headers` is a top-level key of its settings, a
 * map[string]string on every line (v26.7.28:infra/conf/http.go:66), read
 * whichever of the flat and the `servers` shapes the outbound uses.
 */

const http = (settings: Record<string, unknown>) => ({ tag: 'proxy', protocol: 'http', settings });

describe('headers on an HTTP outbound', () => {
    it('are read from settings.headers, in either shape', () => {
        expect(readHttpHeaders(http({ address: 'p.example', port: 8080, headers: { A: 'b' } }))).toEqual({ A: 'b' });
        expect(readHttpHeaders(http({ servers: [{ address: 'p.example', port: 8080 }], headers: { A: 'b' } }))).toEqual({ A: 'b' });
        expect(readHttpHeaders(http({}))).toBeUndefined();
        expect(readHttpHeaders(null)).toBeUndefined();
        expect(readHttpHeaders({ protocol: 'http' })).toBeUndefined();
    });

    it('are fine as an object of strings, empty or absent, or null', () => {
        const found = (headers: unknown) => httpHeadersProblems(http({ servers: [], headers })).map(problem => problem.kind);
        expect(found({ 'User-Agent': 'Mozilla/5.0', 'X-Tunnel': '{{ .Target }}' })).toEqual([]);
        expect(found({})).toEqual([]);
        expect(found(undefined)).toEqual([]);
        expect(found(null)).toEqual([]);
    });

    it('cannot be a string, a list or a number: the core cannot decode the outbound', () => {
        for (const headers of ['User-Agent: x', ['User-Agent'], 5, true]) {
            const problems = httpHeadersProblems(http({ servers: [], headers }));
            expect(problems.map(problem => problem.kind)).toEqual(['headers.type']);
            expect(problems[0]!.field).toBe('settings.headers');
            expect(problems[0]!.suggestion).toBeTruthy();
        }
    });

    it('cannot hold a value that is not a string', () => {
        const problems = httpHeadersProblems(http({ headers: { A: 'ok', B: 5, C: ['x'] } }));
        expect(problems.map(problem => problem.kind)).toEqual(['headers.value', 'headers.value']);
        expect(problems[0]!.message).toContain('"B"');
        expect(problems[1]!.message).toContain('"C"');
    });

    it('are only asked of an HTTP outbound: nothing else reads the key', () => {
        expect(httpHeadersProblems({ protocol: 'socks', settings: { headers: 'x' } })).toEqual([]);
        expect(httpHeadersProblems(createDefaultOutbound('vless'))).toEqual([]);
        expect(httpHeadersProblems(null)).toEqual([]);
        expect(isHttpOutbound({ protocol: 'HTTP' })).toBe(true);
    });
});

describe('in the diagnostics', () => {
    const critical = (outbounds: unknown[], line?: (typeof CORE_VERSIONS)[number]['id']) =>
        runFullDiagnostics({ outbounds } as any, [], line)
            .filter(d => d.severity === 'critical')
            .map(d => [d.section, d.itemIndex, d.field]);

    it('is critical on headers the core cannot decode, with or without a line', () => {
        for (const line of [undefined, ...CORE_VERSIONS.map(version => version.id)]) {
            expect(critical([createDefaultOutbound('socks'), http({ headers: 'x' })], line)).toEqual([['outbounds', 1, 'settings.headers']]);
        }
    });

    it('is quiet about the headers the form writes', () => {
        const outbound = { ...createDefaultOutbound('http'), settings: { ...(createDefaultOutbound('http').settings as object), headers: { 'User-Agent': 'x' } } };
        expect(critical([outbound], '26.7')).toEqual([]);
    });
});
