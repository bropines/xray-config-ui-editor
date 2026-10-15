/**
 * Strings VLESS Encryption is judged by, each with what the real core does.
 *
 * `refused` is the verdict of the released Xray 26.10.10 binary
 * (sha256 accbc95197799903338d59796dff54f79e854cea6cfc87be9c9949211f9a96e6) on a
 * config holding the case — `xray run -test -c`, which builds the config and
 * starts neither inbound nor outbound, so a refusal here is Build() or the
 * constructor Init(), never the network. The unit test holds
 * core/xray/vless-encryption to every row; the same rows were run through the
 * binary, so the table is the core's word and not this repository's.
 *
 * `kinds` is what the reader is expected to report as critical — the wording
 * of the core's own message is in the comment beside the row where it says
 * more than "unsupported".
 */
import { generateVlessKeyPair, type RandomBytes } from '../generators/vless-encryption';
import { encodeRawUrlBase64, type VlessEncryptionProblemKind } from './vless-encryption';

/** Bytes counting up from a start, so every key below is the same on every run. */
const counting = (start: number): RandomBytes => {
    let next = start;
    return length => Uint8Array.from({ length }, () => next++ & 0xff);
};

const x = generateVlessKeyPair('x25519', counting(1));
const m = generateVlessKeyPair('mlkem768', counting(100));

/** A server's X25519 private key and ML-KEM seed, and a client's public keys, as they are written in a string. */
export const KEYS = {
    serverX: encodeRawUrlBase64(x.privateKey),
    serverM: encodeRawUrlBase64(m.privateKey),
    clientX: encodeRawUrlBase64(x.publicKey),
    clientM: encodeRawUrlBase64(m.publicKey),
};

const bytes = (length: number, seed = 7): string =>
    encodeRawUrlBase64(Uint8Array.from({ length }, (_, at) => (at * 31 + seed) & 0xff));

/** The client key with the first twelve-bit number of its first polynomial set to `value`. */
const withFirstCoefficient = (value: number): string => {
    const key = Uint8Array.from(m.publicKey);
    key[0] = value & 0xff;
    key[1] = (key[1]! & 0xf0) | (value >> 8);
    return encodeRawUrlBase64(key);
};

/** The client key with the second number of the last triple of the last polynomial set to `value`. */
const withLastCoefficient = (value: number): string => {
    const key = Uint8Array.from(m.publicKey);
    key[1150] = (key[1150]! & 0x0f) | ((value & 0x0f) << 4);
    key[1151] = value >> 4;
    return encodeRawUrlBase64(key);
};

const withRho = (fill: number): string => {
    const key = Uint8Array.from(m.publicKey);
    key.fill(fill, 1152);
    return encodeRawUrlBase64(key);
};

export interface VlessEncryptionCase {
    label: string;
    /** `undefined` leaves the key out of the config. */
    value: unknown;
    /** What the real core did with it. */
    refused: boolean;
    /** What the reader reports as critical, in any order. */
    kinds?: VlessEncryptionProblemKind[];
    /** What the reader reports as a warning. */
    warnings?: VlessEncryptionProblemKind[];
    /** The outbound shape; the inbound has one. */
    shape?: 'vnext' | 'flat';
    /** Other keys of the inbound's settings. */
    settings?: Record<string, unknown>;
    /** Other keys of the inbound's first client. */
    client?: Record<string, unknown>;
}

const H = 'mlkem768x25519plus';
const PAD = '100-111-1111.75-0-111.50-0-3333';

const ok = (label: string, value: unknown, extra: Partial<VlessEncryptionCase> = {}): VlessEncryptionCase =>
    ({ label, value, refused: false, ...extra });
const no = (label: string, value: unknown, kinds: VlessEncryptionProblemKind[], extra: Partial<VlessEncryptionCase> = {}): VlessEncryptionCase =>
    ({ label, value, refused: true, kinds, ...extra });

const s = (middle: string, key = KEYS.serverX) => `${H}.${middle}.${key}`;
const c = (middle: string, key = KEYS.clientX) => `${H}.${middle}.${key}`;

export const INBOUND_CASES: VlessEncryptionCase[] = [
    // The value as a whole.
    no('key left out', undefined, ['missing']),                       // please add/set "decryption":"none" to every settings
    no('empty string', '', ['missing']),
    no('null', null, ['missing']),                                    // null decodes to the empty string
    ok('"none"', 'none'),
    no('"None"', 'None', ['shape']),                                  // unsupported "decryption": None
    no('one word', 'x', ['shape']),
    no('three parts', `${H}.native.600s`, ['shape']),
    no('a number', 5, ['type']),                                      // json: cannot unmarshal number into … of type string
    ok('X25519 key', s('native.600s')),
    ok('ML-KEM-768 seed', s('native.600s', KEYS.serverM)),
    no('handshake mlkem768', `mlkem768.native.600s.${KEYS.serverX}`, ['handshake']),
    no('handshake in capitals', `${H.toUpperCase()}.native.600s.${KEYS.serverX}`, ['handshake']),

    // How it looks.
    ok('xorpub', s('xorpub.600s')),
    ok('random', s('random.600s')),
    no('Native', s('Native.600s'), ['appearance']),
    no('xor', s('xor.600s'), ['appearance']),
    no('no appearance', s('.600s'), ['appearance']),

    // The ticket lifetime. Go's Atoi: an optional sign and digits.
    ok('600 without the s', s('native.600')),
    ok('0s', s('native.0s')),
    ok('0', s('native.0')),
    ok('range', s('native.300-600s')),
    ok('range without the s', s('native.300-600')),
    ok('reversed range', s('native.600-300s')),
    ok('plus sign', s('native.+600s')),
    ok('double dash is a range ending in a negative', s('native.5--10s')),
    no('negative', s('native.-5s'), ['lifetime']),                    // the dash is the separator, and "" is not a number
    no('600ss', s('native.600ss'), ['lifetime']),
    no('words', s('native.abc'), ['lifetime']),
    no('nothing', s('native.'), ['lifetime']),
    no('minutes', s('native.600m'), ['lifetime']),
    no('exponent', s('native.1e3s'), ['lifetime']),
    no('open range', s('native.10-'), ['lifetime']),
    no('range from nothing', s('native.-10'), ['lifetime']),
    no('leading space', s('native. 600s'), ['lifetime']),
    no('past int64', s('native.99999999999999999999s'), ['lifetime']),
    ok('70000s loads', s('native.70000s'), { warnings: ['lifetime.wide'] }),
    ok('65535s', s('native.65535s')),

    // Keys. A part of 20 bytes or more is a key; a shorter one is padding.
    no('a key cut to 19 characters', s('native.600s', KEYS.serverX.slice(0, 19)), ['key.missing']),   // panic: slice bounds out of range [20:19]
    no('a key cut to 20 characters', s('native.600s', KEYS.serverX.slice(0, 20)), ['key.size']),
    no('36 bytes', s('native.600s', bytes(36)), ['key.size']),
    no('33 bytes', s('native.600s', bytes(33)), ['key.size']),
    no('63 bytes', s('native.600s', bytes(63)), ['key.size']),
    no('a client\'s 1184-byte key', s('native.600s', KEYS.clientM), ['key.size']),
    no('padded with =', s('native.600s', `${KEYS.serverX}=`), ['key.chars']),
    no('standard alphabet', s('native.600s', 'ab+defghijklmnopqrstuvwxyz0123456789ABCDEFG'), ['key.chars']),
    no('trailing dot', `${s('native.600s')}.`, ['key.order']),       // mlkem: invalid seed length
    no('empty key', `${H}.native.600s.`, ['key.missing']),            // panic: slice bounds out of range [1:0]
    ok('X25519 then ML-KEM', `${s('native.600s')}.${KEYS.serverM}`),
    ok('ML-KEM then X25519', `${s('native.600s', KEYS.serverM)}.${KEYS.serverX}`),
    ok('the same key twice', `${s('native.600s')}.${KEYS.serverX}`),
    ok('an empty part before the key', `${H}.native.600s..${KEYS.serverX}`),

    // Padding. Blocks are chance-min-max; the first needs 100 and 35.
    ok('the default padding', `${H}.native.600s.${PAD}.${KEYS.serverX}`),
    no('padding and no key', `${H}.native.600s.${PAD}`, ['key.missing']),   // panic: slice bounds out of range [32:31]
    ok('one block', `${H}.native.600s.100-111-1111.${KEYS.serverX}`),
    no('padding after the key', `${s('native.600s')}.${PAD}`, ['key.order']),
    ok('first block 100-35-35', `${H}.native.600s.100-35-35.${KEYS.serverX}`),
    no('first block under 100', `${H}.native.600s.99-111-1111.${KEYS.serverX}`, ['padding.first']),    // first padding length must not be smaller than 35
    no('first block minimum 34', `${H}.native.600s.100-34-100.${KEYS.serverX}`, ['padding.first']),
    no('first block maximum 34', `${H}.native.600s.100-100-34.${KEYS.serverX}`, ['padding.first']),
    no('first block 0-0-0', `${H}.native.600s.0-0-0.${KEYS.serverX}`, ['padding.first']),
    no('two numbers', `${H}.native.600s.100-111.${KEYS.serverX}`, ['padding.shape']),                  // invalid padding lenth/gap parameter: 100-111
    ok('a fourth number is ignored', `${H}.native.600s.100-111-1111-9.${KEYS.serverX}`),
    no('empty number', `${H}.native.600s.100--5.${KEYS.serverX}`, ['padding.shape']),
    no('trailing dash', `${H}.native.600s.100-111-.${KEYS.serverX}`, ['padding.shape']),
    no('leading dash', `${H}.native.600s.-100-111.${KEYS.serverX}`, ['padding.shape']),
    no('a letter', `${H}.native.600s.100-a-5.${KEYS.serverX}`, ['padding.number']),                     // strconv.Atoi: parsing "a": invalid syntax
    ok('a plus sign', `${H}.native.600s.+100-111-1111.${KEYS.serverX}`),
    ok('a chance over 100', `${H}.native.600s.101-111-1111.${KEYS.serverX}`),
    ok('minimum above maximum', `${H}.native.600s.100-1111-111.${KEYS.serverX}`),
    ok('a wait block of nothing', `${H}.native.600s.100-111-1111.0-0-0.${KEYS.serverX}`),
    no('a wait block of two numbers', `${H}.native.600s.100-111-1111.7-0.${KEYS.serverX}`, ['padding.shape']),
    ok('lengths adding to 65553', `${H}.native.600s.100-35-32776.0-0-0.100-35-32777.${KEYS.serverX}`),
    no('lengths adding to 65554', `${H}.native.600s.100-35-32777.0-0-0.100-35-32777.${KEYS.serverX}`, ['padding.total']),
    ok('one length of 65553', `${H}.native.600s.100-35-65553.${KEYS.serverX}`),
    no('one length of 65554', `${H}.native.600s.100-35-65554.${KEYS.serverX}`, ['padding.total']),
    no('a length of seven digits', `${H}.native.600s.1000-1111-1111111.${KEYS.serverX}`, ['padding.total']),

    // What sits beside it.
    no('fallbacks beside a key', s('native.600s'), ['fallbacks'], { settings: { fallbacks: [{ dest: 80 }] } }),
    no('empty fallbacks beside a key', s('native.600s'), ['fallbacks'], { settings: { fallbacks: [] } }),
    ok('null fallbacks', s('native.600s'), { settings: { fallbacks: null } }),
    ok('empty fallbacks beside "none"', 'none', { settings: { fallbacks: [] } }),
    no('a client with encryption "none"', 'none', ['user.encryption'], { client: { encryption: 'none' } }),
    no('a client with a client string', 'none', ['user.encryption'], { client: { encryption: c('native.0rtt') } }),
    ok('a client with an empty encryption', 'none', { client: { encryption: '' } }),
];

export const OUTBOUND_CASES: VlessEncryptionCase[] = [
    no('key left out (vnext)', undefined, ['missing']),               // please add/set "encryption":"none" for every user
    no('key left out (flat)', undefined, ['missing'], { shape: 'flat' }),
    no('empty string', '', ['missing']),
    ok('"none"', 'none'),
    ok('"none" (flat)', 'none', { shape: 'flat' }),
    no('"None"', 'None', ['shape']),
    no('three parts', `${H}.native.0rtt`, ['shape']),
    no('handshake mlkem768', `mlkem768.native.0rtt.${KEYS.clientX}`, ['handshake']),
    ok('X25519 key', c('native.0rtt')),
    ok('X25519 key (flat)', c('native.0rtt'), { shape: 'flat' }),
    ok('ML-KEM-768 key', c('native.0rtt', KEYS.clientM)),

    ok('xorpub', c('xorpub.0rtt')),
    ok('random', c('random.0rtt')),
    no('Native', c('Native.0rtt'), ['appearance']),
    no('no appearance', c('.0rtt'), ['appearance']),

    ok('1rtt', c('native.1rtt')),
    no('0RTT', c('native.0RTT'), ['resumption']),
    no('2rtt', c('native.2rtt'), ['resumption']),
    no('a server lifetime', c('native.600s'), ['resumption']),
    no('nothing', c('native.'), ['resumption']),
    no('trailing space', c('native.0rtt '), ['resumption']),
    no('rtt', c('native.rtt'), ['resumption']),

    no('a server\'s 64-byte seed', c('native.0rtt', KEYS.serverM), ['key.size']),
    ok('a server\'s X25519 key is 32 bytes too', c('native.0rtt', KEYS.serverX)),
    no('36 bytes', c('native.0rtt', bytes(36)), ['key.size']),
    no('1183 bytes', c('native.0rtt', bytes(1183)), ['key.size']),
    no('1185 bytes', c('native.0rtt', bytes(1185)), ['key.size']),
    no('a key cut to 19 characters', c('native.0rtt', KEYS.clientX.slice(0, 19)), ['key.missing']),
    ok('X25519 then ML-KEM', `${c('native.0rtt')}.${KEYS.clientM}`),
    no('empty key', `${H}.native.0rtt.`, ['key.missing']),

    // The ML-KEM key has to be a real one: every twelve-bit number below 3329 (mlkem: invalid polynomial encoding).
    ok('first coefficient 3328', c('native.0rtt', withFirstCoefficient(3328))),
    no('first coefficient 3329', c('native.0rtt', withFirstCoefficient(3329)), ['key.encapsulation']),
    no('first coefficient 4095', c('native.0rtt', withFirstCoefficient(4095)), ['key.encapsulation']),
    ok('last coefficient 3328', c('native.0rtt', withLastCoefficient(3328))),
    no('last coefficient 3329', c('native.0rtt', withLastCoefficient(3329)), ['key.encapsulation']),
    ok('rho of 0xff', c('native.0rtt', withRho(255))),
    ok('rho of zeros', c('native.0rtt', withRho(0))),
    no('1184 bytes of 0xff', c('native.0rtt', encodeRawUrlBase64(new Uint8Array(1184).fill(255))), ['key.encapsulation']),

    ok('the default padding', `${H}.native.0rtt.${PAD}.${KEYS.clientX}`),
    no('padding and no key', `${H}.native.0rtt.${PAD}`, ['key.missing']),
    no('first block under 100', `${H}.native.0rtt.99-111-1111.${KEYS.clientX}`, ['padding.first']),
    no('first block minimum 34', `${H}.native.0rtt.100-34-100.${KEYS.clientX}`, ['padding.first']),
    no('two numbers', `${H}.native.0rtt.100-111.${KEYS.clientX}`, ['padding.shape']),
    no('padding after the key', `${c('native.0rtt')}.${PAD}`, ['key.order']),
];

/** The config a case stands for, whole enough for `xray run -test`. */
export const inboundConfig = (testCase: VlessEncryptionCase, port = 45011) => ({
    log: { loglevel: 'warning' },
    inbounds: [{
        tag: 'in', listen: '127.0.0.1', port, protocol: 'vless',
        settings: {
            clients: [{ id: '5783a3e7-e373-51cd-8642-c83782b807c5', ...testCase.client }],
            ...(testCase.value === undefined ? {} : { decryption: testCase.value }),
            ...testCase.settings,
        },
    }],
    outbounds: [{ protocol: 'freedom' }],
});

export const outboundConfig = (testCase: VlessEncryptionCase, port = 45012, target = 45011) => ({
    log: { loglevel: 'warning' },
    inbounds: [{ tag: 'socks', listen: '127.0.0.1', port, protocol: 'socks', settings: { udp: false } }],
    outbounds: [{
        tag: 'out', protocol: 'vless',
        settings: testCase.shape === 'flat'
            ? { address: '127.0.0.1', port: target, id: '5783a3e7-e373-51cd-8642-c83782b807c5', ...(testCase.value === undefined ? {} : { encryption: testCase.value }) }
            : {
                vnext: [{
                    address: '127.0.0.1', port: target,
                    users: [{ id: '5783a3e7-e373-51cd-8642-c83782b807c5', ...(testCase.value === undefined ? {} : { encryption: testCase.value }) }],
                }],
            },
    }],
});
