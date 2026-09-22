import { describe, expect, it } from 'bun:test';
import { fieldsAt, valuesAt } from './schema-walk';

/**
 * The editor's suggestions come from here. What matters is that they are the
 * keys of the object the cursor is actually in — the old completion offered
 * the root's keys at every depth, so writing a routing rule suggested
 * `inbounds` and `log`.
 */

const names = (mode: Parameters<typeof fieldsAt>[0], path: (string | number)[]) =>
    fieldsAt(mode, path).map(f => f.name);

describe('fieldsAt', () => {
    it('offers a routing rule its matchers, not the root config keys', () => {
        const fields = names('rule', []);
        expect(fields).toContain('domain');
        expect(fields).toContain('outboundTag');
        expect(fields).toContain('protocol');
        expect(fields).not.toContain('inbounds');
        expect(fields).not.toContain('log');
    });

    it('descends through an array into the object it holds', () => {
        expect(names('routing', ['rules', 0])).toContain('balancerTag');
        expect(names('full', ['inbounds', 0])).toContain('streamSettings');
        expect(names('full', ['routing', 'rules', 3])).toContain('inboundTag');
    });

    it('knows the nested objects too', () => {
        expect(names('full', ['inbounds', 0, 'sniffing'])).toContain('destOverride');
        expect(names('full', ['inbounds', 0, 'streamSettings'])).toContain('network');
    });

    it('says which fields are required', () => {
        const tag = fieldsAt('balancer', []).find(f => f.name === 'tag');
        const fallback = fieldsAt('balancer', []).find(f => f.name === 'fallbackTag');
        expect(tag?.required).toBe(true);
        expect(fallback?.required).toBe(false);
    });

    it('names the type in terms someone writing JSON would use', () => {
        const byName = Object.fromEntries(fieldsAt('rule', []).map(f => [f.name, f.type]));
        expect(byName['ruleTag']).toBe('string');
        expect(byName['inboundTag']).toBe('string[]');
        expect(byName['attrs']).toBe('object');
    });

    it('carries the allowed values for a closed set', () => {
        const protocol = fieldsAt('rule', []).find(f => f.name === 'protocol');
        expect(protocol?.values).toContain('bittorrent');

        const strategy = fieldsAt('routing', []).find(f => f.name === 'domainStrategy');
        expect(strategy?.values).toEqual(expect.arrayContaining(['AsIs', 'IPIfNonMatch', 'IPOnDemand']));
    });

    it('answers nothing where anything is allowed', () => {
        // Protocol settings are a free-form record on purpose.
        expect(fieldsAt('full', ['inbounds', 0, 'settings'])).toEqual([]);
        expect(fieldsAt('rule', ['nonsense', 'deeper'])).toEqual([]);
    });
});

describe('valuesAt', () => {
    it('answers for an enum field', () => {
        expect(valuesAt('routing', ['domainStrategy'])).toContain('IPIfNonMatch');
    });

    it('answers for an array of enums, since that is what you type inside it', () => {
        expect(valuesAt('rule', ['protocol'])).toContain('tls');
    });

    it('is empty for a free-text field', () => {
        expect(valuesAt('rule', ['ruleTag'])).toEqual([]);
    });
});
