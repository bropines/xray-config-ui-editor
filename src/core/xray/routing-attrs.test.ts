import { describe, expect, it } from 'bun:test';
import { attrsProblems, attrsWrongType, readAttrs } from './routing-attrs';
import { RoutingRuleSchema } from './schemas/routing.schema';
import { runFullDiagnostics } from '../diagnostics';
import { CORE_VERSIONS } from './versions';

/**
 * A rule's `attrs` is `map[string]string` on every supported line
 * (v26.3.27:infra/conf/router.go:546 … v26.10.10:infra/conf/router.go:158), so
 * anything but an object of strings fails the rule's decode
 * (v26.10.10:infra/conf/router.go:166-169) and the config does not load. The
 * editor used to write whatever JSON the box held — a string, a list, a number.
 */

const rule = (attrs: unknown) => ({ type: 'field', inboundTag: ['in'], outboundTag: 'direct', attrs });
const found = (attrs: unknown) => attrsProblems(rule(attrs)).map(problem => `${problem.severity} ${problem.kind}`);

describe('what the core reads as attrs', () => {
    it('is an object of attribute names to strings', () => {
        expect(found({ ':method': 'GET' })).toEqual([]);
        expect(found({ ':method': 'GET', ':path': '^/api/', 'user-agent': '(?i)curl' })).toEqual([]);
        expect(found({})).toEqual([]);
    });

    it('is nothing when absent or null, which the core leaves a nil map', () => {
        expect(found(undefined)).toEqual([]);
        expect(found(null)).toEqual([]);
        expect(attrsWrongType(rule(null))).toBe(false);
        expect(attrsWrongType(rule(undefined))).toBe(false);
    });

    it('is never anything but an object: a string, a list or a number fails the decode', () => {
        for (const attrs of ["attrs[':method'] == 'GET'", '', 5, true, [':method', 'GET']]) {
            expect(found(attrs)).toEqual(['critical attrs.type']);
            expect(attrsWrongType(rule(attrs))).toBe(true);
        }
    });

    it('offers the object to write instead', () => {
        const [problem] = attrsProblems(rule('GET'));
        expect(problem!.field).toBe('attrs');
        expect(problem!.message).toContain('"GET"');
        expect(problem!.suggestion).toContain('{ ":method": "GET" }');
    });

    it('names every value that is not a string', () => {
        const problems = attrsProblems(rule({ ':method': 'GET', ':path': 5, 'x-a': true, 'x-b': { c: 'd' }, 'x-c': ['e'] }));
        expect(problems.map(problem => problem.kind)).toEqual(['attrs.value', 'attrs.value', 'attrs.value', 'attrs.value']);
        expect(problems.map(problem => problem.name)).toEqual([':path', 'x-a', 'x-b', 'x-c']);
        expect(problems[0]!.message).toContain('":path"');
        expect(problems[0]!.message).toContain('5');
        expect(problems.every(problem => problem.severity === 'critical')).toBe(true);
    });

    it('takes a null value, which encoding/json reads as an empty string', () => {
        expect(found({ ':method': null })).toEqual([]);
    });

    it('is not asked of anything that is not a rule object', () => {
        expect(attrsProblems(null)).toEqual([]);
        expect(attrsProblems('rule')).toEqual([]);
        expect(attrsProblems({ snippet: 'NAME' })).toEqual([]);
        expect(readAttrs([])).toBeUndefined();
    });
});

describe('the schema', () => {
    it('already says the same', () => {
        expect(RoutingRuleSchema.safeParse(rule({ ':method': 'GET' })).success).toBe(true);
        expect(RoutingRuleSchema.safeParse(rule('GET')).success).toBe(false);
        expect(RoutingRuleSchema.safeParse(rule({ ':method': 1 })).success).toBe(false);
    });
});

describe('in the diagnostics', () => {
    const run = (attrs: unknown, line?: (typeof CORE_VERSIONS)[number]['id']) =>
        runFullDiagnostics({ outbounds: [{ tag: 'direct', protocol: 'freedom' }], routing: { rules: [rule(attrs)] } } as any, [], line)
            .filter(d => d.section === 'routing' && d.field === 'attrs');

    it('is critical on a wrong type, on every line and without one', () => {
        for (const line of [undefined, ...CORE_VERSIONS.map(version => version.id)]) {
            expect(run("attrs[':method'] == 'GET'", line).map(d => [d.severity, d.itemIndex])).toEqual([['critical', 0]]);
            expect(run({ ':method': 1 }, line).map(d => [d.severity, d.itemIndex])).toEqual([['critical', 0]]);
        }
    });

    it('says nothing about a good one', () => {
        for (const line of [undefined, ...CORE_VERSIONS.map(version => version.id)]) {
            expect(run({ ':method': 'GET' }, line)).toEqual([]);
        }
    });

    it('skips a snippet reference', () => {
        const found = runFullDiagnostics({ routing: { rules: [{ snippet: 'NAME', attrs: 'x' }] } } as any)
            .filter(d => d.field === 'attrs');
        expect(found).toEqual([]);
    });
});
