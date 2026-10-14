import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'fs';
import { CORE_VERSIONS } from './index';
import { FEATURES, VALUE_SETS, featureStatus, featureStatusAt, allowedValues } from './features';
import { versionDiagnostics } from './check';
import { TunInboundSettingsSchema } from '../schemas';

/**
 * What 26.10 (v26.10.10) changed outside MASQUE and finalmask, and the guards
 * that keep the new column honest: every row that differs from 26.9 says where
 * v26.10.10 was read, and every finding has an answer for the new tag.
 */

describe('the 26.10 column', () => {
    it('cites v26.10.10 wherever it differs from 26.9', () => {
        const uncited = FEATURES
            .filter(feature => feature.status['26.10'] !== feature.status['26.9'])
            .filter(feature => !feature.evidence.some(cite => cite.startsWith('v26.10.10:')))
            .map(feature => feature.id);
        expect(uncited).toEqual([]);
    });

    it('does so for the value sets too', () => {
        const same = (a: string[] | null, b: string[] | null) => JSON.stringify(a) === JSON.stringify(b);
        const uncited = VALUE_SETS
            .filter(set => !same(set.allowed['26.10'], set.allowed['26.9']))
            .filter(set => !set.evidence.some(cite => cite.startsWith('v26.10.10:')))
            .map(set => set.id);
        expect(uncited).toEqual([]);
    });

    it('gives every cited line a tag the app models', () => {
        const tags = new Set(CORE_VERSIONS.map(line => line.tag));
        for (const feature of FEATURES) {
            for (const cite of feature.evidence) expect(tags.has(cite.split(':')[0]!)).toBe(true);
        }
    });

    it('answers for the new tag in every finding', () => {
        for (const area of ['protocols', 'transport', 'finalmask', 'toplevel']) {
            const findings = JSON.parse(readFileSync(`scripts/core-versions/findings/${area}.json`, 'utf8'));
            const missing = findings.items
                .filter((item: any) => !item.status?.['v26.10.10'] || !(item.evidence ?? []).some((cite: string) => cite.startsWith('v26.10.10:')))
                .map((item: any) => `${area}: ${item.path}`);
            expect(missing).toEqual([]);
        }
    });
});

describe('what 26.10 added', () => {
    const at = (version: '26.7' | '26.9' | '26.10', scope: 'config' | 'inbound' | 'outbound' | 'dnsServer', path: string, protocol?: string) =>
        featureStatusAt(version, { scope, path, protocol });

    it('has a DNS script, a routing script and a DNS server id, and the earlier lines drop them', () => {
        for (const [scope, path] of [['config', 'dns.script'], ['config', 'routing.script'], ['dnsServer', 'id']] as const) {
            expect(at('26.9', scope, path)).toBe('absent');
            expect(at('26.7', scope, path)).toBe('absent');
            expect(at('26.10', scope, path)).toBe('accepted');
        }
    });

    it('has two more tun keys, on 26.10 only', () => {
        for (const key of ['autoSystemDnsToGateway', 'autoSystemWfpBlockLeak']) {
            expect(at('26.9', 'inbound', `settings.${key}`, 'tun')).toBe('absent');
            expect(at('26.10', 'inbound', `settings.${key}`, 'tun')).toBe('accepted');
        }
        // The form draws the schema's keys and asks the table which the line offers.
        expect(Object.keys(TunInboundSettingsSchema.shape)).toEqual(expect.arrayContaining(['autoSystemDnsToGateway', 'autoSystemWfpBlockLeak']));
        expect(allowedValues('26.10', 'inbound.tun.autoSystemWfpBlockLeak')).toEqual(['dns', 'misconfigtun']);
        const config = { inbounds: [{ protocol: 'tun', settings: { autoSystemWfpBlockLeak: ['DNS', 'bogus'] } }] };
        const found = versionDiagnostics(config, '26.10').filter(d => d.severity === 'critical');
        expect(found.map(d => d.field)).toEqual(['settings.autoSystemWfpBlockLeak[]']);
        expect(found[0]!.message).toContain('bogus');
    });

    it('has useSystemCA in TLS, on both sides, on 26.10 only', () => {
        for (const scope of ['inbound', 'outbound'] as const) {
            expect(at('26.9', scope, 'streamSettings.tlsSettings.useSystemCA')).toBe('absent');
            expect(at('26.10', scope, 'streamSettings.tlsSettings.useSystemCA')).toBe('accepted');
        }
    });

    it('has the xdrive transport: a network name and a settings key', () => {
        expect(allowedValues('26.9', 'stream.network')).not.toContain('xdrive');
        expect(allowedValues('26.10', 'stream.network')).toContain('xdrive');
        expect(at('26.9', 'outbound', 'streamSettings.xdriveSettings')).toBe('absent');
        expect(at('26.10', 'outbound', 'streamSettings.xdriveSettings')).toBe('accepted');
    });
});

describe('what 26.10 dropped', () => {
    it('drops the WireGuard domain strategy, key and check both', () => {
        for (const scope of ['inbound', 'outbound'] as const) {
            expect(featureStatus('26.9', `${scope}.wireguard.domainStrategy.key`)).toBe('accepted');
            expect(featureStatus('26.10', `${scope}.wireguard.domainStrategy.key`)).toBe('absent');
        }
        // Up to 26.9 a value outside the Force family stops the core; 26.10 never looks.
        const config = { outbounds: [{ protocol: 'wireguard', settings: { domainStrategy: 'UseIP' } }] };
        const critical = (version: '26.9' | '26.10') =>
            versionDiagnostics(config, version).filter(d => d.field === 'settings.domainStrategy').map(d => d.severity);
        expect(critical('26.9')).toEqual(['critical']);
        expect(critical('26.10')).toEqual(['warning']);
    });
});
