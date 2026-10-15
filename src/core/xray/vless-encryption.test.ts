import { describe, expect, it } from 'bun:test';
import {
    DEFAULT_PADDING,
    KEY_BYTES,
    buildAccepts,
    composeVlessEncryption,
    decodeRawUrlBase64,
    goAtoi,
    isMlkem768PublicKey,
    lifetimeCeiling,
    paddingIssue,
    pathText,
    readLifetime,
    readVlessDecryption,
    readVlessEncryption,
    readVlessOutboundEncryption,
    splitVlessEncryption,
    vlessEncryptionOffered,
    vlessEncryptionPath,
    vlessInboundEncryptionProblems,
    vlessOutboundEncryptionProblems,
} from './vless-encryption';
import { INBOUND_CASES, KEYS, OUTBOUND_CASES, inboundConfig, outboundConfig, type VlessEncryptionCase } from './vless-encryption.cases';
import { CORE_VERSIONS } from './versions';
import { runFullDiagnostics } from '../diagnostics';

const criticalKinds = (kinds: { kind: string; severity: string }[]) =>
    kinds.filter(problem => problem.severity === 'critical').map(problem => problem.kind).sort();

describe('the strings the real core was asked about', () => {
    // Every row of the table was run through the released v26.10.10 binary
    // (see the cases file). The reader has to refuse exactly the ones it did.
    const run = (side: 'inbound' | 'outbound', cases: VlessEncryptionCase[]) => {
        for (const testCase of cases) {
            it(`${side}: ${testCase.label} is ${testCase.refused ? 'refused' : 'taken'}`, () => {
                const config = side === 'inbound' ? inboundConfig(testCase) : outboundConfig(testCase);
                const item = (config as any)[side === 'inbound' ? 'inbounds' : 'outbounds'][side === 'inbound' ? 0 : 0];
                const problems = side === 'inbound'
                    ? vlessInboundEncryptionProblems(item)
                    : vlessOutboundEncryptionProblems(item);
                const critical = problems.filter(problem => problem.severity === 'critical');
                expect(critical.length > 0).toBe(testCase.refused);
                if (testCase.kinds) expect(criticalKinds(problems)).toEqual([...new Set(testCase.kinds)].sort());
                expect(problems.filter(problem => problem.severity === 'warning').map(problem => problem.kind).sort())
                    .toEqual([...(testCase.warnings ?? [])].sort());
            });
        }
    };
    run('inbound', INBOUND_CASES);
    run('outbound', OUTBOUND_CASES);
});

describe('Go\'s number parsing, as far as these strings use it', () => {
    it('takes an optional sign and digits, within int64', () => {
        expect(goAtoi('600')).toBe(600n);
        expect(goAtoi('+600')).toBe(600n);
        expect(goAtoi('-600')).toBe(-600n);
        expect(goAtoi('007')).toBe(7n);
        expect(goAtoi('9223372036854775807')).toBe(9223372036854775807n);
        expect(goAtoi('9223372036854775808')).toBeNull();
        expect(goAtoi('-9223372036854775808')).toBe(-9223372036854775808n);
        expect(goAtoi('-9223372036854775809')).toBeNull();
    });

    it('takes nothing else', () => {
        for (const bad of ['', '+', '-', ' 5', '5 ', '5.0', '1e3', '0x10', '1_000', '٣', 'a']) expect(goAtoi(bad)).toBeNull();
    });
});

describe('the ticket lifetime', () => {
    it('is one number or two with a dash, with or without the s', () => {
        expect(readLifetime('600s')).toEqual({ from: 600n, to: null });
        expect(readLifetime('600')).toEqual({ from: 600n, to: null });
        expect(readLifetime('300-600s')).toEqual({ from: 300n, to: 600n });
        expect(readLifetime('5--10s')).toEqual({ from: 5n, to: -10n });
        expect(readLifetime('-5s')).toBeNull();
        expect(readLifetime('600ss')).toBeNull();
        expect(readLifetime('')).toBeNull();
        expect(readLifetime('s')).toBeNull();
    });

    it('has a ceiling, and 0 means tickets are off', () => {
        expect(lifetimeCeiling('600s')).toBe(600n);
        expect(lifetimeCeiling('600-300s')).toBe(600n);
        expect(lifetimeCeiling('0s')).toBe(0n);
        expect(lifetimeCeiling('0-0')).toBe(0n);
        expect(lifetimeCeiling('x')).toBeNull();
    });
});

describe('padding', () => {
    it('accepts the documented default', () => {
        expect(paddingIssue(DEFAULT_PADDING)).toBeNull();
        expect(paddingIssue('')).toBeNull();
    });

    it('names the first thing wrong, as the core does', () => {
        expect(paddingIssue('100-111')).toEqual({ kind: 'shape', block: '100-111' });
        expect(paddingIssue('100-a-5')).toEqual({ kind: 'number', block: '100-a-5', part: 'a' });
        expect(paddingIssue('99-111-1111')).toEqual({ kind: 'first', block: '99-111-1111' });
        expect(paddingIssue('100-35-35.0-0-0.100-35-40000.0-0-0.100-35-40000')).toEqual({ kind: 'total' });
        // A later block is only checked for its shape and numbers; the floor is the first block's.
        expect(paddingIssue('100-111-1111.1-0-0.1-0-0')).toBeNull();
    });

    it('counts only the length blocks, the first, third, ... ones, toward the total', () => {
        // Waits (the odd ones) can be as large as an int64 allows and do not add to it.
        expect(paddingIssue('100-35-100.100-0-60000.100-35-100')).toBeNull();
    });
});

describe('the ML-KEM-768 public key check', () => {
    it('is the modulus check on the first 1152 bytes and nothing on the last 32', () => {
        const key = decodeRawUrlBase64(KEYS.clientM)!;
        expect(key).toHaveLength(KEY_BYTES.mlkem768Public);
        expect(isMlkem768PublicKey(key)).toBe(true);
        const high = Uint8Array.from(key);
        high[1] = 0xff;
        high[0] = 0xff;
        expect(isMlkem768PublicKey(high)).toBe(false);
        const rho = Uint8Array.from(key);
        rho.fill(0xff, 1152);
        expect(isMlkem768PublicKey(rho)).toBe(true);
        expect(isMlkem768PublicKey(key.slice(0, 1183))).toBe(false);
    });
});

describe('taking a string apart and putting it back', () => {
    it('finds the pieces of a well laid out string', () => {
        const parts = splitVlessEncryption(`mlkem768x25519plus.xorpub.300-600s.${DEFAULT_PADDING}.${KEYS.serverX}.${KEYS.serverM}`)!;
        expect(parts).toEqual({
            appearance: 'xorpub',
            ticket: '300-600s',
            padding: DEFAULT_PADDING,
            keys: [KEYS.serverX, KEYS.serverM],
        });
    });

    it('puts back exactly what it took apart', () => {
        for (const value of [
            `mlkem768x25519plus.native.600s.${KEYS.serverX}`,
            `mlkem768x25519plus.random.0rtt.${DEFAULT_PADDING}.${KEYS.clientX}`,
            `mlkem768x25519plus.native.600s.100-35-35.${KEYS.serverX}.${KEYS.serverX}`,
        ]) {
            expect(composeVlessEncryption(splitVlessEncryption(value)!)).toBe(value);
        }
    });

    it('is not fooled by a string that is not the layout', () => {
        expect(splitVlessEncryption('none')).toBeNull();
        expect(splitVlessEncryption('a.b.c')).toBeNull();
        expect(splitVlessEncryption('mlkem768.native.600s.x')).toBeNull();
        expect(splitVlessEncryption(5)).toBeNull();
        expect(splitVlessEncryption(undefined)).toBeNull();
    });

    it('keeps what it cannot place with the keys, so nothing is lost on the way back', () => {
        const value = `mlkem768x25519plus.native.600s.${KEYS.serverX}.100-111-1111`;
        expect(composeVlessEncryption(splitVlessEncryption(value)!)).toBe(value);
    });
});

describe('what the reader hands an editor', () => {
    it('knows "none"', () => {
        const reading = readVlessEncryption('none', 'server', 'settings.decryption');
        expect(reading.none).toBe(true);
        expect(reading.problems).toEqual([]);
        expect(reading.usable).toBe(false);
    });

    it('lists the keys a good string holds, by kind and in order', () => {
        const reading = readVlessEncryption(`mlkem768x25519plus.native.600s.${KEYS.serverX}.${KEYS.serverM}`, 'server', 'd');
        expect(reading.usable).toBe(true);
        expect(reading.keys.map(key => key.kind)).toEqual(['x25519', 'mlkem768']);
        expect(reading.keys.map(key => key.bytes.length)).toEqual([32, 64]);
        const client = readVlessEncryption(`mlkem768x25519plus.native.0rtt.${KEYS.clientX}.${KEYS.clientM}`, 'client', 'e');
        expect(client.keys.map(key => key.bytes.length)).toEqual([32, 1184]);
    });

    it('reports everything wrong at once where the core would stop at the first', () => {
        const reading = readVlessEncryption(`Mlkem768x25519plus.xor.abc.${KEYS.clientM}`, 'server', 'settings.decryption');
        expect(reading.problems.map(problem => problem.kind)).toEqual(['handshake', 'appearance', 'lifetime', 'key.size']);
        expect(reading.usable).toBe(false);
    });

    it('says which half is the likely mistake when a client key is where a server key goes, and the other way round', () => {
        const server = readVlessEncryption(`mlkem768x25519plus.native.600s.${KEYS.clientM}`, 'server', 'd');
        expect(server.problems[0]?.suggestion).toContain('client');
        const client = readVlessEncryption(`mlkem768x25519plus.native.0rtt.${KEYS.serverM}`, 'client', 'e');
        expect(client.problems[0]?.suggestion).toContain('private');
    });

    it('does not call a string usable when the padding is the only thing wrong', () => {
        const reading = readVlessEncryption(`mlkem768x25519plus.native.600s.99-1-1.${KEYS.serverX}`, 'server', 'd');
        expect(reading.problems.map(problem => problem.kind)).toEqual(['padding.first']);
        expect(reading.usable).toBe(false);
        // Build() takes it; Init does not. fallbacks is judged on what Build takes.
        expect(buildAccepts(reading)).toBe(true);
    });

    it('lets a warning through without calling the string unusable', () => {
        const reading = readVlessEncryption(`mlkem768x25519plus.native.70000s.${KEYS.serverX}`, 'server', 'd');
        expect(reading.problems.map(problem => problem.kind)).toEqual(['lifetime.wide']);
        expect(reading.usable).toBe(true);
    });

    it('names a wrong JSON type and a missing value for what they are', () => {
        expect(readVlessEncryption({}, 'server', 'd').problems.map(problem => problem.kind)).toEqual(['type']);
        expect(readVlessEncryption(5, 'client', 'e').problems.map(problem => problem.kind)).toEqual(['type']);
        expect(readVlessEncryption(undefined, 'client', 'e').problems.map(problem => problem.kind)).toEqual(['missing']);
        expect(readVlessEncryption('', 'server', 'd').problems.map(problem => problem.kind)).toEqual(['missing']);
    });

    it('measures a part in bytes, as Go does: 19 ASCII characters are padding, 20 are a key', () => {
        const nineteen = 'A'.repeat(19);
        const twenty = 'A'.repeat(20);
        expect(readVlessEncryption(`mlkem768x25519plus.native.600s.${nineteen}`, 'server', 'd').problems.map(p => p.kind)).toEqual(['key.missing']);
        expect(readVlessEncryption(`mlkem768x25519plus.native.600s.${twenty}`, 'server', 'd').problems.map(p => p.kind)).toEqual(['key.size']);
        // …and a multi-byte character counts for its bytes: ten of them are 20 bytes, so a key, though 10 characters.
        expect(readVlessEncryption(`mlkem768x25519plus.native.600s.${'é'.repeat(10)}`, 'server', 'd').problems.map(p => p.kind)).toEqual(['key.chars']);
    });
});

describe('where the outbound keeps it', () => {
    it('is the first user of the first server, until the flat form is there', () => {
        expect(vlessEncryptionPath({ protocol: 'vless', settings: { vnext: [{ users: [{}] }] } })).toEqual(['settings', 'vnext', 0, 'users', 0, 'encryption']);
        expect(vlessEncryptionPath({ protocol: 'vless', settings: { address: '1.2.3.4' } })).toEqual(['settings', 'encryption']);
        // address: null is not there — Go decodes it to a nil pointer.
        expect(vlessEncryptionPath({ protocol: 'vless', settings: { address: null, vnext: [] } })).toEqual(['settings', 'vnext', 0, 'users', 0, 'encryption']);
        expect(pathText(['settings', 'vnext', 0, 'users', 0, 'encryption'])).toBe('settings.vnext[0].users[0].encryption');
    });

    it('reads the flat form even when the vnext one holds a string: the flat form wins in the core', () => {
        const outbound = {
            protocol: 'vless',
            settings: {
                address: '1.2.3.4', port: 1, id: 'x',
                vnext: [{ users: [{ encryption: `mlkem768x25519plus.native.0rtt.${KEYS.clientX}` }] }],
            },
        };
        expect(readVlessOutboundEncryption(outbound)?.problems.map(problem => problem.kind)).toEqual(['missing']);
        expect(vlessOutboundEncryptionProblems(outbound)[0]?.field).toBe('settings.encryption');
    });

    it('says nothing where there is no user to hold it — that is another refusal', () => {
        expect(vlessOutboundEncryptionProblems({ protocol: 'vless', settings: { vnext: [] } })).toEqual([]);
        expect(vlessOutboundEncryptionProblems({ protocol: 'vless', settings: {} })).toEqual([]);
    });

    it('is only for VLESS', () => {
        expect(vlessOutboundEncryptionProblems({ protocol: 'vmess', settings: {} })).toEqual([]);
        expect(vlessInboundEncryptionProblems({ protocol: 'trojan', settings: {} })).toEqual([]);
        expect(readVlessDecryption({ protocol: 'vmess' })).toBeNull();
        expect(readVlessOutboundEncryption(null)).toBeNull();
    });

    it('takes the protocol in any case, as the loader does', () => {
        expect(vlessInboundEncryptionProblems({ protocol: 'VLESS', settings: {} }).map(problem => problem.kind)).toEqual(['missing']);
    });
});

describe('the inbound\'s users', () => {
    const inbound = (settings: Record<string, unknown>) => ({ protocol: 'vless', settings: { decryption: 'none', ...settings } });
    const withEncryption = [{ id: 'u', encryption: 'none' }];

    it('are looked at under `clients` on every line', () => {
        const problems = vlessInboundEncryptionProblems(inbound({ clients: withEncryption }));
        expect(problems.map(problem => [problem.kind, problem.field])).toEqual([['user.encryption', 'settings.clients[0].encryption']]);
    });

    it('are looked at under `users` from 26.7 only, and only when `clients` is not there', () => {
        const settings = { users: withEncryption };
        expect(vlessInboundEncryptionProblems(inbound(settings), '26.3')).toEqual([]);
        expect(vlessInboundEncryptionProblems(inbound(settings))).toEqual([]);
        for (const version of ['26.7', '26.9', '26.9.30', '26.10'] as const) {
            expect(vlessInboundEncryptionProblems(inbound(settings), version).map(problem => problem.field)).toEqual(['settings.users[0].encryption']);
        }
        // `clients` wins, even empty: the users beside it are not read.
        expect(vlessInboundEncryptionProblems(inbound({ clients: [], users: withEncryption }), '26.10')).toEqual([]);
    });

    it('may carry an empty or null encryption', () => {
        expect(vlessInboundEncryptionProblems(inbound({ clients: [{ id: 'u', encryption: '' }, { id: 'v', encryption: null }] }))).toEqual([]);
    });
});

describe('the lines', () => {
    it('all have VLESS Encryption', () => {
        for (const version of CORE_VERSIONS) expect(vlessEncryptionOffered(version.id)).toBe(true);
    });
});

describe('in the full diagnostics', () => {
    const config = (inbound: Record<string, unknown>, outbound?: Record<string, unknown>) => ({
        inbounds: [{ tag: 'in', port: 443, protocol: 'vless', ...inbound }],
        outbounds: [outbound ?? { tag: 'direct', protocol: 'freedom' }],
    });

    it('reports an inbound the core would refuse as critical, in the section and at the item it sits', () => {
        const found = runFullDiagnostics(config({ settings: { clients: [], decryption: 'None' } }) as any, [], '26.7')
            .filter(diagnostic => diagnostic.field === 'settings.decryption');
        expect(found).toHaveLength(1);
        expect(found[0]).toMatchObject({ section: 'inbounds', itemIndex: 0, severity: 'critical' });
    });

    it('reports an outbound without encryption, which the factory\'s own vnext form never lacks', () => {
        const outbound = { tag: 'o', protocol: 'vless', settings: { vnext: [{ address: '10.0.0.1', port: 443, users: [{ id: 'u' }] }] } };
        const found = runFullDiagnostics(config({ settings: { clients: [], decryption: 'none' } }, outbound) as any, [], '26.7')
            .filter(diagnostic => diagnostic.field === 'settings.vnext[0].users[0].encryption');
        expect(found).toHaveLength(1);
        expect(found[0]).toMatchObject({ section: 'outbounds', itemIndex: 0, severity: 'critical' });
    });

    it('is silent about a good pair', () => {
        const server = `mlkem768x25519plus.native.600s.${KEYS.serverX}`;
        const client = `mlkem768x25519plus.native.0rtt.${KEYS.clientX}`;
        const outbound = { tag: 'o', protocol: 'vless', settings: { vnext: [{ address: '10.0.0.1', port: 443, users: [{ id: 'u', encryption: client }] }] } };
        const diagnostics = runFullDiagnostics(config({ settings: { clients: [{ id: 'u' }], decryption: server } }, outbound) as any, [], '26.7');
        expect(diagnostics.filter(diagnostic => /decryption|encryption/.test(diagnostic.field ?? ''))).toEqual([]);
    });

    it('works with no version too: the grammar is the same on every line', () => {
        const found = runFullDiagnostics(config({ settings: { clients: [], decryption: 'x' } }) as any);
        expect(found.some(diagnostic => diagnostic.field === 'settings.decryption' && diagnostic.severity === 'critical')).toBe(true);
    });
});
