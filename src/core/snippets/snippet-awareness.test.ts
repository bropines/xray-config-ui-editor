import { describe, it, expect } from 'bun:test';
import { getCriticalRuleErrors, validateOutbound } from '../validators';
import { runFullDiagnostics } from '../diagnostics';
import type { SnippetDefinition } from './index';

// These cover the behaviour that made an imported Remnawave profile unusable:
// a `{ "snippet": "NAME" }` placeholder was linted as if it were a rule (or an
// outbound), so every profile using snippets opened with red "will crash Xray"
// errors that the user had no way to fix.

describe('snippet references are not linted as rules or outbounds', () => {
    it('reports no critical errors for a rule that is a snippet reference', () => {
        expect(getCriticalRuleErrors({ snippet: 'RU-RELAY-RULES-2' })).toEqual([]);
    });

    it('still reports a genuinely empty rule', () => {
        const errors = getCriticalRuleErrors({});
        expect(errors.map(e => e.field).sort()).toEqual(['matchers', 'target']);
    });

    it('reports no errors for an outbound slot holding a snippet reference', () => {
        expect(validateOutbound({ snippet: 'SHARED-PROXIES' })).toEqual([]);
    });

    it('still requires a tag on a real outbound', () => {
        expect(validateOutbound({ protocol: 'freedom' }).some(e => e.field === 'tag')).toBe(true);
    });
});

describe('runFullDiagnostics with snippets', () => {
    const config: any = {
        inbounds: [],
        outbounds: [
            { tag: 'DIRECT', protocol: 'freedom', settings: {} },
            { snippet: 'SHARED-PROXIES' },
        ],
        routing: {
            rules: [
                { snippet: 'RU-RELAY-RULES-2' },
                { domain: ['geosite:ru'], outboundTag: 'PROXY-A' },
            ],
        },
    };

    const defs: SnippetDefinition[] = [
        {
            name: 'SHARED-PROXIES',
            source: 'panel',
            snippet: [{ tag: 'PROXY-A', protocol: 'vless', settings: {} }],
        },
        { name: 'RU-RELAY-RULES-2', source: 'panel', snippet: [{ domain: ['geosite:ru'], outboundTag: 'DIRECT' }] },
    ];

    it('does not flag a rule that targets an outbound provided by a snippet', () => {
        const critical = runFullDiagnostics(config, defs).filter(d => d.severity === 'critical');
        expect(critical).toEqual([]);
    });

    it('does flag that same target when no snippet supplies it', () => {
        const critical = runFullDiagnostics(config, []).filter(d => d.severity === 'critical');
        expect(critical.map(d => d.message)).toContain('Rule targets unknown outbound: "PROXY-A"');
    });

    it('warns about an unresolved reference once a library is loaded', () => {
        const partial = defs.filter(d => d.name === 'SHARED-PROXIES');
        const found = runFullDiagnostics(config, partial)
            .filter(d => d.field === 'snippet');
        expect(found).toHaveLength(1);
        expect(found[0]?.severity).toBe('warning');
        expect(found[0]?.message).toContain('RU-RELAY-RULES-2');
    });

    it('downgrades that to info when no library has been loaded at all', () => {
        const found = runFullDiagnostics(config, []).filter(d => d.field === 'snippet');
        expect(found.map(d => d.severity)).toEqual(['info', 'info']);
    });

    it('never marks a snippet reference critical, so it cannot block a cloud push', () => {
        const all = [
            ...runFullDiagnostics(config, []),
            ...runFullDiagnostics(config, defs),
        ].filter(d => d.field === 'snippet');
        expect(all.every(d => d.severity !== 'critical')).toBe(true);
    });
});


describe('REALITY inbound destination naming', () => {
    // Xray-core renamed the fallback destination `dest` -> `target`; both are
    // accepted by the core and by this project's Zod schema. Diagnostics used
    // to demand `dest`, so every current REALITY inbound (every live
    // Remnawave profile checked) raised a critical finding — which
    // saveToRemnawave treats as a hard block on pushing to the panel.
    const inbound = (reality: any) => ({
        inbounds: [{ tag: 'in', protocol: 'vless', streamSettings: { security: 'reality', realitySettings: reality } }],
        outbounds: [{ tag: 'DIRECT', protocol: 'freedom', settings: {} }],
    }) as any;

    it('accepts the current "target" spelling', () => {
        const critical = runFullDiagnostics(inbound({ target: '127.0.0.1:9443', privateKey: 'k' }))
            .filter(d => d.severity === 'critical');
        expect(critical).toEqual([]);
    });

    it('still accepts the legacy "dest" spelling', () => {
        const critical = runFullDiagnostics(inbound({ dest: '127.0.0.1:9443', privateKey: 'k' }))
            .filter(d => d.severity === 'critical');
        expect(critical).toEqual([]);
    });

    it('still reports a REALITY inbound with neither, or without a key', () => {
        expect(runFullDiagnostics(inbound({ privateKey: 'k' })).filter(d => d.severity === 'critical')).toHaveLength(1);
        expect(runFullDiagnostics(inbound({ target: '127.0.0.1:9443' })).filter(d => d.severity === 'critical')).toHaveLength(1);
    });
});
