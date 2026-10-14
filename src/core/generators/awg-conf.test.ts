import { describe, expect, it } from 'bun:test';
import { toAwgConf } from './awg-conf';
import { parseWireguardConfig } from '../../utils/link-parser';

/**
 * The export only means something if the importer reads it back, so the
 * round-trip runs against the real `parseWireguardConfig` rather than a
 * fixture — the two are each other's inverse and are what keep the field
 * mapping from drifting.
 *
 * The rest of the tests are about the half that cannot round-trip: AWG has
 * five fixed-packet slots and one junk triple, so anything beyond that has to
 * come back as a note instead of quietly changing what goes on the wire.
 *
 * Those reshaping notes (packets past the fifth, order, delays, reset,
 * randRange, junk steps collapsing) are worded by `src/core/noise/awg.ts`,
 * which both directions share; the notes about items that cannot be read at
 * all belong to the exporter. The assertions name the wording of whichever
 * module owns the condition, so a reword there shows up here as a failure
 * rather than as two notes for one problem.
 */

const SECRET = 'QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUE=';
const PEER_KEY = 'QkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQg=';
const PSK = 'Q0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQw=';

const peer = () => ({
    publicKey: PEER_KEY,
    endpoint: '1.2.3.4:51820',
    allowedIPs: ['0.0.0.0/0', '::/0'],
    keepAlive: 25,
});

/** A wireguard outbound, optionally with a finalmask noise layer. */
const outbound = (noise?: unknown[], settings: Record<string, unknown> = {}) => ({
    tag: 'wg-out',
    protocol: 'wireguard',
    settings: {
        secretKey: SECRET,
        address: ['10.2.0.2/32', 'fd00::2/128'],
        mtu: 1280,
        peers: [peer()],
        ...settings,
    },
    streamSettings: {
        network: 'raw',
        security: 'none',
        ...(noise ? { finalmask: { udp: [{ type: 'noise', settings: { noise } }] } } : {}),
    },
});

/** "hi" — the same two bytes, written four ways. */
const HI = '6869';

const junk = (count: number, rand: string | number = '40-70') => Array.from({ length: count }, () => ({ rand }));

const messages = (notes: { message: string }[]) => notes.map(note => note.message).join('\n');

describe('toAwgConf round-trip', () => {
    it('comes back through parseWireguardConfig with its fields intact', () => {
        const { conf, notes } = toAwgConf(outbound([{ type: 'hex', packet: HI }, { type: 'hex', packet: 'deadbeef' }, ...junk(4)]));
        expect(notes).toEqual([]);

        const back = parseWireguardConfig(conf);
        expect(back).not.toBeNull();
        expect(back.settings.secretKey).toBe(SECRET);
        expect(back.settings.address).toEqual(['10.2.0.2/32', 'fd00::2/128']);
        expect(back.settings.mtu).toBe(1280);
        expect(back.settings.peers).toHaveLength(1);
        expect(back.settings.peers[0].publicKey).toBe(PEER_KEY);
        expect(back.settings.peers[0].endpoint).toBe('1.2.3.4:51820');
        expect(back.settings.peers[0].allowedIPs).toEqual(['0.0.0.0/0', '::/0']);
        expect(back.settings.peers[0].keepAlive).toBe(25);
    });

    it('brings the noise layer back as the same packets and junk count', () => {
        const { conf } = toAwgConf(outbound([{ type: 'hex', packet: HI }, { type: 'hex', packet: 'deadbeef' }, ...junk(4)]));
        const back = parseWireguardConfig(conf);
        const reimported = back.streamSettings.finalmask.udp[0].settings.noise;

        expect(reimported.filter((item: any) => item.packet).map((item: any) => item.packet)).toEqual([HI, 'deadbeef']);
        expect(reimported.filter((item: any) => item.rand)).toHaveLength(4);
        expect(reimported.filter((item: any) => item.rand).every((item: any) => item.rand === '40-70')).toBe(true);
    });

    it('writes the optional lines only when the outbound has them', () => {
        const { conf } = toAwgConf(outbound(undefined, { peers: [{ ...peer(), preSharedKey: PSK, keepAlive: 0 }] }), { dns: ['1.1.1.1', '1.0.0.1'] });
        expect(conf).toContain(`PresharedKey = ${PSK}`);
        expect(conf).toContain('DNS = 1.1.1.1, 1.0.0.1');
        // keepAlive 0 means "off" in Xray, and AWG reads a missing line the same way.
        expect(conf).not.toContain('PersistentKeepalive');
        // No noise layer, so no obfuscation lines at all.
        expect(conf).not.toContain('Jc =');
        expect(conf).not.toContain('I1 =');
    });

    it('never writes S or H keys, which would change WireGuard itself', () => {
        const { conf } = toAwgConf(outbound([...junk(2)], { reserved: [8, 9, 10] }));
        for (const key of ['S1', 'S2', 'S3', 'S4', 'H1', 'H2', 'H3', 'H4']) {
            expect(conf).not.toContain(`${key} =`);
        }
    });
});

describe('toAwgConf obfuscation', () => {
    it('turns fixed packets into I lines and all junk into one Jc triple', () => {
        const { conf, notes } = toAwgConf(outbound([
            { type: 'hex', packet: HI },
            { type: 'hex', packet: 'deadbeef' },
            ...junk(4),
        ]));
        expect(notes).toEqual([]);
        expect(conf).toContain(`I1 = <b 0x${HI}>`);
        expect(conf).toContain('I2 = <b 0xdeadbeef>');
        expect(conf).not.toContain('I3 =');
        expect(conf).toContain('Jc = 4');
        expect(conf).toContain('Jmin = 40');
        expect(conf).toContain('Jmax = 70');
    });

    it('reads every packet encoding the core reads', () => {
        const encodings: unknown[] = [
            { type: 'hex', packet: HI },
            { type: 'str', packet: 'hi' },
            { type: 'base64', packet: 'aGk=' },
            { type: 'array', packet: [104, 105] },
            // "" is the same as "array" (v26.7.28:infra/conf/transport_finalmask.go:63).
            { type: '', packet: [104, 105] },
            { packet: [104, 105] },
        ];
        for (const item of encodings) {
            const { conf, notes } = toAwgConf(outbound([item]));
            expect(conf).toContain(`I1 = <b 0x${HI}>`);
            expect(notes).toEqual([]);
        }
    });

    it('notes the packets past the fifth, which AWG cannot carry', () => {
        const packets = ['00', '11', '22', '33', '44', '55', '66'].map(byte => ({ type: 'hex', packet: byte }));
        const { conf, notes } = toAwgConf(outbound(packets));
        expect(conf).toContain('I5 = <b 0x44>');
        expect(conf).not.toContain('I6');
        expect(messages(notes)).toMatch(/I1-I5\); the last 2 were left out/);
    });

    it('notes a delay, which AWG has no way to wait for', () => {
        const { notes } = toAwgConf(outbound([{ type: 'hex', packet: HI, delay: '5-10' }, ...junk(2)]));
        expect(notes.some(note => note.severity === 'info' && /Delays were dropped/.test(note.message))).toBe(true);
    });

    it('notes an order AWG cannot reproduce', () => {
        const interleaved = toAwgConf(outbound([...junk(2), { type: 'hex', packet: HI }]));
        expect(messages(interleaved.notes)).toMatch(/moves ahead of it/);
        // Packets first is AWG's own order, so it needs no note.
        const inOrder = toAwgConf(outbound([{ type: 'hex', packet: HI }, ...junk(2)]));
        expect(inOrder.notes).toEqual([]);
    });

    it('takes the widest range when the junk items disagree, and says so', () => {
        const { conf, notes } = toAwgConf(outbound([{ rand: '40-70' }, { rand: '100-200' }]));
        expect(conf).toContain('Jc = 2');
        expect(conf).toContain('Jmin = 40');
        expect(conf).toContain('Jmax = 200');
        expect(messages(notes)).toMatch(/2 junk steps became 2 packets of 40-200 bytes/);
    });

    it('reads a fixed junk size as Jmin = Jmax', () => {
        const { conf, notes } = toAwgConf(outbound([{ rand: 64 }]));
        expect(conf).toContain('Jc = 1');
        expect(conf).toContain('Jmin = 64');
        expect(conf).toContain('Jmax = 64');
        expect(notes).toEqual([]);
    });

    it('notes randRange, reset and reserved, none of which AWG has', () => {
        const withExtras = {
            protocol: 'wireguard',
            settings: { secretKey: SECRET, address: ['10.0.0.1/32'], peers: [peer()], reserved: [1, 2, 3] },
            streamSettings: { finalmask: { udp: [{ type: 'noise', settings: { reset: 30, noise: [{ rand: '40-70', randRange: '10-20' }] } }] } },
        };
        const { notes } = toAwgConf(withExtras);
        const text = messages(notes);
        expect(text).toMatch(/randRange/);
        expect(text).toMatch(/"reset" was dropped/);
        expect(text).toMatch(/reserved \(1, 2, 3\)/);
        // reserved is WARP's header substitution, not AWG padding — the note has to say so.
        expect(text).toMatch(/not the same thing as S1\/S2/);
        expect(notes.some(note => note.severity === 'info')).toBe(true);
    });

    it('says nothing about a reset of zero, which asks for nothing', () => {
        const items = [{ type: 'hex', packet: HI }];
        for (const reset of [0, '0', '']) {
            const { notes } = toAwgConf({
                protocol: 'wireguard',
                settings: { secretKey: SECRET, address: ['10.0.0.1/32'], peers: [peer()] },
                streamSettings: { finalmask: { udp: [{ type: 'noise', settings: { reset, noise: items } }] } },
            });
            expect(notes).toEqual([]);
        }
    });

    it('leaves out noise it cannot read, with a note for each kind', () => {
        const { conf, notes } = toAwgConf(outbound([
            { type: 'hex', packet: 'zz' },
            { type: 'hex', packet: '' },
            { rand: 'lots' },
            { type: 'morse', packet: 'hi' },
            {},
        ]));
        expect(conf).not.toContain('I1 =');
        expect(conf).not.toContain('Jc =');
        const text = messages(notes);
        expect(text).toMatch(/could not be decoded/);
        expect(text).toMatch(/decoded to no bytes/);
        expect(text).toMatch(/could not be read/);
        expect(text).toMatch(/neither packet nor rand/);
    });
});

describe('toAwgConf robustness', () => {
    it('never throws on an outbound that is not one', () => {
        for (const value of [undefined, null, 42, 'wireguard', [], {}, { settings: 'nope' }, { settings: { peers: 'nope', address: 7, mtu: 'big' } }]) {
            const { conf, notes } = toAwgConf(value);
            expect(typeof conf).toBe('string');
            expect(conf).toContain('[Interface]');
            expect(notes.length).toBeGreaterThan(0);
        }
    });

    it('omits the lines it has nothing for and says what is missing', () => {
        const { conf, notes } = toAwgConf({ protocol: 'wireguard', settings: { peers: [] } });
        expect(conf).not.toContain('PrivateKey');
        expect(conf).not.toContain('[Peer]');
        const text = messages(notes);
        expect(text).toMatch(/no secretKey/);
        expect(text).toMatch(/no address/);
        expect(text).toMatch(/no peers/);
        // Nothing to load means nothing an importer would accept either.
        expect(parseWireguardConfig(conf)).toBeNull();
    });

    it('notes a peer with nothing to connect to, and still writes the rest', () => {
        const { conf, notes } = toAwgConf(outbound(undefined, { peers: [{}, peer()] }));
        expect(conf.match(/\[Peer\]/g)).toHaveLength(2);
        // An empty allowedIPs is a catch-all peer on both sides.
        expect(conf).toContain('AllowedIPs = 0.0.0.0/0, ::/0');
        expect(messages(notes)).toMatch(/Peer 1 has no publicKey and no endpoint/);
    });

    it('notes an outbound of another protocol instead of pretending', () => {
        const { notes } = toAwgConf({ ...outbound(), protocol: 'vless' });
        expect(messages(notes)).toMatch(/not wireguard/);
    });
});

/**
 * 26.10's `exp` items (v26.10.10:infra/conf/transport_finalmask.go:317-332)
 * are built from an expression rather than held as bytes. Most of that
 * grammar is AmneziaWG's own — the same tags, meaning the same thing — so an
 * item that uses only those goes out as its tag chain; the rest is left out
 * with a note that names what AWG has no tag for. They used to be dropped as
 * "could not be decoded (type must be hex, str, base64 or array)".
 */
describe('toAwgConf exp items', () => {
    it('writes an expression of shared tags as the same chain', () => {
        const { conf, notes } = toAwgConf(outbound([{ type: 'exp', packet: '<b 0xDE AD><r 8><rc 4><rd 2><t>' }]));
        expect(conf).toContain('I1 = <b 0xdead><r 8><rc 4><rd 2><t>');
        expect(notes).toEqual([]);
    });

    it('reads the type as the core does, case and all, and keeps the order around it', () => {
        const { conf, notes } = toAwgConf(outbound([
            { type: 'hex', packet: HI },
            { type: 'EXP', packet: '<b 0Xbeef>' },
            { type: 'hex', packet: 'ff' },
            ...junk(2),
        ]));
        expect(conf).toContain(`I1 = <b 0x${HI}>`);
        expect(conf).toContain('I2 = <b 0xbeef>');
        expect(conf).toContain('I3 = <b 0xff>');
        expect(conf).toContain('Jc = 2');
        expect(notes).toEqual([]);
    });

    it('writes <n> as the eight random bytes it is', () => {
        const { conf } = toAwgConf(outbound([{ type: 'exp', packet: '<b 0x01><n>' }]));
        expect(conf).toContain('I1 = <b 0x01><r 8>');
    });

    it('leaves out an item with a counter, which AWG has no tag for, and says so', () => {
        const { conf, notes } = toAwgConf(outbound([{ type: 'exp', packet: '<b 0x01><c>' }, { type: 'hex', packet: HI }]));
        expect(conf).toContain(`I1 = <b 0x${HI}>`);
        expect(conf).not.toContain('I2 =');
        expect(messages(notes)).toMatch(/<c>/);
        expect(messages(notes)).not.toMatch(/could not be decoded/);
    });

    it('leaves out an item with a ranged length, which AWG cannot draw, and says so', () => {
        const { conf, notes } = toAwgConf(outbound([{ type: 'exp', packet: '<r 8-16>' }]));
        expect(conf).not.toContain('I1 =');
        expect(messages(notes)).toMatch(/<r 8-16>/);
        expect(messages(notes)).toMatch(/between 8 and 16/);
        // A range of one is a fixed length.
        expect(toAwgConf(outbound([{ type: 'exp', packet: '<rd 5-5>' }])).conf).toContain('I1 = <rd 5>');
    });

    it('says once what several items have in common', () => {
        const { notes } = toAwgConf(outbound([{ type: 'exp', packet: '<c>' }, { type: 'exp', packet: '<t><c>' }]));
        expect(notes.filter(note => /<c>/.test(note.message))).toHaveLength(1);
    });

    it('leaves out an expression the core refuses, in the core\'s words', () => {
        const { conf, notes } = toAwgConf(outbound([{ type: 'exp', packet: '<b 0xABC>' }, { type: 'exp', packet: ['<t>'] }]));
        expect(conf).not.toContain('I1 =');
        const text = messages(notes);
        expect(text).toMatch(/invalid hex in noise exp: 0xABC/);
        expect(text).toMatch(/not a string/);
    });

    it('passes the delay on to the recipe, which notes that AWG has none', () => {
        const { conf, notes } = toAwgConf(outbound([{ type: 'exp', packet: '<t>', delay: '5-10' }]));
        expect(conf).toContain('I1 = <t>');
        expect(notes.some(note => note.severity === 'info' && /Delays were dropped/.test(note.message))).toBe(true);
    });
});
