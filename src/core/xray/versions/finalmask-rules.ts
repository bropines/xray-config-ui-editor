/**
 * Finalmask, line by line: which settings each mask's struct decodes, which
 * side reads them, and the rules about where in a chain a mask may sit.
 *
 * FEATURES answers "does this line know this key" one path at a time, which
 * is enough for a checker but not for a form: a form has to draw every key a
 * mask takes on the chosen line, including the ones nothing ever changed.
 * MASK_KEYS is that list, read off the structs in
 * `infra/conf/transport_internet.go` (v26.3.27) and
 * `infra/conf/transport_finalmask.go` (v26.7.28, v26.9.9, v26.9.30,
 * v26.10.10). Where a FEATURES row exists for a key it still wins —
 * `maskKeyStatus` asks it first — and finalmask-rules.test.ts holds the two to
 * each other.
 *
 * A key can change its JSON type between lines, and then the table says so
 * with one entry per type and disjoint `lines`: xdns `domains` is a list of
 * strings on 26.7 and 26.9, a list of `{name, ...}` objects on v26.9.30 and a
 * list of `{names, ...}` objects on 26.10. Every lookup here is by key *and*
 * line for that reason.
 *
 * v26.9.30 and v26.10.10 share every other mask, the chain rules and the
 * quicParams: `git diff v26.9.30 v26.10.10` is empty for finalmask.go, xicmp,
 * udphop, realm, sudoku, noise, xmc, the header masks and the rest of
 * transport_finalmask.go. Only xdns differs, so only xdns has a line of its
 * own below.
 *
 * The chain rules at the bottom are the part no key table can say: a mask
 * that only works at one end of the list, and which end that is, moved
 * between lines. All of them fail at runtime rather than at load, so their
 * severity follows who pays: an inbound that cannot listen stops the core
 * from starting (`v26.9.9:app/proxyman/inbound/inbound.go:115` returns the
 * handler's error from Start), an outbound that cannot dial only fails its
 * own connections. What does fail at load — xdns and udphop settings, a noise
 * expression — is critical on either side.
 */
import { t } from '../../../i18n';
import { coreVersion, type CoreVersionId } from './index';
import { allowedValues, coreValueSet, FEATURES, type FeatureStatus } from './features';
import { parseNoiseExp } from '../../noise/exp';

export type MaskList = 'tcp' | 'udp';
export type MaskSide = 'inbound' | 'outbound';

/** Where finalmask sits in an inbound or outbound — the prefix of every path here. */
export const FINALMASK_PATH = 'streamSettings.finalmask';

/**
 * The JSON a settings key decodes into, which is what an editor draws for it.
 *
 *   range   Int32Range: `10` or `"5-30"`
 *   ranges  []Int32Range
 *   ports   PortList: `443` or `"20000-30000,443"`
 *   choice  a string from `options`; empty means the core's default
 *   flags   a comma-separated combination of `options`
 *   objects a list of JSON objects (`[]struct`): a string in it is a type
 *           error that fails the decode of the whole config
 *   json    anything with inner structure (items, TLS); `expects` says which
 *           kind of JSON the struct reads when it is not left open
 *   noise   the noise mask's item list
 *   udpHop  quicParams.udpHop: `{ports, interval}`
 */
export type MaskKeyShape =
    | 'string' | 'strings' | 'range' | 'ranges' | 'ports' | 'number' | 'bool'
    | 'choice' | 'flags' | 'objects' | 'json' | 'noise' | 'udpHop';

export interface MaskKey {
    key: string;
    shape: MaskKeyShape;
    /** The lines whose struct decodes this key. */
    lines: CoreVersionId[];
    /** Decoded on both sides, read by one. */
    side?: MaskSide;
    options?: string[];
    /** A second spelling the core falls back to: shown when present, never offered. */
    legacy?: boolean;
    /** `json` only: the JSON kind the struct reads. Unset leaves it open. */
    expects?: 'object' | 'array';
    /** `objects` only: one element as the core reads it, for a placeholder. */
    example?: string;
}

const ALL: CoreVersionId[] = ['26.3', '26.7', '26.9', '26.9.30', '26.10'];
const FROM_267: CoreVersionId[] = ['26.7', '26.9', '26.9.30', '26.10'];
const FROM_269: CoreVersionId[] = ['26.9', '26.9.30', '26.10'];
/** v26.9.30 and later: the lines that have the noise `exp` item, MASQUE and the new chain rules. */
const FROM_2693: CoreVersionId[] = ['26.9.30', '26.10'];
const ONLY_263: CoreVersionId[] = ['26.3'];
const ONLY_267_269: CoreVersionId[] = ['26.7', '26.9'];
const ONLY_269: CoreVersionId[] = ['26.9'];
const ONLY_2693: CoreVersionId[] = ['26.9.30'];
const ONLY_2610: CoreVersionId[] = ['26.10'];
const UNTIL_267: CoreVersionId[] = ['26.3', '26.7'];

// Sudoku is one struct for both lists and the same on every line:
// v26.3.27:transport_internet.go:1618, v26.9.9:transport_finalmask.go:654,
// v26.9.30:transport_finalmask.go:750, v26.10.10:transport_finalmask.go:749.
// The snake_case keys are fallbacks Build() reads when the camelCase one is empty.
const SUDOKU: MaskKey[] = [
    { key: 'password', shape: 'string', lines: ALL },
    { key: 'ascii', shape: 'string', lines: ALL },
    { key: 'customTable', shape: 'string', lines: ALL },
    { key: 'customTables', shape: 'strings', lines: ALL },
    { key: 'paddingMin', shape: 'number', lines: ALL },
    { key: 'paddingMax', shape: 'number', lines: ALL },
    { key: 'custom_table', shape: 'string', lines: ALL, legacy: true },
    { key: 'custom_tables', shape: 'strings', lines: ALL, legacy: true },
    { key: 'padding_min', shape: 'number', lines: ALL, legacy: true },
    { key: 'padding_max', shape: 'number', lines: ALL, legacy: true },
];

/** The eight 26.3 UDP masks mkcp-legacy replaced; none of them survived 26.3. */
const HEADER_TYPES = ['header-dtls', 'header-srtp', 'header-utp', 'header-wechat', 'header-wireguard'];

export const MASK_KEYS: Record<MaskList, Record<string, MaskKey[]>> = {
    tcp: {
        // v26.3.27:transport_internet.go:1270, v26.9.9:transport_finalmask.go:103,
        // v26.9.30:transport_finalmask.go:104, v26.10.10:transport_finalmask.go:103 — three lists of item lists
        'header-custom': [
            { key: 'clients', shape: 'json', lines: ALL, expects: 'array' },
            { key: 'servers', shape: 'json', lines: ALL, expects: 'array' },
            { key: 'errors', shape: 'json', lines: ALL, expects: 'array' },
        ],
        // v26.3.27:transport_internet.go:1383; lengths/delays from v26.7.28:transport_finalmask.go:238
        fragment: [
            { key: 'packets', shape: 'string', lines: ALL },
            { key: 'length', shape: 'range', lines: ALL },
            { key: 'lengths', shape: 'ranges', lines: FROM_267 },
            { key: 'delay', shape: 'range', lines: ALL },
            { key: 'delays', shape: 'ranges', lines: FROM_267 },
            { key: 'maxSplit', shape: 'range', lines: ALL },
        ],
        sudoku: SUDOKU,
        // v26.7.28:transport_finalmask.go:723, v26.9.30:transport_finalmask.go:878, v26.10.10:transport_finalmask.go:868;
        // hostname only reaches newClientConn (v26.9.9:transport/internet/finalmask/xmc/config.go:13).
        xmc: [
            { key: 'password', shape: 'string', lines: FROM_267 },
            { key: 'profiles', shape: 'json', lines: FROM_267, expects: 'array' },
            { key: 'hostname', shape: 'string', lines: FROM_267, side: 'outbound' },
        ],
    },
    udp: {
        // v26.3.27:transport_internet.go:1484; mode from v26.7.28:transport_finalmask.go:505,
        // matched exactly — "" and "prefix" are the same thing.
        'header-custom': [
            { key: 'mode', shape: 'choice', lines: FROM_267, options: ['prefix', 'standalone'] },
            { key: 'client', shape: 'json', lines: ALL, expects: 'array' },
            { key: 'server', shape: 'json', lines: ALL, expects: 'array' },
        ],
        // v26.3.27:transport_internet.go:1547 (domain defaults to www.baidu.com)
        'header-dns': [{ key: 'domain', shape: 'string', lines: ONLY_263 }],
        ...Object.fromEntries([...HEADER_TYPES, 'mkcp-original'].map(type => [type, [] as MaskKey[]])),
        // v26.3.27:transport_internet.go:1598
        'mkcp-aes128gcm': [{ key: 'password', shape: 'string', lines: ONLY_263 }],
        // v26.7.28:transport_finalmask.go:595 — header picks the old type, value
        // carries what the old settings did (dns domain, aes128gcm password).
        'mkcp-legacy': [
            { key: 'header', shape: 'choice', lines: FROM_267, options: ['dns', 'dtls', 'srtp', 'utp', 'wechat', 'wireguard'] },
            { key: 'value', shape: 'string', lines: FROM_267 },
        ],
        // v26.3.27:transport_internet.go:1435, v26.9.9:transport_finalmask.go:306
        noise: [
            { key: 'noise', shape: 'noise', lines: ALL },
            { key: 'reset', shape: 'range', lines: ALL },
        ],
        // v26.3.27:transport_internet.go:1608; packetSize from v26.7.28:transport_finalmask.go:632
        salamander: [
            { key: 'password', shape: 'string', lines: ALL },
            { key: 'packetSize', shape: 'range', lines: FROM_267 },
        ],
        sudoku: SUDOKU,
        // v26.3.27:transport_internet.go:1662 took one domain. v26.7.28:transport_finalmask.go:695
        // splits it: the server answers for `domains` (xdns/server.go:69), the
        // client sends through `resolvers` (xdns/client.go:58). Both are lists of
        // strings on 26.7 and 26.9 (v26.9.9:transport_finalmask.go:701-702).
        //
        // v26.9.30:transport_finalmask.go:828-832 makes both lists of OBJECTS, and a
        // string in either fails the decode of the whole config: a domain is
        // {name, lenLimit, labelLimit, types, edns0} (:794-800) and a resolver
        // {type, settings} (:823-826), `type` picking the struct `settings` is
        // read into (tcp or udp, each {addr}, :802-821). `domains` is now read on
        // both sides — the client builds its queries from it
        // (v26.9.30:xdns/client.go:67-78) — while `resolvers` and `extraPoll` are
        // the client's alone (xdns/server.go reads neither).
        //
        // v26.10.10:transport_finalmask.go:805 keeps the two lists of objects and
        // changes what is in them: a domain takes `names`, a list, in the place
        // of `name`, and a resolver takes `addrs` in the place of `type` and
        // `settings`.
        xdns: [
            { key: 'domain', shape: 'string', lines: ONLY_263 },
            { key: 'domains', shape: 'strings', lines: ONLY_267_269, side: 'inbound' },
            { key: 'resolvers', shape: 'strings', lines: ONLY_267_269, side: 'outbound' },
            { key: 'domains', shape: 'objects', lines: ONLY_2693, example: '{"name": "t.example.com", "types": [16]}' },
            { key: 'resolvers', shape: 'objects', lines: ONLY_2693, side: 'outbound', example: '{"type": "udp", "settings": {"addr": "1.1.1.1:53"}}' },
            { key: 'domains', shape: 'objects', lines: ONLY_2610, example: '{"names": ["t.example.com"]}' },
            { key: 'resolvers', shape: 'objects', lines: ONLY_2610, side: 'outbound', example: '{"addrs": ["1.1.1.1:53"]}' },
            { key: 'extraPoll', shape: 'number', lines: FROM_2693, side: 'outbound' },
        ],
        // v26.3.27:transport_internet.go:1676; v26.7.28:transport_finalmask.go:798. Only the
        // client opens a datagram ICMP socket (v26.9.9:finalmask/xicmp/client.go:56).
        xicmp: [
            { key: 'listenIp', shape: 'string', lines: ONLY_263 },
            { key: 'id', shape: 'number', lines: ONLY_263 },
            { key: 'ips', shape: 'strings', lines: FROM_267 },
            { key: 'dgram', shape: 'bool', lines: FROM_267, side: 'outbound' },
        ],
        // v26.7.28:transport_finalmask.go:818; ipMode/portMapping v26.9.9:transport_finalmask.go:825,
        // v26.10.10:transport_finalmask.go:963 (tlsConfig and portMapping are pointers to structs)
        realm: [
            { key: 'url', shape: 'string', lines: FROM_267 },
            { key: 'stunServers', shape: 'strings', lines: FROM_267 },
            { key: 'tlsConfig', shape: 'json', lines: FROM_267, expects: 'object' },
            { key: 'ipMode', shape: 'choice', lines: FROM_269, options: ['dual', 'v4', 'v6'] },
            { key: 'portMapping', shape: 'json', lines: FROM_269, expects: 'object' },
        ],
        // v26.9.9:transport_finalmask.go:911, v26.9.30:transport_finalmask.go:1063, v26.10.10:transport_finalmask.go:1053.
        // The whole mask is client-only (finalmask/udphop/config.go:19, v26.9.30 and v26.10.10: config.go:16), so its
        // keys carry no side of their own. v26.9.30 lost the mask's own sockopt: the hops dial
        // with the outbound's (v26.9.30:transport/internet/memory_settings.go:76).
        udphop: [
            { key: 'mode', shape: 'flags', lines: FROM_269, options: ['intervalLocal', 'intervalRemote', 'perConnRemote'] },
            { key: 'interval', shape: 'range', lines: FROM_269 },
            { key: 'remotePorts', shape: 'ports', lines: FROM_269 },
            { key: 'remoteIPs', shape: 'strings', lines: FROM_269 },
            { key: 'sockopt', shape: 'json', lines: ONLY_269, expects: 'object' },
        ],
    },
};

/**
 * `finalmask.quicParams`, one struct per line: v26.3.27:transport_internet.go:630,
 * v26.7.28:transport_finalmask.go:930, v26.9.9:transport_finalmask.go:993,
 * v26.9.30:transport_finalmask.go:1142, v26.10.10:transport_finalmask.go:1132 (the same keys as 26.9).
 * All numbers are plain integers — `maxIdleTimeout` and `keepAlivePeriod` in
 * seconds — and there is no handshake timeout at all.
 */
export const QUIC_KEYS: MaskKey[] = [
    { key: 'congestion', shape: 'choice', lines: ALL, options: ['reno', 'bbr', 'brutal', 'force-brutal'] },
    { key: 'bbrProfile', shape: 'choice', lines: FROM_267, options: ['conservative', 'standard', 'aggressive'] },
    { key: 'brutalUp', shape: 'string', lines: ALL },
    { key: 'brutalDown', shape: 'string', lines: ALL },
    { key: 'brutalDisableLossCompensation', shape: 'bool', lines: FROM_269 },
    { key: 'maxIdleTimeout', shape: 'number', lines: ALL },
    { key: 'keepAlivePeriod', shape: 'number', lines: ALL },
    { key: 'initStreamReceiveWindow', shape: 'number', lines: ALL },
    { key: 'maxStreamReceiveWindow', shape: 'number', lines: ALL },
    { key: 'initConnectionReceiveWindow', shape: 'number', lines: ALL },
    { key: 'maxConnectionReceiveWindow', shape: 'number', lines: ALL },
    { key: 'maxIncomingStreams', shape: 'number', lines: ALL },
    { key: 'disablePathMTUDiscovery', shape: 'bool', lines: ALL },
    { key: 'disableChromeParrot', shape: 'bool', lines: FROM_269 },
    { key: 'disableGSO', shape: 'bool', lines: FROM_269 },
    { key: 'disableStatelessReset', shape: 'bool', lines: FROM_269 },
    { key: 'debug', shape: 'bool', lines: ALL },
    // Gone from the struct in 26.9, where the udphop mask does the job.
    { key: 'udpHop', shape: 'udpHop', lines: UNTIL_267 },
];

/** Masks the core refuses to run on a server (`WrapPacketConnServer` errors). */
const CLIENT_ONLY_TYPES = new Set(['udphop']);

export const maskKeys = (list: MaskList, type: string): MaskKey[] =>
    MASK_KEYS[list][type.toLowerCase()] ?? [];

export interface KeyStatus {
    status: FeatureStatus;
    /** The line decodes the key, but only this side does anything with it. */
    readBy?: MaskSide;
    legacy?: boolean;
    /** What to use instead, when a FEATURES row names something. */
    replacement?: string;
}

const statusOf = (
    version: CoreVersionId,
    path: string,
    spec: MaskKey | undefined,
    side?: MaskSide,
): KeyStatus => {
    // A FEATURES row is the per-path answer the checker gives, so the form
    // gives the same one. Only the loud answers need it: "accepted" and
    // "absent" follow from the key table, and the test holds them together.
    const scope = side ?? 'outbound';
    const row = FEATURES.find(feature =>
        feature.scope === scope && feature.path === path && feature.value === undefined && !feature.protocol);
    const rowStatus = row?.status[version];
    const replacement = row?.replacement ? { replacement: row.replacement } : {};
    if (rowStatus === 'rejected' || rowStatus === 'deprecated') return { status: rowStatus, ...replacement };
    if (!spec || !spec.lines.includes(version)) return { status: 'absent', ...(rowStatus === 'absent' ? replacement : {}) };
    if (side && spec.side && spec.side !== side) return { status: 'accepted', readBy: spec.side };
    return spec.legacy ? { status: 'accepted', legacy: true } : { status: 'accepted' };
};

/**
 * The entry for a key as `version` reads it. Where the lines disagree about
 * the key's type there is one entry per type, so the line decides; a key no
 * entry gives to this line comes back as some other line's entry, which
 * `statusOf` then calls absent.
 */
const specFor = (specs: MaskKey[], key: string, version: CoreVersionId): MaskKey | undefined =>
    specs.find(spec => spec.key === key && spec.lines.includes(version)) ?? specs.find(spec => spec.key === key);

/** What `version` does with one settings key of one mask, seen from `side`. */
export const maskKeyStatus = (
    version: CoreVersionId,
    list: MaskList,
    type: string,
    key: string,
    side?: MaskSide,
): KeyStatus =>
    statusOf(
        version,
        `${FINALMASK_PATH}.${list}[type=${type.toLowerCase()}].settings.${key}`,
        specFor(maskKeys(list, type), key, version),
        side,
    );

/** What `version` does with one quicParams key. */
export const quicKeyStatus = (version: CoreVersionId, key: string, side?: MaskSide): KeyStatus =>
    statusOf(version, `${FINALMASK_PATH}.quicParams.${key}`, specFor(QUIC_KEYS, key, version), side);

/**
 * Whether a value already in a config is the JSON type the core decodes this
 * key from. A mask's settings are unmarshalled into its typed struct when
 * the mask is built (v26.10.10:infra/conf/loader.go:51, returned by
 * Mask.Build at transport_finalmask.go:1121-1124), and a value of the wrong
 * type — a string where a struct is read, an object in a list of strings —
 * is a type error that stops the config from loading, not just that key from
 * working. A form must therefore show such a value as it is and offer to
 * remove it, never draw an input that would coerce it. Only the collection
 * shapes are checked: they are the ones whose editors parse text, and scalars
 * are what the inputs already write.
 */
export const heldTypeMatches = (spec: MaskKey, value: unknown): boolean => {
    if (value === undefined || value === null) return true;
    const list = Array.isArray(value) ? value : null;
    switch (spec.shape) {
        case 'strings': return !!list && list.every(entry => typeof entry === 'string');
        // Int32Range reads a number or a string.
        case 'ranges': return !!list && list.every(entry => typeof entry === 'string' || typeof entry === 'number');
        case 'objects': return !!list && list.every(isObject);
        case 'noise': return !!list && list.every(isObject);
        case 'udpHop': return isObject(value);
        case 'json':
            if (spec.expects === 'object') return isObject(value);
            if (spec.expects === 'array') return list !== null;
            return true;
        default: return true;
    }
};

/**
 * The keys a form should offer for a mask: decoded on this line, not a
 * fallback spelling, and read on this side. With no side known, both sides'
 * keys are offered.
 */
export const offeredMaskKeys = (version: CoreVersionId, list: MaskList, type: string, side?: MaskSide): MaskKey[] =>
    maskKeys(list, type).filter(spec =>
        spec.lines.includes(version) && !spec.legacy && (!side || !spec.side || spec.side === side));

export const offeredQuicKeys = (version: CoreVersionId): MaskKey[] =>
    QUIC_KEYS.filter(spec => spec.lines.includes(version));

export interface MaskTypeStatus {
    /** This line registers the type in this list. */
    accepted: boolean;
    /** What took its place, when the value set names something. */
    replacement?: string;
    /** Registered, but the core refuses to run it on this side. */
    clientOnly?: boolean;
}

export const maskTypeStatus = (version: CoreVersionId, list: MaskList, type: string, side?: MaskSide): MaskTypeStatus => {
    const id = `finalmask.${list}.type`;
    const wanted = type.toLowerCase();
    const accepted = allowedValues(version, id).some(value => value.toLowerCase() === wanted);
    const replacement = accepted ? undefined : coreValueSet(id)?.replacedBy?.[wanted];
    return {
        accepted,
        ...(replacement ? { replacement } : {}),
        ...(accepted && side === 'inbound' && CLIENT_ONLY_TYPES.has(wanted) ? { clientOnly: true } : {}),
    };
};

/**
 * The types a chooser should list: what this line registers in this list,
 * minus client-only masks on an inbound, plus the current type whatever it is
 * — a chooser that goes blank on a refused type hides the one thing the user
 * needs to see.
 */
export const maskTypeChoices = (version: CoreVersionId, list: MaskList, side?: MaskSide, current?: string): string[] => {
    const choices = allowedValues(version, `finalmask.${list}.type`)
        .filter(type => !(side === 'inbound' && CLIENT_ONLY_TYPES.has(type)));
    return current && !choices.some(type => type.toLowerCase() === current.toLowerCase())
        ? [...choices, current]
        : choices;
};

/**
 * The mkcp-legacy mask that builds what a removed 26.3 mask built.
 *
 * v26.7.28:transport_finalmask.go:600 — no header and no value is
 * mkcp-original, no header with a value is aes128gcm keyed by it, and a header
 * picks the old header mask, with `value` as the dns domain. Returns null for
 * a type mkcp-legacy does not replace.
 */
export const toMkcpLegacy = (type: string, settings: unknown): { type: 'mkcp-legacy'; settings: Record<string, string> } | null => {
    const old = (settings && typeof settings === 'object' ? settings : {}) as Record<string, unknown>;
    const text = (value: unknown) => (typeof value === 'string' ? value : '');
    switch (type.toLowerCase()) {
        case 'mkcp-original':
            return { type: 'mkcp-legacy', settings: {} };
        case 'mkcp-aes128gcm':
            return { type: 'mkcp-legacy', settings: text(old.password) ? { value: text(old.password) } : {} };
        case 'header-dns':
            return { type: 'mkcp-legacy', settings: { header: 'dns', ...(text(old.domain) ? { value: text(old.domain) } : {}) } };
        case 'header-dtls':
        case 'header-srtp':
        case 'header-utp':
        case 'header-wechat':
        case 'header-wireguard':
            return { type: 'mkcp-legacy', settings: { header: type.toLowerCase().slice('header-'.length) } };
        default:
            return null;
    }
};

// ── Noise items ─────────────────────────────────────────────────────────

const NOISE_ITEM_TYPES = 'finalmask.udp.noise.item.type';

/** Whether `version` takes this encoding for a noise item's packet (case-insensitive, as the core compares). */
export const noiseItemTypeAccepted = (version: CoreVersionId, type: string): boolean =>
    allowedValues(version, NOISE_ITEM_TYPES).some(value => value.toLowerCase() === type.toLowerCase());

/**
 * The packet encodings a noise item's chooser offers on a line, plus the one
 * the item already holds, whatever it is — a chooser that cannot show the
 * held value hides it, and "exp" on a line that refuses it is exactly the
 * value that needs to stay on screen.
 */
export const noiseItemTypeChoices = (version: CoreVersionId, held?: unknown): string[] => {
    const offered = ['hex', 'str', 'base64', 'exp'].filter(type => noiseItemTypeAccepted(version, type));
    return typeof held === 'string' && held !== '' && !offered.includes(held) ? [...offered, held] : offered;
};

/**
 * A noise item written as an expression (v26.9.30:transport_finalmask.go:318,
 * v26.10.10:transport_finalmask.go:317):
 * the core builds its bytes from a string of tags, so there is no packet to
 * decode and no recipe that could hold it.
 */
export const isNoiseExpItem = (item: unknown): boolean =>
    isObject(item) && typeof item.type === 'string' && item.type.toLowerCase() === 'exp';

/**
 * What `parseNoiseExp` (v26.9.30:transport_finalmask.go:364,
 * v26.10.10:transport_finalmask.go:363) would answer to
 * an expression like `<b 0xDEADBEEF><r 8><t>`, in its words, or null when it
 * builds. Only whitespace may sit between the tags, and there has to be at
 * least one. Tags are lower-case letters only, which is what the pattern at
 * :361 matches. The grammar itself is read in one place, core/noise/exp.ts,
 * which the AmneziaWG export reads too.
 */
export const noiseExpProblem = (exp: string): string | null => {
    const parsed = parseNoiseExp(exp);
    return 'error' in parsed ? parsed.error : null;
};

// ── Chain rules ─────────────────────────────────────────────────────────

export interface FinalmaskIssue {
    /** From the inbound/outbound: `streamSettings.finalmask.udp[1].settings.mode`. */
    path: string;
    severity: 'critical' | 'warning' | 'info';
    message: string;
}

/**
 * Masks that must sit at level 0 — the one the core wraps first — and the
 * index level 0 is on each line. v26.3.27 walks the list forward, so level 0
 * is udp[0] (finalmask/finalmask.go:31); v26.7.28 walks it with
 * slices.Backward but keeps the original index as the level, so level 0 is
 * still udp[0] (finalmask.go:32); v26.9.9 reverses the slice before numbering
 * (finalmask.go:22), which puts level 0 at udp[last].
 *
 * v26.9.30 has no levels any more, and neither has v26.10.10 (finalmask.go is
 * the same file in both): NewFinalMask reverses the lists
 * (finalmask.go:45-46) and a mask that supplies the connection itself
 * declares `HandleDial` (and `HandleListen` on a server) — DialUDP and
 * ListenPacket refuse it at any index but 0, "incorrect index: N" (:151,
 * :220), and index 0 of the reversed list is udp[last] again. Those are
 * xicmp (xicmp/config.go:10-12) and udphop (udphop/config.go:9); realm lost
 * its check (realm/config.go:8-14), so it may sit anywhere.
 *
 *   xicmp   v26.3.27:finalmask/xicmp/client.go:60, server.go:54;
 *           v26.7.28:finalmask/xicmp/config.go:17; v26.9.9:finalmask/xicmp/config.go:12
 *   realm   v26.7.28:finalmask/realm/config.go:16; v26.9.9:finalmask/realm/config.go:12
 *   udphop  v26.9.9:finalmask/udphop/config.go:12
 */
const OUTERMOST: Record<string, Partial<Record<CoreVersionId, 'first' | 'last'>>> = {
    xicmp: { '26.3': 'first', '26.7': 'first', '26.9': 'last', '26.9.30': 'last', '26.10': 'last' },
    realm: { '26.7': 'first', '26.9': 'last' },
    udphop: { '26.9': 'last', '26.9.30': 'last', '26.10': 'last' },
};

/** What the core calls a mask in the wrong place, where it is not "requires being at the outermost level". */
const WRONG_INDEX_ERROR: Partial<Record<CoreVersionId, string>> = { '26.9.30': 'incorrect index', '26.10': 'incorrect index' };

/**
 * A UDP sudoku mask must be at level == count-1 ("must be the innermost mask
 * in chain"): udp[last] before 26.9, udp[0] after the reversal.
 * v26.3.27:finalmask/sudoku/config.go:46, v26.7.28:finalmask/sudoku/config.go:46,
 * v26.9.9:finalmask/sudoku/config.go:40. v26.9.30 and v26.10.10 dropped the check
 * (sudoku/config.go:38-44).
 */
const INNERMOST: Record<string, Partial<Record<CoreVersionId, 'first' | 'last'>>> = {
    sudoku: { '26.3': 'last', '26.7': 'last', '26.9': 'first' },
};

/**
 * Not a refusal but a place the mask belongs: an xdns client in v26.9.30 and
 * v26.10.10 dials its own resolvers and never touches the connection it is
 * handed (xdns/config.go:9 calls NewClient(c, dialer)), so whatever sits
 * nearer the socket than it is wrapped around a connection nobody uses — on a
 * client only; a server still applies it (xdns/config.go:13). Its end is the
 * socket's.
 */
const SOCKET_BOUND: Record<string, Partial<Record<CoreVersionId, 'last'>>> = {
    xdns: { '26.9.30': 'last', '26.10': 'last' },
};

/**
 * The end of a mask list the core wraps around the socket first — the mask
 * whose output is what goes on the wire. 26.3 walks the list forward
 * (v26.3.27:finalmask/finalmask.go:31), 26.7 walks it backward
 * (v26.7.28:finalmask.go:32), 26.9 reverses it before walking
 * (v26.9.9:finalmask.go:22) and v26.9.30 and 26.10 reverse it in NewFinalMask
 * (v26.9.30:finalmask.go:45-46, v26.10.10:finalmask.go:45-46).
 */
export const socketEnd = (version: CoreVersionId): 'first' | 'last' => (version === '26.3' ? 'first' : 'last');

/**
 * The end of the UDP list a mask of this type has to hold on this line, if it
 * has to hold one — or, for xdns on a client, ought to.
 */
export const pinnedEnd = (version: CoreVersionId, type: string): 'first' | 'last' | undefined => {
    const key = type.toLowerCase();
    return OUTERMOST[key]?.[version] ?? INNERMOST[key]?.[version] ?? SOCKET_BOUND[key]?.[version];
};

const UDPHOP_MODES = ['intervallocal', 'intervalremote', 'perconnremote'];

/**
 * How a line treats udphop's interval. v26.9.9 has no default and checks both
 * ends when the mask is built for a dial (v26.9.9:finalmask/udphop/conn.go:62);
 * v26.9.30 and 26.10 turn 0 into 30-30 and refuse a start under 5 while the
 * config loads (v26.9.30:transport_finalmask.go:1098-1104,
 * v26.10.10:transport_finalmask.go:1088-1094).
 */
const UDPHOP_INTERVAL: Partial<Record<CoreVersionId, 'dial' | 'load'>> = { '26.9': 'dial', '26.9.30': 'load', '26.10': 'load' };

/** Whether a line fills in udphop's interval when it is left out (30), instead of failing each dial. */
export const udphopDefaultsInterval = (version: CoreVersionId): boolean => UDPHOP_INTERVAL[version] === 'load';

/**
 * Whether the MASQUE transport reads quicParams on this line. Hysteria and
 * XHTTP always did (v26.9.9:hysteria/dialer.go:324, splithttp/dialer.go:159);
 * v26.9.30 adds MASQUE (v26.9.30:transport/internet/masque/dialer.go:49,
 * hub.go:92), and v26.10.10 keeps it (dialer.go:52, hub.go:92).
 */
export const masqueReadsQuicParams = (version: CoreVersionId): boolean => FROM_2693.includes(version);

/** A client with no xicmp ips targets the address it dials, which must be an IP (v26.9.30 and v26.10.10:finalmask/xicmp/config.go:15, client.go:72). */
const XICMP_DIALS_ADDRESS: CoreVersionId[] = FROM_2693;

/** The DNS record types an xdns domain may list: A, CNAME, TXT, AAAA (v26.10.10:finalmask/xdns/domain.go:97). */
const XDNS_RECORD_TYPES = [1, 5, 16, 28];

const isObject = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value);

const typeOf = (mask: unknown): string =>
    isObject(mask) && typeof mask.type === 'string' ? mask.type.toLowerCase() : '';

const settingsOf = (mask: unknown): Record<string, unknown> =>
    isObject(mask) && isObject(mask.settings) ? mask.settings : {};

const nonEmptyStrings = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string' && entry !== '') : [];

/**
 * An Int32Range the way `infra/conf/common.go` reads it: a number, or a
 * string that is a number or "a-b". Null for anything it would refuse.
 */
export const parseInt32Range = (value: unknown): [number, number] | null => {
    if (value === undefined || value === null) return [0, 0];
    if (typeof value === 'number') return Number.isInteger(value) ? [value, value] : null;
    if (typeof value !== 'string') return null;
    const text = value;
    if (text === '') return [0, 0];
    if (/^[+-]?\d+$/.test(text)) {
        const n = Number(text);
        return [n, n];
    }
    const match = /^(-?\d+)-(-?\d+)$/.exec(text);
    if (!match) return null;
    const a = Number(match[1]);
    const b = Number(match[2]);
    return a <= b ? [a, b] : [b, a];
};

/**
 * The runtime rules for one finalmask on one line, from one side.
 *
 * Covers what FEATURES and VALUE_SETS cannot: where in the chain a mask may
 * sit, and the xdns/udphop/noise settings the core refuses to start without.
 * Keys and types a line does not know are left to those tables, so nothing
 * here repeats a finding the version check already reports. Types the line
 * does not register are skipped for the same reason.
 */
export const finalmaskIssues = (finalmask: unknown, version: CoreVersionId, direction: MaskSide): FinalmaskIssue[] => {
    if (!isObject(finalmask)) return [];
    const { tag } = coreVersion(version);
    const out: FinalmaskIssue[] = [];
    // Runtime failures: a listener that cannot start takes the core down with
    // it; a dial that fails only loses that connection.
    const runtime: FinalmaskIssue['severity'] = direction === 'inbound' ? 'critical' : 'warning';
    const lists: MaskList[] = ['udp', 'tcp'];

    for (const list of lists) {
        const masks = Array.isArray(finalmask[list]) ? finalmask[list] as unknown[] : [];
        if (masks.length < 2) continue;
        // The wrapping order flipped in 26.7: v26.3.27:finalmask/finalmask.go:31/207
        // walk forward, v26.7.28:finalmask.go:32/216 walk backward,
        // v26.9.9:finalmask.go:22/204 reverse first and v26.9.30 and v26.10.10
        // (finalmask.go:45-46) reverse in NewFinalMask — the same list is a
        // different wire format on either side of 26.3 → 26.7.
        const name = list.toUpperCase();
        out.push({
            path: `${FINALMASK_PATH}.${list}`,
            severity: 'info',
            message: version === '26.3'
                ? t("Xray {tag} applies the first {list} mask nearest the socket; 26.7 and later apply the last one there. A peer on 26.7 or later needs this list in reverse order.", { tag, list: name })
                : t("Xray {tag} applies the last {list} mask nearest the socket; 26.3 applied the first one there. A peer on 26.3 needs this list in reverse order.", { tag, list: name }),
        });
    }

    const udp = Array.isArray(finalmask.udp) ? finalmask.udp as unknown[] : [];
    const registered = new Set(allowedValues(version, 'finalmask.udp.type').map(type => type.toLowerCase()));
    const quicParams = isObject(finalmask.quicParams) ? finalmask.quicParams : {};
    const hopPorts = isObject(quicParams.udpHop) ? quicParams.udpHop.ports : undefined;
    const hopping = hopPorts !== undefined && hopPorts !== null && hopPorts !== '' && hopPorts !== 0;
    // quicParams.udpHop is a key of 26.3 and 26.7 only (QUIC_KEYS).
    const hasQuicHop = QUIC_KEYS.some(spec => spec.key === 'udpHop' && spec.lines.includes(version));

    udp.forEach((mask, index) => {
        const type = typeOf(mask);
        if (!registered.has(type)) return;
        const at = `${FINALMASK_PATH}.udp[${index}]`;
        const last = udp.length - 1;

        // With one mask, level 0 is also the last level: nothing to place.
        const outer = OUTERMOST[type]?.[version];
        if (outer && udp.length > 1 && index !== (outer === 'first' ? 0 : last)) {
            const refusal = WRONG_INDEX_ERROR[version];
            out.push({
                path: at,
                severity: runtime,
                message: refusal
                    ? t("{type} has to be the last UDP mask on Xray {tag}. Anywhere else the core stops with \"{error}\" when it sets the connection up.", { type, tag, error: refusal })
                    : outer === 'first'
                        ? t("{type} has to be the first UDP mask on Xray {tag}. Anywhere else the core stops with \"requires being at the outermost level\" when it sets the connection up.", { type, tag })
                        : t("{type} has to be the last UDP mask on Xray {tag}. Anywhere else the core stops with \"requires being at the outermost level\" when it sets the connection up.", { type, tag }),
            });
        }
        const inner = INNERMOST[type]?.[version];
        if (inner && udp.length > 1 && index !== (inner === 'first' ? 0 : last)) {
            out.push({
                path: at,
                severity: runtime,
                message: inner === 'first'
                    ? t("A UDP sudoku mask has to be the first in the list on Xray {tag}. Anywhere else the core stops with \"must be the innermost mask in chain\".", { tag })
                    : t("A UDP sudoku mask has to be the last in the list on Xray {tag}. Anywhere else the core stops with \"must be the innermost mask in chain\".", { tag }),
            });
        }
        // An xdns client ignores the socket and everything nearer to it; only a
        // client does, so only an outbound is told.
        if (SOCKET_BOUND[type]?.[version] === 'last' && direction === 'outbound' && udp.length > 1 && index !== last) {
            out.push({
                path: at,
                severity: 'warning',
                message: t("xdns on Xray {tag} dials its own resolvers and never uses the socket, so a client skips every UDP mask listed after it while a server still applies them. Put xdns last in the list.", { tag }),
            });
        }

        // Before 26.9 a client also refuses these on top of quicParams.udpHop:
        // the hop conn is what they would wrap (v26.3.27:finalmask/xicmp/client.go:60,
        // v26.7.28:finalmask/xicmp/config.go:17, realm/config.go:16), and a hop conn
        // exists once ports are set (v26.7.28:transport/internet/hysteria/dialer.go:162).
        if (direction === 'outbound' && hopping && hasQuicHop && (type === 'xicmp' || type === 'realm')) {
            out.push({
                path: at,
                severity: 'warning',
                message: t("{type} cannot run over quicParams.udpHop on Xray {tag}: with hop ports set, every dial fails with \"requires being at the outermost level\".", { type, tag }),
            });
        }

        const settings = settingsOf(mask);
        if (type === 'xdns') out.push(...xdnsIssues(settings, `${at}.settings`, version, direction, tag));
        if (type === 'udphop') out.push(...udphopIssues(settings, at, version, direction, tag));
        if (type === 'xicmp' && direction === 'outbound' && XICMP_DIALS_ADDRESS.includes(version) && nonEmptyStrings(settings.ips).length === 0) {
            out.push({
                path: `${at}.settings.ips`,
                severity: 'info',
                message: t("With no ips, xicmp on Xray {tag} pings the address this outbound dials, and refuses to dial at all when that is a domain (\"empty ip addresses\"). List the server's IP addresses in ips.", { tag }),
            });
        }
        if (type === 'noise') out.push(...noiseIssues(settings, `${at}.settings`, version, tag));
    });

    return out;
};

/** The core's `item.Packet` is set whenever the key is present, even as null (RawMessage keeps the bytes). */
const noiseIssues = (settings: Record<string, unknown>, at: string, version: CoreVersionId, tag: string): FinalmaskIssue[] => {
    const out: FinalmaskIssue[] = [];
    const items = Array.isArray(settings.noise) ? settings.noise : [];
    items.forEach((item, index) => {
        if (!isObject(item)) return;
        const here = `${at}.noise[${index}]`;
        // v26.3.27:transport_internet.go:1442, v26.7.28:transport_finalmask.go:310,
        // v26.9.9:transport_finalmask.go:313, v26.9.30:transport_finalmask.go:315,
        // v26.10.10:transport_finalmask.go:314 — on every line.
        const rand = parseInt32Range(item.rand);
        if (item.packet !== undefined && rand && rand[1] > 0) {
            out.push({
                path: here,
                severity: 'critical',
                message: t("A noise item that sets both packet and rand is refused by Xray {tag} when the config loads. Keep one of them.", { tag }),
            });
        }
        if (!isNoiseExpItem(item) || !noiseItemTypeAccepted(version, 'exp')) return;
        // v26.9.30:transport_finalmask.go:318-326, v26.10.10:transport_finalmask.go:317-325
        if (typeof item.packet !== 'string') {
            out.push({
                path: `${here}.packet`,
                severity: 'critical',
                message: t("The packet of a noise item of type exp has to be a string such as <b 0xDEADBEEF><r 8><t>; Xray {tag} refuses the config otherwise.", { tag }),
            });
            return;
        }
        const problem = noiseExpProblem(item.packet);
        if (problem) {
            out.push({
                path: `${here}.packet`,
                severity: 'critical',
                message: t("Xray {tag} refuses this noise expression when the config loads: {problem}.", { tag, problem }),
            });
        }
    });
    return out;
};

// ── xdns ────────────────────────────────────────────────────────────────

const wholeNumber = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= -2147483648 && value <= 2147483647;

/**
 * `xdns.NewDomain`'s arithmetic (v26.10.10:finalmask/xdns/domain.go:82-129,
 * the same file as v26.9.30:finalmask/xdns/domain.go:82-129): whether a name
 * leaves room for at least 17 bytes of payload per query under these limits.
 * Both of its failures are the same to a user — the limits and the name do not
 * fit — so it answers yes or no.
 */
const domainFits = (name: string, lenLimit: number, labelLimit: number): boolean => {
    const length = new TextEncoder().encode(`${name}.`).length;
    if (length > 255 || lenLimit < length + 1) return false;
    const n = Math.floor((lenLimit - length - 1) / (labelLimit + 1));
    const left = (lenLimit - length - 1) % (labelLimit + 1);
    const total = n * labelLimit + (left > 1 ? left - 1 : 0);
    return Math.floor(total * 5 / 8) >= 17;
};

const xdnsIssues = (
    settings: Record<string, unknown>,
    at: string,
    version: CoreVersionId,
    direction: MaskSide,
    tag: string,
): FinalmaskIssue[] => {
    // What the line reads `domains` as: nothing on 26.3, which took one domain.
    const listShape = maskKeys('udp', 'xdns').find(spec => spec.key === 'domains' && spec.lines.includes(version))?.shape;
    if (listShape === undefined) {
        // v26.3.27:transport_internet.go:1667 — "empty domain" at load.
        return typeof settings.domain === 'string' && settings.domain !== ''
            ? []
            : [{
                path: `${at}.domain`,
                severity: 'critical',
                message: t("xdns needs a domain on Xray {tag}; without one the config does not load (\"empty domain\").", { tag }),
            }];
    }
    if (listShape !== 'objects') return xdnsStringIssues(settings, at, direction, tag);
    return xdnsReadsOneName(version)
        ? xdnsOneNameIssues(settings, at, direction, tag)
        : xdnsObjectIssues(settings, at, version, direction, tag);
};

/** The lines whose xdns domain is one `name`; the next one reads a list of `names`. */
const XDNS_ONE_NAME: CoreVersionId[] = ONLY_2693;

/** Whether this line's xdns domains carry one `name` and its resolvers a `type` with `settings` — v26.9.30's shape. */
export const xdnsReadsOneName = (version: CoreVersionId): boolean => XDNS_ONE_NAME.includes(version);

/** A JSON number as the core's `uint16(int32)` conversion sees it: modulo 65536. */
const asUint16 = (value: number): number => ((value % 65536) + 65536) % 65536;

/**
 * v26.9.30: lists of objects, a domain with one `name` and a resolver with a
 * `type` and its `settings` (v26.9.30:infra/conf/transport_finalmask.go:794-832).
 *
 * What fails where: a value of the wrong type fails the decode of the config,
 * and so does everything Build() checks (:834-876) — every domain through
 * NewDomain, record types included (xdns/domain.go:82-129: "empty types" and
 * "unknown types" are load errors here, because Build() hands NewDomain the
 * domain's own types where 26.10 hands it a fixed list), the resolver type and
 * the decode of its settings (loader.go:45-55), and extraPoll. An empty list of
 * domains or resolvers is only found when the listener starts
 * (xdns/server.go:46) or the dial happens (client.go:58-62).
 */
const xdnsOneNameIssues = (
    settings: Record<string, unknown>,
    at: string,
    direction: MaskSide,
    tag: string,
): FinalmaskIssue[] => {
    const out: FinalmaskIssue[] = [];
    const runtime: FinalmaskIssue['severity'] = direction === 'inbound' ? 'critical' : 'warning';
    const critical = (path: string, message: string) => out.push({ path, severity: 'critical', message });
    const wrongType = (path: string, expected: string) =>
        critical(path, t("{field} must be {expected} for Xray {tag}; as written the config does not load.", { field: path.slice(at.length + 1), expected, tag }));
    const example = (key: string) => maskKeys('udp', 'xdns').find(entry => entry.key === key && entry.lines.includes('26.9.30'))?.example;
    const range = (path: string, field: string, value: number, bounds: string) =>
        critical(path, t("{field} is {value}, outside {range}, so Xray {tag} refuses the config at load.", { field, value, range: bounds, tag }));

    let domainCount = 0;
    const domains = settings.domains;
    if (domains !== undefined && domains !== null) {
        if (!Array.isArray(domains) || !domains.every(isObject)) {
            critical(`${at}.domains`, t("xdns {key} on Xray {tag} must be a list of objects such as {example}. Plain strings, or anything else, make Xray fail to read the config at all.", { key: 'domains', tag, example: example('domains') }));
        } else {
            domains.forEach((domain, index) => {
                const here = `${at}.domains[${index}]`;
                const name = domain.name;
                if (name !== undefined && name !== null && typeof name !== 'string') wrongType(`${here}.name`, t("text"));
                for (const key of ['lenLimit', 'labelLimit', 'edns0']) {
                    if (domain[key] !== undefined && domain[key] !== null && !wholeNumber(domain[key])) wrongType(`${here}.${key}`, t("a whole number"));
                }
                if (domain.types !== undefined && domain.types !== null && !(Array.isArray(domain.types) && domain.types.every(wholeNumber))) {
                    wrongType(`${here}.types`, t("a list of whole numbers"));
                }
                if (out.some(issue => issue.path.startsWith(`${here}.`))) return;
                domainCount++;

                // Build() defaults both limits when they are 0 (:838-843), then NewDomain checks them.
                const lenLimit = wholeNumber(domain.lenLimit) && domain.lenLimit !== 0 ? domain.lenLimit : 255;
                const labelLimit = wholeNumber(domain.labelLimit) && domain.labelLimit !== 0 ? domain.labelLimit : 63;
                // uint16(Edns0): a value past 65535 wraps before the 0 / 512-4096 test.
                const edns0 = wholeNumber(domain.edns0) ? asUint16(domain.edns0) : 0;
                if (lenLimit < 0 || lenLimit > 255) range(`${here}.lenLimit`, 'lenLimit', lenLimit, '0-255');
                if (labelLimit < 0 || labelLimit > 63) range(`${here}.labelLimit`, 'labelLimit', labelLimit, '0-63');
                if (edns0 !== 0 && (edns0 < 512 || edns0 > 4096)) range(`${here}.edns0`, 'edns0', edns0, '0 or 512-4096');

                // NewDomain's own checks (xdns/domain.go:92-101): at least one type, each one A, CNAME, TXT or AAAA.
                const kinds = (Array.isArray(domain.types) ? domain.types as number[] : []).map(asUint16);
                if (kinds.length === 0) {
                    critical(`${here}.types`, t("An xdns domain on Xray {tag} needs its record types: with none the config does not load (\"empty types\").", { tag }));
                }
                for (const kind of kinds.filter(value => !XDNS_RECORD_TYPES.includes(value))) {
                    critical(`${here}.types`, t("Record type {kind} is not one xdns can use (1 A, 5 CNAME, 16 TXT, 28 AAAA), so Xray {tag} refuses the config at load.", { kind, tag }));
                }

                const written = typeof name === 'string' ? name : '';
                if (written.includes('..')) {
                    critical(`${here}.name`, t("\"{name}\" is not a domain Xray {tag} accepts (it contains \"..\"), so the config does not load.", { name: written, tag }));
                } else if (lenLimit >= 0 && lenLimit <= 255 && labelLimit >= 0 && labelLimit <= 63 && !domainFits(written, lenLimit, labelLimit)) {
                    critical(`${here}.name`, t("\"{name}\" does not fit xdns's limits (lenLimit {lenLimit}, labelLimit {labelLimit}): too little room is left for data, so Xray {tag} refuses the config at load.", { name: written, lenLimit, labelLimit, tag }));
                }
            });
        }
    }

    const missing: string[] = [];
    let resolverCount = 0;
    const resolvers = settings.resolvers;
    if (resolvers !== undefined && resolvers !== null) {
        if (!Array.isArray(resolvers) || !resolvers.every(isObject)) {
            critical(`${at}.resolvers`, t("xdns {key} on Xray {tag} must be a list of objects such as {example}. Plain strings, or anything else, make Xray fail to read the config at all.", { key: 'resolvers', tag, example: example('resolvers') }));
        } else {
            resolvers.forEach((resolver, index) => {
                const here = `${at}.resolvers[${index}]`;
                const kind = resolver.type;
                if (kind !== undefined && kind !== null && typeof kind !== 'string') {
                    wrongType(`${here}.type`, t("text"));
                    return;
                }
                // LoadWithID lower-cases the id and looks it up (loader.go:45-48): tcp and udp, and nothing else.
                const known = typeof kind === 'string' ? kind.toLowerCase() : '';
                if (known !== 'tcp' && known !== 'udp') {
                    critical(`${here}.type`, t("Resolver type \"{value}\" is not one Xray {tag} loads: only tcp and udp (\"unknown config id\").", { value: typeof kind === 'string' ? kind : '', tag }));
                    return;
                }
                const inner = resolver.settings;
                if (inner === undefined) {
                    critical(`${here}.settings`, t("A resolver needs its settings object, such as {example}; without it Xray {tag} fails to read the config (\"unexpected end of JSON input\").", { example: '{"addr": "1.1.1.1:53"}', tag }));
                    return;
                }
                // `null` unmarshals to nothing (an empty addr); anything but an object is a type error.
                if (inner !== null && !isObject(inner)) {
                    wrongType(`${here}.settings`, t("an object"));
                    return;
                }
                const addr = isObject(inner) ? inner.addr : undefined;
                if (addr !== undefined && addr !== null && typeof addr !== 'string') {
                    wrongType(`${here}.settings.addr`, t("text"));
                    return;
                }
                resolverCount++;
                if (typeof addr !== 'string' || addr === '') missing.push(`${here}.settings.addr`);
            });
        }
    }

    // :872-874 — also read by the client only, but Build() checks it for both.
    const poll = settings.extraPoll;
    if (poll !== undefined && poll !== null) {
        if (!wholeNumber(poll)) wrongType(`${at}.extraPoll`, t("a whole number"));
        else if (poll < 0 || poll > 3) range(`${at}.extraPoll`, 'extraPoll', poll, '0-3');
    }

    if (out.some(issue => issue.severity === 'critical')) return out;

    // Empty lists are not a load error: the listener (xdns/server.go:46) and the
    // dial (client.go:58, :61) say so when they build the mask.
    if (domainCount === 0) {
        out.push({
            path: `${at}.domains`,
            severity: runtime,
            message: direction === 'inbound'
                ? t("An xdns server answers for its domains, and this one has none: the inbound fails to start (\"empty domains\").")
                : t("An xdns client builds its queries from its domains, and this one has none: every connection fails (\"empty domains\")."),
        });
    }
    if (direction === 'outbound') {
        if (resolverCount === 0) {
            out.push({
                path: `${at}.resolvers`,
                severity: 'warning',
                message: t("An xdns client sends through its resolvers, and this one has none: every connection fails (\"empty resolvers\")."),
            });
        }
        // The client dials each resolver when it is set up (xdns/resolver_udp.go:25-28): an empty address does not parse.
        for (const path of missing) {
            out.push({
                path,
                severity: 'warning',
                message: t("An xdns client dials every resolver when it is set up, and a resolver with no addr fails that: every connection fails."),
            });
        }
    }
    return out;
};

/** 26.7 and 26.9: lists of strings. */
const xdnsStringIssues = (settings: Record<string, unknown>, at: string, direction: MaskSide, tag: string): FinalmaskIssue[] => {
    const out: FinalmaskIssue[] = [];
    // A list of anything but strings is a type error for Go's decoder: the
    // config does not load (v26.9.9:transport_finalmask.go:701-702).
    for (const key of ['domains', 'resolvers']) {
        const value = settings[key];
        if (value !== undefined && value !== null && !(Array.isArray(value) && value.every(entry => typeof entry === 'string'))) {
            out.push({
                path: `${at}.${key}`,
                severity: 'critical',
                message: t("xdns {key} on Xray {tag} must be a list of plain strings. Objects, or anything else, make Xray fail to read the config at all.", { key, tag }),
            });
        }
    }
    if (out.length > 0) return out;
    const domains = nonEmptyStrings(settings.domains);
    const resolvers = nonEmptyStrings(settings.resolvers);
    if (domains.length === 0 && resolvers.length === 0) {
        // v26.7.28:transport_finalmask.go:707, v26.9.9:transport_finalmask.go:710
        out.push({
            path: at,
            severity: 'critical',
            message: t("xdns needs domains (server) or resolvers (client) on Xray {tag}; with neither the config does not load.", { tag }),
        });
        return out;
    }
    // v26.7.28:transport_finalmask.go:712, v26.9.9:transport_finalmask.go:715
    for (const resolver of resolvers) {
        if (!resolver.includes('+udp://')) {
            out.push({
                path: `${at}.resolvers`,
                severity: 'critical',
                message: t("Resolver \"{value}\" has no \"+udp://\" part, so Xray {tag} refuses the config. The form is domain+udp://IP:port.", { value: resolver, tag }),
            });
        }
    }
    // Each side reads only its own list: finalmask/xdns/server.go:69 and client.go:58.
    if (direction === 'inbound' && domains.length === 0) {
        out.push({
            path: `${at}.domains`,
            severity: 'critical',
            message: t("An xdns server answers for its domains, and this one has none: the inbound fails to start (\"empty domains\")."),
        });
    }
    if (direction === 'outbound' && resolvers.length === 0) {
        out.push({
            path: `${at}.resolvers`,
            severity: 'warning',
            message: t("An xdns client sends through its resolvers, and this one has none: every connection fails (\"empty resolvers\")."),
        });
    }
    return out;
};

/**
 * 26.10: lists of objects (v26.10.10:transport_finalmask.go:793-809), a domain
 * with `names` and a resolver with `addrs`. v26.9.30's are in xdnsOneNameIssues.
 *
 * What fails where: a value of the wrong type fails the config at load, and so
 * do the checks in Build() (:811-866: every name through NewDomain, the
 * resolver schemes, extraPoll). The types of the record kinds are only
 * checked when the listener or the dial builds the mask (xdns/server.go:58,
 * client.go:75), and so is an empty list of domains or resolvers.
 */
const xdnsObjectIssues = (
    settings: Record<string, unknown>,
    at: string,
    version: CoreVersionId,
    direction: MaskSide,
    tag: string,
): FinalmaskIssue[] => {
    const out: FinalmaskIssue[] = [];
    const runtime: FinalmaskIssue['severity'] = direction === 'inbound' ? 'critical' : 'warning';
    const critical = (path: string, message: string) => out.push({ path, severity: 'critical', message });
    const wrongType = (path: string, expected: string) =>
        critical(path, t("{field} must be {expected} for Xray {tag}; as written the config does not load.", { field: path.slice(at.length + 1), expected, tag }));
    const spec = (key: string) => maskKeys('udp', 'xdns').find(entry => entry.key === key && entry.lines.includes(version));

    let names = 0;
    const domains = settings.domains;
    if (domains !== undefined && domains !== null) {
        if (!Array.isArray(domains) || !domains.every(isObject)) {
            critical(`${at}.domains`, t("xdns {key} on Xray {tag} must be a list of objects such as {example}. Plain strings, or anything else, make Xray fail to read the config at all.", { key: 'domains', tag, example: spec('domains')?.example }));
        } else {
            domains.forEach((domain, index) => {
                const here = `${at}.domains[${index}]`;
                const given = domain.names;
                const list = given === undefined || given === null ? [] : given;
                if (!Array.isArray(list) || !list.every(entry => typeof entry === 'string')) wrongType(`${here}.names`, t("a list of strings"));
                for (const key of ['lenLimit', 'labelLimit', 'edns0']) {
                    if (domain[key] !== undefined && domain[key] !== null && !wholeNumber(domain[key])) wrongType(`${here}.${key}`, t("a whole number"));
                }
                if (domain.types !== undefined && domain.types !== null && !(Array.isArray(domain.types) && domain.types.every(wholeNumber))) {
                    wrongType(`${here}.types`, t("a list of whole numbers"));
                }
                if (out.some(issue => issue.path.startsWith(`${here}.`))) return;

                // Build() defaults both limits when they are 0 (:815-820), then NewDomain checks them.
                const lenLimit = wholeNumber(domain.lenLimit) && domain.lenLimit !== 0 ? domain.lenLimit : 255;
                const labelLimit = wholeNumber(domain.labelLimit) && domain.labelLimit !== 0 ? domain.labelLimit : 63;
                const edns0 = wholeNumber(domain.edns0) ? domain.edns0 : 0;
                if (lenLimit < 0 || lenLimit > 255) critical(`${here}.lenLimit`, t("{field} is {value}, outside {range}, so Xray {tag} refuses the config at load.", { field: 'lenLimit', value: lenLimit, range: '0-255', tag }));
                if (labelLimit < 0 || labelLimit > 63) critical(`${here}.labelLimit`, t("{field} is {value}, outside {range}, so Xray {tag} refuses the config at load.", { field: 'labelLimit', value: labelLimit, range: '0-63', tag }));
                if (edns0 !== 0 && (edns0 < 512 || edns0 > 4096)) critical(`${here}.edns0`, t("{field} is {value}, outside {range}, so Xray {tag} refuses the config at load.", { field: 'edns0', value: edns0, range: '0 or 512-4096', tag }));

                const written = list as string[];
                names += written.length;
                written.forEach((name, nameIndex) => {
                    const where = `${here}.names[${nameIndex}]`;
                    if (name.includes('..')) {
                        critical(where, t("\"{name}\" is not a domain Xray {tag} accepts (it contains \"..\"), so the config does not load.", { name, tag }));
                    } else if (lenLimit >= 0 && lenLimit <= 255 && labelLimit >= 0 && labelLimit <= 63 && !domainFits(name, lenLimit, labelLimit)) {
                        critical(where, t("\"{name}\" does not fit xdns's limits (lenLimit {lenLimit}, labelLimit {labelLimit}): too little room is left for data, so Xray {tag} refuses the config at load.", { name, lenLimit, labelLimit, tag }));
                    }
                });
                // The kinds are not checked at load, only when the mask is built (xdns/domain.go:95-101).
                const unknown = (Array.isArray(domain.types) ? domain.types as number[] : []).filter(kind => !XDNS_RECORD_TYPES.includes(kind));
                for (const kind of unknown) {
                    out.push({
                        path: `${here}.types`,
                        severity: runtime,
                        message: t("Record type {kind} is not one xdns can use (1 A, 5 CNAME, 16 TXT, 28 AAAA), so Xray {tag} stops when it builds the mask.", { kind, tag }),
                    });
                }
            });
        }
    }

    let addrs = 0;
    const resolvers = settings.resolvers;
    if (resolvers !== undefined && resolvers !== null) {
        if (!Array.isArray(resolvers) || !resolvers.every(isObject)) {
            critical(`${at}.resolvers`, t("xdns {key} on Xray {tag} must be a list of objects such as {example}. Plain strings, or anything else, make Xray fail to read the config at all.", { key: 'resolvers', tag, example: spec('resolvers')?.example }));
        } else {
            resolvers.forEach((resolver, index) => {
                const here = `${at}.resolvers[${index}]`;
                const given = resolver.addrs;
                if (given === undefined || given === null) return;
                if (!Array.isArray(given) || !given.every(entry => typeof entry === 'string')) {
                    wrongType(`${here}.addrs`, t("a list of strings"));
                    return;
                }
                addrs += given.length;
                (given as string[]).forEach((addr, addrIndex) => {
                    // :838-852 — no scheme means udp; url.Parse lower-cases the scheme.
                    const marker = addr.indexOf('://');
                    const scheme = marker < 0 ? 'udp' : addr.slice(0, marker).toLowerCase();
                    if (scheme !== 'udp' && scheme !== 'tcp') {
                        critical(`${here}.addrs[${addrIndex}]`, t("Resolver address \"{value}\" uses a scheme Xray {tag} refuses: only udp:// and tcp:// load (\"invalid protocol\").", { value: addr, tag }));
                    }
                });
            });
        }
    }

    // :862 — also read by the client only, but Build() checks it for both.
    const poll = settings.extraPoll;
    if (poll !== undefined && poll !== null) {
        if (!wholeNumber(poll)) wrongType(`${at}.extraPoll`, t("a whole number"));
        else if (poll < 0 || poll > 3) critical(`${at}.extraPoll`, t("{field} is {value}, outside {range}, so Xray {tag} refuses the config at load.", { field: 'extraPoll', value: poll, range: '0-3', tag }));
    }

    if (out.some(issue => issue.severity === 'critical')) return out;

    // Empty lists are not a load error any more: the listener (xdns/server.go:46)
    // and the dial (client.go:57, :60) say so when they build the mask.
    if (names === 0) {
        out.push({
            path: `${at}.domains`,
            severity: runtime,
            message: direction === 'inbound'
                ? t("An xdns server answers for its domains, and this one has none: the inbound fails to start (\"empty domains\").")
                : t("An xdns client builds its queries from its domains, and this one has none: every connection fails (\"empty domains\")."),
        });
    }
    if (direction === 'outbound' && addrs === 0) {
        out.push({
            path: `${at}.resolvers`,
            severity: 'warning',
            message: t("An xdns client sends through its resolvers, and this one has none: every connection fails (\"empty resolvers\")."),
        });
    }
    return out;
};

// ── udphop ──────────────────────────────────────────────────────────────

const udphopIssues = (
    settings: Record<string, unknown>,
    at: string,
    version: CoreVersionId,
    direction: MaskSide,
    tag: string,
): FinalmaskIssue[] => {
    const out: FinalmaskIssue[] = [];
    // v26.9.9:finalmask/udphop/config.go:19, v26.9.30 and v26.10.10:finalmask/udphop/config.go:16
    if (direction === 'inbound') {
        out.push({
            path: at,
            severity: 'critical',
            message: t("udphop only works on the client side; on an inbound Xray {tag} fails to start (\"udphop: client only\").", { tag }),
        });
    }
    // v26.9.9:transport_finalmask.go:929 — split on commas, lower-cased, and an
    // empty string splits into one empty entry, so a missing mode fails too.
    const mode = typeof settings.mode === 'string' ? settings.mode : '';
    if (mode === '') {
        out.push({
            path: `${at}.settings.mode`,
            severity: 'critical',
            message: t("udphop needs a mode on Xray {tag}: intervalLocal, intervalRemote or perConnRemote, comma-separated. Without one the config does not load.", { tag }),
        });
    } else {
        for (const entry of mode.split(',')) {
            if (!UDPHOP_MODES.includes(entry.toLowerCase())) {
                out.push({
                    path: `${at}.settings.mode`,
                    severity: 'critical',
                    message: t("\"{value}\" is not a udphop mode, so Xray {tag} refuses the config. It takes intervalLocal, intervalRemote and perConnRemote, comma-separated without spaces.", { value: entry, tag }),
                });
            }
        }
    }
    const interval = parseInt32Range(settings.interval);
    const handling = UDPHOP_INTERVAL[version];
    if (interval && handling === 'dial' && direction === 'outbound' && (interval[0] < 5 || interval[1] < 5)) {
        // v26.9.9:finalmask/udphop/conn.go:62 — checked when the mask is built for
        // a dial, with no default: a missing interval is 0 and fails.
        out.push({
            path: `${at}.settings.interval`,
            severity: 'warning',
            message: t("udphop needs an interval of at least 5 seconds at both ends (10, or \"5-30\"); otherwise every connection fails (\"invalid interval\")."),
        });
    }
    if (interval && handling === 'load' && !(interval[0] === 0 && interval[1] === 0) && interval[0] < 5) {
        // v26.9.30:transport_finalmask.go:1098-1104, v26.10.10:transport_finalmask.go:1088-1094 — 0 is the default (30), a start under 5 is refused at load.
        out.push({
            path: `${at}.settings.interval`,
            severity: 'critical',
            message: t("udphop's interval starts at {from} seconds, and Xray {tag} refuses a start under 5 when it loads the config (\"interval must be at least 5\"). Leave it empty for the default of 30.", { from: interval[0], tag }),
        });
    }
    return out;
};
