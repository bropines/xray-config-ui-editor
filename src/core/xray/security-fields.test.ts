import { describe, expect, it } from 'bun:test';
import {
    checkPinnedCertSha256,
    echSockoptProblem,
    fallbackLimitIsInert,
    fallbackLimitProblems,
    formatByteCount,
    readFallbackLimit,
    withFallbackLimit,
} from './security-fields';
import { ruleDiagnostics } from './versions/rules';
import { CORE_VERSIONS } from './versions';

/**
 * Each expectation here is a line of the core, not a preference of the form:
 * TLSConfig.Build() for the pinned hash
 * (v26.7.28:infra/conf/transport_security.go:364-380), the LimitFallback
 * struct for the limits (:21-25), encoding/json for the types.
 */

const TAG = 'v26.7.28';
// SHA-256 of nothing, and of "abc": two real hashes, so nothing here is a
// string that merely happens to be 64 characters long.
const EMPTY = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const colons = (hex: string) => hex.match(/../g)!.join(':').toUpperCase();
// The same 32 bytes in the form the old help asked for.
const EMPTY_BASE64 = '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=';

const pin = (value: unknown) => checkPinnedCertSha256(value, TAG);

describe('pinnedPeerCertSha256, as Build() reads it', () => {
    it('takes 64 hex digits, in either case', () => {
        expect(pin(EMPTY)).toEqual({ hashes: [EMPTY] });
        expect(pin(EMPTY.toUpperCase())).toEqual({ hashes: [EMPTY] });
    });

    it('takes the colon form openssl prints', () => {
        // "remove colons for OpenSSL format" — strings.ReplaceAll(v, ":", "").
        expect(pin(colons(EMPTY))).toEqual({ hashes: [EMPTY] });
    });

    it('takes several, separated by commas, with spaces around them', () => {
        expect(pin(`${EMPTY}, ${colons(ABC)}`)).toEqual({ hashes: [EMPTY, ABC] });
        expect(pin(`  ${EMPTY} ,\n${ABC}  `)).toEqual({ hashes: [EMPTY, ABC] });
    });

    it('skips empty entries, so a trailing comma is harmless', () => {
        expect(pin(`${EMPTY},`)).toEqual({ hashes: [EMPTY] });
        expect(pin(`,${EMPTY},,${ABC},`)).toEqual({ hashes: [EMPTY, ABC] });
    });

    it('has nothing to say about a key that is not set', () => {
        for (const value of [undefined, null, '']) expect(pin(value)).toEqual({ hashes: [] });
    });

    it('refuses Base64 — what the help text used to ask for', () => {
        const check = pin(EMPTY_BASE64);
        expect(check.hashes).toEqual([]);
        expect(check.problem?.kind).toBe('not-hex');
        expect(check.problem?.severity).toBe('critical');
        expect(check.problem?.message).toContain(TAG);
    });

    it('refuses every prefix and delimiter the core does not strip', () => {
        for (const value of [
            `0x${EMPTY}`,
            `sha256/${EMPTY}`,
            `SHA256:${EMPTY}`,
            // A space inside a hash is not a separator.
            `${EMPTY.slice(0, 32)} ${EMPTY.slice(32)}`,
            EMPTY.replace(/(..)(?=.)/g, '$1-'),
        ]) {
            expect(pin(value).problem?.kind).toBe('not-hex');
        }
    });

    it('refuses hex of the wrong length, odd or even', () => {
        // An odd count fails hex.DecodeString; an even one fails `!= 32`.
        const cases: [string, number][] = [
            [EMPTY.slice(0, 63), 63],
            [EMPTY.slice(0, 62), 62],
            [`${EMPTY}ab`, 66],
            // SHA-1 and MD5 fingerprints are the usual wrong ones.
            [EMPTY.slice(0, 40), 40],
            [EMPTY.slice(0, 32), 32],
            // Colons alone decode to no bytes at all.
            [':', 0],
        ];
        for (const [value, digits] of cases) {
            const problem = pin(value).problem;
            expect(problem?.kind).toBe('wrong-length');
            expect(problem?.severity).toBe('critical');
            expect(problem?.message).toContain(String(digits));
        }
    });

    it('stops at the first bad entry, as the core does, keeping the ones before it', () => {
        const check = pin(`${EMPTY},nope,${ABC}`);
        expect(check.hashes).toEqual([EMPTY]);
        expect(check.problem?.kind).toBe('not-hex');
        expect(check.problem?.entry).toBe('nope');
    });

    it('warns about a value with no hash in it: it loads and pins nothing', () => {
        for (const value of [',', ' ', ' , ,']) {
            const problem = pin(value).problem;
            expect(problem?.kind).toBe('no-hash');
            expect(problem?.severity).toBe('warning');
        }
    });

    it('trims what strings.TrimSpace trims, and nothing more', () => {
        // Built from code points: invisible characters do not belong in source.
        const NEXT_LINE = String.fromCharCode(0x0085);
        const NO_BREAK_SPACE = String.fromCharCode(0x00a0);
        const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);
        // U+0085 is White_Space to Go and not to String.trim().
        expect(pin(`${NEXT_LINE}${EMPTY}${NO_BREAK_SPACE}`)).toEqual({ hashes: [EMPTY] });
        // A byte-order mark is the reverse: trim() would hide it, Go keeps it.
        expect(pin(`${BYTE_ORDER_MARK}${EMPTY}`).problem?.kind).toBe('not-hex');
    });

    it('refuses anything that is not a string: the field decodes as one', () => {
        for (const value of [[EMPTY], 12345, true, { sha256: EMPTY }]) {
            const problem = pin(value).problem;
            expect(problem?.kind).toBe('not-text');
            expect(problem?.severity).toBe('critical');
        }
    });

    it('shortens a long entry in the message rather than printing all of it', () => {
        const message = pin(`${EMPTY}zz`).problem?.message ?? '';
        expect(message).toContain('…');
        expect(message).not.toContain(EMPTY);
    });
});

describe('a REALITY fallback limit', () => {
    it('reads a sub-field under any casing, the later spelling winning', () => {
        // No json tags on the struct: the decoder matches case-insensitively.
        expect(readFallbackLimit({ afterBytes: 1 }, 'afterBytes')).toBe(1);
        expect(readFallbackLimit({ AfterBytes: 2 }, 'afterBytes')).toBe(2);
        expect(readFallbackLimit({ afterBytes: 1, AFTERBYTES: 3 }, 'afterBytes')).toBe(3);
        expect(readFallbackLimit({ afterBytes: null }, 'afterBytes')).toBeUndefined();
        expect(readFallbackLimit({}, 'bytesPerSec')).toBeUndefined();
    });

    it('reads nothing out of a value that is not an object', () => {
        for (const value of ['1000', 1000, ['bytesPerSec'], null, undefined]) {
            expect(readFallbackLimit(value, 'bytesPerSec')).toBeUndefined();
        }
    });

    it('writes a number into an object', () => {
        const next = withFallbackLimit(undefined, 'bytesPerSec', 1048576);
        expect(next).toEqual({ bytesPerSec: 1048576 });
        expect(typeof next?.bytesPerSec).toBe('number');
        expect(withFallbackLimit({ bytesPerSec: 1 }, 'afterBytes', 2)).toEqual({ bytesPerSec: 1, afterBytes: 2 });
    });

    it('removes a cleared sub-field, and the key once nothing is left', () => {
        expect(withFallbackLimit({ bytesPerSec: 1, afterBytes: 2 }, 'afterBytes', undefined)).toEqual({ bytesPerSec: 1 });
        expect(withFallbackLimit({ bytesPerSec: 1 }, 'bytesPerSec', undefined)).toBeUndefined();
        expect(withFallbackLimit(undefined, 'bytesPerSec', undefined)).toBeUndefined();
    });

    it('replaces every spelling of a sub-field with the one it writes', () => {
        expect(withFallbackLimit({ AfterBytes: 1, afterbytes: 2 }, 'afterBytes', 5)).toEqual({ afterBytes: 5 });
    });

    it('keeps keys it does not know: they are the config\'s', () => {
        expect(withFallbackLimit({ note: 'x', bytesPerSec: 1 }, 'bytesPerSec', undefined)).toEqual({ note: 'x' });
    });

    it('replaces the old form\'s string instead of spreading it', () => {
        // { ...'1000', bytesPerSec: 5 } is { 0: '1', 1: '0', … }.
        expect(withFallbackLimit('1000', 'bytesPerSec', 5)).toEqual({ bytesPerSec: 5 });
        expect(withFallbackLimit(['x'], 'bytesPerSec', 5)).toEqual({ bytesPerSec: 5 });
    });

    it('writes what a uint64 takes: whole, and not below zero', () => {
        expect(withFallbackLimit({}, 'bytesPerSec', 1.9)).toEqual({ bytesPerSec: 1 });
        expect(withFallbackLimit({}, 'bytesPerSec', -5)).toEqual({ bytesPerSec: 0 });
        expect(withFallbackLimit({}, 'bytesPerSec', Number.NaN)).toBeUndefined();
    });

    it('finds nothing wrong with numbers, an empty object or no key', () => {
        for (const value of [undefined, null, {}, { bytesPerSec: 0 }, { afterBytes: 1, bytesPerSec: 2, burstBytesPerSec: 3 }]) {
            expect(fallbackLimitProblems(value, 'limitFallbackUpload', TAG)).toEqual([]);
        }
    });

    it('says the whole value is wrong when it is not an object', () => {
        for (const value of ['1000', '', 1000, true, [], [1, 2, 3]]) {
            const problems = fallbackLimitProblems(value, 'limitFallbackUpload', TAG);
            expect(problems).toHaveLength(1);
            expect(problems[0]!.key).toBeUndefined();
            expect(problems[0]!.message).toContain('limitFallbackUpload');
            expect(problems[0]!.message).toContain(TAG);
        }
    });

    it('names each sub-field a uint64 cannot take, and shows what is there', () => {
        const problems = fallbackLimitProblems(
            { bytesPerSec: '1000', afterBytes: -1, burstBytesPerSec: 1.5 },
            'limitFallbackDownload',
            TAG,
        );
        expect(problems.map(problem => problem.key).sort()).toEqual(['afterBytes', 'burstBytesPerSec', 'bytesPerSec']);
        const rate = problems.find(problem => problem.key === 'bytesPerSec')!;
        expect(rate.message).toContain('limitFallbackDownload.bytesPerSec');
        expect(rate.message).toContain('"1000"');
    });

    it('calls a limit with no rate inert, since zero returns the connection unwrapped', () => {
        expect(fallbackLimitIsInert({ afterBytes: 1024 })).toBe(true);
        expect(fallbackLimitIsInert({ bytesPerSec: 0, burstBytesPerSec: 4096 })).toBe(true);
        expect(fallbackLimitIsInert({ bytesPerSec: 100, afterBytes: 1024 })).toBe(false);
        expect(fallbackLimitIsInert({})).toBe(false);
        expect(fallbackLimitIsInert('1000')).toBe(false);
    });

    it('spells a byte count out in binary units from a kibibyte up', () => {
        expect(formatByteCount(512)).toBeUndefined();
        expect(formatByteCount(1024)).toBe('1 KiB');
        expect(formatByteCount(1536)).toBe('1.5 KiB');
        expect(formatByteCount(1048576)).toBe('1 MiB');
        expect(formatByteCount(5 * 1024 ** 3)).toBe('5 GiB');
        expect(formatByteCount('1048576')).toBeUndefined();
        expect(formatByteCount(-1)).toBeUndefined();
    });
});

describe('echSockopt', () => {
    it('is fine as an object, or absent', () => {
        for (const value of [undefined, null, {}, { mark: 255 }]) expect(echSockoptProblem(value, TAG)).toBeUndefined();
    });

    it('is refused as anything else', () => {
        for (const value of ['eth0', '', 1, true, []]) expect(echSockoptProblem(value, TAG)).toContain('echSockopt');
    });
});

describe('diagnostics for the same values', () => {
    const inbound = (streamSettings: any) => ({ inbounds: [{ tag: 'in', protocol: 'vless', streamSettings }] });
    const outbound = (streamSettings: any) => ({ outbounds: [{ tag: 'out', protocol: 'vless', streamSettings }] });
    const found = (config: any, version: (typeof CORE_VERSIONS)[number]['id'] = '26.7') =>
        ruleDiagnostics(config, version).filter(d => /limitFallback|echSockopt|pinnedPeerCertSha256/.test(d.field ?? ''));

    it('is silent about a config that is right', () => {
        expect(found(inbound({
            security: 'reality',
            realitySettings: { limitFallbackUpload: { bytesPerSec: 1000 }, limitFallbackDownload: { afterBytes: 1, bytesPerSec: 2, burstBytesPerSec: 3 } },
        }))).toEqual([]);
        expect(found(outbound({
            security: 'tls',
            tlsSettings: { pinnedPeerCertSha256: `${EMPTY},${colons(ABC)}`, echSockopt: { mark: 255 } },
        }))).toEqual([]);
    });

    it('blocks the string the old form wrote into a fallback limit, on every line', () => {
        for (const { id } of CORE_VERSIONS) {
            const diagnostics = found(inbound({ security: 'reality', realitySettings: { limitFallbackUpload: '1048576' } }), id);
            expect(diagnostics).toHaveLength(1);
            expect(diagnostics[0]).toMatchObject({
                section: 'inbounds',
                itemIndex: 0,
                field: 'streamSettings.realitySettings.limitFallbackUpload',
                severity: 'critical',
            });
        }
    });

    it('blocks it whatever security says: the decode fails before anything is built', () => {
        const diagnostics = found(inbound({ security: 'none', realitySettings: { limitFallbackDownload: 'x' } }));
        expect(diagnostics.map(d => d.severity)).toEqual(['critical']);
    });

    it('points at the sub-field when only that is wrong', () => {
        const diagnostics = found(inbound({ security: 'reality', realitySettings: { limitFallbackUpload: { bytesPerSec: '1000' } } }));
        expect(diagnostics.map(d => d.field)).toEqual(['streamSettings.realitySettings.limitFallbackUpload.bytesPerSec']);
    });

    it('blocks a string in echSockopt', () => {
        const diagnostics = found(outbound({ security: 'tls', tlsSettings: { echSockopt: 'eth0' } }));
        expect(diagnostics).toHaveLength(1);
        expect(diagnostics[0]).toMatchObject({ field: 'streamSettings.tlsSettings.echSockopt', severity: 'critical' });
    });

    it('blocks a Base64 pin where TLS is built, and not where it is not', () => {
        const tlsSettings = { pinnedPeerCertSha256: EMPTY_BASE64 };
        expect(found(outbound({ security: 'tls', tlsSettings })).map(d => d.severity)).toEqual(['critical']);
        // TLSConfig.Build() runs only for security "tls"; the value is a
        // string, so the decode has no complaint either.
        expect(found(outbound({ security: 'none', tlsSettings }))).toEqual([]);
        expect(found(outbound({ security: 'reality', tlsSettings, realitySettings: {} }))).toEqual([]);
    });

    it('blocks a pin that is not a string wherever it sits', () => {
        const diagnostics = found(outbound({ security: 'none', tlsSettings: { pinnedPeerCertSha256: [EMPTY] } }));
        expect(diagnostics.map(d => d.severity)).toEqual(['critical']);
    });

    it('only warns about a pin with no hash in it', () => {
        const diagnostics = found(outbound({ security: 'tls', tlsSettings: { pinnedPeerCertSha256: ' , ' } }));
        expect(diagnostics.map(d => d.severity)).toEqual(['warning']);
    });

    it('leaves a snippet reference alone', () => {
        expect(found({ outbounds: [{ snippet: 'NAME' }] })).toEqual([]);
    });
});
