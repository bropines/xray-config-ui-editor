// ============================================================
// TLS and REALITY values the core is particular about
// ============================================================

/**
 * Three keys under `tlsSettings` / `realitySettings` that the form used to
 * get wrong, and what the core actually does with each. All three behave the
 * same on every supported line — the struct moved from
 * infra/conf/transport_internet.go (v26.3.27) to transport_security.go
 * (v26.7.28, v26.9.9) without changing — so nothing here asks for a version;
 * the tag is only named in the messages.
 *
 * Two different failures are involved, and they differ in when they bite:
 *
 *   - A value of the wrong JSON type (a string where the struct has an
 *     object) fails the *decode* of the whole document
 *     (v26.7.28:infra/conf/serial/loader.go:57-69). The settings object only
 *     has to be present; `security` need not select it.
 *   - A value of the right type that Build() rejects (a hash that is not
 *     hex) fails only when that object is built, i.e. when `security` is
 *     `tls` (v26.7.28:infra/conf/transport_internet.go:85-98).
 *
 * The editors say this next to the fields and the version rules say it in the
 * diagnostics panel; the words live here so the two cannot drift.
 */
import { t } from '../../i18n';

const isObject = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value);

/** A JSON key is absent for the decoder when it is missing or `null`. */
const absent = (value: unknown): boolean => value === undefined || value === null;

// ── pinnedPeerCertSha256 ───────────────────────────────────────────────

/**
 * What `strings.TrimSpace` strips: Unicode White_Space. Not `String.trim()`,
 * which also takes U+FEFF and leaves U+0085 — a pasted byte-order mark is
 * exactly the kind of thing that makes a hash "not hex" to the core while
 * looking fine here.
 */
const GO_SPACE = '\\t\\n\\v\\f\\r \\u0085\\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000';
const GO_TRIM = new RegExp(`^[${GO_SPACE}]+|[${GO_SPACE}]+$`, 'g');

export type PinProblemKind =
    /** Not a string at all: the decode fails. */
    | 'not-text'
    /** An entry with something other than hex digits and colons in it. */
    | 'not-hex'
    /** Hex, but not 64 digits of it. */
    | 'wrong-length'
    /** Commas and spaces only: it loads, and pins nothing. */
    | 'no-hash';

export interface PinProblem {
    kind: PinProblemKind;
    /** `critical`: the config does not load. `warning`: it loads and does not do what it says. */
    severity: 'critical' | 'warning';
    /** The entry at fault, as it was written. */
    entry?: string;
    message: string;
}

export interface PinCheck {
    /** The hashes the core would pin: 64 lower-case hex digits each. */
    hashes: string[];
    /** The first thing wrong, which is also where the core stops. */
    problem?: PinProblem;
}

const shorten = (entry: string): string => (entry.length > 24 ? `${entry.slice(0, 20)}…` : entry);

/**
 * Reads `tlsSettings.pinnedPeerCertSha256` the way TLSConfig.Build() does
 * (v26.7.28:infra/conf/transport_security.go:364-380; the same code at
 * v26.9.9 and at v26.3.27:infra/conf/transport_internet.go:717-733):
 *
 *     for v := range strings.SplitSeq(c.PinnedPeerCertSha256, ",") {
 *         v = strings.TrimSpace(v)
 *         if v == "" { continue }
 *         hashValue, err := hex.DecodeString(strings.ReplaceAll(v, ":", ""))
 *         if err != nil { return nil, err }
 *         if len(hashValue) != 32 { return nil, errors.New("incorrect … length") }
 *
 * So: one string; several hashes separated by commas; spaces around each
 * are ignored and so are empty entries; colons anywhere in an entry are
 * dropped (the form `openssl x509 -fingerprint -sha256` prints); what is left
 * must be hex, either case, and exactly 64 digits. No other prefix or
 * delimiter is tolerated — not `0x`, not `sha256/`, not a space inside a
 * hash — and Base64 is not hex. Every failure is returned from Build(), so a
 * wrong value is refused at load; it never loads and quietly fails to match.
 *
 * The one silent case is a value with no entry in it at all: nothing is
 * appended, `len(c.PinnedPeerCertSha256) > 0` is false and the pin check is
 * switched off (v26.7.28:transport/internet/tls/config.go:400-404).
 */
export const checkPinnedCertSha256 = (value: unknown, tag: string): PinCheck => {
    if (absent(value) || value === '') return { hashes: [] };
    if (typeof value !== 'string') {
        return {
            hashes: [],
            problem: {
                kind: 'not-text',
                severity: 'critical',
                message: t("This is not text, and Xray {tag} reads text here — it cannot read the config. Write the hashes on one line, separated by commas.", { tag }),
            },
        };
    }

    const hashes: string[] = [];
    for (const piece of value.split(',')) {
        const entry = piece.replace(GO_TRIM, '');
        if (entry === '') continue;
        const digits = entry.replaceAll(':', '');
        if (!/^[0-9a-fA-F]*$/.test(digits)) {
            return {
                hashes,
                problem: {
                    kind: 'not-hex',
                    severity: 'critical',
                    entry,
                    message: t("“{entry}” is not hex. Xray {tag} reads each hash as 64 hex digits and refuses the config otherwise — a Base64 hash has to be converted first.", { entry: shorten(entry), tag }),
                },
            };
        }
        // An odd count fails hex.DecodeString, an even one that is not 64
        // fails the length check after it. Either way the config is refused.
        if (digits.length !== 64) {
            return {
                hashes,
                problem: {
                    kind: 'wrong-length',
                    severity: 'critical',
                    entry,
                    message: t("“{entry}” has {n} hex digits where a SHA-256 hash has 64 — Xray {tag} refuses the config.", { entry: shorten(entry), n: digits.length, tag }),
                },
            };
        }
        hashes.push(digits.toLowerCase());
    }

    if (hashes.length === 0) {
        return {
            hashes,
            problem: {
                kind: 'no-hash',
                severity: 'warning',
                message: t("There is no hash in this value, so Xray {tag} pins nothing and checks the certificate the ordinary way.", { tag }),
            },
        };
    }
    return { hashes };
};

// ── REALITY fallback limits ────────────────────────────────────────────

/**
 * `realitySettings.limitFallbackUpload` / `limitFallbackDownload`.
 *
 * Each decodes into a struct of three `uint64` with no json tags
 * (v26.7.28:infra/conf/transport_security.go:21-25 and :42-43; the same at
 * v26.9.9 and at v26.3.27:infra/conf/transport_internet.go:774-778, :795-796):
 *
 *     type LimitFallback struct {
 *         AfterBytes       uint64
 *         BytesPerSec      uint64
 *         BurstBytesPerSec uint64
 *     }
 *
 * Only the server branch of Build() copies them
 * (v26.7.28:infra/conf/transport_security.go:171-178), the transport hands
 * them to the REALITY library (v26.7.28:transport/internet/reality/config.go:40-49),
 * and the library applies them to the connections it forwards to the target
 * instead of serving — the ones that did not authenticate. That code is
 * github.com/xtls/reality, at the commit each line's go.mod pins: 9234c772ba8f
 * for v26.3.27 and v26.7.28 (tls.go:104-137, :275, :437-442) and 8cdf7bf9c7f0
 * for v26.9.9 (the same code at tls.go:104-137, :285, :447-452):
 *
 *   - `bytesPerSec` is the refill rate of a token bucket. Zero returns the
 *     connection unwrapped: no limit, and the other two are never read.
 *   - `afterBytes` is how much of a connection passes before reads start
 *     waiting on the bucket.
 *   - `burstBytesPerSec` is the bucket's capacity — a size in bytes despite
 *     the name — and is raised to `bytesPerSec` when it is smaller.
 *
 * Upload is client → target, download is target → client.
 *
 * Listed in the order the editor draws them rather than the struct's: the
 * rate first, because without it the other two are never read.
 */
export const FALLBACK_LIMIT_KEYS = ['bytesPerSec', 'afterBytes', 'burstBytesPerSec'] as const;
export type FallbackLimitKey = (typeof FALLBACK_LIMIT_KEYS)[number];

/**
 * The config's own spellings of one sub-field. With no json tag the decoder
 * matches the Go field name case-insensitively, so `AfterBytes` is as good as
 * `afterBytes` — and when both are there, the later one wins.
 */
const spellingsOf = (limit: Record<string, unknown>, key: FallbackLimitKey): string[] =>
    Object.keys(limit).filter(name => name.toLowerCase() === key.toLowerCase());

/** One sub-field as the core would read it; `undefined` when it is not set. */
export const readFallbackLimit = (limit: unknown, key: FallbackLimitKey): unknown => {
    if (!isObject(limit)) return undefined;
    const spellings = spellingsOf(limit, key);
    const last = spellings[spellings.length - 1];
    const held = last === undefined ? undefined : limit[last];
    return held === null ? undefined : held;
};

/** What a `uint64` field takes from JSON: a whole number, zero or more. */
const isByteCount = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= 0;

/**
 * The limit with one sub-field set, or cleared when `amount` is undefined.
 *
 * Returns `undefined` once nothing is left, so the caller removes the key: an
 * empty object would decode, but it is a limit that limits nothing. Keys this
 * file does not know are kept — they are the config's, not the form's.
 * Anything that is not an object is replaced rather than spread: spreading
 * the string the old form wrote would turn it into a key per character.
 */
export const withFallbackLimit = (
    limit: unknown,
    key: FallbackLimitKey,
    amount: number | undefined,
): Record<string, unknown> | undefined => {
    const next: Record<string, unknown> = isObject(limit) ? { ...limit } : {};
    for (const spelling of spellingsOf(next, key)) delete next[spelling];
    if (amount !== undefined && Number.isFinite(amount)) next[key] = Math.max(0, Math.trunc(amount));
    return Object.keys(next).length > 0 ? next : undefined;
};

export interface FallbackLimitProblem {
    /** The sub-field at fault; absent when the whole value is the wrong type. */
    key?: FallbackLimitKey;
    message: string;
}

/**
 * Why the core cannot decode a fallback limit. Empty when it can.
 *
 * `name` is the key as the config spells it — `limitFallbackUpload`.
 */
export const fallbackLimitProblems = (limit: unknown, name: string, tag: string): FallbackLimitProblem[] => {
    if (absent(limit)) return [];
    if (!isObject(limit)) return [{ message: objectExpected(name, tag) }];
    return FALLBACK_LIMIT_KEYS
        .filter(key => {
            const held = readFallbackLimit(limit, key);
            return held !== undefined && !isByteCount(held);
        })
        .map(key => ({
            key,
            // The value is spelled out: a field that takes numbers cannot
            // draw `"1000"` or `-1`, and what is held must still be shown.
            message: t("{key} holds {value}; it has to be a whole number of bytes, 0 or more — Xray {tag} cannot read the config otherwise.", {
                key: `${name}.${key}`,
                value: shorten(JSON.stringify(readFallbackLimit(limit, key)) ?? ''),
                tag,
            }),
        }));
};

/**
 * Whether a limit is set up to do nothing: a free allowance or a burst with
 * no rate. Not an error — the config loads — but not what its author meant.
 */
export const fallbackLimitIsInert = (limit: unknown): boolean => {
    if (!isObject(limit)) return false;
    const rate = readFallbackLimit(limit, 'bytesPerSec');
    if (isByteCount(rate) && rate > 0) return false;
    return (['afterBytes', 'burstBytesPerSec'] as const).some(key => {
        const held = readFallbackLimit(limit, key);
        return isByteCount(held) && held > 0;
    });
};

/** "1.5 MiB" for 1572864; nothing below a kibibyte, where the number says it. */
export const formatByteCount = (bytes: unknown): string | undefined => {
    if (!isByteCount(bytes) || bytes < 1024) return undefined;
    const units = ['KiB', 'MiB', 'GiB', 'TiB'];
    let amount = bytes / 1024;
    let unit = 0;
    while (amount >= 1024 && unit < units.length - 1) {
        amount /= 1024;
        unit += 1;
    }
    return `${Number(amount.toFixed(2))} ${units[unit]}`;
};

// ── Keys that must hold an object ──────────────────────────────────────

/** The sentence for an object-typed key that holds something else. */
export const objectExpected = (name: string, tag: string): string =>
    t("{key} has to be an object — Xray {tag} cannot read the config with anything else there.", { key: name, tag });

/**
 * `tlsSettings.echSockopt` is a `*SocketConfig`, the struct `sockopt` itself
 * decodes into (v26.7.28:infra/conf/transport_security.go:318, the same at
 * v26.9.9; v26.3.27:infra/conf/transport_internet.go:666). Anything but an
 * object fails the decode.
 */
export const echSockoptProblem = (value: unknown, tag: string): string | undefined =>
    absent(value) || isObject(value) ? undefined : objectExpected('echSockopt', tag);
