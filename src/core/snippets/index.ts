// ============================================================
// Snippets — src/core/snippets/index.ts
// ============================================================
//
// Remnawave config profiles can contain *snippet references* instead of
// literal blocks:
//
//   "routing": { "rules": [ { "snippet": "RU-RELAY-RULES-2" }, ... ] }
//
// The panel stores the referenced body centrally (GET /api/snippets) and
// expands it right before pushing the config to a node, so a config imported
// from the panel keeps the *unexpanded* reference. Xray-core itself knows
// nothing about `snippet` — a reference reaching a node unexpanded is simply
// an empty rule.
//
// For this editor that means two things:
//   1. A reference must never be treated as a broken rule ("no matchers",
//      "no destination") — it is a placeholder, not a rule.
//   2. A reference must survive a round-trip untouched, or pushing the
//      config back to the panel would silently inline (and thus unlink) it.
//
// This module is the single source of truth for recognising, validating,
// classifying and (for preview only) expanding those references. The same
// shapes back the local "templates" library, which is the offline twin of a
// panel snippet: same body, stored in the browser instead of the panel.
// ============================================================

/**
 * Where a snippet body may legally be spliced in by the panel.
 *
 * `balancers` is not a guess: live Remnawave profiles reference a snippet
 * from `routing.balancers` as often as from `routing.rules`.
 */
export type SnippetSection = 'rules' | 'outbounds' | 'balancers';

/** What a snippet body turned out to contain, inferred from its entries. */
export type SnippetKind = 'rules' | 'outbounds' | 'balancers' | 'mixed' | 'empty' | 'unknown';

/** Where the definition of a snippet came from. */
export type SnippetSource = 'panel' | 'local';

/** A snippet body plus its identity — a panel snippet or a local template. */
export interface SnippetDefinition {
    /** Unique name; this is what `{ "snippet": name }` refers to. */
    name: string;
    /** The body: an array of routing rules or of outbounds. */
    snippet: any[];
    /** `panel` = fetched from Remnawave, `local` = this browser's template. */
    source: SnippetSource;
    /** Epoch ms of the last local edit (local templates only). */
    updatedAt?: number;
    /** Free-form note, local templates only — the panel has no such field. */
    description?: string;
}

/** One `{ "snippet": "NAME" }` occurrence found inside a config. */
export interface SnippetRefLocation {
    name: string;
    section: SnippetSection;
    /** Index inside `routing.rules` / `outbounds` — routing order matters. */
    index: number;
}

/**
 * Remnawave's own constraint (its create/update/delete snippet commands):
 * letters, digits, underscores, dashes and spaces, optionally grouped into
 * `folder/name` segments.
 */
export const SNIPPET_NAME_REGEX = /^[A-Za-z0-9_ -]+(\/[A-Za-z0-9_ -]+)*$/;
export const SNIPPET_NAME_MIN = 2;
export const SNIPPET_NAME_MAX = 255;

/**
 * True when `value` is a snippet reference rather than a real rule/outbound.
 *
 * Deliberately permissive about sibling keys: the panel keys off the
 * `snippet` property alone, so `{ "snippet": "X", "comment": "..." }` is
 * still a reference and must not be linted as a rule.
 */
export const isSnippetRef = (value: any): boolean =>
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof value.snippet === 'string' &&
    value.snippet.trim() !== '';

/** The referenced name, or null when `value` is not a reference. */
export const getSnippetRefName = (value: any): string | null =>
    isSnippetRef(value) ? String(value.snippet).trim() : null;

/** Build a reference object to splice into `rules` / `outbounds`. */
export const makeSnippetRef = (name: string) => ({ snippet: name.trim() });

/**
 * Every snippet reference in a config, in document order, with the array and
 * index it sits at so callers can preserve routing order when rendering.
 */
export const collectSnippetRefs = (config: any): SnippetRefLocation[] => {
    const refs: SnippetRefLocation[] = [];
    if (!config || typeof config !== 'object') return refs;

    const scan = (list: any, section: SnippetSection) => {
        if (!Array.isArray(list)) return;
        list.forEach((item, index) => {
            const name = getSnippetRefName(item);
            if (name) refs.push({ name, section, index });
        });
    };

    scan(config.routing?.rules, 'rules');
    scan(config.routing?.balancers, 'balancers');
    scan(config.outbounds, 'outbounds');
    return refs;
};

/** Distinct snippet names referenced by a config, in first-seen order. */
export const collectSnippetNames = (config: any): string[] => {
    const seen = new Set<string>();
    const names: string[] = [];
    collectSnippetRefs(config).forEach(ref => {
        if (seen.has(ref.name)) return;
        seen.add(ref.name);
        names.push(ref.name);
    });
    return names;
};

/**
 * Validate a snippet name against Remnawave's rules.
 * Returns an error message, or null when the name is acceptable.
 */
export const validateSnippetName = (name: string): string | null => {
    const trimmed = (name || '').trim();
    if (trimmed.length < SNIPPET_NAME_MIN) return `Name must be at least ${SNIPPET_NAME_MIN} characters`;
    if (trimmed.length > SNIPPET_NAME_MAX) return `Name must be at most ${SNIPPET_NAME_MAX} characters`;
    if (!SNIPPET_NAME_REGEX.test(trimmed)) {
        return 'Only letters, digits, spaces, "_", "-" and "/" are allowed';
    }
    return null;
};

/**
 * Validate a snippet body. The panel requires an array of objects — a bare
 * object (the most common mistake, since the editor shows one rule at a
 * time) is rejected there with an opaque error, so catch it here.
 */
export const validateSnippetBody = (body: any): string | null => {
    if (!Array.isArray(body)) return 'Snippet body must be a JSON array — wrap it in [ ]';
    if (body.some(entry => !entry || typeof entry !== 'object' || Array.isArray(entry))) {
        return 'Every entry of a snippet must be a JSON object';
    }
    return null;
};

const OUTBOUND_MARKERS = ['streamSettings', 'proxySettings', 'mux'];
const BALANCER_MARKERS = ['selector', 'fallbackTag'];
const RULE_MARKERS = [
    'outboundTag', 'balancerTag', 'domain', 'ip', 'port', 'sourcePort', 'network',
    'source', 'user', 'inboundTag', 'attrs', 'ruleTag', 'process', 'localIP', 'localPort',
];

/**
 * Infer whether a body holds routing rules, outbounds or balancers.
 *
 * Keys overlap across all three — `tag` belongs to outbounds and balancers,
 * `protocol` to outbounds and (as a sniffed-protocol matcher) to rules — so
 * each entry is decided by its most specific key: `selector` means balancer,
 * a transport/mux key means outbound, a matcher or action key means rule.
 */
export const classifySnippet = (body: any): SnippetKind => {
    if (!Array.isArray(body)) return 'unknown';
    if (body.length === 0) return 'empty';

    let rules = 0;
    let outbounds = 0;
    let balancers = 0;

    for (const entry of body) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return 'unknown';
        const keys = Object.keys(entry);
        const hasRuleKey = keys.some(k => RULE_MARKERS.includes(k));
        const hasBalancerKey = keys.some(k => BALANCER_MARKERS.includes(k));
        const hasOutboundKey = keys.some(k => OUTBOUND_MARKERS.includes(k));
        const looksLikeOutbound =
            hasOutboundKey ||
            (keys.includes('protocol') && (keys.includes('settings') || keys.includes('tag')));

        if (hasBalancerKey && !hasRuleKey) balancers++;
        else if (looksLikeOutbound && !hasRuleKey) outbounds++;
        else if (hasRuleKey || keys.includes('protocol')) rules++;
    }

    const kinds = [rules, outbounds, balancers].filter(n => n > 0).length;
    if (kinds > 1) return 'mixed';
    if (balancers > 0) return 'balancers';
    if (outbounds > 0) return 'outbounds';
    if (rules > 0) return 'rules';
    return 'unknown';
};

/** Index a definition list by name; later entries win over earlier ones. */
export const indexSnippets = (defs: SnippetDefinition[]): Map<string, SnippetDefinition> => {
    const map = new Map<string, SnippetDefinition>();
    (defs || []).forEach(def => {
        if (def?.name) map.set(def.name.trim(), def);
    });
    return map;
};

/**
 * Tags a config gains once its snippet references are expanded — outbound
 * tags and balancer tags alike, since both live on a `tag` property.
 * Diagnostics uses this so a rule targeting a snippet-provided outbound or
 * balancer is not reported as dangling.
 */
export const snippetProvidedOutboundTags = (
    config: any,
    defs: Map<string, SnippetDefinition>
): string[] => {
    const tags: string[] = [];
    collectSnippetRefs(config).forEach(ref => {
        const def = defs.get(ref.name);
        if (!def || !Array.isArray(def.snippet)) return;
        def.snippet.forEach((entry: any) => {
            if (entry && typeof entry === 'object' && typeof entry.tag === 'string') tags.push(entry.tag);
        });
    });
    return tags;
};

export interface ExpandSnippetsResult {
    /** A deep copy of the config with every known reference spliced in. */
    config: any;
    /** Names referenced by the config but absent from the definition map. */
    unresolved: string[];
    /** How many references were replaced. */
    expanded: number;
}

/**
 * Expand references into their bodies — the same thing the panel does before
 * pushing a config to a node.
 *
 * This is for *analysis and preview*: diagnostics, topology, "what will the
 * node actually see". The stored config keeps its references, because
 * expanding them in place would sever the link to the panel's central copy.
 * Unknown references are left in place rather than dropped, so an expansion
 * run against a stale library never silently deletes routing.
 */
export const expandSnippets = (
    config: any,
    defs: Map<string, SnippetDefinition>
): ExpandSnippetsResult => {
    const unresolved: string[] = [];
    let expanded = 0;

    if (!config || typeof config !== 'object') {
        return { config, unresolved, expanded };
    }

    const clone = JSON.parse(JSON.stringify(config));

    const expandList = (list: any): any => {
        if (!Array.isArray(list)) return list;
        const out: any[] = [];
        list.forEach(item => {
            const name = getSnippetRefName(item);
            if (!name) {
                out.push(item);
                return;
            }
            const def = defs.get(name);
            if (!def || !Array.isArray(def.snippet)) {
                if (!unresolved.includes(name)) unresolved.push(name);
                out.push(item);
                return;
            }
            expanded++;
            def.snippet.forEach(entry => out.push(JSON.parse(JSON.stringify(entry))));
        });
        return out;
    };

    if (clone.routing?.rules) clone.routing.rules = expandList(clone.routing.rules);
    if (clone.routing?.balancers) clone.routing.balancers = expandList(clone.routing.balancers);
    if (clone.outbounds) clone.outbounds = expandList(clone.outbounds);

    return { config: clone, unresolved, expanded };
};
