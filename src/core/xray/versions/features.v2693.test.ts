import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'fs';
import { CORE_VERSIONS } from './index';
import { byLine, onEveryLine } from './by-line';
import { FEATURES, VALUE_SETS, allowedValues, featureStatus, featureStatusAt } from './features';
import { versionDiagnostics } from './check';
import { TunInboundSettingsSchema } from '../schemas';

/**
 * v26.9.30 is a line of its own because it is neither 26.9 nor 26.10: it has
 * MASQUE and xdrive, the two tun keys and the noise exp item that v26.9.9 lacks,
 * and none of 26.10's `warp`, `useSystemCA`, scripts and dns server id; its
 * xdns takes objects shaped like neither. These tests hold the table to that —
 * and hold every row whose answer differs between 26.9 and 26.10 to a stated
 * 26.9.30 value with a citation, so the column cannot be left to a default.
 */

const cites930 = (evidence: string[]) => evidence.some(cite => cite.startsWith('v26.9.30:'));

describe('the 26.9.30 column cannot be defaulted', () => {
    it('has to be named together with 26.10, or not at all', () => {
        // 26.9.30 and 26.10 follow 26.9 when only three values are given...
        expect(byLine('a', 'b', 'c')).toEqual({ '26.3': 'a', '26.7': 'b', '26.9': 'c', '26.9.30': 'c', '26.10': 'c' });
        expect(onEveryLine(1)).toEqual({ '26.3': 1, '26.7': 1, '26.9': 1, '26.9.30': 1, '26.10': 1 });
        // ...and are both stated when 26.9 and 26.10 differ. The types refuse the four-value form;
        // a caller that gets round them is refused here.
        expect(byLine('a', 'b', 'c', 'x', 'y')).toEqual({ '26.3': 'a', '26.7': 'b', '26.9': 'c', '26.9.30': 'x', '26.10': 'y' });
        // @ts-expect-error — a row that names 26.10 has to name 26.9.30 too
        expect(() => byLine('absent', 'absent', 'absent', 'accepted')).toThrow();
    });

    it('cites v26.9.30 wherever a row differs between 26.9 and 26.10, or from either', () => {
        const uncited = FEATURES
            .filter(feature => {
                const s = feature.status;
                return s['26.9'] !== s['26.10'] || s['26.9.30'] !== s['26.9'] || s['26.9.30'] !== s['26.10'];
            })
            .filter(feature => !cites930(feature.evidence))
            .map(feature => feature.id);
        expect(uncited).toEqual([]);
    });

    it('does so for the value sets too', () => {
        const same = (a: string[] | null, b: string[] | null) => JSON.stringify(a) === JSON.stringify(b);
        const uncited = VALUE_SETS
            .filter(set => {
                const a = set.allowed;
                return !same(a['26.9'], a['26.10']) || !same(a['26.9.30'], a['26.9']) || !same(a['26.9.30'], a['26.10']);
            })
            .filter(set => !cites930(set.evidence))
            .map(set => set.id);
        expect(uncited).toEqual([]);
    });

    it('answers for the new tag in every finding, with a v26.9.30 citation', () => {
        for (const area of ['protocols', 'transport', 'finalmask', 'toplevel']) {
            const findings = JSON.parse(readFileSync(`scripts/core-versions/findings/${area}.json`, 'utf8'));
            const missing = findings.items
                .filter((item: any) => !item.status?.['v26.9.30'] || !(item.evidence ?? []).some((cite: string) => cite.startsWith('v26.9.30:')))
                .map((item: any) => `${area}: ${item.path}`);
            expect(missing).toEqual([]);
        }
    });

    it('has a column for every supported line, and no other', () => {
        expect(new Set(Object.keys(byLine(0, 0, 0)))).toEqual(new Set(CORE_VERSIONS.map(line => line.id)));
    });
});

const at = (version: '26.9' | '26.9.30' | '26.10', scope: 'config' | 'inbound' | 'outbound' | 'dnsServer', path: string, protocol?: string) =>
    featureStatusAt(version, { scope, path, protocol });

describe('what v26.9.30 has that v26.9.9 lacks, and 26.10 keeps', () => {
    it('registers MASQUE and xdrive: protocols, networks and the settings keys', () => {
        for (const side of ['outbound', 'inbound'] as const) {
            expect(featureStatus('26.9', `${side}.protocol.masque`)).toBe('rejected');
            expect(featureStatus('26.9.30', `${side}.protocol.masque`)).toBe('accepted');
            expect(featureStatus('26.10', `${side}.protocol.masque`)).toBe('accepted');
            expect(at('26.9', side, 'streamSettings.xdriveSettings')).toBe('absent');
            expect(at('26.9.30', side, 'streamSettings.xdriveSettings')).toBe('accepted');
            expect(at('26.9.30', side, 'streamSettings.xdriveSettings.remoteFolder')).toBe('accepted');
            expect(at('26.9.30', side, 'streamSettings.masqueSettings')).toBe('accepted');
        }
        expect(allowedValues('26.9', 'stream.network')).not.toContain('masque');
        for (const line of ['26.9.30', '26.10'] as const) {
            expect(allowedValues(line, 'stream.network')).toEqual(expect.arrayContaining(['masque', 'xdrive']));
            expect(allowedValues(line, 'inbound.stream.network')).toEqual(expect.arrayContaining(['masque', 'xdrive']));
        }
    });

    it('has the two tun keys, and the values one of them takes', () => {
        for (const key of ['autoSystemDnsToGateway', 'autoSystemWfpBlockLeak']) {
            expect(at('26.9', 'inbound', `settings.${key}`, 'tun')).toBe('absent');
            expect(at('26.9.30', 'inbound', `settings.${key}`, 'tun')).toBe('accepted');
        }
        expect(Object.keys(TunInboundSettingsSchema.shape)).toEqual(expect.arrayContaining(['autoSystemDnsToGateway', 'autoSystemWfpBlockLeak']));
        expect(allowedValues('26.9', 'inbound.tun.autoSystemWfpBlockLeak')).toEqual([]);
        expect(allowedValues('26.9.30', 'inbound.tun.autoSystemWfpBlockLeak')).toEqual(['dns', 'misconfigtun']);
        const config = { inbounds: [{ protocol: 'tun', settings: { autoSystemWfpBlockLeak: ['DNS', 'bogus'] } }] };
        const critical = versionDiagnostics(config, '26.9.30').filter(d => d.severity === 'critical');
        expect(critical.map(d => d.field)).toEqual(['settings.autoSystemWfpBlockLeak[]']);
        expect(critical[0]!.message).toContain('bogus');
    });

    it('takes the noise exp item', () => {
        expect(allowedValues('26.9', 'finalmask.udp.noise.item.type')).not.toContain('exp');
        for (const line of ['26.9.30', '26.10'] as const) expect(allowedValues(line, 'finalmask.udp.noise.item.type')).toContain('exp');
    });

    it('has dropped WireGuard domainStrategy and udphop sockopt, key and check both', () => {
        for (const side of ['inbound', 'outbound'] as const) {
            expect(featureStatus('26.9', `${side}.wireguard.domainStrategy.key`)).toBe('accepted');
            expect(featureStatus('26.9.30', `${side}.wireguard.domainStrategy.key`)).toBe('absent');
            expect(at('26.9', side, 'streamSettings.finalmask.udp[type=udphop].settings.sockopt')).toBe('accepted');
            expect(at('26.9.30', side, 'streamSettings.finalmask.udp[type=udphop].settings.sockopt')).toBe('absent');
        }
        expect(allowedValues('26.9', 'outbound.wireguard.domainStrategy')).toContain('ForceIP');
        expect(allowedValues('26.9.30', 'outbound.wireguard.domainStrategy')).toEqual([]);
        expect(allowedValues('26.9.30', 'inbound.wireguard.domainStrategy')).toEqual([]);
        const config = { outbounds: [{ protocol: 'wireguard', settings: { domainStrategy: 'UseIP' } }] };
        const found = (line: '26.9' | '26.9.30') => versionDiagnostics(config, line).filter(d => d.field === 'settings.domainStrategy').map(d => d.severity);
        expect(found('26.9')).toEqual(['critical']);
        expect(found('26.9.30')).toEqual(['warning']);
    });

    it('reads xdns as objects, which 26.9 refuses as strings and 26.10 reads another way', () => {
        // v26.9.30:infra/conf/transport_finalmask.go:828-832
        for (const key of ['domains', 'resolvers']) {
            expect(at('26.9.30', 'outbound', `streamSettings.finalmask.udp[type=xdns].settings.${key}`)).toBe('accepted');
        }
        expect(at('26.9', 'outbound', 'streamSettings.finalmask.udp[type=xdns].settings.extraPoll')).toBe('absent');
        expect(at('26.9.30', 'outbound', 'streamSettings.finalmask.udp[type=xdns].settings.extraPoll')).toBe('accepted');
        expect(at('26.9.30', 'outbound', 'streamSettings.finalmask.udp[type=xdns].settings.domain')).toBe('absent');
        expect(at('26.9', 'outbound', 'streamSettings.finalmask.udp[type=xdns].settings.domain')).toBe('rejected');
    });
});

describe('what v26.9.30 shares with v26.9.9 and 26.10 lacks', () => {
    it('has no WARP over MASQUE: masqueSettings.warp is dropped', () => {
        for (const side of ['outbound', 'inbound'] as const) {
            for (const key of ['warp', 'warp.privateKey', 'warp.publicKey', 'warp.address']) {
                expect(at('26.9.30', side, `streamSettings.masqueSettings.${key}`)).toBe('absent');
                expect(at('26.10', side, `streamSettings.masqueSettings.${key}`)).toBe('accepted');
            }
        }
    });

    it('has no DNS script, no routing script, no dns server id and no useSystemCA', () => {
        for (const [scope, path] of [['config', 'dns.script'], ['config', 'routing.script'], ['dnsServer', 'id']] as const) {
            expect(at('26.9.30', scope, path)).toBe('absent');
            expect(at('26.10', scope, path)).toBe('accepted');
        }
        for (const side of ['inbound', 'outbound'] as const) {
            expect(at('26.9.30', side, 'streamSettings.tlsSettings.useSystemCA')).toBe('absent');
            expect(at('26.10', side, 'streamSettings.tlsSettings.useSystemCA')).toBe('accepted');
        }
    });
});

describe('what the findings say about 26.9.30', () => {
    it('agrees with the generated rows the table is built from', () => {
        const findings = JSON.parse(readFileSync('scripts/core-versions/findings/finalmask.json', 'utf8'));
        // The keys of the xdns mask on each tag, as read from the structs.
        const keys = findings.perVersionKeys['udp[type=xdns].settings'];
        expect(keys['v26.9.9']).toEqual(['domains', 'resolvers']);
        expect(keys['v26.9.30']).toEqual(['domains', 'resolvers', 'extraPoll']);
        expect(findings.perVersionKeys['udp[type=xdns].settings.domains[]']['v26.9.30']).toEqual(['name', 'lenLimit', 'labelLimit', 'types', 'edns0']);
        expect(findings.perVersionKeys['udp[type=xdns].settings.resolvers[]']['v26.9.30']).toEqual(['type', 'settings']);
        expect(findings.perVersionKeys['udp[type=xdns].settings.domains[]']['v26.10.10']).toEqual(['names', 'lenLimit', 'labelLimit', 'types', 'edns0']);
        const masque = JSON.parse(readFileSync('scripts/core-versions/findings/transport.json', 'utf8')).perVersionKeys['streamSettings.masqueSettings'];
        expect(masque['v26.9.30']).toEqual(['host', 'path', 'user', 'pass', 'headers']);
        expect(masque['v26.10.10']).toEqual(['host', 'path', 'user', 'pass', 'headers', 'warp']);
    });
});
