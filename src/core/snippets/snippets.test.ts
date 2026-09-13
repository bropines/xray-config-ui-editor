import { describe, it, expect } from 'bun:test';
import {
    isSnippetRef,
    getSnippetRefName,
    collectSnippetRefs,
    collectSnippetNames,
    validateSnippetName,
    validateSnippetBody,
    classifySnippet,
    indexSnippets,
    snippetProvidedOutboundTags,
    expandSnippets,
    makeSnippetRef,
    type SnippetDefinition,
} from './index';

// A trimmed-down version of a real Remnawave config profile: two snippet
// references sitting between ordinary rules, which is exactly the shape that
// used to import as two "broken" rules.
const PANEL_CONFIG = {
    routing: {
        rules: [
            { ip: ['geoip:private'], outboundTag: 'BLOCK' },
            { snippet: 'RU-RELAY-RULES-2' },
            { snippet: 'RU-RELAY-RULES-NOBAL' },
            { type: 'field', network: 'tcp,udp', balancerTag: 'proxy-balancer' },
        ],
        balancers: [{ tag: 'proxy-balancer', selector: ['PROXY-'] }, { snippet: 'RU-RELAY-BALANCER' }],
    },
    outbounds: [
        { tag: 'DIRECT', protocol: 'freedom', settings: {} },
        { snippet: 'SHARED-PROXIES' },
    ],
};

describe('isSnippetRef / getSnippetRefName', () => {
    it('recognises a bare reference', () => {
        expect(isSnippetRef({ snippet: 'RU-RELAY-RULES-2' })).toBe(true);
        expect(getSnippetRefName({ snippet: 'RU-RELAY-RULES-2' })).toBe('RU-RELAY-RULES-2');
    });

    it('recognises a reference that carries sibling keys, because the panel does', () => {
        expect(isSnippetRef({ snippet: 'X', note: 'kept by the user' })).toBe(true);
    });

    it('trims surrounding whitespace out of the referenced name', () => {
        expect(getSnippetRefName({ snippet: '  Block Private  ' })).toBe('Block Private');
    });

    it('rejects ordinary rules, empty names and non-objects', () => {
        expect(isSnippetRef({ ip: ['geoip:private'], outboundTag: 'BLOCK' })).toBe(false);
        expect(isSnippetRef({ snippet: '   ' })).toBe(false);
        expect(isSnippetRef({ snippet: 42 })).toBe(false);
        expect(isSnippetRef(null)).toBe(false);
        expect(isSnippetRef(['snippet'])).toBe(false);
        expect(getSnippetRefName({ ip: [] })).toBeNull();
    });
});

describe('collectSnippetRefs', () => {
    it('finds references in rules, balancers and outbounds, with their positions', () => {
        expect(collectSnippetRefs(PANEL_CONFIG)).toEqual([
            { name: 'RU-RELAY-RULES-2', section: 'rules', index: 1 },
            { name: 'RU-RELAY-RULES-NOBAL', section: 'rules', index: 2 },
            // Live Remnawave profiles reference a balancer snippet as often
            // as a rules one, so this array must be scanned too.
            { name: 'RU-RELAY-BALANCER', section: 'balancers', index: 1 },
            { name: 'SHARED-PROXIES', section: 'outbounds', index: 1 },
        ]);
    });

    it('returns an empty list for a config with no references at all', () => {
        expect(collectSnippetRefs({ outbounds: [{ tag: 'DIRECT', protocol: 'freedom' }] })).toEqual([]);
        expect(collectSnippetRefs(null)).toEqual([]);
    });

    it('de-duplicates names while keeping first-seen order', () => {
        const cfg = { routing: { rules: [{ snippet: 'B' }, { snippet: 'A' }, { snippet: 'B' }] } };
        expect(collectSnippetNames(cfg)).toEqual(['B', 'A']);
    });
});

describe('validateSnippetName', () => {
    it('accepts the names Remnawave accepts, including folder segments', () => {
        expect(validateSnippetName('Block Private')).toBeNull();
        expect(validateSnippetName('RU-RELAY-RULES-2')).toBeNull();
        expect(validateSnippetName('ru/relay/rules_2')).toBeNull();
    });

    it('rejects too-short names and illegal characters', () => {
        expect(validateSnippetName('a')).toContain('at least');
        expect(validateSnippetName('a'.repeat(256))).toContain('at most');
        expect(validateSnippetName('bad.name')).toContain('letters');
        expect(validateSnippetName('trailing/')).toContain('letters');
    });
});

describe('validateSnippetBody', () => {
    it('requires an array of objects — the [] the docs insist on', () => {
        expect(validateSnippetBody([{ outboundTag: 'BLOCK' }])).toBeNull();
        expect(validateSnippetBody([])).toBeNull();
        expect(validateSnippetBody({ outboundTag: 'BLOCK' })).toContain('array');
        expect(validateSnippetBody([[{}]])).toContain('object');
        expect(validateSnippetBody(['rule'])).toContain('object');
    });
});

describe('classifySnippet', () => {
    it('reads a rules body as rules', () => {
        expect(classifySnippet([{ domain: ['geosite:ru'], outboundTag: 'DIRECT' }])).toBe('rules');
    });

    it('reads an outbounds body as outbounds', () => {
        expect(classifySnippet([
            { tag: 'PROXY-1', protocol: 'vless', settings: {}, streamSettings: { network: 'raw' } },
        ])).toBe('outbounds');
    });

    it('does not mistake a protocol matcher rule for an outbound', () => {
        expect(classifySnippet([{ protocol: ['bittorrent'], outboundTag: 'BLOCK' }])).toBe('rules');
    });

    it('reads a balancers body as balancers, not as unknown', () => {
        // The exact shape of the panel's own RU-RELAY-BALANCER snippet.
        expect(classifySnippet([
            { tag: 'proxy-balancer', selector: ['PROXY-'], strategy: { type: 'leastPing' } },
        ])).toBe('balancers');
    });

    it('flags a body that mixes both kinds', () => {
        expect(classifySnippet([
            { domain: ['geosite:ru'], outboundTag: 'DIRECT' },
            { tag: 'PROXY-1', protocol: 'vless', settings: {} },
        ])).toBe('mixed');
    });

    it('reports empty and non-array bodies distinctly', () => {
        expect(classifySnippet([])).toBe('empty');
        expect(classifySnippet({})).toBe('unknown');
    });
});

describe('snippetProvidedOutboundTags', () => {
    it('lists tags a config only gains once its snippets expand', () => {
        const defs = indexSnippets([
            {
                name: 'SHARED-PROXIES',
                source: 'panel',
                snippet: [
                    { tag: 'PROXY-A', protocol: 'vless', settings: {} },
                    { tag: 'PROXY-B', protocol: 'vless', settings: {} },
                ],
            },
        ]);
        expect(snippetProvidedOutboundTags(PANEL_CONFIG, defs)).toEqual(['PROXY-A', 'PROXY-B']);
    });

    it('contributes nothing for an unknown reference', () => {
        expect(snippetProvidedOutboundTags(PANEL_CONFIG, indexSnippets([]))).toEqual([]);
    });
});

describe('expandSnippets', () => {
    const defs = indexSnippets([
        {
            name: 'RU-RELAY-RULES-2',
            source: 'panel',
            snippet: [
                { domain: ['geosite:ru'], outboundTag: 'DIRECT' },
                { ip: ['geoip:ru'], outboundTag: 'DIRECT' },
            ],
        },
    ] as SnippetDefinition[]);

    it('splices a known body in at the reference position, preserving rule order', () => {
        const { config, expanded } = expandSnippets(PANEL_CONFIG, defs);
        expect(expanded).toBe(1);
        expect(config.routing.rules.map((r: any) => r.outboundTag || r.balancerTag || r.snippet)).toEqual([
            'BLOCK',
            'DIRECT',
            'DIRECT',
            'RU-RELAY-RULES-NOBAL',
            'proxy-balancer',
        ]);
    });

    it('keeps unknown references in place and reports them', () => {
        const { config, unresolved } = expandSnippets(PANEL_CONFIG, defs);
        expect(unresolved).toEqual(['RU-RELAY-RULES-NOBAL', 'RU-RELAY-BALANCER', 'SHARED-PROXIES']);
        expect(config.routing.rules[3]).toEqual({ snippet: 'RU-RELAY-RULES-NOBAL' });
    });

    it('expands a reference inside routing.balancers', () => {
        const balancerDefs = indexSnippets([
            {
                name: 'RU-RELAY-BALANCER',
                source: 'panel',
                snippet: [{ tag: 'relay-balancer', selector: ['RELAY-'], strategy: { type: 'leastPing' } }],
            },
        ]);
        const { config } = expandSnippets(PANEL_CONFIG, balancerDefs);
        expect(config.routing.balancers.map((b: any) => b.tag)).toEqual(['proxy-balancer', 'relay-balancer']);
    });

    it('never mutates the config it was handed', () => {
        const before = JSON.stringify(PANEL_CONFIG);
        expandSnippets(PANEL_CONFIG, defs);
        expect(JSON.stringify(PANEL_CONFIG)).toBe(before);
    });

    it('deep-copies bodies so two references cannot share one object', () => {
        const cfg = { routing: { rules: [{ snippet: 'RU-RELAY-RULES-2' }, { snippet: 'RU-RELAY-RULES-2' }] } };
        const { config } = expandSnippets(cfg, defs);
        expect(config.routing.rules).toHaveLength(4);
        expect(config.routing.rules[0]).not.toBe(config.routing.rules[2]);
    });
});

describe('makeSnippetRef', () => {
    it('produces exactly the object the panel expects', () => {
        expect(makeSnippetRef('  Block Private ')).toEqual({ snippet: 'Block Private' });
    });
});
