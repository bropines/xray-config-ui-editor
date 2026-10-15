import { describe, expect, it } from 'bun:test';
import { CORE_VERSIONS } from './versions';
import { runFullDiagnostics } from '../diagnostics';
import {
    DEFAULT_TESTSEED,
    INT32_MAX,
    TESTPRE_WARN_ABOVE,
    UINT32_MAX,
    VISION_EVIDENCE,
    clientList,
    effectiveClientFlow,
    inheritedSeed,
    outboundHolder,
    parseUint32,
    readTestpre,
    readTestseed,
    seedProblems,
    visionCarrier,
    visionInboundProblems,
    visionOutboundProblems,
    withSeedEntry,
    type VisionProblem,
    visionMuxProblem,
} from './vless-vision';

const VISION = 'xtls-rprx-vision';
const kinds = (problems: VisionProblem[]) => problems.map(problem => problem.kind);
const seed = (raw: unknown, scope: 'inbound' | 'client' | 'outbound' = 'outbound') =>
    seedProblems(raw, { field: 'settings.testseed', scope });

describe('the evidence', () => {
    it('has a citation for every fact on every line, each from that line\'s own tag', () => {
        for (const [fact, table] of Object.entries(VISION_EVIDENCE)) {
            for (const version of CORE_VERSIONS) {
                const cites = table[version.id];
                expect(cites.length, `${fact} on ${version.id}`).toBeGreaterThan(0);
                for (const cite of cites) expect(cite.startsWith(`${version.tag}:`), cite).toBe(true);
            }
        }
    });
});

describe('reading testseed', () => {
    it('tells absent, a list and a refused value apart', () => {
        expect(readTestseed(undefined)).toEqual({ state: 'absent' });
        expect(readTestseed(null)).toEqual({ state: 'absent' });
        expect(readTestseed([1, 2, 3, 4])).toEqual({ state: 'list', entries: [1, 2, 3, 4] });
        expect(readTestseed([])).toEqual({ state: 'list', entries: [] });
        expect(readTestseed('900,500,900,256')).toEqual({ state: 'wrong', held: '900,500,900,256' });
        expect(readTestseed({ 0: 1 })).toMatchObject({ state: 'wrong' });
    });

    it('refuses what a uint32 cannot hold, and says which entry', () => {
        for (const entry of ['900', -1, 1.5, UINT32_MAX + 1, true, {}, [1]]) {
            expect(readTestseed([900, entry, 900, 256])).toMatchObject({ state: 'wrong', at: { index: 1 } });
        }
        expect(readTestseed([0, UINT32_MAX])).toEqual({ state: 'list', entries: [0, UINT32_MAX] });
    });

    it('reads a null entry as the zero value Go leaves there', () => {
        expect(readTestseed([900, null, 900, 256])).toEqual({ state: 'list', entries: [900, 0, 900, 256] });
    });
});

describe('reading testpre', () => {
    it('takes a whole number from 0 to uint32 and refuses the rest', () => {
        expect(readTestpre(undefined)).toEqual({ state: 'absent' });
        expect(readTestpre(0)).toEqual({ state: 'number', value: 0 });
        expect(readTestpre(8)).toEqual({ state: 'number', value: 8 });
        for (const held of ['8', -1, 2.5, UINT32_MAX + 1, true, [], {}]) {
            expect(readTestpre(held)).toMatchObject({ state: 'wrong' });
        }
    });
});

describe('typing a number', () => {
    it('writes only what the core can decode', () => {
        expect(parseUint32('')).toBeUndefined();
        expect(parseUint32('  ')).toBeUndefined();
        expect(parseUint32('abc')).toBeUndefined();
        expect(parseUint32('500')).toBe(500);
        expect(parseUint32('2.9')).toBe(2);
        expect(parseUint32('-3')).toBe(0);
        expect(parseUint32('99999999999')).toBe(UINT32_MAX);
        expect(parseUint32(7)).toBe(7);
    });

    it('fills the numbers around the one changed, so the boxes show what is written', () => {
        expect(withSeedEntry([], 1, 700)).toEqual([900, 700, 900, 256]);
        expect(withSeedEntry([1, 2], 3, 4)).toEqual([1, 2, 900, 4]);
        // The inbound's list is what a client's boxes show, so that is what fills in.
        expect(withSeedEntry([], 0, 5, [10, 20, 30, 40])).toEqual([5, 20, 30, 40]);
        // Entries past the fourth are somebody's, and stay.
        expect(withSeedEntry([1, 2, 3, 4, 5, 6], 2, 9)).toEqual([1, 2, 9, 4, 5, 6]);
    });

    it('takes a client\'s fallback from the inbound only when it has all four', () => {
        expect(inheritedSeed({ settings: { testseed: [1, 2, 3, 4] } })).toEqual([1, 2, 3, 4]);
        expect(inheritedSeed({ settings: { testseed: [1, 2, 3, 4, 5] } })).toEqual([1, 2, 3, 4]);
        expect(inheritedSeed({ settings: { testseed: [1, 2, 3] } })).toBeUndefined();
        expect(inheritedSeed({ settings: { testseed: 'x' } })).toBeUndefined();
        expect(inheritedSeed({ settings: {} })).toBeUndefined();
    });
});

describe('the four padding numbers', () => {
    it('are fine at Xray\'s own values and at anything sensible', () => {
        expect(seed([...DEFAULT_TESTSEED])).toEqual([]);
        expect(seed([1000, 600, 1000, 300])).toEqual([]);
        expect(seed([])).toEqual([]);
        expect(seed(undefined)).toEqual([]);
    });

    it('call a list the decoder refuses critical: it fails the whole document', () => {
        const wrong = seed('900,500,900,256');
        expect(kinds(wrong)).toEqual(['testseed.type']);
        expect(wrong[0]!.severity).toBe('critical');
        expect(wrong[0]!.message).toContain('settings.testseed');
        const entry = seed([900, 'x', 900, 256]);
        expect(kinds(entry)).toEqual(['testseed.type']);
        expect(entry[0]!.message).toContain('settings.testseed[1]');
        expect(seed([900, -5, 900, 256])[0]!.severity).toBe('critical');
        expect(seed([900, 1.5, 900, 256])[0]!.severity).toBe('critical');
        expect(seed([900, UINT32_MAX + 1, 900, 256])[0]!.severity).toBe('critical');
    });

    it('call a 0 where the core draws a random number below it critical: that is a panic', () => {
        const spread = seed([900, 0, 900, 256]);
        expect(kinds(spread)).toEqual(['testseed.zero']);
        expect(spread[0]).toMatchObject({ severity: 'critical', entry: 1 });
        const short = seed([900, 500, 900, 0]);
        expect(short[0]).toMatchObject({ kind: 'testseed.zero', severity: 'critical', entry: 3 });
        expect(kinds(seed([900, 0, 900, 0]))).toEqual(['testseed.zero', 'testseed.zero']);
        // A null entry is the zero Go leaves there.
        expect(kinds(seed([900, null, 900, 256]))).toEqual(['testseed.zero']);
    });

    it('do not call a 0 in [1] a panic when no write is ever short enough to reach it', () => {
        expect(seed([0, 0, 900, 256])).toEqual([]);
        expect(kinds(seed([0, 500, 900, 0]))).toEqual(['testseed.zero']);
        // [0] wrapped negative by int32: the same, plus the warning for the wrap itself.
        expect(kinds(seed([INT32_MAX + 1, 0, 900, 256]))).toEqual(['testseed.overflow']);
    });

    it('treat fewer than four as ignored, and say what is used instead', () => {
        for (const list of [[900], [900, 500], [900, 500, 900]]) {
            const found = seed(list);
            expect(kinds(found)).toEqual(['testseed.short']);
            expect(found[0]!.severity).toBe('warning');
            expect(found[0]!.message).toContain('900, 500, 900, 256');
        }
        // A short list is ignored whole, so a 0 in it is not a panic.
        expect(kinds(seed([900, 0]))).toEqual(['testseed.short']);
        const client = seed([1, 2], 'client');
        expect(client[0]!.message).toContain("inbound's");
    });

    it('treat more than four as read up to the fourth', () => {
        const found = seed([900, 500, 900, 256, 7]);
        expect(kinds(found)).toEqual(['testseed.extra']);
        expect(found[0]!.severity).toBe('warning');
    });

    it('flag a number the signed 32-bit arithmetic wraps', () => {
        // [0]: the comparison goes negative, so the long padding is never used. No panic.
        const first = seed([INT32_MAX + 1, 500, 900, 256]);
        expect(first[0]).toMatchObject({ kind: 'testseed.overflow', severity: 'warning', entry: 0 });
        // [1] and [3]: a draw below 2^31 is safe, so 2^31 itself is fine and one more is not.
        expect(seed([900, INT32_MAX + 1, 900, 256])).toEqual([]);
        expect(seed([900, 500, 900, INT32_MAX + 1])).toEqual([]);
        expect(seed([900, INT32_MAX + 2, 900, 256])[0]).toMatchObject({ kind: 'testseed.overflow', severity: 'critical', entry: 1 });
        expect(seed([900, 500, 900, UINT32_MAX])[0]).toMatchObject({ kind: 'testseed.overflow', severity: 'critical', entry: 3 });
        // [2]: int32(testseed[2]) is negative from 2^31 on.
        expect(seed([900, 500, INT32_MAX, 256])).toEqual([]);
        expect(seed([900, 500, INT32_MAX + 1, 256])[0]).toMatchObject({ kind: 'testseed.overflow', severity: 'critical', entry: 2 });
    });

    it('warn when the long padding length is below the writes that get it', () => {
        const found = seed([900, 500, 800, 256]);
        expect(found[0]).toMatchObject({ kind: 'testseed.negative', severity: 'warning', entry: 2 });
        expect(found[0]!.message).toContain('899');
        // The longest write that takes the long padding is [0] - 1.
        expect(seed([900, 500, 899, 256])).toEqual([]);
        expect(kinds(seed([900, 500, 898, 256]))).toEqual(['testseed.negative']);
        // A write cannot be longer than a buffer holds, whatever [0] says.
        expect(seed([100000, 500, 8171, 256])).toEqual([]);
        expect(kinds(seed([100000, 500, 8000, 256]))).toEqual(['testseed.negative']);
    });
});

const reality = { network: 'tcp', security: 'reality' };
const vlessInbound = (settings: Record<string, unknown>, streamSettings: unknown = reality) => ({
    protocol: 'vless', port: 443, settings: { decryption: 'none', ...settings }, streamSettings,
});

describe('a VLESS inbound', () => {
    it('is left alone when it is not VLESS or holds nothing to check', () => {
        expect(visionInboundProblems({ protocol: 'vmess', settings: { testseed: 'x' } })).toEqual([]);
        expect(visionInboundProblems(vlessInbound({ clients: [] }))).toEqual([]);
        expect(visionInboundProblems(vlessInbound({ flow: VISION, clients: [{ id: 'a' }] }))).toEqual([]);
        expect(visionInboundProblems(null)).toEqual([]);
        expect(visionInboundProblems({ protocol: 'vless' })).toEqual([]);
        expect(visionInboundProblems({ protocol: 'VLESS', settings: { testseed: [900, 0, 900, 256] } })).toHaveLength(1);
    });

    it('reports the inbound-wide numbers at settings.testseed', () => {
        const found = visionInboundProblems(vlessInbound({ testseed: [900, 0, 900, 256], flow: VISION, clients: [{ id: 'a' }] }));
        expect(found).toHaveLength(1);
        expect(found[0]).toMatchObject({ kind: 'testseed.zero', field: 'settings.testseed', severity: 'critical' });
    });

    it('reports a client\'s numbers at its own place, with its index', () => {
        const found = visionInboundProblems(vlessInbound({
            flow: VISION,
            clients: [{ id: 'a' }, { id: 'b', testseed: [900, 500, 900, 0] }],
        }));
        expect(found).toHaveLength(1);
        expect(found[0]).toMatchObject({ kind: 'testseed.zero', field: 'settings.clients[1].testseed', client: 1 });
    });

    it('lets a client with no flow of its own take the inbound\'s', () => {
        const inbound = vlessInbound({ flow: VISION, clients: [{ id: 'a', testseed: [900, 500, 900, 256] }] });
        expect(effectiveClientFlow(inbound, { id: 'a' })).toBe(VISION);
        expect(effectiveClientFlow(inbound, { id: 'a', flow: '' })).toBe(VISION);
        expect(effectiveClientFlow(inbound, { id: 'a', flow: null })).toBe(VISION);
        expect(visionInboundProblems(inbound)).toEqual([]);
        // The other way round: a flow of its own stands, even over a Vision default.
        expect(effectiveClientFlow(inbound, { id: 'a', flow: 'other' })).toBe('other');
    });

    it('warns that numbers do nothing for a client that does not run Vision', () => {
        const found = visionInboundProblems(vlessInbound({ clients: [{ id: 'a', testseed: [900, 500, 900, 256] }] }));
        expect(found).toHaveLength(1);
        expect(found[0]).toMatchObject({ kind: 'testseed.inert', severity: 'warning', field: 'settings.clients[0].testseed', client: 0 });
        expect(found[0]!.message).toContain('no flow');
        // Not for a list the core ignores anyway; that already has its own warning.
        expect(kinds(visionInboundProblems(vlessInbound({ clients: [{ id: 'a', testseed: [1, 2] }] })))).toEqual(['testseed.short']);
    });

    it('warns about the inbound-wide numbers only when it lists clients and none runs Vision', () => {
        const numbers = [900, 500, 900, 256];
        expect(kinds(visionInboundProblems(vlessInbound({ testseed: numbers, clients: [{ id: 'a' }] })))).toEqual(['testseed.inert']);
        expect(visionInboundProblems(vlessInbound({ testseed: numbers, clients: [] }))).toEqual([]);
        expect(visionInboundProblems(vlessInbound({ testseed: numbers }))).toEqual([]);
        expect(visionInboundProblems(vlessInbound({ testseed: numbers, flow: VISION, clients: [{ id: 'a' }] }))).toEqual([]);
        expect(visionInboundProblems(vlessInbound({ testseed: numbers, clients: [{ id: 'a', flow: VISION }] }))).toEqual([]);
    });

    it('reports a flow that is not text, which fails the decode', () => {
        const found = visionInboundProblems(vlessInbound({ flow: true, clients: [{ id: 'a', flow: 5 }] }));
        expect(found.map(problem => [problem.kind, problem.field, problem.severity])).toEqual([
            ['flow.type', 'settings.flow', 'critical'],
            ['flow.type', 'settings.clients[0].flow', 'critical'],
        ]);
    });

    describe('reads the client list the way the line does', () => {
        const users = vlessInbound({ users: [{ id: 'a', testseed: [900, 500, 900, 0] }] });

        it('takes `users` from 26.7 on and not on 26.3, which has no such key', () => {
            expect(visionInboundProblems(users, '26.7')[0]).toMatchObject({ kind: 'testseed.zero', field: 'settings.users[0].testseed' });
            expect(visionInboundProblems(users, '26.10')).toHaveLength(2);
            expect(visionInboundProblems(users, '26.3')).toEqual([]);
            expect(clientList(users, '26.3')).toBeUndefined();
            expect(clientList(users, '26.9.30')?.key).toBe('users');
        });

        it('lets `clients` win whenever it is a list, empty or not', () => {
            const both = vlessInbound({ clients: [], users: [{ id: 'a', testseed: [900, 500, 900, 0] }] });
            expect(visionInboundProblems(both, '26.7')).toEqual([]);
            expect(clientList(both)?.key).toBe('clients');
        });
    });

    describe('and the stream it runs on', () => {
        const visionClient = (inbound: ReturnType<typeof vlessInbound>) => visionInboundProblems(inbound).filter(problem => problem.kind === 'flow.transport');
        const withVision = (streamSettings: unknown, decryption: unknown = 'none') =>
            vlessInbound({ decryption, flow: VISION, clients: [{ id: 'a' }] }, streamSettings);

        it('is fine on raw or tcp with REALITY or TLS', () => {
            for (const network of [undefined, 'tcp', 'raw', 'TCP']) {
                for (const security of ['reality', 'tls', 'REALITY']) {
                    expect(visionClient(withVision({ network, security }))).toEqual([]);
                }
            }
        });

        it('is refused at run time on another transport, and the warning names it', () => {
            for (const network of ['ws', 'grpc', 'xhttp', 'httpupgrade', 'kcp', 'WebSocket']) {
                const found = visionClient(withVision({ network, security: 'tls' }));
                expect(found).toHaveLength(1);
                expect(found[0]).toMatchObject({ severity: 'warning', field: 'streamSettings.network', client: 0 });
                expect(found[0]!.message).toContain(network);
                expect(found[0]!.message).toContain('settings.flow');
            }
        });

        it('is refused with no security at all, and that is the default', () => {
            for (const stream of [{ network: 'tcp', security: 'none' }, { network: 'tcp' }, {}, null, { security: '' }]) {
                const found = visionClient(withVision(stream));
                expect(found).toHaveLength(1);
                expect(found[0]).toMatchObject({ field: 'streamSettings.security', severity: 'warning' });
            }
        });

        it('is allowed over VLESS Encryption on any transport', () => {
            const encrypted = 'mlkem768x25519plus.native.600s.abc';
            expect(visionClient(withVision({ network: 'ws', security: 'none' }, encrypted))).toEqual([]);
            expect(visionClient(withVision(null, encrypted))).toEqual([]);
            // `none` is the absence of it, and so is an empty or missing value.
            expect(visionClient(withVision({ network: 'ws' }, 'none'))).toHaveLength(1);
            expect(visionClient(withVision({ network: 'ws' }, ''))).toHaveLength(1);
        });

        it('says nothing it cannot be sure of', () => {
            // Reported elsewhere, or not a name this app knows.
            for (const stream of [{ network: 'h2' }, { network: 'madeup' }, { security: 'xtls' }, { network: 5 }, { method: 'ws' }, { security: 'whatever' }]) {
                expect(visionClient(withVision(stream))).toEqual([]);
            }
        });

        it('says nothing for a client that does not run Vision, or one running the outbound-only spelling', () => {
            expect(visionClient(vlessInbound({ clients: [{ id: 'a' }] }, { network: 'ws' }))).toEqual([]);
            expect(visionClient(vlessInbound({ clients: [{ id: 'a', flow: 'xtls-rprx-vision-udp443' }] }, { network: 'ws' }))).toEqual([]);
            expect(visionClient(vlessInbound({ flow: VISION, clients: [] }, { network: 'ws' }))).toEqual([]);
        });

        it('points at the client that has the flow', () => {
            const found = visionInboundProblems(vlessInbound(
                { clients: [{ id: 'a' }, { id: 'b', flow: VISION }] },
                { network: 'ws', security: 'tls' },
            )).filter(problem => problem.kind === 'flow.transport');
            expect(found[0]).toMatchObject({ client: 1 });
            expect(found[0]!.message).toContain('settings.clients[1].flow');
        });
    });
});

const vnext = (user: Record<string, unknown>, streamSettings: unknown = { security: 'reality' }) => ({
    protocol: 'vless', tag: 'out',
    settings: { vnext: [{ address: 'h.example', port: 443, users: [{ id: 'u', encryption: 'none', ...user }] }] },
    streamSettings,
});
const flat = (settings: Record<string, unknown>, streamSettings: unknown = { security: 'reality' }) => ({
    protocol: 'vless', tag: 'out',
    settings: { address: 'h.example', port: 443, id: 'u', encryption: 'none', ...settings },
    streamSettings,
});

describe('a VLESS outbound', () => {
    it('keeps its account where the core reads it: the flat settings once there is an address', () => {
        expect(outboundHolder(flat({})).shape).toBe('flat');
        expect(outboundHolder(flat({})).path).toEqual(['settings']);
        expect(outboundHolder(vnext({})).shape).toBe('vnext');
        expect(outboundHolder(vnext({})).path).toEqual(['settings', 'vnext', 0, 'users', 0]);
        // `address: null` decodes to a nil pointer: not there.
        expect(outboundHolder({ protocol: 'vless', settings: { address: null, vnext: [{ users: [{ id: 'u' }] }] } }).shape).toBe('vnext');
        // A flat config wins over the list it also holds.
        const both = { protocol: 'vless', settings: { address: 'h', vnext: [{ users: [{ id: 'x', testseed: [1, 2, 3, 4] }] }] } };
        expect(outboundHolder(both).shape).toBe('flat');
        expect(outboundHolder({ protocol: 'vless' }).holder).toBeUndefined();
    });

    it('is left alone when it is not VLESS or has no account yet', () => {
        expect(visionOutboundProblems({ protocol: 'vmess', settings: { address: 'h', testpre: 'x' } })).toEqual([]);
        expect(visionOutboundProblems({ protocol: 'vless', settings: {} })).toEqual([]);
        expect(visionOutboundProblems({ protocol: 'vless', settings: { vnext: [{ users: [] }] } })).toEqual([]);
        expect(visionOutboundProblems({ snippet: 'NAME' })).toEqual([]);
        expect(visionOutboundProblems(vnext({ flow: VISION, testseed: [900, 500, 900, 256], testpre: 4 }))).toEqual([]);
    });

    it('reports the numbers at the place its shape keeps them', () => {
        const inVnext = visionOutboundProblems(vnext({ flow: VISION, testseed: [900, 0, 900, 256] }));
        expect(inVnext[0]).toMatchObject({ kind: 'testseed.zero', field: 'settings.vnext[0].users[0].testseed' });
        const inFlat = visionOutboundProblems(flat({ flow: VISION, testseed: [900, 500, 900, 0] }));
        expect(inFlat[0]).toMatchObject({ kind: 'testseed.zero', field: 'settings.testseed' });
        // The flat key of a vnext config, and the other way round, is not read.
        expect(visionOutboundProblems({ ...vnext({}), settings: { ...vnext({}).settings, testseed: [900, 0, 900, 256] } })).toEqual([]);
    });

    it('warns that numbers do nothing without a Vision flow, udp443 included as Vision', () => {
        expect(kinds(visionOutboundProblems(vnext({ testseed: [900, 500, 900, 256] })))).toEqual(['testseed.inert']);
        expect(kinds(visionOutboundProblems(vnext({ flow: '', testseed: [900, 500, 900, 256] })))).toEqual(['testseed.inert']);
        expect(visionOutboundProblems(vnext({ flow: 'xtls-rprx-vision-udp443', testseed: [900, 500, 900, 256] }))).toEqual([]);
        expect(kinds(visionOutboundProblems(vnext({ testseed: [900, 500] })))).toEqual(['testseed.short']);
    });

    it('calls a testpre the decoder refuses critical', () => {
        for (const held of ['8', -1, 2.5, UINT32_MAX + 1, true]) {
            const found = visionOutboundProblems(vnext({ testpre: held }));
            expect(found).toHaveLength(1);
            expect(found[0]).toMatchObject({ kind: 'testpre.type', severity: 'critical', field: 'settings.vnext[0].users[0].testpre' });
        }
        expect(visionOutboundProblems(flat({ testpre: 'many' }))[0]).toMatchObject({ field: 'settings.testpre' });
    });

    it('does not mind testpre of 0, or a few, or one without Vision at all', () => {
        expect(visionOutboundProblems(vnext({ testpre: 0 }))).toEqual([]);
        expect(visionOutboundProblems(vnext({ testpre: 4 }))).toEqual([]);
        expect(visionOutboundProblems(vnext({ testpre: TESTPRE_WARN_ABOVE }))).toEqual([]);
    });

    it('warns about a testpre that opens a crowd of connections', () => {
        const found = visionOutboundProblems(vnext({ testpre: TESTPRE_WARN_ABOVE + 1 }));
        expect(found).toHaveLength(1);
        expect(found[0]).toMatchObject({ kind: 'testpre.large', severity: 'warning' });
        expect(found[0]!.message).toContain(String(TESTPRE_WARN_ABOVE + 1));
    });

    it('warns that testpre is ignored next to a reverse, in the flat form that can have one', () => {
        const found = visionOutboundProblems(flat({ testpre: 4, reverse: { tag: 'r' } }));
        expect(found).toHaveLength(1);
        expect(found[0]).toMatchObject({ kind: 'testpre.reverse', severity: 'warning', field: 'settings.testpre' });
        // Say it once: not also that it is a lot.
        expect(kinds(visionOutboundProblems(flat({ testpre: 500, reverse: { tag: 'r' } })))).toEqual(['testpre.reverse']);
        expect(visionOutboundProblems(flat({ testpre: 0, reverse: { tag: 'r' } }))).toEqual([]);
        expect(visionOutboundProblems(flat({ testpre: 4, reverse: null }))).toEqual([]);
    });

    it('reports a flow that is not text', () => {
        expect(visionOutboundProblems(vnext({ flow: false }))[0]).toMatchObject({ kind: 'flow.type', field: 'settings.vnext[0].users[0].flow', severity: 'critical' });
        expect(visionOutboundProblems(flat({ flow: 3 }))[0]).toMatchObject({ kind: 'flow.type', field: 'settings.flow' });
    });

    describe('and the stream it dials with', () => {
        const transport = (outbound: unknown) => visionOutboundProblems(outbound).filter(problem => problem.kind === 'flow.transport');

        it('is fine over REALITY or TLS on raw, and over VLESS Encryption anywhere', () => {
            expect(transport(vnext({ flow: VISION }, { network: 'raw', security: 'tls' }))).toEqual([]);
            expect(transport(vnext({ flow: VISION }, null))).toHaveLength(1);
            expect(transport(vnext({ flow: VISION, encryption: 'mlkem768x25519plus.native.0rtt.abc' }, { network: 'ws' }))).toEqual([]);
            expect(transport(flat({ flow: VISION, encryption: 'mlkem768x25519plus.native.0rtt.abc' }, { network: 'ws' }))).toEqual([]);
        });

        it('is refused on another transport or without security', () => {
            const network = transport(vnext({ flow: VISION }, { network: 'xhttp', security: 'reality' }));
            expect(network[0]).toMatchObject({ field: 'streamSettings.network', severity: 'warning' });
            expect(network[0]!.message).toContain('settings.vnext[0].users[0].flow');
            expect(transport(flat({ flow: 'xtls-rprx-vision-udp443' }, { network: 'tcp' }))[0]).toMatchObject({ field: 'streamSettings.security' });
        });

        it('says nothing without a Vision flow', () => {
            expect(transport(vnext({ flow: '' }, { network: 'ws' }))).toEqual([]);
            expect(transport(vnext({}, { network: 'ws' }))).toEqual([]);
        });
    });
});

describe('visionCarrier', () => {
    it('answers ok for VLESS Encryption whatever the stream', () => {
        expect(visionCarrier({ network: 'ws' }, true)).toEqual({ ok: true });
    });
});

describe('the full diagnostics', () => {
    it('carry the Vision problems of inbounds and outbounds, at the item they belong to', () => {
        const config = {
            inbounds: [
                { tag: 'in-a', protocol: 'vmess', settings: { clients: [] } },
                vlessInbound({ flow: VISION, testseed: [900, 0, 900, 256], clients: [{ id: 'a' }] }),
            ],
            outbounds: [
                { tag: 'direct', protocol: 'freedom' },
                { snippet: 'NODES' },
                flat({ flow: VISION, testpre: 'x' }),
            ],
        };
        const found = runFullDiagnostics(config as any);
        const zero = found.find(d => d.field === 'settings.testseed');
        expect(zero).toMatchObject({ section: 'inbounds', itemIndex: 1, severity: 'critical' });
        expect(zero!.message).toContain('panics');
        const pre = found.find(d => d.field === 'settings.testpre');
        expect(pre).toMatchObject({ section: 'outbounds', itemIndex: 2, severity: 'critical' });
    });

    it('read the client list by the line asked about', () => {
        const config = { inbounds: [vlessInbound({ users: [{ id: 'a', testseed: [900, 500, 900, 0] }] })], outbounds: [] };
        expect(runFullDiagnostics(config as any, [], '26.3').some(d => d.field?.includes('testseed'))).toBe(false);
        expect(runFullDiagnostics(config as any, [], '26.7').some(d => d.field === 'settings.users[0].testseed')).toBe(true);
    });

    it('have nothing to say about a panel-style profile: no clients, REALITY on raw', () => {
        const config = { inbounds: [vlessInbound({ clients: [] })], outbounds: [] };
        expect(runFullDiagnostics(config as any).filter(d => /testseed|testpre|flow|streamSettings/.test(d.field ?? ''))).toEqual([]);
    });
});

describe('Vision with Mux', () => {
    // Mux carries TCP unless concurrency < 0 (v26.10.10:app/proxyman/outbound/handler.go:122-136);
    // a Vision server allows only UDP inside Mux (v26.10.10:proxy/vless/inbound/inbound.go:609).
    const vnext = (flow: string, mux?: object) => ({
        tag: 'v', protocol: 'vless', mux,
        settings: { vnext: [{ address: 'a.example', port: 443, users: [{ id: 'x', flow }] }] },
    });
    const flat = (flow: string, mux?: object) => ({
        tag: 'v', protocol: 'vless', mux, settings: { address: 'a.example', port: 443, id: 'x', flow },
    });

    it('flags Mux that carries TCP, in either shape and with either Vision flow', () => {
        expect(visionMuxProblem(vnext('xtls-rprx-vision', { enabled: true }))?.kind).toBe('mux.tcp');
        expect(visionMuxProblem(flat('xtls-rprx-vision', { enabled: true, concurrency: 8 }))?.kind).toBe('mux.tcp');
        expect(visionMuxProblem(vnext('xtls-rprx-vision-udp443', { enabled: true, concurrency: 0 }))?.kind).toBe('mux.tcp');
    });

    it('leaves the supported combination alone: TCP outside Mux, UDP through XUDP', () => {
        expect(visionMuxProblem(vnext('xtls-rprx-vision', { enabled: true, concurrency: -1, xudpConcurrency: 16 }))).toBeNull();
        expect(visionMuxProblem(flat('xtls-rprx-vision', { enabled: true, concurrency: -1 }))).toBeNull();
    });

    it('says nothing without Vision or without Mux', () => {
        expect(visionMuxProblem(vnext('', { enabled: true }))).toBeNull();
        expect(visionMuxProblem(vnext('xtls-rprx-vision', { enabled: false }))).toBeNull();
        expect(visionMuxProblem(vnext('xtls-rprx-vision'))).toBeNull();
        expect(visionMuxProblem({ tag: 'f', protocol: 'freedom', mux: { enabled: true } })).toBeNull();
    });
});
