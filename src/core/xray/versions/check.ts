/**
 * Check a config against one core version.
 *
 * Walks the config once per feature in FEATURES and reports each place that
 * uses something the chosen core does not accept. The severities follow what
 * the core would actually do:
 *
 *   rejected    critical — the config will not load; saving to a panel stops
 *   absent      warning  — the setting is silently dropped, so it does nothing
 *   deprecated  info     — it works, and the log will say to move off it
 *
 * Snippet references are skipped: the panel expands them, and their bodies are
 * checked where they are edited. See core/snippets.
 */
import type { Diagnostic, DiagnosticSeverity } from '../../diagnostics';
import { isSnippetRef } from '../../snippets';
import { t } from '../../../i18n';
import { coreVersion, type CoreVersionId } from './index';
import { ruleDiagnostics } from './rules';
import { FEATURES, VALUE_SETS, type CoreFeature, type CoreValueSet, type FeatureScope, type FeatureStatus } from './features';

/**
 * Every value found at a dotted path.
 *
 * `[]` fans out over array elements; `[key=value]` fans out over the elements
 * whose `key` equals `value`, case-insensitively — which is how a setting
 * that only one kind of finalmask mask has is told apart from a same-named
 * setting on another: `streamSettings.finalmask.udp[type=xdns].settings.domain`.
 */
export const valuesAtPath = (root: unknown, path: string): unknown[] => {
    let current: unknown[] = [root];
    for (const segment of path.split('.')) {
        const bracket = /^([^[]+)\[(?:([^=\]]+)=([^\]]+))?\]$/.exec(segment);
        const key = bracket ? bracket[1]! : segment;
        const filterKey = bracket?.[2];
        const filterValue = bracket?.[3]?.toLowerCase();
        const next: unknown[] = [];
        for (const node of current) {
            if (node === null || typeof node !== 'object') continue;
            const value = (node as Record<string, unknown>)[key];
            if (value === undefined) continue;
            if (!bracket) {
                next.push(value);
                continue;
            }
            if (!Array.isArray(value)) continue;
            for (const element of value) {
                if (filterKey === undefined) {
                    next.push(element);
                } else if (
                    element && typeof element === 'object'
                    && String((element as Record<string, unknown>)[filterKey]).toLowerCase() === filterValue
                ) {
                    next.push(element);
                }
            }
        }
        current = next;
    }
    return current;
};

const isNonEmpty = (value: unknown): boolean => {
    if (value === '' || value === undefined || value === null) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value as object).length > 0;
    return true;
};

const matchesValue = (found: unknown, wanted: string): boolean =>
    typeof found === 'string' || typeof found === 'number' || typeof found === 'boolean'
        ? String(found).toLowerCase() === wanted.toLowerCase()
        : false;

/** Whether one scoped object uses a feature. */
export const usesFeature = (item: unknown, feature: CoreFeature): boolean => {
    if (item === null || typeof item !== 'object') return false;
    if (feature.protocol) {
        const protocol = (item as Record<string, unknown>).protocol;
        if (typeof protocol !== 'string' || !feature.protocol.includes(protocol)) return false;
    }
    // `null` decodes to a nil pointer, which every Build() treats as unset.
    const found = valuesAtPath(item, feature.path).filter(value => value !== null);
    if (feature.value !== undefined) return found.some(value => matchesValue(value, feature.value!));
    if (feature.nonEmpty) return found.some(isNonEmpty);
    return found.length > 0;
};

interface Site {
    section: string;
    index?: number;
    item: unknown;
}

/** The objects a scope refers to, with where each one sits. */
const sitesFor = (config: any, scope: FeatureScope): Site[] => {
    const list = (value: unknown): any[] => (Array.isArray(value) ? value : []);
    switch (scope) {
        case 'config':
            return [{ section: 'config', item: config }];
        case 'inbound':
            return list(config.inbounds).map((item, index) => ({ section: 'inbounds', index, item }));
        case 'outbound':
            return list(config.outbounds)
                .map((item, index) => ({ section: 'outbounds', index, item }))
                .filter(site => !isSnippetRef(site.item));
        case 'rule':
            return list(config.routing?.rules)
                .map((item, index) => ({ section: 'routing', index, item }))
                .filter(site => !isSnippetRef(site.item));
        case 'balancer':
            return list(config.routing?.balancers).map((item, index) => ({ section: 'routing', index, item }));
        case 'dnsServer':
            return list(config.dns?.servers)
                .filter(server => server && typeof server === 'object')
                .map((item, index) => ({ section: 'dns', index, item }));
    }
};

export interface FeatureUse {
    feature: CoreFeature;
    section: string;
    index?: number;
}

/** Every place a config uses a feature the table knows about. */
export const featureUses = (config: unknown): FeatureUse[] => {
    if (!config || typeof config !== 'object') return [];
    const uses: FeatureUse[] = [];
    for (const feature of FEATURES) {
        for (const site of sitesFor(config, feature.scope)) {
            if (usesFeature(site.item, feature)) {
                uses.push({ feature, section: site.section, index: site.index });
            }
        }
    }
    return uses;
};

const SEVERITY: Record<Exclude<FeatureStatus, 'accepted'>, DiagnosticSeverity> = {
    rejected: 'critical',
    absent: 'warning',
    deprecated: 'info',
};

const describe = (feature: CoreFeature): string =>
    feature.value !== undefined ? `${feature.path} = "${feature.value}"` : feature.path;

const message = (status: Exclude<FeatureStatus, 'accepted'>, what: string, tag: string): string => {
    switch (status) {
        case 'rejected':
            return t("{what} is refused by Xray {tag} — the config will not load.", { what, tag });
        case 'absent':
            return t("{what} does not exist in Xray {tag}, which drops it silently — it does nothing there.", { what, tag });
        case 'deprecated':
            return t("{what} is deprecated in Xray {tag}. It still works, and the log will ask you to move off it.", { what, tag });
    }
};

export interface ValueUse {
    set: CoreValueSet;
    value: string;
    section: string;
    index?: number;
}

/** Every value a config holds at a path some value set governs. */
export const valueUses = (config: unknown): ValueUse[] => {
    if (!config || typeof config !== 'object') return [];
    const uses: ValueUse[] = [];
    for (const set of VALUE_SETS) {
        if (set.offeredOnly) continue;
        for (const site of sitesFor(config, set.scope)) {
            if (site.item === null || typeof site.item !== 'object') continue;
            if (set.protocol) {
                const protocol = (site.item as Record<string, unknown>).protocol;
                if (typeof protocol !== 'string' || !set.protocol.includes(protocol)) continue;
            }
            for (const value of valuesAtPath(site.item, set.path)) {
                if (typeof value === 'string') uses.push({ set, value, section: site.section, index: site.index });
            }
        }
    }
    return uses;
};

/** Whether a line takes a value for a set, compared the way the core compares it. */
export const acceptsValue = (set: CoreValueSet, version: CoreVersionId, value: string): boolean => {
    const allowed = set.allowed[version];
    // No such field on this line: its values are not the question.
    if (allowed === null) return true;
    return set.caseSensitive
        ? allowed.includes(value)
        : allowed.some(candidate => candidate.toLowerCase() === value.toLowerCase());
};

/** Diagnostics for every feature the config uses that `version` does not accept. */
export const versionDiagnostics = (config: unknown, version: CoreVersionId): Diagnostic[] => {
    const { tag } = coreVersion(version);
    const out: Diagnostic[] = [...ruleDiagnostics(config, version)];

    for (const use of valueUses(config)) {
        if (acceptsValue(use.set, version, use.value)) continue;
        const replacement = use.set.replacedBy?.[use.value.toLowerCase()] ?? use.set.replacedBy?.[use.value];
        out.push({
            section: use.section,
            itemIndex: use.index,
            field: use.set.path,
            severity: SEVERITY[use.set.outside],
            message: message(use.set.outside, `${use.set.path} = "${use.value}"`, tag),
            suggestion: replacement
                ? t("Use {replacement} instead.", { replacement })
                : t("Xray {tag} takes: {values}.", { tag, values: (use.set.allowed[version] ?? []).filter(Boolean).join(', ') }),
        });
    }

    const uses = featureUses(config);
    // A key inside an object the line does not know is covered by the finding
    // for the object (see CoreFeature.coveredBy), as long as that one is reported.
    const reported = (id: string, use: FeatureUse): boolean =>
        uses.some(other =>
            other.feature.id === id
            && other.section === use.section
            && other.index === use.index
            && other.feature.status[version] !== 'accepted');

    for (const use of uses) {
        const status = use.feature.status[version];
        if (status === 'accepted') continue;
        if (use.feature.coveredBy && reported(use.feature.coveredBy, use)) continue;
        out.push({
            section: use.section,
            itemIndex: use.index,
            field: use.feature.path,
            severity: SEVERITY[status],
            message: message(status, describe(use.feature), tag),
            suggestion: use.feature.replacement
                ? t("Use {replacement} instead.", { replacement: use.feature.replacement })
                : undefined,
        });
    }
    return out;
};
