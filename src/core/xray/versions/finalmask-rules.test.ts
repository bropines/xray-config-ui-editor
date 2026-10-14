import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'fs';
import { CORE_VERSIONS, type CoreVersionId } from './index';
import { allowedValues, FEATURES } from './features';
import { versionDiagnostics } from './check';
import {
    finalmaskIssues,
    heldTypeMatches,
    isNoiseExpItem,
    MASK_KEYS,
    maskKeyStatus,
    maskTypeChoices,
    maskTypeStatus,
    masqueReadsQuicParams,
    noiseExpProblem,
    noiseItemTypeAccepted,
    noiseItemTypeChoices,
    offeredMaskKeys,
    offeredQuicKeys,
    parseInt32Range,
    pinnedEnd,
    QUIC_KEYS,
    quicKeyStatus,
    socketEnd,
    toMkcpLegacy,
    udphopDefaultsInterval,
    type MaskList,
} from './finalmask-rules';

const LINES = CORE_VERSIONS.map(version => version.id);
const TAG: Record<CoreVersionId, string> = { '26.3': 'v26.3.27', '26.7': 'v26.7.28', '26.9': 'v26.9.9', '26.10': 'v26.10.10' };

const registered = (version: CoreVersionId, list: MaskList, type: string) =>
    allowedValues(version, `finalmask.${list}.type`).includes(type);

// ── The key table against its sources ───────────────────────────────────

describe('the finalmask key table', () => {
    const findings = JSON.parse(readFileSync('scripts/core-versions/findings/finalmask.json', 'utf8'));
    const perVersion: Record<string, Record<string, string[] | null>> = findings.perVersionKeys;

    /** Which findings entry describes each mask's settings. */
    const entryFor = (list: MaskList, type: string): string | undefined =>
        Object.keys(perVersion).find(name => {
            const match = /^(tcp|udp|tcp\|udp)\[type=([^\]]+)\]\.settings$/.exec(name);
            return match && match[1]!.split('|').includes(list) && match[2]!.split('|').includes(type);
        });

    it('lists every key each struct decodes, on each line, as the findings read them', () => {
        for (const list of ['tcp', 'udp'] as const) {
            for (const [type, keys] of Object.entries(MASK_KEYS[list])) {
                const entry = entryFor(list, type);
                expect(entry, `${list}:${type}`).toBeDefined();
                for (const version of LINES) {
                    const expected = perVersion[entry!]![`v${TAG[version].slice(1)}`];
                    const ours = keys.filter(spec => spec.lines.includes(version)).map(spec => spec.key).sort();
                    expect(ours, `${list}:${type} on ${version}`).toEqual([...(expected ?? [])].sort());
                }
            }
        }
    });

    it('lists the quicParams keys each line decodes', () => {
        const entry = perVersion['streamSettings.finalmask.quicParams']!;
        for (const version of LINES) {
            const ours = QUIC_KEYS.filter(spec => spec.lines.includes(version)).map(spec => spec.key).sort();
            expect(ours, version).toEqual([...entry[`v${TAG[version].slice(1)}`]!].sort());
        }
    });

    it('has a form for every type any line registers, and no type none does', () => {
        for (const list of ['tcp', 'udp'] as const) {
            const known = new Set(LINES.flatMap(version => allowedValues(version, `finalmask.${list}.type`)));
            expect(new Set(Object.keys(MASK_KEYS[list]))).toEqual(known);
        }
    });

    it('agrees with every FEATURES row about a mask setting', () => {
        const rows = FEATURES.filter(row => row.path.startsWith('streamSettings.finalmask.'));
        let compared = 0;
        for (const row of rows) {
            const setting = /^streamSettings\.finalmask\.(tcp|udp)\[type=([^\]]+)\]\.settings\.(\w+)$/.exec(row.path);
            const quic = /^streamSettings\.finalmask\.quicParams\.(\w+)$/.exec(row.path);
            for (const version of LINES) {
                const status = row.status[version];
                let listed: boolean;
                if (setting) {
                    const [, list, type, key] = setting as unknown as [string, MaskList, string, string];
                    // A type the line does not register has no settings to speak of.
                    if (!registered(version, list, type)) continue;
                    listed = (MASK_KEYS[list][type] ?? []).some(spec => spec.key === key && spec.lines.includes(version));
                } else if (quic) {
                    listed = QUIC_KEYS.some(spec => spec.key === quic[1] && spec.lines.includes(version));
                } else {
                    continue;
                }
                compared++;
                expect(listed, `${row.id} on ${version}`).toBe(status === 'accepted' || status === 'deprecated');
            }
        }
        expect(compared).toBeGreaterThan(20);
    });
});

// ── Per-key answers ─────────────────────────────────────────────────────

describe('what a line does with one setting', () => {
    it('refuses the single xdns domain from 26.7 on, and reads it on 26.3', () => {
        expect(maskKeyStatus('26.3', 'udp', 'xdns', 'domain').status).toBe('accepted');
        expect(maskKeyStatus('26.7', 'udp', 'xdns', 'domain').status).toBe('rejected');
        expect(maskKeyStatus('26.9', 'udp', 'xdns', 'domain', 'inbound').status).toBe('rejected');
    });

    it('says which side reads a one-sided key', () => {
        expect(maskKeyStatus('26.7', 'udp', 'xdns', 'domains', 'outbound')).toEqual({ status: 'accepted', readBy: 'inbound' });
        expect(maskKeyStatus('26.7', 'udp', 'xdns', 'resolvers', 'inbound')).toEqual({ status: 'accepted', readBy: 'outbound' });
        expect(maskKeyStatus('26.7', 'udp', 'xdns', 'resolvers', 'outbound')).toEqual({ status: 'accepted' });
        expect(maskKeyStatus('26.9', 'udp', 'xicmp', 'dgram', 'inbound').readBy).toBe('outbound');
    });

    it('calls a key the line dropped absent', () => {
        expect(maskKeyStatus('26.7', 'udp', 'xicmp', 'listenIp').status).toBe('absent');
        expect(maskKeyStatus('26.3', 'udp', 'salamander', 'packetSize').status).toBe('absent');
        expect(maskKeyStatus('26.7', 'udp', 'realm', 'ipMode').status).toBe('absent');
        expect(maskKeyStatus('26.9', 'udp', 'noise', 'made-up').status).toBe('absent');
    });

    it('marks the fallback spellings as such', () => {
        expect(maskKeyStatus('26.9', 'tcp', 'sudoku', 'custom_table')).toEqual({ status: 'accepted', legacy: true });
    });

    it('knows the quicParams keys this editor used to write do nothing anywhere', () => {
        for (const version of LINES) {
            expect(quicKeyStatus(version, 'max_idle_timeout').status).toBe('absent');
            expect(quicKeyStatus(version, 'handshake_timeout').status).toBe('absent');
            expect(quicKeyStatus(version, 'maxIdleTimeout').status).toBe('accepted');
        }
        expect(quicKeyStatus('26.7', 'max_idle_timeout').replacement).toBe('streamSettings.finalmask.quicParams.maxIdleTimeout');
        expect(quicKeyStatus('26.9', 'udpHop', 'inbound').replacement).toBe('streamSettings.finalmask.udp udphop');
    });

    it('offers bbrProfile from 26.7, the four switches on 26.9 only, and udpHop until 26.9 took it away', () => {
        const offered = (version: CoreVersionId) => offeredQuicKeys(version).map(spec => spec.key);
        expect(offered('26.3')).not.toContain('bbrProfile');
        expect(offered('26.7')).toContain('bbrProfile');
        expect(offered('26.7')).not.toContain('disableGSO');
        expect(offered('26.9')).toEqual(expect.arrayContaining(['brutalDisableLossCompensation', 'disableChromeParrot', 'disableGSO', 'disableStatelessReset']));
        expect(offered('26.7')).toContain('udpHop');
        expect(offered('26.9')).not.toContain('udpHop');
        expect(quicKeyStatus('26.9', 'udpHop').status).toBe('absent');
        expect(quicKeyStatus('26.3', 'bbrProfile').status).toBe('absent');
    });

    it('offers each side only the xdns list it reads, and both when the side is unknown', () => {
        const keys = (side?: 'inbound' | 'outbound') => offeredMaskKeys('26.7', 'udp', 'xdns', side).map(spec => spec.key);
        expect(keys('inbound')).toEqual(['domains']);
        expect(keys('outbound')).toEqual(['resolvers']);
        expect(keys()).toEqual(['domains', 'resolvers']);
        expect(offeredMaskKeys('26.3', 'udp', 'xdns').map(spec => spec.key)).toEqual(['domain']);
    });

    it('never offers a fallback spelling', () => {
        expect(offeredMaskKeys('26.9', 'udp', 'sudoku').map(spec => spec.key)).not.toContain('custom_table');
    });
});

describe('mask types per line', () => {
    it('points each removed 26.3 mask at mkcp-legacy', () => {
        expect(maskTypeStatus('26.3', 'udp', 'header-dns')).toEqual({ accepted: true });
        expect(maskTypeStatus('26.7', 'udp', 'header-dns')).toEqual({ accepted: false, replacement: 'mkcp-legacy' });
        expect(maskTypeStatus('26.9', 'udp', 'mkcp-aes128gcm').replacement).toBe('mkcp-legacy');
    });

    it('refuses a type in the wrong list without inventing a replacement', () => {
        expect(maskTypeStatus('26.9', 'udp', 'fragment')).toEqual({ accepted: false });
        expect(maskTypeStatus('26.9', 'tcp', 'noise')).toEqual({ accepted: false });
    });

    it('flags udphop on an inbound', () => {
        expect(maskTypeStatus('26.9', 'udp', 'udphop', 'inbound')).toEqual({ accepted: true, clientOnly: true });
        expect(maskTypeStatus('26.9', 'udp', 'udphop', 'outbound')).toEqual({ accepted: true });
    });

    it('offers each list its own types, per line', () => {
        expect(maskTypeChoices('26.3', 'tcp')).toEqual(['header-custom', 'fragment', 'sudoku']);
        expect(maskTypeChoices('26.7', 'tcp')).toContain('xmc');
        expect(maskTypeChoices('26.7', 'udp')).not.toContain('header-dns');
        expect(maskTypeChoices('26.7', 'udp')).toContain('mkcp-legacy');
        expect(maskTypeChoices('26.7', 'udp')).not.toContain('udphop');
        expect(maskTypeChoices('26.9', 'udp', 'outbound')).toContain('udphop');
        expect(maskTypeChoices('26.9', 'udp', 'inbound')).not.toContain('udphop');
    });

    it('keeps the current type in the list even when the line refuses it', () => {
        expect(maskTypeChoices('26.7', 'udp', 'outbound', 'header-wechat')).toContain('header-wechat');
        expect(maskTypeChoices('26.9', 'udp', 'inbound', 'udphop')).toContain('udphop');
    });
});

describe('moving a 26.3 mask onto mkcp-legacy', () => {
    it('builds what the old mask built', () => {
        expect(toMkcpLegacy('mkcp-original', {})).toEqual({ type: 'mkcp-legacy', settings: {} });
        expect(toMkcpLegacy('mkcp-aes128gcm', { password: 'pw' })).toEqual({ type: 'mkcp-legacy', settings: { value: 'pw' } });
        expect(toMkcpLegacy('header-dns', { domain: 'example.com' })).toEqual({ type: 'mkcp-legacy', settings: { header: 'dns', value: 'example.com' } });
        expect(toMkcpLegacy('header-dns', undefined)).toEqual({ type: 'mkcp-legacy', settings: { header: 'dns' } });
        expect(toMkcpLegacy('header-wireguard', {})).toEqual({ type: 'mkcp-legacy', settings: { header: 'wireguard' } });
    });

    it('declines a type it does not replace', () => {
        expect(toMkcpLegacy('noise', {})).toBeNull();
    });
});

describe('Int32Range', () => {
    it('reads what the core reads', () => {
        expect(parseInt32Range(10)).toEqual([10, 10]);
        expect(parseInt32Range('10')).toEqual([10, 10]);
        expect(parseInt32Range('5-30')).toEqual([5, 30]);
        expect(parseInt32Range('30-5')).toEqual([5, 30]);
        expect(parseInt32Range(undefined)).toEqual([0, 0]);
        expect(parseInt32Range('')).toEqual([0, 0]);
        expect(parseInt32Range('soon')).toBeNull();
    });
});

// ── Chain rules ─────────────────────────────────────────────────────────

const udp = (...types: string[]) => ({ udp: types.map(type => ({ type, settings: {} })) });
const paths = (issues: { path: string }[]) => issues.map(issue => issue.path);

describe('where a mask may sit', () => {
    it('puts xicmp first until 26.9 and last from then on', () => {
        const first = udp('xicmp', 'noise');
        const last = udp('noise', 'xicmp');
        expect(paths(finalmaskIssues(first, '26.3', 'outbound'))).not.toContain('streamSettings.finalmask.udp[0]');
        expect(paths(finalmaskIssues(first, '26.7', 'outbound'))).not.toContain('streamSettings.finalmask.udp[0]');
        expect(paths(finalmaskIssues(first, '26.9', 'outbound'))).toContain('streamSettings.finalmask.udp[0]');
        expect(paths(finalmaskIssues(last, '26.7', 'outbound'))).toContain('streamSettings.finalmask.udp[1]');
        expect(paths(finalmaskIssues(last, '26.9', 'outbound'))).not.toContain('streamSettings.finalmask.udp[1]');
    });

    it('does the same for realm and udphop, on the lines that have them', () => {
        expect(paths(finalmaskIssues(udp('noise', 'realm'), '26.7', 'outbound'))).toContain('streamSettings.finalmask.udp[1]');
        expect(paths(finalmaskIssues(udp('realm', 'noise'), '26.9', 'outbound'))).toContain('streamSettings.finalmask.udp[0]');
        // realm does not exist on 26.3: the type check reports it, not this.
        expect(paths(finalmaskIssues(udp('noise', 'realm'), '26.3', 'outbound'))).not.toContain('streamSettings.finalmask.udp[1]');
        const hop = { udp: [{ type: 'udphop', settings: { mode: 'intervalLocal', interval: 10 } }, { type: 'noise', settings: {} }] };
        expect(paths(finalmaskIssues(hop, '26.9', 'outbound'))).toContain('streamSettings.finalmask.udp[0]');
    });

    it('puts a UDP sudoku last until 26.9 and first from then on', () => {
        expect(paths(finalmaskIssues(udp('sudoku', 'noise'), '26.7', 'outbound'))).toContain('streamSettings.finalmask.udp[0]');
        expect(paths(finalmaskIssues(udp('sudoku', 'noise'), '26.9', 'outbound'))).not.toContain('streamSettings.finalmask.udp[0]');
        expect(paths(finalmaskIssues(udp('noise', 'sudoku'), '26.9', 'outbound'))).toContain('streamSettings.finalmask.udp[1]');
    });

    it('lets a lone mask sit anywhere', () => {
        for (const version of LINES) {
            expect(finalmaskIssues(udp('xicmp'), version, 'inbound')).toEqual([]);
        }
    });

    it('stops an inbound, but only fails an outbound\'s own dials', () => {
        const wrong = udp('noise', 'xicmp');
        const at = (direction: 'inbound' | 'outbound') =>
            finalmaskIssues(wrong, '26.7', direction).find(issue => issue.path.endsWith('udp[1]'))!.severity;
        expect(at('inbound')).toBe('critical');
        expect(at('outbound')).toBe('warning');
    });

    it('refuses xicmp over quicParams.udpHop on a client before 26.9', () => {
        const config = { udp: [{ type: 'xicmp', settings: {} }], quicParams: { udpHop: { ports: '20000-30000' } } };
        expect(finalmaskIssues(config, '26.7', 'outbound')).toHaveLength(1);
        expect(finalmaskIssues(config, '26.7', 'inbound')).toEqual([]);
        expect(finalmaskIssues({ ...config, quicParams: { udpHop: {} } }, '26.7', 'outbound')).toEqual([]);
    });

    it('notes that a chain of two reads the other way round across 26.3 → 26.7', () => {
        for (const version of LINES) {
            const issues = finalmaskIssues({ tcp: [{ type: 'fragment' }, { type: 'sudoku' }] }, version, 'outbound');
            expect(issues).toHaveLength(1);
            expect(issues[0]!.severity).toBe('info');
            expect(issues[0]!.path).toBe('streamSettings.finalmask.tcp');
        }
        expect(finalmaskIssues({ tcp: [{ type: 'fragment' }] }, '26.9', 'outbound')).toEqual([]);
    });

    it('reads a type the way the loader does, lower-cased', () => {
        expect(paths(finalmaskIssues(udp('Noise', 'XICMP'), '26.7', 'outbound'))).toContain('streamSettings.finalmask.udp[1]');
    });

    it('ignores what is not a finalmask', () => {
        expect(finalmaskIssues(null, '26.9', 'outbound')).toEqual([]);
        expect(finalmaskIssues({ udp: 'noise' }, '26.9', 'outbound')).toEqual([]);
    });
});

describe('what xdns needs', () => {
    const xdns = (settings: unknown) => ({ udp: [{ type: 'xdns', settings }] });

    it('needs a domain on 26.3', () => {
        expect(finalmaskIssues(xdns({}), '26.3', 'outbound')[0]).toMatchObject({ severity: 'critical', path: 'streamSettings.finalmask.udp[0].settings.domain' });
        expect(finalmaskIssues(xdns({ domain: 't.example.com' }), '26.3', 'outbound')).toEqual([]);
    });

    it('needs domains or resolvers from 26.7 on', () => {
        expect(finalmaskIssues(xdns({}), '26.7', 'outbound')[0]!.severity).toBe('critical');
        expect(finalmaskIssues(xdns({ domains: [], resolvers: [] }), '26.9', 'inbound')).toHaveLength(1);
    });

    it('refuses a resolver without +udp://', () => {
        const issues = finalmaskIssues(xdns({ resolvers: ['t.example.com'] }), '26.7', 'outbound');
        expect(issues).toHaveLength(1);
        expect(issues[0]).toMatchObject({ severity: 'critical', path: 'streamSettings.finalmask.udp[0].settings.resolvers' });
        expect(finalmaskIssues(xdns({ resolvers: ['t.example.com+udp://1.1.1.1:53'] }), '26.7', 'outbound')).toEqual([]);
    });

    it('asks each side for its own list', () => {
        const serverOnly = xdns({ domains: ['t.example.com'] });
        const clientOnly = xdns({ resolvers: ['t.example.com+udp://1.1.1.1:53'] });
        expect(finalmaskIssues(serverOnly, '26.7', 'inbound')).toEqual([]);
        expect(finalmaskIssues(serverOnly, '26.7', 'outbound')[0]).toMatchObject({ severity: 'warning', path: 'streamSettings.finalmask.udp[0].settings.resolvers' });
        expect(finalmaskIssues(clientOnly, '26.7', 'outbound')).toEqual([]);
        expect(finalmaskIssues(clientOnly, '26.7', 'inbound')[0]).toMatchObject({ severity: 'critical', path: 'streamSettings.finalmask.udp[0].settings.domains' });
    });
});

describe('what udphop needs', () => {
    const hop = (settings: unknown) => ({ udp: [{ type: 'udphop', settings }] });

    it('is happy with a mode and an interval of at least 5', () => {
        expect(finalmaskIssues(hop({ mode: 'intervalLocal,perConnRemote', interval: '5-30' }), '26.9', 'outbound')).toEqual([]);
        expect(finalmaskIssues(hop({ mode: 'INTERVALREMOTE', interval: 10 }), '26.9', 'outbound')).toEqual([]);
    });

    it('refuses a missing or unknown mode at load', () => {
        const missing = finalmaskIssues(hop({ interval: 10 }), '26.9', 'outbound');
        expect(missing).toHaveLength(1);
        expect(missing[0]).toMatchObject({ severity: 'critical', path: 'streamSettings.finalmask.udp[0].settings.mode' });
        // Spaces are not trimmed: " intervalRemote" is not a mode.
        expect(finalmaskIssues(hop({ mode: 'intervalLocal, intervalRemote', interval: 10 }), '26.9', 'outbound')).toHaveLength(1);
    });

    it('warns a client about an interval under 5, including none at all', () => {
        expect(finalmaskIssues(hop({ mode: 'intervalLocal' }), '26.9', 'outbound')[0]).toMatchObject({ severity: 'warning', path: 'streamSettings.finalmask.udp[0].settings.interval' });
        expect(finalmaskIssues(hop({ mode: 'intervalLocal', interval: '3-30' }), '26.9', 'outbound')).toHaveLength(1);
    });

    it('refuses to run on an inbound', () => {
        const issues = finalmaskIssues(hop({ mode: 'intervalLocal', interval: 10 }), '26.9', 'inbound');
        expect(issues).toEqual([expect.objectContaining({ severity: 'critical', path: 'streamSettings.finalmask.udp[0]' })]);
    });

    it('says nothing before 26.9, where the type itself is the problem', () => {
        expect(finalmaskIssues(hop({}), '26.7', 'outbound')).toEqual([]);
    });
});

describe('the version check on finalmask', () => {
    it('reports a bbrProfile the core refuses, and none on 26.3 where the key does not exist', () => {
        const config = { outbounds: [{ tag: 'h', protocol: 'hysteria', streamSettings: { finalmask: { quicParams: { bbrProfile: 'turbo' } } } }] };
        // Only what this area says: other rows have views on a bare hysteria outbound.
        const at = (version: CoreVersionId) => versionDiagnostics(config, version)
            .filter(d => d.field?.startsWith('streamSettings.finalmask'))
            .map(d => [d.field, d.severity]);
        expect(at('26.7')).toContainEqual(['streamSettings.finalmask.quicParams.bbrProfile', 'critical']);
        expect(at('26.3')).toEqual([['streamSettings.finalmask.quicParams.bbrProfile', 'warning']]);
        const standard = { outbounds: [{ tag: 'h', protocol: 'hysteria', streamSettings: { finalmask: { quicParams: { bbrProfile: '' } } } }] };
        expect(versionDiagnostics(standard, '26.9').filter(d => d.field?.startsWith('streamSettings.finalmask'))).toEqual([]);
    });

    it('flags the keys the old editor wrote into quicParams', () => {
        const config = { inbounds: [{ tag: 'in', protocol: 'hysteria', streamSettings: { finalmask: { quicParams: { max_idle_timeout: 30, handshake_timeout: 20 } } } }] };
        const fields = versionDiagnostics(config, '26.7').map(d => d.field);
        expect(fields).toContain('streamSettings.finalmask.quicParams.max_idle_timeout');
        expect(fields).toContain('streamSettings.finalmask.quicParams.handshake_timeout');
    });
});

// ── Xray 26.10 ──────────────────────────────────────────────────────────
//
// Everything below is read off v26.10.10; the citations are in
// finalmask-rules.ts and in scripts/core-versions/findings/finalmask.json.

describe('the 26.10 key table', () => {
    it('keeps the 26.9 quicParams keys and mask types', () => {
        expect(offeredQuicKeys('26.10').map(spec => spec.key)).toEqual(offeredQuicKeys('26.9').map(spec => spec.key));
        expect(maskTypeChoices('26.10', 'udp', 'outbound')).toEqual(maskTypeChoices('26.9', 'udp', 'outbound'));
        expect(maskTypeChoices('26.10', 'tcp')).toEqual(maskTypeChoices('26.9', 'tcp'));
        expect(quicKeyStatus('26.10', 'udpHop').status).toBe('absent');
        expect(quicKeyStatus('26.10', 'disableGSO').status).toBe('accepted');
        expect(masqueReadsQuicParams('26.10')).toBe(true);
        expect(masqueReadsQuicParams('26.9')).toBe(false);
    });

    it('draws xdns domains as objects, read by both sides, and resolvers and extraPoll for the client', () => {
        const keys = (side?: 'inbound' | 'outbound') => offeredMaskKeys('26.10', 'udp', 'xdns', side).map(spec => spec.key);
        expect(keys('inbound')).toEqual(['domains']);
        expect(keys('outbound')).toEqual(['domains', 'resolvers', 'extraPoll']);
        expect(keys()).toEqual(['domains', 'resolvers', 'extraPoll']);
        const shapes = (version: CoreVersionId) => offeredMaskKeys(version, 'udp', 'xdns').map(spec => `${spec.key}:${spec.shape}`);
        expect(shapes('26.7')).toEqual(['domains:strings', 'resolvers:strings']);
        expect(shapes('26.9')).toEqual(['domains:strings', 'resolvers:strings']);
        expect(shapes('26.10')).toEqual(['domains:objects', 'resolvers:objects', 'extraPoll:number']);
    });

    it('answers per line when a key changes its type', () => {
        expect(maskKeyStatus('26.10', 'udp', 'xdns', 'domains')).toEqual({ status: 'accepted' });
        expect(maskKeyStatus('26.10', 'udp', 'xdns', 'domains', 'outbound')).toEqual({ status: 'accepted' });
        expect(maskKeyStatus('26.10', 'udp', 'xdns', 'resolvers', 'inbound')).toEqual({ status: 'accepted', readBy: 'outbound' });
        expect(maskKeyStatus('26.9', 'udp', 'xdns', 'domains', 'outbound')).toEqual({ status: 'accepted', readBy: 'inbound' });
        expect(maskKeyStatus('26.9', 'udp', 'xdns', 'extraPoll').status).toBe('absent');
        expect(maskKeyStatus('26.10', 'udp', 'xdns', 'extraPoll', 'inbound').readBy).toBe('outbound');
    });

    it('ignores the old single domain on 26.10 instead of refusing it', () => {
        expect(maskKeyStatus('26.9', 'udp', 'xdns', 'domain').status).toBe('rejected');
        expect(maskKeyStatus('26.10', 'udp', 'xdns', 'domain').status).toBe('absent');
    });

    it('takes sockopt away from udphop', () => {
        expect(offeredMaskKeys('26.9', 'udp', 'udphop').map(spec => spec.key)).toContain('sockopt');
        expect(offeredMaskKeys('26.10', 'udp', 'udphop').map(spec => spec.key)).toEqual(['mode', 'interval', 'remotePorts', 'remoteIPs']);
        expect(maskKeyStatus('26.10', 'udp', 'udphop', 'sockopt').status).toBe('absent');
    });

    it('says what shape a held value has to be', () => {
        const spec = (key: string) => offeredMaskKeys('26.10', 'udp', 'xdns').find(entry => entry.key === key)!;
        expect(heldTypeMatches(spec('domains'), undefined)).toBe(true);
        expect(heldTypeMatches(spec('domains'), [{ names: ['t.example.com'] }])).toBe(true);
        expect(heldTypeMatches(spec('domains'), ['t.example.com'])).toBe(false);
        expect(heldTypeMatches(spec('domains'), 't.example.com')).toBe(false);
        const strings = offeredMaskKeys('26.7', 'udp', 'xdns').find(entry => entry.key === 'domains')!;
        expect(heldTypeMatches(strings, ['t.example.com'])).toBe(true);
        expect(heldTypeMatches(strings, [{ names: [] }])).toBe(false);
        const tls = offeredMaskKeys('26.10', 'udp', 'realm').find(entry => entry.key === 'tlsConfig')!;
        expect(heldTypeMatches(tls, { serverName: 'a' })).toBe(true);
        expect(heldTypeMatches(tls, 'a')).toBe(false);
        expect(heldTypeMatches(tls, [])).toBe(false);
        const clients = offeredMaskKeys('26.10', 'tcp', 'header-custom').find(entry => entry.key === 'clients')!;
        expect(heldTypeMatches(clients, [[]])).toBe(true);
        expect(heldTypeMatches(clients, {})).toBe(false);
    });
});

describe('where a mask sits on 26.10', () => {
    it('puts xicmp and udphop last, with the new refusal', () => {
        expect(paths(finalmaskIssues(udp('xicmp', 'noise'), '26.10', 'outbound'))).toContain('streamSettings.finalmask.udp[0]');
        expect(paths(finalmaskIssues(udp('noise', 'xicmp'), '26.10', 'outbound'))).not.toContain('streamSettings.finalmask.udp[1]');
        const issue = finalmaskIssues(udp('xicmp', 'noise'), '26.10', 'outbound').find(entry => entry.path.endsWith('udp[0]'))!;
        expect(issue.severity).toBe('warning');
        expect(issue.message).toContain('has to be the last UDP mask');
        expect(issue.message).toContain('incorrect index');
        expect(issue.message).not.toContain('outermost');
        const hop = { udp: [{ type: 'udphop', settings: { mode: 'intervalLocal' } }, { type: 'noise', settings: {} }] };
        expect(paths(finalmaskIssues(hop, '26.10', 'outbound'))).toContain('streamSettings.finalmask.udp[0]');
        // the 26.9 refusal keeps its own words
        expect(finalmaskIssues(udp('xicmp', 'noise'), '26.9', 'outbound').find(entry => entry.path.endsWith('udp[0]'))!.message).toContain('outermost');
    });

    it('lets only one of xicmp and udphop have the socket end', () => {
        const both = { udp: [{ type: 'xicmp', settings: {} }, { type: 'udphop', settings: { mode: 'intervalLocal', interval: 10 } }] };
        expect(paths(finalmaskIssues(both, '26.10', 'outbound').filter(issue => issue.severity !== 'info'))).toEqual(['streamSettings.finalmask.udp[0]']);
    });

    it('stops an inbound on a misplaced xicmp, as before', () => {
        expect(finalmaskIssues(udp('xicmp', 'noise'), '26.10', 'inbound').find(entry => entry.path.endsWith('udp[0]'))!.severity).toBe('critical');
    });

    it('lets realm and a UDP sudoku sit anywhere', () => {
        for (const order of [['realm', 'noise'], ['noise', 'realm'], ['sudoku', 'noise'], ['noise', 'sudoku']]) {
            expect(finalmaskIssues(udp(...order), '26.10', 'outbound').filter(issue => issue.severity !== 'info')).toEqual([]);
        }
    });

    it('does not carry the quicParams.udpHop conflict, which 26.9 already lost', () => {
        const config = { udp: [{ type: 'xicmp', settings: {} }], quicParams: { udpHop: { ports: '20000-30000' } } };
        expect(finalmaskIssues(config, '26.7', 'outbound')).toHaveLength(1);
        expect(finalmaskIssues(config, '26.9', 'outbound')).toEqual([]);
        expect(finalmaskIssues(config, '26.10', 'outbound').filter(issue => issue.severity !== 'info')).toEqual([]);
    });

    it('tells a client that xdns ignores every mask nearer the socket than it', () => {
        const wrong = udp('xdns', 'noise');
        const message = finalmaskIssues(wrong, '26.10', 'outbound').find(entry => entry.path.endsWith('udp[0]'))!;
        expect(message.severity).toBe('warning');
        expect(message.message).toContain('never uses the socket');
        // a server wraps the real socket, and the end it belongs at raises nothing
        expect(paths(finalmaskIssues(wrong, '26.10', 'inbound'))).not.toContain('streamSettings.finalmask.udp[0]');
        expect(paths(finalmaskIssues(udp('noise', 'xdns'), '26.10', 'outbound'))).not.toContain('streamSettings.finalmask.udp[1]');
        // 26.9 wraps the raw connection like any other mask
        expect(paths(finalmaskIssues(wrong, '26.9', 'outbound'))).not.toContain('streamSettings.finalmask.udp[0]');
    });

    it('keeps a new mask off the socket end only where a mask has to hold it', () => {
        expect(pinnedEnd('26.10', 'xicmp')).toBe('last');
        expect(pinnedEnd('26.10', 'udphop')).toBe('last');
        expect(pinnedEnd('26.10', 'xdns')).toBe('last');
        expect(pinnedEnd('26.10', 'realm')).toBeUndefined();
        expect(pinnedEnd('26.10', 'sudoku')).toBeUndefined();
        expect(pinnedEnd('26.9', 'xdns')).toBeUndefined();
        expect(pinnedEnd('26.9', 'realm')).toBe('last');
        expect(pinnedEnd('26.9', 'sudoku')).toBe('first');
        expect(socketEnd('26.10')).toBe('last');
        expect(socketEnd('26.3')).toBe('first');
    });

    it('still says a chain of two reads the other way round', () => {
        const issues = finalmaskIssues({ tcp: [{ type: 'fragment' }, { type: 'sudoku' }] }, '26.10', 'outbound');
        expect(issues).toHaveLength(1);
        expect(issues[0]!.severity).toBe('info');
    });
});

describe('what xdns needs on 26.10', () => {
    const xdns = (settings: unknown) => ({ udp: [{ type: 'xdns', settings }] });
    const at = (suffix = '') => `streamSettings.finalmask.udp[0].settings${suffix}`;
    const domains = [{ names: ['t.example.com'] }];
    const resolvers = [{ addrs: ['1.1.1.1:53'] }];

    it('is happy with objects, on each side that reads them', () => {
        expect(finalmaskIssues(xdns({ domains, resolvers, extraPoll: 2 }), '26.10', 'outbound')).toEqual([]);
        expect(finalmaskIssues(xdns({ domains }), '26.10', 'inbound')).toEqual([]);
        // a server does not read resolvers, so they raise nothing there
        expect(finalmaskIssues(xdns({ domains, resolvers: [{ addrs: ['tcp://8.8.8.8'] }] }), '26.10', 'inbound')).toEqual([]);
    });

    it('fails the load on strings where the line reads objects', () => {
        const issues = finalmaskIssues(xdns({ domains: ['t.example.com'], resolvers: ['t.example.com+udp://1.1.1.1:53'] }), '26.10', 'outbound');
        expect(issues.map(issue => [issue.path, issue.severity])).toEqual([[at('.domains'), 'critical'], [at('.resolvers'), 'critical']]);
        expect(issues[0]!.message).toContain('list of objects');
        expect(issues[0]!.message).toContain('"names"');
    });

    it('fails the load on objects where 26.7 and 26.9 read strings', () => {
        for (const version of ['26.7', '26.9'] as const) {
            const issues = finalmaskIssues(xdns({ domains, resolvers }), version, 'outbound');
            expect(issues.map(issue => [issue.path, issue.severity])).toEqual([[at('.domains'), 'critical'], [at('.resolvers'), 'critical']]);
            expect(issues[0]!.message).toContain('plain strings');
        }
    });

    it('no longer refuses an empty xdns at load, only when it starts or dials', () => {
        expect(finalmaskIssues(xdns({}), '26.7', 'outbound')[0]).toMatchObject({ severity: 'critical', path: at() });
        const server = finalmaskIssues(xdns({}), '26.10', 'inbound');
        expect(server).toEqual([expect.objectContaining({ severity: 'critical', path: at('.domains') })]);
        const client = finalmaskIssues(xdns({}), '26.10', 'outbound');
        expect(client.map(issue => [issue.path, issue.severity])).toEqual([[at('.domains'), 'warning'], [at('.resolvers'), 'warning']]);
        // empty lists and empty objects count for nothing
        expect(finalmaskIssues(xdns({ domains: [{ names: [] }], resolvers: [{ addrs: [] }] }), '26.10', 'outbound')).toHaveLength(2);
    });

    it('asks a client for both lists and a server for domains only', () => {
        expect(finalmaskIssues(xdns({ domains }), '26.10', 'outbound').map(issue => issue.path)).toEqual([at('.resolvers')]);
        expect(finalmaskIssues(xdns({ resolvers }), '26.10', 'outbound').map(issue => issue.path)).toEqual([at('.domains')]);
    });

    it('checks what Build() checks, critically', () => {
        const one = (domain: unknown) => finalmaskIssues(xdns({ domains: [domain], resolvers }), '26.10', 'outbound');
        expect(one({ names: ['a..example.com'] })[0]).toMatchObject({ severity: 'critical', path: at('.domains[0].names[0]') });
        expect(one({ names: ['t.example.com'], lenLimit: 300 })[0]).toMatchObject({ severity: 'critical', path: at('.domains[0].lenLimit') });
        expect(one({ names: ['t.example.com'], lenLimit: -1 })[0]).toMatchObject({ severity: 'critical', path: at('.domains[0].lenLimit') });
        expect(one({ names: ['t.example.com'], labelLimit: 64 })[0]).toMatchObject({ severity: 'critical', path: at('.domains[0].labelLimit') });
        expect(one({ names: ['t.example.com'], edns0: 100 })[0]).toMatchObject({ severity: 'critical', path: at('.domains[0].edns0') });
        expect(one({ names: ['t.example.com'], edns0: 4096, lenLimit: 200, labelLimit: 40 })).toEqual([]);
        expect(one({ names: ['t.example.com'], lenLimit: 40 })[0]).toMatchObject({ severity: 'critical', path: at('.domains[0].names[0]') });
        const poll = (extraPoll: unknown) => finalmaskIssues(xdns({ domains, resolvers, extraPoll }), '26.10', 'outbound');
        expect(poll(3)).toEqual([]);
        expect(poll(4)[0]).toMatchObject({ severity: 'critical', path: at('.extraPoll') });
        expect(poll(-1)[0]).toMatchObject({ severity: 'critical', path: at('.extraPoll') });
    });

    it('refuses a resolver scheme that is not udp or tcp, and takes a bare address as udp', () => {
        const one = (addr: string) => finalmaskIssues(xdns({ domains, resolvers: [{ addrs: [addr] }] }), '26.10', 'outbound');
        expect(one('1.1.1.1')).toEqual([]);
        expect(one('UDP://1.1.1.1:5353')).toEqual([]);
        expect(one('tcp://dns.example.com')).toEqual([]);
        expect(one('https://dns.example.com/dns-query')[0]).toMatchObject({ severity: 'critical', path: at('.resolvers[0].addrs[0]') });
        expect(one('t.example.com+udp://1.1.1.1:53')[0]).toMatchObject({ severity: 'critical' });
    });

    it('fails the load on a value of the wrong JSON type inside an object', () => {
        const one = (domain: unknown) => finalmaskIssues(xdns({ domains: [domain], resolvers }), '26.10', 'outbound');
        expect(one({ names: 't.example.com' })[0]).toMatchObject({ severity: 'critical', path: at('.domains[0].names') });
        expect(one({ names: ['t.example.com'], lenLimit: '255' })[0]).toMatchObject({ severity: 'critical', path: at('.domains[0].lenLimit') });
        expect(one({ names: ['t.example.com'], types: ['txt'] })[0]).toMatchObject({ severity: 'critical', path: at('.domains[0].types') });
        expect(finalmaskIssues(xdns({ domains, resolvers: [{ addrs: '1.1.1.1' }] }), '26.10', 'outbound')[0]).toMatchObject({ severity: 'critical', path: at('.resolvers[0].addrs') });
        expect(finalmaskIssues(xdns({ domains, resolvers, extraPoll: '2' }), '26.10', 'outbound')[0]).toMatchObject({ severity: 'critical', path: at('.extraPoll') });
    });

    it('lets an unknown record type load and fails it where the mask is built', () => {
        const kinds = (direction: 'inbound' | 'outbound') =>
            finalmaskIssues(xdns({ domains: [{ names: ['t.example.com'], types: [1, 16, 99] }], resolvers }), '26.10', direction);
        expect(kinds('outbound')).toEqual([expect.objectContaining({ severity: 'warning', path: at('.domains[0].types') })]);
        expect(kinds('inbound')).toEqual([expect.objectContaining({ severity: 'critical', path: at('.domains[0].types') })]);
    });
});

describe('what udphop needs on 26.10', () => {
    const hop = (settings: unknown) => ({ udp: [{ type: 'udphop', settings }] });
    const interval = 'streamSettings.finalmask.udp[0].settings.interval';

    it('has a default interval, so none is fine', () => {
        expect(finalmaskIssues(hop({ mode: 'intervalLocal' }), '26.10', 'outbound')).toEqual([]);
        expect(finalmaskIssues(hop({ mode: 'intervalLocal', interval: 0 }), '26.10', 'outbound')).toEqual([]);
        expect(finalmaskIssues(hop({ mode: 'intervalLocal', interval: '5-30' }), '26.10', 'outbound')).toEqual([]);
        // 26.9 has none: the same config fails every dial there
        expect(finalmaskIssues(hop({ mode: 'intervalLocal' }), '26.9', 'outbound')).toHaveLength(1);
    });

    it('refuses a start under 5 at load, on either side', () => {
        for (const value of [3, '3-30', '0-30', 1]) {
            const issues = finalmaskIssues(hop({ mode: 'intervalLocal', interval: value }), '26.10', 'outbound');
            expect(issues).toEqual([expect.objectContaining({ severity: 'critical', path: interval })]);
        }
        expect(finalmaskIssues(hop({ mode: 'intervalLocal', interval: 3 }), '26.9', 'outbound')[0]).toMatchObject({ severity: 'warning', path: interval });
        // load-time, so an inbound's config does not load either
        expect(finalmaskIssues(hop({ mode: 'intervalLocal', interval: 3 }), '26.10', 'inbound').map(issue => issue.path)).toContain(interval);
        expect(finalmaskIssues(hop({ mode: 'intervalLocal', interval: '30-5' }), '26.10', 'outbound')).toEqual([]);
    });

    it('still wants a mode and still refuses to run on an inbound', () => {
        expect(finalmaskIssues(hop({}), '26.10', 'outbound')[0]).toMatchObject({ severity: 'critical', path: 'streamSettings.finalmask.udp[0].settings.mode' });
        expect(finalmaskIssues(hop({ mode: 'intervalLocal' }), '26.10', 'inbound')).toEqual([expect.objectContaining({ severity: 'critical', path: 'streamSettings.finalmask.udp[0]' })]);
        expect(maskTypeStatus('26.10', 'udp', 'udphop', 'inbound')).toEqual({ accepted: true, clientOnly: true });
        expect(udphopDefaultsInterval('26.10')).toBe(true);
        expect(udphopDefaultsInterval('26.9')).toBe(false);
    });
});

describe('what xicmp needs on 26.10', () => {
    const icmp = (settings: unknown) => ({ udp: [{ type: 'xicmp', settings }] });

    it('says a client without ips pings the address it dials', () => {
        const issues = finalmaskIssues(icmp({}), '26.10', 'outbound');
        expect(issues).toEqual([expect.objectContaining({ severity: 'info', path: 'streamSettings.finalmask.udp[0].settings.ips' })]);
        expect(issues[0]!.message).toContain('empty ip addresses');
        expect(finalmaskIssues(icmp({ ips: ['203.0.113.7'] }), '26.10', 'outbound')).toEqual([]);
        expect(finalmaskIssues(icmp({}), '26.10', 'inbound')).toEqual([]);
        expect(finalmaskIssues(icmp({}), '26.9', 'outbound')).toEqual([]);
    });
});

describe('the noise mask on 26.10', () => {
    const noise = (...items: unknown[]) => ({ udp: [{ type: 'noise', settings: { noise: items } }] });
    const problem = (version: CoreVersionId, ...items: unknown[]) =>
        finalmaskIssues(noise(...items), version, 'outbound').filter(issue => issue.severity === 'critical');

    it('takes exp as a packet encoding on 26.10 only', () => {
        expect(noiseItemTypeAccepted('26.10', 'exp')).toBe(true);
        expect(noiseItemTypeAccepted('26.10', 'EXP')).toBe(true);
        for (const version of ['26.3', '26.7', '26.9'] as const) {
            expect(noiseItemTypeAccepted(version, 'exp')).toBe(false);
            expect(noiseItemTypeAccepted(version, 'hex')).toBe(true);
            expect(noiseItemTypeAccepted(version, '')).toBe(true);
            expect(allowedValues(version, 'finalmask.udp.noise.item.type')).toEqual(['', 'array', 'str', 'hex', 'base64']);
        }
        expect(allowedValues('26.10', 'finalmask.udp.noise.item.type')).toEqual(['', 'array', 'str', 'hex', 'base64', 'exp']);
    });

    it('offers exp where it is taken, and keeps a held one on screen where it is not', () => {
        expect(noiseItemTypeChoices('26.10')).toEqual(['hex', 'str', 'base64', 'exp']);
        expect(noiseItemTypeChoices('26.7')).toEqual(['hex', 'str', 'base64']);
        expect(noiseItemTypeChoices('26.7', 'exp')).toEqual(['hex', 'str', 'base64', 'exp']);
        expect(noiseItemTypeChoices('26.9', 'array')).toEqual(['hex', 'str', 'base64', 'array']);
        expect(noiseItemTypeChoices('26.10', 'hex')).toEqual(['hex', 'str', 'base64', 'exp']);
        expect(noiseItemTypeChoices('26.10', '')).toEqual(['hex', 'str', 'base64', 'exp']);
    });

    it('recognises an item written as an expression', () => {
        expect(isNoiseExpItem({ type: 'exp', packet: '<t>' })).toBe(true);
        expect(isNoiseExpItem({ type: 'EXP', packet: '<t>' })).toBe(true);
        expect(isNoiseExpItem({ type: 'hex', packet: 'aa' })).toBe(false);
        expect(isNoiseExpItem({ rand: '40-70' })).toBe(false);
        expect(isNoiseExpItem(null)).toBe(false);
    });

    it('reports exp as refused on the lines before 26.10 through the version check', () => {
        const config = { outbounds: [{ tag: 'w', protocol: 'wireguard', streamSettings: { finalmask: noise({ type: 'exp', packet: '<t>' }) } }] };
        const at = (version: CoreVersionId) => versionDiagnostics(config, version)
            .filter(d => d.field === 'streamSettings.finalmask.udp[type=noise].settings.noise[].type')
            .map(d => d.severity);
        expect(at('26.9')).toEqual(['critical']);
        expect(at('26.7')).toEqual(['critical']);
        expect(at('26.3')).toEqual(['critical']);
        expect(at('26.10')).toEqual([]);
        // and hex stays fine everywhere
        const hex = { outbounds: [{ tag: 'w', protocol: 'wireguard', streamSettings: { finalmask: noise({ type: 'HEX', packet: 'aa' }) } }] };
        for (const version of LINES) {
            expect(versionDiagnostics(hex, version).filter(d => d.field?.includes('noise[]'))).toEqual([]);
        }
    });

    it('builds what the core builds, and says why when it does not', () => {
        expect(noiseExpProblem('<b 0xDEADBEEF><r 8><t>')).toBeNull();
        expect(noiseExpProblem('  <b 0xDE AD BE EF> <rc 4-8>\n<rd 2><c><n>  ')).toBeNull();
        expect(noiseExpProblem('<b 0XAB>')).toBeNull();
        expect(noiseExpProblem('<r 0>')).toBeNull();
        expect(noiseExpProblem('<r 65535>')).toBeNull();
        expect(noiseExpProblem('')).toBe('empty noise exp: ');
        expect(noiseExpProblem('hello')).toBe('invalid noise exp near hello');
        expect(noiseExpProblem('<t> trailing')).toBe('invalid noise exp near  trailing');
        expect(noiseExpProblem('lead <t>')).toBe('invalid noise exp near lead ');
        expect(noiseExpProblem('<x 1>')).toBe('unknown <x> in noise exp');
        // upper case is not a tag at all, so what is left over is junk
        expect(noiseExpProblem('<B 0xAA>')).toBe('invalid noise exp near <B 0xAA>');
        expect(noiseExpProblem('<b>')).toBe('empty bytes in noise exp');
        expect(noiseExpProblem('<b 0x>')).toBe('empty bytes in noise exp');
        expect(noiseExpProblem('<b 0xABC>')).toBe('invalid hex in noise exp: 0xABC');
        expect(noiseExpProblem('<b zz>')).toBe('invalid hex in noise exp: zz');
        expect(noiseExpProblem('<r>')).toBe('<r> in noise exp needs a size');
        expect(noiseExpProblem('<rc 5-2>')).toBe('invalid size in noise exp: 5-2');
        expect(noiseExpProblem('<rd -1>')).toBe('invalid size in noise exp: -1');
        expect(noiseExpProblem('<r 70000>')).toBe('invalid size in noise exp: 70000');
        expect(noiseExpProblem('<r big>')).toBe('invalid range string: big');
        expect(noiseExpProblem('<t 4>')).toBe('<t> in noise exp takes no argument');
        expect(noiseExpProblem('<c 1>')).toBe('<c> in noise exp takes no argument');
        expect(noiseExpProblem('<n 1>')).toBe('<n> in noise exp takes no argument');
    });

    it('refuses a bad expression at load, as critical, but only where exp is a type', () => {
        expect(problem('26.10', { type: 'exp', packet: '<b 0xDEADBEEF><r 8><t>', delay: '5-10' })).toEqual([]);
        const bad = problem('26.10', { type: 'exp', packet: '<q>' });
        expect(bad).toEqual([expect.objectContaining({ path: 'streamSettings.finalmask.udp[0].settings.noise[0].packet' })]);
        expect(bad[0]!.message).toContain('unknown <q> in noise exp');
        expect(problem('26.10', { type: 'exp', packet: ['<t>'] })).toHaveLength(1);
        expect(problem('26.10', { type: 'exp' })).toHaveLength(1);
        expect(problem('26.10', { type: 'Exp', packet: '<t' })).toHaveLength(1);
        // the other lines have the version check for the type itself
        expect(problem('26.9', { type: 'exp', packet: '<q>' })).toEqual([]);
    });

    it('refuses a packet together with rand on every line, and an exp item ignores randRange', () => {
        for (const version of LINES) {
            expect(problem(version, { type: 'hex', packet: 'aa', rand: '10-20' })).toEqual([expect.objectContaining({ path: 'streamSettings.finalmask.udp[0].settings.noise[0]' })]);
            expect(problem(version, { type: 'hex', packet: 'aa' })).toEqual([]);
            expect(problem(version, { rand: '10-20' })).toEqual([]);
            expect(problem(version, { type: 'hex', packet: 'aa', rand: 0 })).toEqual([]);
        }
        expect(problem('26.10', { type: 'exp', packet: '<t>', rand: 5 })).toHaveLength(1);
        expect(problem('26.10', { type: 'exp', packet: '<t>', randRange: '1-2' })).toEqual([]);
    });
});

describe('the 26.10 rows of the version check', () => {
    const outbound = (finalmask: unknown) => ({ outbounds: [{ tag: 'o', protocol: 'wireguard', streamSettings: { finalmask } }] });
    const fields = (config: unknown, version: CoreVersionId) => versionDiagnostics(config, version)
        .filter(d => d.field?.startsWith('streamSettings.finalmask'))
        .map(d => [d.field, d.severity]);

    it('warns about extraPoll before 26.10 and about the old xdns domain on 26.10 as ignored, not refused', () => {
        const config = outbound({ udp: [{ type: 'xdns', settings: { domain: 't.example.com', extraPoll: 1, domains: [{ names: ['t.example.com'] }], resolvers: [{ addrs: ['1.1.1.1'] }] } }] });
        expect(fields(config, '26.10')).toEqual([['streamSettings.finalmask.udp[type=xdns].settings.domain', 'warning']]);
        expect(fields(config, '26.9')).toContainEqual(['streamSettings.finalmask.udp[type=xdns].settings.domain', 'critical']);
        expect(fields(config, '26.9')).toContainEqual(['streamSettings.finalmask.udp[type=xdns].settings.extraPoll', 'warning']);
        expect(fields(config, '26.7')).toContainEqual(['streamSettings.finalmask.udp[type=xdns].settings.extraPoll', 'warning']);
    });

    it('warns about the udphop sockopt that 26.10 dropped', () => {
        const config = outbound({ udp: [{ type: 'udphop', settings: { mode: 'intervalLocal', interval: 10, sockopt: { mark: 255 } } }] });
        expect(fields(config, '26.10')).toEqual([['streamSettings.finalmask.udp[type=udphop].settings.sockopt', 'warning']]);
        expect(fields(config, '26.9')).toEqual([]);
    });

    it('cites v26.10.10 on every finalmask row that differs from 26.9', () => {
        const rows = FEATURES.filter(row => row.path.startsWith('streamSettings.finalmask.') && row.status['26.10'] !== row.status['26.9']);
        expect(rows.length).toBeGreaterThanOrEqual(3);
        for (const row of rows) expect(row.evidence.some(cite => cite.startsWith('v26.10.10:')), row.id).toBe(true);
    });
});
