import { describe, expect, it } from 'bun:test';
import {
    compareCoreVersions,
    CORE_VERSIONS,
    coreVersionId,
    DEFAULT_CORE_VERSION,
    LATEST_CORE_VERSION,
    MINIMUM_CORE_VERSION,
} from './index';
import { FEATURES, featureStatus, offersFeature } from './features';
import { featureUses, usesFeature, valuesAtPath, versionDiagnostics } from './check';
import { runFullDiagnostics } from '../../diagnostics';

describe('the supported lines', () => {
    it('are 26.3, 26.7, 26.9 and 26.10, oldest first', () => {
        expect(CORE_VERSIONS.map(version => version.id)).toEqual(['26.3', '26.7', '26.9', '26.10']);
        expect(MINIMUM_CORE_VERSION).toBe('26.3');
        expect(LATEST_CORE_VERSION).toBe('26.10');
        expect(compareCoreVersions('26.3', '26.9')).toBeLessThan(0);
        // Two digits compare as a number, not as text: "26.10" is newer than "26.9".
        expect(compareCoreVersions('26.9', '26.10')).toBeLessThan(0);
        expect(compareCoreVersions('26.10', '26.10')).toBe(0);
    });

    it('name the tag each one was read from', () => {
        // 26.9 stays on v26.9.9: v26.9.30 changed the config surface (xdns takes
        // objects, WireGuard lost domainStrategy, tun gained keys), so it is not
        // the same line with a later patch — v26.10.10 carries all of it.
        expect(CORE_VERSIONS.map(version => version.tag)).toEqual(['v26.3.27', 'v26.7.28', 'v26.9.9', 'v26.10.10']);
    });

    it('gives each line a role the settings list can show', () => {
        expect(CORE_VERSIONS.map(version => version.role)).toEqual(['minimum', 'remnawave', 'previous', 'latest']);
    });

    it('default to the line Remnawave nodes run', () => {
        expect(DEFAULT_CORE_VERSION).toBe('26.7');
    });
});

describe('reading a stored version back', () => {
    it('keeps a supported id', () => {
        expect(coreVersionId('26.9')).toBe('26.9');
    });

    it('maps a tag to its line', () => {
        expect(coreVersionId('v26.3.27')).toBe('26.3');
        expect(coreVersionId('26.7.28')).toBe('26.7');
    });

    it('reads two-digit minors whole: v26.10.10 is 26.10, never 26.1', () => {
        expect(coreVersionId('26.10')).toBe('26.10');
        expect(coreVersionId('v26.10.10')).toBe('26.10');
        expect(coreVersionId(' v26.10.3 ')).toBe('26.10');
        // 26.1 is no supported line, and must not borrow 26.10's name.
        expect(coreVersionId('v26.1.5')).toBe(DEFAULT_CORE_VERSION);
        expect(coreVersionId('26.1')).toBe(DEFAULT_CORE_VERSION);
        // A later minor that is not on the list falls back to the default.
        expect(coreVersionId('v26.11.0')).toBe(DEFAULT_CORE_VERSION);
    });

    it('moves the old placeholders, which never did anything, onto the default', () => {
        for (const legacy of ['v1.8.10', 'v1.8.0', 'v1.5.0', '', undefined, null, 42]) {
            expect(coreVersionId(legacy)).toBe(DEFAULT_CORE_VERSION);
        }
    });
});

describe('the feature table', () => {
    it('answers for every supported line, for every entry', () => {
        for (const feature of FEATURES) {
            for (const version of CORE_VERSIONS) {
                expect(['accepted', 'deprecated', 'absent', 'rejected']).toContain(feature.status[version.id]);
            }
        }
    });

    it('has unique ids and cites a source for each entry', () => {
        const ids = FEATURES.map(feature => feature.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const feature of FEATURES) {
            expect(feature.evidence.length).toBeGreaterThan(0);
            for (const cite of feature.evidence) expect(cite).toMatch(/^v26\.\d+\.\d+:/);
        }
    });

    it('only lists differences — an entry accepted everywhere would be noise', () => {
        for (const feature of FEATURES) {
            const statuses = new Set(Object.values(feature.status));
            // Refused, ignored or deprecated everywhere is still worth a line:
            // the editor must not offer the first two and should flag the
            // third. An entry accepted on every line says nothing.
            if (statuses.size === 1) expect(['rejected', 'absent', 'deprecated']).toContain([...statuses][0]!);
        }
    });

    it('treats an id nobody registered as accepted', () => {
        expect(featureStatus('26.3', 'nobody.registered.this')).toBe('accepted');
    });

    it('offers only what a line accepts', () => {
        expect(offersFeature('26.7', 'outbound.proxySettings')).toBe(true);
        expect(offersFeature('26.9', 'outbound.proxySettings')).toBe(false);
        expect(offersFeature('26.3', 'outbound.shadowsocks.uot')).toBe(true);
        expect(offersFeature('26.7', 'outbound.shadowsocks.uot')).toBe(false);
    });
});

describe('finding a feature in a config', () => {
    it('walks arrays with []', () => {
        const item = { settings: { servers: [{ uot: true }, { uot: false }, {}] } };
        expect(valuesAtPath(item, 'settings.servers[].uot')).toEqual([true, false]);
    });

    it('matches a value case-insensitively, the way the core lower-cases it', () => {
        const masque = FEATURES.find(feature => feature.id === 'outbound.protocol.masque')!;
        expect(usesFeature({ protocol: 'MASQUE' }, masque)).toBe(true);
        expect(usesFeature({ protocol: 'vless' }, masque)).toBe(false);
    });

    it('respects the protocol a feature belongs to', () => {
        const uot = FEATURES.find(feature => feature.id === 'outbound.shadowsocks.uot')!;
        expect(usesFeature({ protocol: 'shadowsocks', settings: { uot: true } }, uot)).toBe(true);
        expect(usesFeature({ protocol: 'vless', settings: { uot: true } }, uot)).toBe(false);
    });

    it('skips snippet references, which the panel expands', () => {
        const config = { outbounds: [{ snippet: 'NODES' }] };
        expect(featureUses(config)).toEqual([]);
    });
});

describe('diagnostics for a version', () => {
    const config = {
        outbounds: [
            { tag: 'chained', protocol: 'vless', proxySettings: { tag: 'warp' }, settings: {} },
            { tag: 'ss', protocol: 'shadowsocks', settings: { servers: [{ uot: true }] } },
        ],
        routing: { rules: [{ localOS: ['linux'], outboundTag: 'chained' }] },
    };

    it('calls a refused feature critical — the node will not start', () => {
        const found = versionDiagnostics(config, '26.9').find(d => d.field === 'proxySettings')!;
        expect(found.severity).toBe('critical');
        expect(found.section).toBe('outbounds');
        expect(found.itemIndex).toBe(0);
        expect(found.suggestion).toContain('sockopt.dialerProxy');
    });

    it('calls a field the line does not have a warning — it silently does nothing', () => {
        const found = versionDiagnostics(config, '26.7').find(d => d.field === 'settings.servers[].uot')!;
        expect(found.severity).toBe('warning');
        expect(found.itemIndex).toBe(1);
    });

    it('says nothing about what the line accepts', () => {
        const on263 = versionDiagnostics(config, '26.3');
        expect(on263.some(d => d.field === 'proxySettings')).toBe(false);
        expect(on263.some(d => d.field === 'settings.servers[].uot')).toBe(false);
        // localOS arrives in 26.9, so 26.3 is warned about it.
        expect(on263.some(d => d.field === 'localOS')).toBe(true);
    });

    it('is part of the full run when a version is given, and absent when not', () => {
        expect(runFullDiagnostics(config as any, [], '26.9').some(d => d.field === 'proxySettings')).toBe(true);
        expect(runFullDiagnostics(config as any).some(d => d.field === 'proxySettings')).toBe(false);
    });
});
