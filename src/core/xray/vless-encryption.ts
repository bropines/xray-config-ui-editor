/**
 * VLESS Encryption: the string a VLESS inbound keeps in `settings.decryption`,
 * the string each of its clients keeps in the outbound's `encryption`, what
 * `xray vlessenc` prints for them, and everything the core then refuses.
 *
 * The grammar. One dot-separated string, the same on every supported line:
 *
 *   none
 *   mlkem768x25519plus . APPEARANCE . TICKET { . BLOCK } . KEY { . KEY }
 *
 *   none         plain VLESS. The only plain spelling: "" and a missing key are
 *                refused, so is "None" (case-sensitive).
 *   APPEARANCE   native | xorpub | random, lower case. How the handshake looks:
 *                native keeps the key exchange as it is, xorpub masks the
 *                public keys and ciphertexts in it so they pass for random
 *                bytes (client.go:98-99), random masks the whole stream.
 *   TICKET       server: how long a session ticket lives — seconds, "600s" (the
 *                trailing "s" is optional) or a range "300-600s"; a single
 *                number means a random value between half of it and all of
 *                it (server.go:272-273). 0 turns tickets off.
 *                client: 0rtt (resume with a ticket the server handed out,
 *                skipping a round trip) or 1rtt (always the full handshake).
 *   BLOCK        padding, `chance-min-max`, three whole numbers. Blocks alternate:
 *                the first, third, ... are LENGTHS (bytes of padding sent
 *                with the handshake) and the second, fourth, ... are WAITS
 *                (milliseconds paused before the next piece). None written:
 *                100-111-1111 . 75-0-111 . 50-0-3333 is used (common.go:259-263).
 *                The server pads its reply and the client its hello, each by its
 *                own string.
 *   KEY          unpadded URL-safe base64. Server: a 32-byte X25519 private key
 *                or a 64-byte ML-KEM-768 seed. Client: the 32-byte X25519
 *                public key or the 1184-byte ML-KEM-768 encapsulation key that
 *                goes with it. Several keys in a row are all required, in the
 *                same order on both sides (server.go:134-175).
 *
 * `xray vlessenc` writes the plain case: `mlkem768x25519plus.native.600s.KEY`
 * for the server and `mlkem768x25519plus.native.0rtt.KEY` for the client, once
 * with X25519 keys and once with ML-KEM-768 (v26.10.10:main/commands/all/
 * vlessenc.go:23-37; the file is the same on every line). The X25519 private
 * key it prints has been clamped (curve25519.go:51-53); the ML-KEM client key is
 * `NewDecapsulationKey768(seed).EncapsulationKey().Bytes()` (mlkem768.go:56-57).
 *
 * Where it is read, per line. All five have it and none differs in what it
 * takes: infra/conf/vless.go is the same code and proxy/vless/encryption is
 * the same package (a diff of v26.3.27 against v26.10.10 touches two lines,
 * `var index = 32` becoming `index := 32`, one in client.go and one in server.go).
 *
 *               server string      users refused an      client string      plain-VLESS
 *               (Build)            `encryption` (Build)  (Build)            check *
 *   26.3        vless.go:95-143    :78                   vless.go:321-363   —
 *   26.7        vless.go:107-155   :85                   vless.go:333-375   xray.go:245
 *   26.9        vless.go:107-155   :85                   vless.go:336-378   xray.go:236
 *   26.9.30     vless.go:107-155   :85                   vless.go:336-378   xray.go:242
 *   26.10       vless.go:107-155   :85                   vless.go:336-378   xray.go:242
 *
 *   * "vless without TLS or other encryption is prohibited unless the server
 *     address is a private IP or domain": a client string exempts the outbound
 *     (that rule lives in versions/rules.ts). 26.3 has no such check.
 *
 * Every file above is the tag's own (v26.3.27:infra/conf/vless.go and so on);
 * the 26.9.30 and 26.10 lines are the 26.9 lines of v26.9.30 and v26.10.10. The
 * constructors that read the string afterwards are proxy/vless/inbound/inbound.go:104-115
 * and proxy/vless/outbound/outbound.go:86-97 (:87-98 from 26.7), the same on every
 * line but for the line numbers.
 *
 * What stops a config, in the order the core meets it:
 *
 *   Build (the config does not load)
 *   - an empty or missing string: `please add/set "decryption":"none"` (server,
 *     vless.go:152 from 26.7, :140 on 26.3) or `"encryption":"none"` (client, :372
 *     on 26.7, :375 from 26.9, :360 on 26.3). A JSON null is the same as missing.
 *     A number or object fails the decode of the whole document.
 *   - anything but "none" that is not the grammar: `unsupported "decryption"`
 *     (:154, :377). The parts it looks at: at least four, the first exactly
 *     mlkem768x25519plus, the second one of the three appearances, the third a
 *     whole-number lifetime (server: Go's Atoi, an optional sign and digits within
 *     int64; "-5s" fails only because the dash is taken as the range separator) or
 *     0rtt / 1rtt (client), and every part of 20 bytes or more must decode as
 *     RawURLEncoding to 32 or 64 bytes (server) / 32 or 1184 bytes (client). A part
 *     of fewer than 20 bytes is not looked at: Build takes it for padding.
 *   - no key after the options: the cut `Decryption[padding:]` is past the end of
 *     the string and the loader panics (vless.go:147 and :370 on v26.10.10 —
 *     verified on that binary, whose stack trace names them).
 *   - on an inbound: `fallbacks` (even `[]`) beside a string that is not "none"
 *     (vless.go:157-159 from 26.7, :145-147 on 26.3), and an `encryption` (even
 *     "none") on a user (:85, :78).
 *
 *   Init (the inbound or outbound does not start; `xray run -test` reports it)
 *   - padding (common.go:223-257): every block needs three numbers; the first needs
 *     a chance of at least 100 and a minimum and maximum of at least 35; the
 *     largest lengths together must not pass 65553.
 *   - a padding block after a key: Build cuts the string by the total size of the
 *     short parts, wherever they are, so the key loses its front and no longer
 *     decodes to a size the constructor takes (server.go:55-67, client.go:46-57).
 *   - a client's ML-KEM-768 key that is the right size but is not a public key (a
 *     twelve-bit number not below 3329 in its first 1152 bytes): `mlkem: invalid
 *     polynomial encoding` from crypto/mlkem, called at client.go:52. That check is
 *     in Go's standard library and not in this repository, so what is here was read
 *     off the v26.10.10 binary; core/xray/vless-encryption.cases.ts holds the
 *     boundary (3328 loads, 3329 does not).
 *
 * The words say "every supported Xray" because the answer is the same on every
 * line; only the inbound's users list (`clients`, and from 26.7 `users`) depends
 * on one, and that is the one place `version` is looked at.
 */
import { t } from '../../i18n';
import { byLine } from './versions/by-line';
import { compareCoreVersions, type CoreVersionId } from './versions';
import { serverShape } from './outbound-credentials';

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

// ── Names and sizes ─────────────────────────────────────────────────────

export const VLESS_ENCRYPTION_HANDSHAKE = 'mlkem768x25519plus';
export const APPEARANCES = ['native', 'xorpub', 'random'] as const;
export type Appearance = (typeof APPEARANCES)[number];
export const RESUMPTIONS = ['0rtt', '1rtt'] as const;
export type Resumption = (typeof RESUMPTIONS)[number];

/** The plain spelling of both keys. */
export const NO_VLESS_ENCRYPTION = 'none';

/** Bytes in each kind of key, per side (vless.go:140 and :363, server.go:55-67, client.go:46-57). */
export const KEY_BYTES = {
    x25519: 32,
    /** A server's ML-KEM-768 key is its 64-byte seed. */
    mlkem768Seed: 64,
    /** A client's is the 1184-byte public key made from it. */
    mlkem768Public: 1184,
} as const;

/** A part shorter than this many bytes is padding to Build(), whatever it holds (vless.go:136, :359). */
export const PADDING_PART_LIMIT = 20;

/**
 * The chance and sizes Xray pads with when the string names no block
 * (common.go:259-263): two lengths and the wait between them.
 */
export const DEFAULT_PADDING = '100-111-1111.75-0-111.50-0-3333';

/** What a server's ticket lifetime is when `vlessenc` writes it (vlessenc.go:27). */
export const DEFAULT_LIFETIME = '600s';

/** The first padding block's floor (common.go:243): a chance of 100, and 18 + 17 bytes at least. */
export const FIRST_PADDING_MINIMUM = 35;
/** The ceiling on the sum of the largest lengths (common.go:253): 18 + 65535. */
export const PADDING_TOTAL_LIMIT = 65553;

/**
 * Whether a line has VLESS Encryption. Every one does — the grammar above is
 * read by the same code on all five — so this is a table of one answer, kept so
 * a sixth line has to be asked about rather than assumed (and so editors ask a
 * version instead of hard-coding "yes").
 *
 * 26.3 v26.3.27:infra/conf/vless.go:95-143 and :321-362; 26.7 v26.7.28:infra/conf/vless.go:107-155
 * and :333-375; 26.9 v26.9.9:infra/conf/vless.go:107-155 and :336-378; 26.9.30 and 26.10 the same
 * lines of v26.9.30 and v26.10.10.
 */
const HAS_VLESS_ENCRYPTION = byLine<boolean>(true, true, true);
export const vlessEncryptionOffered = (version: CoreVersionId): boolean => HAS_VLESS_ENCRYPTION[version];

// ── Go, as far as these strings go ──────────────────────────────────────

const INT64_MAX = 2n ** 63n - 1n;
const INT64_MIN = -(2n ** 63n);

/** strconv.Atoi on a 64-bit build: an optional sign, then decimal digits and nothing else, within int64. */
export const goAtoi = (text: string): bigint | null => {
    if (!/^[+-]?[0-9]+$/.test(text)) return null;
    const value = BigInt(text);
    return value >= INT64_MIN && value <= INT64_MAX ? value : null;
};

const utf8Length = (text: string): number => new TextEncoder().encode(text).length;

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/**
 * What `base64.RawURLEncoding.DecodeString` makes of a part, or null where Go
 * reports an error: any character outside A–Z a–z 0–9 - _ (so no "=" and no
 * "+" or "/"), or a length of 4n+1. CR and LF are skipped, as Go skips them;
 * trailing bits that are not zero are tolerated, as Go tolerates them outside
 * its strict mode. Go keeps the bytes it had decoded when it fails, but only
 * whole groups of three, and no key is a multiple of three bytes long (32, 64,
 * 1184), so an error is a refusal either way.
 */
export const decodeRawUrlBase64 = (text: string): Uint8Array | null => {
    const body = text.replace(/[\r\n]/g, '');
    if (!/^[A-Za-z0-9_-]*$/.test(body) || body.length % 4 === 1) return null;
    const out = new Uint8Array(Math.floor((body.length * 6) / 8));
    let bits = 0;
    let acc = 0;
    let at = 0;
    for (const char of body) {
        acc = (acc << 6) | ALPHABET.indexOf(char);
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            out[at++] = (acc >> bits) & 0xff;
            acc &= (1 << bits) - 1;
        }
    }
    return out;
};

/** Unpadded URL-safe base64, the spelling every VLESS Encryption key is written in. */
export const encodeRawUrlBase64 = (bytes: Uint8Array): string => {
    let out = '';
    let acc = 0;
    let bits = 0;
    for (const byte of bytes) {
        acc = (acc << 8) | byte;
        bits += 8;
        while (bits >= 6) {
            bits -= 6;
            out += ALPHABET[(acc >> bits) & 63];
            acc &= (1 << bits) - 1;
        }
    }
    if (bits > 0) out += ALPHABET[(acc << (6 - bits)) & 63];
    return out;
};

// ── The string, taken apart and put back ────────────────────────────────

export interface VlessEncryptionParts {
    /** Second part, as written (a valid one is in APPEARANCES). */
    appearance: string;
    /** Third part, as written: "600s" or "300-600s" on a server, "0rtt" or "1rtt" on a client. */
    ticket: string;
    /** The padding blocks that lead the keys, joined by dots; "" when there are none. */
    padding: string;
    /** Every part from the first of 20 bytes or more on, as written. */
    keys: string[];
}

/**
 * The parts of a string that has the dotted shape — four or more parts, the
 * first the handshake name — or null. Reads loosely: it does not say whether
 * anything is valid (readVlessEncryption does), only where each piece sits, so
 * an editor can change one piece and keep the rest.
 */
export const splitVlessEncryption = (value: unknown): VlessEncryptionParts | null => {
    if (typeof value !== 'string') return null;
    const parts = value.split('.');
    if (parts.length < 4 || parts[0] !== VLESS_ENCRYPTION_HANDSHAKE) return null;
    const rest = parts.slice(3);
    const firstKey = rest.findIndex(part => utf8Length(part) >= PADDING_PART_LIMIT);
    const padding = firstKey === -1 ? rest : rest.slice(0, firstKey);
    return {
        appearance: parts[1] ?? '',
        ticket: parts[2] ?? '',
        padding: padding.join('.'),
        keys: firstKey === -1 ? [] : rest.slice(firstKey),
    };
};

/** The string for these parts; the inverse of splitVlessEncryption on a string that was well laid out. */
export const composeVlessEncryption = (parts: VlessEncryptionParts): string =>
    [
        VLESS_ENCRYPTION_HANDSHAKE,
        parts.appearance,
        parts.ticket,
        ...(parts.padding === '' ? [] : [parts.padding]),
        ...parts.keys,
    ].join('.');

// ── Reading ─────────────────────────────────────────────────────────────

export type VlessEncryptionSide = 'server' | 'client';
export type VlessKeyKind = 'x25519' | 'mlkem768';

export interface VlessKey {
    text: string;
    kind: VlessKeyKind;
    bytes: Uint8Array;
}

export type VlessEncryptionProblemKind =
    | 'missing' | 'type'
    | 'shape' | 'handshake' | 'appearance' | 'lifetime' | 'resumption'
    | 'key.size' | 'key.chars' | 'key.missing' | 'key.order' | 'key.encapsulation'
    | 'padding.shape' | 'padding.number' | 'padding.first' | 'padding.total'
    | 'lifetime.wide'
    | 'fallbacks' | 'user.encryption';

export interface VlessEncryptionProblem {
    kind: VlessEncryptionProblemKind;
    /** Where it is, from the inbound or outbound down: `settings.decryption`. */
    field: string;
    severity: 'critical' | 'warning';
    message: string;
    suggestion?: string;
}

/**
 * The findings Build() itself returns (or crashes on). The rest — padding and
 * the key checks — come from Init, after the config has loaded.
 */
const BUILD_KINDS: ReadonlySet<VlessEncryptionProblemKind> = new Set([
    'missing', 'type', 'shape', 'handshake', 'appearance', 'lifetime', 'resumption',
    'key.size', 'key.chars', 'key.missing',
]);

export interface VlessEncryptionReading {
    side: VlessEncryptionSide;
    /** The value is exactly "none". */
    none: boolean;
    /** The dotted layout, whether or not it is valid. */
    parts: VlessEncryptionParts | null;
    /** The keys that are a size this side takes, in order. */
    keys: VlessKey[];
    problems: VlessEncryptionProblem[];
    /** An encrypted string no part of which the core refuses: ready to be derived from or sent. */
    usable: boolean;
}

/** Whether Build() takes the string, whatever Init then says about its padding and keys. */
export const buildAccepts = (reading: VlessEncryptionReading): boolean =>
    !reading.problems.some(problem => BUILD_KINDS.has(problem.kind));

/** A server's ticket lifetime as Build() reads it (vless.go:121-132): one number, or two with a dash. */
export const readLifetime = (text: string): { from: bigint; to: bigint | null } | null => {
    const body = text.endsWith('s') ? text.slice(0, -1) : text;
    const dash = body.indexOf('-');
    const from = goAtoi(dash === -1 ? body : body.slice(0, dash));
    if (from === null) return null;
    if (dash === -1) return { from, to: null };
    const to = goAtoi(body.slice(dash + 1));
    return to === null ? null : { from, to };
};

/** The seconds a server's lifetime allows at most; 0 means tickets are off. */
export const lifetimeCeiling = (text: string): bigint | null => {
    const read = readLifetime(text);
    if (!read) return null;
    const to = read.to ?? 0n;
    return read.from > to ? read.from : to;
};

export type PaddingIssue =
    | { kind: 'shape'; block: string }
    | { kind: 'number'; block: string; part: string }
    | { kind: 'first'; block: string }
    | { kind: 'total' };

/** ParsePadding (common.go:223-257), which stops at the first thing wrong. */
export const paddingIssue = (padding: string): PaddingIssue | null => {
    if (padding === '') return null;
    let longest = 0n;
    const blocks = padding.split('.');
    for (let at = 0; at < blocks.length; at += 1) {
        const block = blocks[at]!;
        const fields = block.split('-');
        if (fields.length < 3 || !fields[0] || !fields[1] || !fields[2]) return { kind: 'shape', block };
        const numbers: bigint[] = [];
        for (const field of fields.slice(0, 3)) {
            const number = goAtoi(field);
            if (number === null) return { kind: 'number', block, part: field };
            numbers.push(number);
        }
        const [chance, min, max] = numbers as [bigint, bigint, bigint];
        if (at === 0 && (chance < 100n || min < BigInt(FIRST_PADDING_MINIMUM) || max < BigInt(FIRST_PADDING_MINIMUM))) {
            return { kind: 'first', block };
        }
        if (at % 2 === 0) longest += min > max ? min : max;
    }
    return longest > BigInt(PADDING_TOTAL_LIMIT) ? { kind: 'total' } : null;
};

/**
 * Whether 1184 bytes are an ML-KEM-768 encapsulation key Go will take: the
 * first 1152 bytes are three polynomials of 256 twelve-bit numbers, and every
 * one has to be below q = 3329 (FIPS 203 §7.2, the "modulus check" that
 * crypto/mlkem's NewEncapsulationKey768 applies). The last 32 bytes are the
 * seed ρ and can be anything.
 */
export const isMlkem768PublicKey = (bytes: Uint8Array): boolean => {
    if (bytes.length !== KEY_BYTES.mlkem768Public) return false;
    for (let at = 0; at < 1152; at += 3) {
        const a = bytes[at]!;
        const b = bytes[at + 1]!;
        const c = bytes[at + 2]!;
        if ((a | ((b & 0x0f) << 8)) >= 3329 || ((b >> 4) | (c << 4)) >= 3329) return false;
    }
    return true;
};

const preview = (value: unknown): string => {
    let text: string;
    try {
        text = JSON.stringify(value) ?? String(value);
    } catch {
        text = String(value);
    }
    return text.length > 48 ? `${text.slice(0, 47)}…` : text;
};

const shown = (text: string): string => JSON.stringify(text.length > 60 ? `${text.slice(0, 59)}…` : text);

const noun = (side: VlessEncryptionSide): string => (side === 'server' ? t("inbound") : t("outbound"));

/**
 * Read the value a VLESS inbound's `decryption` or an outbound's `encryption`
 * holds, as the core's loader does, and say everything it refuses.
 *
 * `held` is whatever the config has at the key. `what` is its path, for the
 * messages. A string that is not the dotted layout is reported and nothing
 * further is guessed about it; one that is gets every independent finding,
 * which is more than the core says (it stops at the first).
 */
export const readVlessEncryption = (held: unknown, side: VlessEncryptionSide, what: string): VlessEncryptionReading => {
    const result: VlessEncryptionReading = { side, none: false, parts: null, keys: [], problems: [], usable: false };
    const add = (kind: VlessEncryptionProblemKind, message: string, suggestion?: string, severity: 'critical' | 'warning' = 'critical') =>
        result.problems.push({ kind, field: what, severity, message, suggestion });

    if (held === undefined || held === null || held === '') {
        add('missing',
            side === 'server'
                ? t("{what} is missing, and every supported Xray refuses a VLESS inbound without it — the config will not load.", { what })
                : t("{what} is missing, and every supported Xray refuses a VLESS outbound without it — the config will not load.", { what }),
            t("Set it to \"none\", or use a VLESS Encryption string."));
        return result;
    }
    if (typeof held !== 'string') {
        add('type', t("{name} holds {value}, and Xray reads text here — it cannot read the config until this is replaced or removed.", { name: what, value: preview(held) }));
        return result;
    }
    if (held === NO_VLESS_ENCRYPTION) {
        result.none = true;
        return result;
    }

    const parts = held.split('.');
    if (parts.length < 4) {
        add('shape',
            t("{what} is {shown}. Xray reads \"none\" or a VLESS Encryption string — at least four parts separated by dots: mlkem768x25519plus, how it looks, how a session resumes, then the key — and refuses anything else, so the config will not load.", { what, shown: shown(held) }),
            t("Generate a key in the VLESS Encryption card, or paste what xray vlessenc prints."));
        return result;
    }
    result.parts = splitVlessEncryption(held) ?? {
        appearance: parts[1] ?? '',
        ticket: parts[2] ?? '',
        padding: '',
        keys: [],
    };

    const [handshake = '', appearance = '', ticket = ''] = parts;
    if (handshake !== VLESS_ENCRYPTION_HANDSHAKE) {
        add('handshake', t("{what} starts with {shown}. The first part has to be mlkem768x25519plus, in lower case — Xray refuses any other, so the config will not load.", { what, shown: shown(handshake) }));
    }
    if (!(APPEARANCES as readonly string[]).includes(appearance)) {
        add('appearance', t("The second part of {what} is {shown}. It has to be native, xorpub or random, in lower case — Xray refuses any other, so the config will not load.", { what, shown: shown(appearance) }));
    }
    if (side === 'server') {
        const lifetime = readLifetime(ticket);
        if (!lifetime) {
            add('lifetime', t("The third part of {what} is {shown}. On a server it is how long a session ticket lives — whole seconds like 600s, or a range like 300-600s — and Xray refuses anything else, so the config will not load.", { what, shown: shown(ticket) }));
        } else if ((lifetimeCeiling(ticket) ?? 0n) > 65535n) {
            // The server writes the lifetime it picked with EncodeLength, which
            // keeps two bytes (server.go:277, common.go:196-198), and the client
            // reads two (client.go:186). Nothing refuses it; it arrives cut.
            add('lifetime.wide',
                t("The ticket lifetime in {what} is {shown}. The server tells the client how long a ticket lives in two bytes, so anything above 65535 seconds reaches the client cut down.", { what, shown: shown(ticket) }),
                t("Use 65535 seconds (about 18 hours) or less."), 'warning');
        }
    } else if (!(RESUMPTIONS as readonly string[]).includes(ticket)) {
        add('resumption', t("The third part of {what} is {shown}. On a client it has to be 0rtt or 1rtt, in lower case — Xray refuses any other, so the config will not load.", { what, shown: shown(ticket) }));
    }

    // The rest: padding blocks, then keys. Build() calls a part short (padding)
    // or long (a key) by its length alone, and cuts the string by the size of
    // the short ones wherever they are.
    const rest = parts.slice(3);
    const leading: string[] = [];
    const keyTexts: string[] = [];
    let misplaced = false;
    for (const part of rest) {
        if (utf8Length(part) < PADDING_PART_LIMIT) {
            if (keyTexts.length === 0) leading.push(part);
            else misplaced = true;
        } else {
            keyTexts.push(part);
        }
    }

    let keysFine = true;
    keyTexts.forEach((text, index) => {
        const n = index + 1;
        const bytes = decodeRawUrlBase64(text);
        if (!bytes) {
            keysFine = false;
            add('key.chars',
                t("Key {n} of {what} is not unpadded URL-safe base64 — only A–Z, a–z, 0–9, - and _ are allowed, and no \"=\". Xray refuses it, so the config will not load.", { n, what }));
            return;
        }
        const kind: VlessKeyKind | null = bytes.length === KEY_BYTES.x25519
            ? 'x25519'
            : bytes.length === (side === 'server' ? KEY_BYTES.mlkem768Seed : KEY_BYTES.mlkem768Public) ? 'mlkem768' : null;
        if (!kind) {
            keysFine = false;
            add('key.size',
                side === 'server'
                    ? t("Key {n} of {what} is {bytes} bytes. A server takes a 32-byte X25519 private key or a 64-byte ML-KEM-768 seed — Xray refuses any other size, so the config will not load.", { n, what, bytes: bytes.length })
                    : t("Key {n} of {what} is {bytes} bytes. A client takes a 32-byte X25519 public key or a 1184-byte ML-KEM-768 public key — Xray refuses any other size, so the config will not load.", { n, what, bytes: bytes.length }),
                side === 'server' && bytes.length === KEY_BYTES.mlkem768Public
                    ? t("That is a client's public key. A server holds the private half — generate a pair, or use the server's own key.")
                    : side === 'client' && bytes.length === KEY_BYTES.mlkem768Seed
                        ? t("That is a server's private seed. A client needs the public key that goes with it — paste the server's decryption below to work it out.")
                        : undefined);
            return;
        }
        if (side === 'client' && kind === 'mlkem768' && !isMlkem768PublicKey(bytes)) {
            keysFine = false;
            add('key.encapsulation',
                t("Key {n} of {what} is the size of an ML-KEM-768 public key, but it is not one — a number in it is out of range, and Xray will not start the outbound with it.", { n, what }),
                t("Copy the client string again from the server's VLESS Encryption card, or generate a new pair."));
            return;
        }
        result.keys.push({ text, kind, bytes });
    });

    // With no key at all Build() panics at the cut, before anything about the
    // padding is looked at; with a padding block after a key the cut lands in
    // the key and what is left of the padding is not what was written.
    if (keyTexts.length === 0) {
        add('key.missing',
            t("{what} ends before its key. Xray runs off the end of the string while loading it, so the config will not load.", { what }),
            t("Add the key after the options, or generate a new one. A key is at least 20 characters; anything shorter is read as padding."));
        keysFine = false;
    } else if (misplaced) {
        keysFine = false;
        add('key.order',
            side === 'server'
                ? t("In {what} a padding block comes after a key. Padding goes first, then the keys: Xray cuts the string by the size of the short parts, so with this order it cuts into the key and the inbound will not start.", { what })
                : t("In {what} a padding block comes after a key. Padding goes first, then the keys: Xray cuts the string by the size of the short parts, so with this order it cuts into the key and the outbound will not start.", { what }),
            t("Move the padding blocks in front of the keys."));
    } else {
        const issue = paddingIssue(leading.join('.'));
        if (issue) {
            const n = noun(side);
            if (issue.kind === 'shape') {
                add('padding.shape', t("The padding block {shown} in {what} is not three numbers separated by dashes (chance-min-max). Xray cannot read it, and the {noun} will not start.", { shown: shown(issue.block), what, noun: n }),
                    t("Padding blocks look like 100-111-1111 and are separated by dots. A key is at least 20 characters, so a shorter one is read as padding."));
            } else if (issue.kind === 'number') {
                add('padding.number', t("The padding block {shown} in {what} holds {part}, which is not a whole number. Xray cannot read it, and the {noun} will not start.", { shown: shown(issue.block), what, part: shown(issue.part), noun: n }));
            } else if (issue.kind === 'first') {
                add('padding.first', t("The first padding block of {what}, {shown}, is too small. Xray wants a chance of 100 and a minimum and a maximum of at least 35 bytes in it, and the {noun} will not start otherwise.", { shown: shown(issue.block), what, noun: n }),
                    t("Start with something like 100-111-1111."));
            } else {
                add('padding.total', t("The length blocks of {what} add up to more than 65553 bytes at their largest. Xray will not start the {noun} with them.", { what, noun: n }));
            }
        }
    }

    result.usable = keysFine && !result.problems.some(problem => problem.severity === 'critical');
    return result;
};

// ── Where each side keeps it ────────────────────────────────────────────

const isVless = (item: unknown): item is Json =>
    isObject(item) && typeof item.protocol === 'string' && item.protocol.toLowerCase() === 'vless';

/** The key an inbound's string lives under. */
export const VLESS_DECRYPTION_PATH = ['settings', 'decryption'] as const;

/**
 * Where an outbound keeps its `encryption`, by the same test the core uses to
 * choose between its two shapes: flat as soon as `settings.address` is there
 * (infra/conf/vless.go:263-271 on v26.10.10 — Build() then overwrites `vnext`
 * and reads the flat `encryption`), otherwise the first user of the first
 * server.
 */
export const vlessEncryptionPath = (outbound: unknown): (string | number)[] =>
    serverShape(outbound) === 'flat'
        ? ['settings', 'encryption']
        : ['settings', 'vnext', 0, 'users', 0, 'encryption'];

/** The path as it is written in a diagnostic: `settings.vnext[0].users[0].encryption`. */
export const pathText = (path: readonly (string | number)[]): string =>
    path.reduce<string>((text, key) => (typeof key === 'number' ? `${text}[${key}]` : text === '' ? key : `${text}.${key}`), '');

const valueAt = (root: unknown, path: readonly (string | number)[]): unknown => {
    let current: unknown = root;
    for (const key of path) {
        if (current === null || typeof current !== 'object') return undefined;
        current = (current as Record<string | number, unknown>)[key];
    }
    return current;
};

/** The reading of the string an inbound holds, or null for something that is not a VLESS inbound. */
export const readVlessDecryption = (inbound: unknown): VlessEncryptionReading | null =>
    isVless(inbound) ? readVlessEncryption(valueAt(inbound, VLESS_DECRYPTION_PATH), 'server', pathText(VLESS_DECRYPTION_PATH)) : null;

/** The reading of the string an outbound holds, or null for something that is not a VLESS outbound. */
export const readVlessOutboundEncryption = (outbound: unknown): VlessEncryptionReading | null => {
    if (!isVless(outbound)) return null;
    const path = vlessEncryptionPath(outbound);
    return readVlessEncryption(valueAt(outbound, path), 'client', pathText(path));
};

/**
 * Everything the core refuses about the `decryption` of a VLESS inbound, and
 * the two neighbours that only matter beside it: `fallbacks`, which cannot be
 * used with an encrypting inbound, and an `encryption` on a user, which cannot
 * be there at all.
 *
 * The users list is the one the line reads: `clients`, and `users` only from
 * 26.7 and only when `clients` is not there (v26.7.28:infra/conf/vless.go:46-49).
 * Without a `version` only `clients` is looked at — what every line reads.
 */
export const vlessInboundEncryptionProblems = (inbound: unknown, version?: CoreVersionId): VlessEncryptionProblem[] => {
    const reading = readVlessDecryption(inbound);
    if (!reading) return [];
    const settings = isObject((inbound as Json).settings) ? ((inbound as Json).settings as Json) : {};
    const problems = [...reading.problems];

    // Build() compares what is left of the string with "none" once the grammar
    // has passed, so this holds for any string it takes — Init's complaints aside.
    if (!reading.none && buildAccepts(reading) && Array.isArray(settings.fallbacks)) {
        problems.push({
            kind: 'fallbacks',
            field: 'settings.fallbacks',
            severity: 'critical',
            message: t("{what} is set beside a VLESS Encryption decryption. Every supported Xray refuses fallbacks on an inbound that decrypts — an empty list too — and the config will not load.", { what: 'settings.fallbacks' }),
            suggestion: t("Remove the fallbacks, or set decryption to \"none\"."),
        });
    }

    const listKey = Array.isArray(settings.clients)
        ? 'clients'
        : version !== undefined && compareCoreVersions(version, '26.7') >= 0 && Array.isArray(settings.users) ? 'users' : undefined;
    const users = listKey ? (settings[listKey] as unknown[]) : [];
    users.forEach((user, index) => {
        if (!isObject(user)) return;
        const held = user.encryption;
        if (held === undefined || held === null || held === '') return;
        const field = `settings.${listKey}[${index}].encryption`;
        problems.push(typeof held === 'string'
            ? {
                kind: 'user.encryption', field, severity: 'critical',
                message: t("{what} is set. An inbound's users carry no encryption — every supported Xray refuses one, even \"none\" — and the config will not load.", { what: field }),
                suggestion: t("Remove it. The client's string goes in the client's outbound."),
            }
            : {
                kind: 'type', field, severity: 'critical',
                message: t("{name} holds {value}, and Xray reads text here — it cannot read the config until this is replaced or removed.", { name: field, value: preview(held) }),
            });
    });

    return problems;
};

/** Everything the core refuses about the `encryption` of a VLESS outbound. */
export const vlessOutboundEncryptionProblems = (outbound: unknown): VlessEncryptionProblem[] => {
    if (!isVless(outbound)) return [];
    // A vnext form with no user to hold it is a different refusal (one and only one member).
    if (serverShape(outbound) !== 'flat') {
        const vnext = isObject(outbound.settings) && Array.isArray(outbound.settings.vnext) ? outbound.settings.vnext[0] : undefined;
        const user = isObject(vnext) && Array.isArray(vnext.users) ? vnext.users[0] : undefined;
        if (!isObject(user)) return [];
    }
    return readVlessOutboundEncryption(outbound)?.problems ?? [];
};
