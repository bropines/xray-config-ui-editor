import { describe, expect, it } from 'bun:test';
import { hasWebhook, webhookProblems } from './routing-webhook';
import { RoutingRuleSchema } from './schemas/routing.schema';
import { runFullDiagnostics } from '../diagnostics';
import { CORE_VERSIONS } from './versions';
import { stringMapProblems } from './string-map';

/**
 * `webhook` was typed as "a string or an object". The core reads an object:
 * WebhookRuleConfig behind a pointer, on every line, so a bare URL there is a
 * type error that fails the rule's decode (v26.7.28:infra/conf/router.go:151-157)
 * and the config with it.
 */

const rule = (webhook: unknown) => ({ type: 'field', domain: ['example.com'], outboundTag: 'direct', webhook });
const found = (webhook: unknown) => webhookProblems(rule(webhook)).map(problem => `${problem.severity} ${problem.kind}`);

describe('what the core reads as a webhook', () => {
    it('is an object with a url, and optionally a deduplication and headers', () => {
        expect(found({ url: 'https://hook.example/notify' })).toEqual([]);
        expect(found({ url: 'https://hook.example', deduplication: 10, headers: { Authorization: 'Bearer x' } })).toEqual([]);
        expect(found({ url: 'https://hook.example', deduplication: 0 })).toEqual([]);
    });

    it('is nothing when absent or null, which the core leaves nil', () => {
        expect(found(undefined)).toEqual([]);
        expect(found(null)).toEqual([]);
        expect(hasWebhook(rule(null))).toBe(false);
        expect(hasWebhook(rule(undefined))).toBe(false);
        expect(hasWebhook(rule(''))).toBe(true);
    });

    it('is never a bare string: Go cannot decode it into the struct, so the config will not load', () => {
        for (const webhook of ['https://hook.example/notify', '', 5, true, ['https://hook.example']]) {
            expect(found(webhook)).toEqual(['critical webhook.type']);
        }
    });

    it('offers the object a string URL should have been, to copy', () => {
        const [problem] = webhookProblems(rule('https://hook.example/notify'));
        expect(problem!.suggestion).toContain('{ "url": "https://hook.example/notify" }');
        expect(problem!.field).toBe('webhook');
    });

    it('may not have a url, but then the core drops it: a warning, not an error', () => {
        // v26.7.28:infra/conf/router.go:264 builds the notifier only for a non-empty url.
        expect(found({})).toEqual(['warning webhook.url.missing']);
        expect(found({ url: '' })).toEqual(['warning webhook.url.missing']);
        expect(found({ deduplication: 10 })).toEqual(['warning webhook.url.missing']);
    });

    it('has a string url: any other type fails the decode', () => {
        expect(found({ url: 5 })).toEqual(['critical webhook.url.type']);
        expect(found({ url: ['https://hook.example'] })).toEqual(['critical webhook.url.type']);
    });

    it('has a deduplication that is a uint32', () => {
        for (const bad of ['10', -1, 1.5, 4294967296, true]) {
            expect(found({ url: 'https://h.example', deduplication: bad })).toEqual(['critical webhook.deduplication']);
        }
        expect(found({ url: 'https://h.example', deduplication: 4294967295 })).toEqual([]);
    });

    it('has headers that are an object of strings', () => {
        expect(found({ url: 'https://h.example', headers: 'Authorization: x' })).toEqual(['critical webhook.headers.type']);
        expect(found({ url: 'https://h.example', headers: ['a'] })).toEqual(['critical webhook.headers.type']);
        expect(found({ url: 'https://h.example', headers: { A: 'x', B: 5, C: null, D: { e: 'f' } } }))
            .toEqual(['critical webhook.headers.value', 'critical webhook.headers.value', 'critical webhook.headers.value']);
        expect(found({ url: 'https://h.example', headers: null })).toEqual([]);
    });

    it('names the header and the value that cannot be decoded', () => {
        const problems = webhookProblems(rule({ url: 'https://h.example', headers: { Authorization: 5 } }));
        expect(problems[0]!.message).toContain('Authorization');
        expect(problems[0]!.message).toContain('5');
        expect(problems[0]!.field).toBe('webhook.headers');
    });

    it('is not asked of anything that is not a rule object', () => {
        expect(webhookProblems(null)).toEqual([]);
        expect(webhookProblems('rule')).toEqual([]);
        expect(webhookProblems({ snippet: 'NAME' })).toEqual([]);
    });
});

describe('a string map', () => {
    it('is an object whose values are all strings; null and absent are nil maps', () => {
        expect(stringMapProblems(undefined)).toEqual([]);
        expect(stringMapProblems(null)).toEqual([]);
        expect(stringMapProblems({})).toEqual([]);
        expect(stringMapProblems({ a: 'b' })).toEqual([]);
        expect(stringMapProblems('x')).toEqual([{ kind: 'not-object', held: 'x' }]);
        expect(stringMapProblems([])).toEqual([{ kind: 'not-object', held: [] }]);
        expect(stringMapProblems({ a: 1 })).toEqual([{ kind: 'not-string', name: 'a', held: 1 }]);
    });
});

describe('the schema', () => {
    it('no longer takes a bare string', () => {
        expect(RoutingRuleSchema.safeParse(rule('https://hook.example')).success).toBe(false);
        expect(RoutingRuleSchema.safeParse(rule({ url: 'https://hook.example' })).success).toBe(true);
        expect(RoutingRuleSchema.safeParse({ outboundTag: 'x' }).success).toBe(true);
    });

    it('holds deduplication to a uint32', () => {
        expect(RoutingRuleSchema.safeParse(rule({ url: 'u', deduplication: -1 })).success).toBe(false);
        expect(RoutingRuleSchema.safeParse(rule({ url: 'u', deduplication: 1.5 })).success).toBe(false);
        expect(RoutingRuleSchema.safeParse(rule({ url: 'u', deduplication: 30 })).success).toBe(true);
    });
});

describe('in the diagnostics', () => {
    const run = (webhook: unknown, line?: (typeof CORE_VERSIONS)[number]['id']) =>
        runFullDiagnostics({ outbounds: [{ tag: 'direct', protocol: 'freedom' }], routing: { rules: [rule(webhook)] } } as any, [], line)
            .filter(d => d.section === 'routing');

    it('is critical on a bare string, on every line and without one', () => {
        for (const line of [undefined, ...CORE_VERSIONS.map(version => version.id)]) {
            const found = run('https://hook.example', line);
            expect(found.map(d => [d.severity, d.itemIndex, d.field])).toEqual([['critical', 0, 'webhook']]);
            expect(found[0]!.suggestion).toBeTruthy();
        }
    });

    it('is critical on headers that are not strings', () => {
        expect(run({ url: 'https://h.example', headers: 'x' }).map(d => [d.severity, d.field])).toEqual([['critical', 'webhook.headers']]);
    });

    it('is a warning, not a block, on a webhook with no url', () => {
        expect(run({}).map(d => [d.severity, d.field])).toEqual([['warning', 'webhook.url']]);
    });

    it('is quiet about a good one', () => {
        expect(run({ url: 'https://h.example', deduplication: 5, headers: { A: 'b' } })).toEqual([]);
    });

    it('leaves a snippet reference alone', () => {
        const found = runFullDiagnostics({ routing: { rules: [{ snippet: 'RULES' }] } } as any, [], '26.7')
            .filter(d => d.field?.startsWith('webhook'));
        expect(found).toEqual([]);
    });
});
