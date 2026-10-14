import { t } from '../../i18n';
import type { AwgTag } from './awg-tags';
import type { Note } from './types';

/**
 * Xray's noise expressions (26.10): a noise item of type `exp` builds its
 * datagram from a string of tags, such as `<b 0xDEADBEEF><r 8><t>`, instead of
 * holding the bytes (v26.10.10:infra/conf/transport_finalmask.go:317-332).
 *
 * The grammar, read off parseNoiseExp and buildNoiseSegment
 * (v26.10.10:infra/conf/transport_finalmask.go:361-441):
 *
 *   tags      `<\s*([a-z]+)(?:\s+([^>]*?))?\s*>`, separated by nothing but
 *             whitespace, at least one (:361-390)
 *   <b hex>   fixed bytes; whitespace inside is dropped, then one `0x` and one
 *             `0X` prefix, then hex.DecodeString (:407-416)
 *   <r size>  random bytes; <rc size> random letters, <rd size> random digits.
 *             `size` is "n" or "lo-hi" (ParseRangeString,
 *             v26.10.10:infra/conf/common.go:355-380), 0 ≤ lo ≤ hi ≤ 65535,
 *             and the length is drawn from lo to hi inclusive (:393-405, :417-422;
 *             noise/conn.go:70)
 *   <t>       the unix time, 4 bytes big-endian (:423-427)
 *   <c>       a counter, 4 bytes big-endian, one up for every packet the
 *             connection builds with it (:428-432)
 *   <n>       8 random bytes (:433-437)
 *
 * What each one sends is in v26.10.10:transport/internet/finalmask/noise/conn.go:37-91.
 * Every part is drawn again each time the packet is sent; nothing is frozen.
 *
 * This module is the one reader of that grammar: finalmask-rules.ts asks it
 * whether an expression builds (and words the answer in the core's terms),
 * and the AmneziaWG export asks it what an expression is made of.
 */

export type ExpSegment =
    | { kind: 'bytes'; hex: string }
    | { kind: 'random' | 'letters' | 'digits'; key: 'r' | 'rc' | 'rd'; min: number; max: number; size: string }
    | { kind: 'timestamp' | 'counter' | 'nonce' };

/** `strconv.Atoi`: an optional sign and decimal digits, nothing else. */
const atoi = (text: string): number | null => (/^[+-]?\d+$/.test(text) ? Number(text) : null);

/** `ParseRangeString` (v26.10.10:infra/conf/common.go:355-380): "114", "114-514", "-114-514", "". Null where it errors. */
const parseRangeString = (text: string): [number, number] | null => {
    const single = atoi(text);
    if (single !== null) return [single, single];
    if (text === '') return [0, 0];
    let pair: string[];
    if (text.startsWith('-')) {
        const at = text.indexOf('-', 1);
        pair = at < 0 ? [text] : [text.slice(0, at), text.slice(at + 1)];
    } else {
        const at = text.indexOf('-');
        pair = at < 0 ? [text] : [text.slice(0, at), text.slice(at + 1)];
    }
    if (pair.length !== 2) return null;
    const left = atoi(pair[0]!);
    const right = atoi(pair[1]!);
    return left !== null && right !== null ? [left, right] : null;
};

const SIZED = { r: 'random', rc: 'letters', rd: 'digits' } as const;
const BARE = { t: 'timestamp', c: 'counter', n: 'nonce' } as const;

/** One `<key arg>` as buildNoiseSegment builds it, or the core's own words for why not. */
const segmentOf = (key: string, arg: string): ExpSegment | { error: string } => {
    if (key === 'b') {
        let hex = arg.split(/\s+/).join('');
        if (hex.startsWith('0x')) hex = hex.slice(2);
        if (hex.startsWith('0X')) hex = hex.slice(2);
        if (hex === '') return { error: 'empty bytes in noise exp' };
        return /^([0-9a-fA-F]{2})+$/.test(hex) ? { kind: 'bytes', hex: hex.toLowerCase() } : { error: `invalid hex in noise exp: ${arg}` };
    }
    if (key === 'r' || key === 'rc' || key === 'rd') {
        if (arg === '') return { error: `<${key}> in noise exp needs a size` };
        const size = parseRangeString(arg);
        if (!size) return { error: `invalid range string: ${arg}` };
        const [min, max] = size;
        if (min < 0 || max < min || max > 65535) return { error: `invalid size in noise exp: ${arg}` };
        return { kind: SIZED[key], key, min, max, size: arg };
    }
    if (key === 't' || key === 'c' || key === 'n') {
        return arg === '' ? { kind: BARE[key] } : { error: `<${key}> in noise exp takes no argument` };
    }
    return { error: `unknown <${key}> in noise exp` };
};

/**
 * What `parseNoiseExp` (v26.10.10:infra/conf/transport_finalmask.go:363-390)
 * makes of an expression: its segments, or the error it answers, in its words.
 */
export const parseNoiseExp = (exp: string): { segments: ExpSegment[] } | { error: string } => {
    const tag = /<\s*([a-z]+)(?:\s+([^>]*?))?\s*>/g;
    const segments: ExpSegment[] = [];
    let last = 0;
    for (const match of exp.matchAll(tag)) {
        const before = exp.slice(last, match.index);
        if (before.trim() !== '') return { error: `invalid noise exp near ${before}` };
        last = match.index + match[0].length;
        const segment = segmentOf(match[1]!, match[2] ?? '');
        if ('error' in segment) return segment;
        segments.push(segment);
    }
    const rest = exp.slice(last);
    if (rest.trim() !== '') return { error: `invalid noise exp near ${rest}` };
    return segments.length === 0 ? { error: `empty noise exp: ${exp}` } : { segments };
};

/**
 * The AmneziaWG tag chain an expression is, when it is one.
 *
 * Compared with AmneziaWG's own tags (awg-tags.ts, from amneziawg-go's
 * device/obf*.go), most of the grammar is the same thing spelled the same way:
 *
 *   <b hex>          → <b 0xhex>   fixed bytes (device/obf_bytes.go)
 *   <r n>            → <r n>       n random bytes (device/obf_rand.go)
 *   <rc n>           → <rc n>      n letters from the same 52, lower case
 *                                  first, picked by byte % 52 on both sides
 *                                  (device/obf_randchars.go; Xray's conn.go:76-80)
 *   <rd n>           → <rd n>      n digits, byte % 10 on both (obf_randdigits.go; conn.go:81-85)
 *   <t>              → <t>         4 bytes of unix time, big-endian (obf_timestamp.go; conn.go:57-60)
 *   <n>              → <r 8>       8 random bytes, which is all <n> is (conn.go:65-68)
 *
 * Two things have no AmneziaWG spelling, and an expression with either is not
 * exported at all — half a decoy is not the decoy:
 *
 *   <c>              a counter that goes up with every packet sent; AmneziaWG
 *                    has no counter tag
 *   <r lo-hi> with lo < hi, and the same for rc and rd: a length drawn per
 *                    packet; AmneziaWG's tags take one fixed length
 */
export const awgTagsForExp = (segments: ExpSegment[]): { tags: AwgTag[] } | { notes: Note[] } => {
    const tags: AwgTag[] = [];
    const notes: Note[] = [];
    const note = (message: string) => {
        if (!notes.some(existing => existing.message === message)) notes.push({ severity: 'warning', message });
    };
    for (const segment of segments) {
        switch (segment.kind) {
            case 'bytes':
                tags.push({ key: 'b', value: `0x${segment.hex}` });
                break;
            case 'random':
            case 'letters':
            case 'digits':
                if (segment.min === segment.max) tags.push({ key: segment.key, value: String(segment.min) });
                else note(t("An exp noise item has <{key} {size}>, a length drawn between {min} and {max} for each packet; AmneziaWG's <{key}> takes one fixed length, so the item was left out.", { key: segment.key, size: segment.size, min: segment.min, max: segment.max }));
                break;
            case 'timestamp':
                tags.push({ key: 't' });
                break;
            case 'nonce':
                tags.push({ key: 'r', value: '8' });
                break;
            case 'counter':
                note(t("An exp noise item has <c>, a counter Xray raises with every packet it sends; AmneziaWG has no such tag, so the item was left out."));
                break;
        }
    }
    return notes.length > 0 ? { notes } : { tags };
};
