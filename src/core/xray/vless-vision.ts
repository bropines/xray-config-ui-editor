/**
 * XTLS Vision on a VLESS inbound and outbound: the flow, the padding numbers
 * (`testseed`) and the pre-connect count (`testpre`).
 *
 * The keys, and what each line does with them. They are the same on every
 * supported line, which is why the version table has no row for them — it lists
 * differences (versions.test.ts) — and why everything below states a fact once
 * and `VISION_EVIDENCE` holds the line numbers per tag.
 *
 * Where they sit
 *
 *   inbound   `settings.flow` and `settings.testseed` beside the client list,
 *             and `flow`, `testseed` on each client. A client whose `flow` is
 *             empty gets the inbound's; a client with fewer than four
 *             `testseed` entries gets the inbound's list (whatever it holds).
 *             The inbound's `flow` takes "" or "xtls-rprx-vision" only, and so
 *             does a client's.
 *   outbound  flat: `settings.flow`, `.testseed`, `.testpre` beside `address`.
 *             vnext: the same three keys in `settings.vnext[0].users[0]`, which
 *             is decoded straight into the account the core hands the handler,
 *             and carries them under the same names (vless.Account's json
 *             tags). The core takes the flat form whenever `address` is there and
 *             replaces `vnext` with it, so a config holding both is the flat one.
 *             `seed` is decoded and then not used (`//account.Seed = c.Seed`).
 *
 * The defaults are a convenience of the JSON loader: the inbound's protobuf
 * config has no `flow` or `testseed` of its own, so a user added to a running
 * Xray through its API arrives with whatever its own account says.
 *
 * What the numbers do
 *
 * `NewVisionWriter` replaces a list shorter than four with 900, 500, 900, 256.
 * `XtlsPadding` then reads indexes 0 to 3 and nothing after them:
 *
 *   a write shorter than [0] bytes, while the traffic inside is TLS:
 *       padding = rand(0 .. [1]-1) + [2] - length         (long padding)
 *   any other write:
 *       padding = rand(0 .. [3]-1)                         (short padding)
 *
 * so [2] is how long the padded write comes to before the random part, and
 * [1] and [3] are how far that part reaches. The padding length travels in the
 * block header, which the receiving side reads (XtlsUnpadding), so each side's
 * numbers shape only what that side sends: the inbound's what the server sends
 * back, the outbound's what the client sends. Nothing has to match.
 *
 * What breaks. `rand.Int` is crypto/rand's, which panics for a maximum of 0, and
 * a negative length makes `Buffer.Extend` slice backwards. Nothing around a
 * connection's handler recovers a panic, so the core stops: `git grep 'recover()'`
 * on each tag finds only the DNS cache (v26.10.10:app/dns/cache_controller.go:179),
 * common/reflect's marshaller (v26.10.10:common/reflect/marshal.go:132), the
 * pre-connect goroutines below (v26.10.10:proxy/vless/outbound/outbound.go:164)
 * and, on 26.3 and 26.7, two inside the XHTTP client's own methods
 * (v26.7.28:transport/internet/splithttp/client.go:197 and :218). The
 * arithmetic is done on int32: `int32(testseed[0])`,
 * `int32(l.Int64())` and `int32(testseed[2])` wrap for anything above 2147483647,
 * and a number above 2147483648 in [1] or [3] lets the draw land on a wrapped,
 * negative value. `uint32` is what the decoder accepts: a negative number, a
 * fraction, a string or a number above 4294967295 is an encoding/json type error
 * and fails the whole document, as does a `testseed` that is not a list. A JSON
 * `null` inside the list is the Go zero value without an error (the standard
 * library leaves the destination alone — the same behaviour string-map.ts
 * relies on for a null string).
 *
 * `testpre`. Not Vision's: it works with any flow. The first request through
 * the outbound starts that many goroutines; each dials the server and parks
 * the connection on an unbuffered channel until a request takes it, then waits
 * 200 ms and dials again. A connection older than two minutes when it is taken
 * is closed and the next one used. It is skipped for an outbound with `reverse`
 * (flat form only; vnext refuses `reverse`) and 0 is off. The core sets no
 * ceiling: each unit is a goroutine and an idle connection the server holds.
 *
 * Whether Vision can run where it is put. It is a Build()-time no-op and a
 * run-time refusal: the handler only does Vision on a connection that is the TLS
 * or REALITY one itself — `*tls.Conn` (TLS 1.3) or `*reality.Conn` on an inbound,
 * `*tls.Conn`, `*tls.UConn` or `*reality.UConn` on an outbound — or one carried
 * by VLESS Encryption; anything else is answered with "XTLS only supports TLS
 * and REALITY directly for now." on every connection, and the node starts fine.
 * WebSocket, httpupgrade and XHTTP hand the handler their own connection types
 * (v26.10.10:transport/internet/websocket/hub.go:75, httpupgrade/hub.go:45,
 * splithttp/hub.go:391), which is why only the raw transport qualifies. Vision
 * does not pad UDP either: the inbound refuses a UDP request that names the
 * flow (v26.10.10:proxy/vless/inbound/inbound.go:558), and the outbound refuses
 * UDP to port 443 unless the flow is "xtls-rprx-vision-udp443"
 * (v26.10.10:proxy/vless/outbound/outbound.go:259).
 */

import { t } from '../../i18n';
import { byLine } from './versions/by-line';
import { compareCoreVersions, type CoreVersionId } from './versions';
import { isPlainObject, previewValue } from './string-map';

export const VISION_FLOW = 'xtls-rprx-vision';
/** Outbound only: the same flow with UDP to port 443 let through (the inbound refuses this spelling). */
export const VISION_FLOW_UDP443 = 'xtls-rprx-vision-udp443';

export const UINT32_MAX = 4294967295;
export const INT32_MAX = 2147483647;

/** What `NewVisionWriter` uses for a list shorter than four. */
export const DEFAULT_TESTSEED: readonly [number, number, number, number] = [900, 500, 900, 256];
export const TESTSEED_LENGTH = 4;

/**
 * The most a padded write can hold. `ReshapeMultiBuffer` splits a buffer of
 * `buf.Size-21` bytes or more, and `buf.Size` is 8192.
 */
const MAX_CONTENT = 8192 - 21;

/**
 * Past this a pre-connect count is flagged. The core has no limit; this is the
 * point where "a few spare connections" has become a lot of idle sockets on the
 * server, and a judgement of this app's, not a fact about the core.
 */
export const TESTPRE_WARN_ABOVE = 32;

/**
 * `tag:file:line` for each fact above, per line. 26.9.30 and 26.10 sit two lines
 * further down `proxy/proxy.go` than 26.9 (the close-notify suppressor added
 * above NewVisionWriter), and 26.3 and 26.7 carry the outbound's Process one
 * block lower than 26.9 on; everything else is the same code at the same place.
 */
export const VISION_EVIDENCE = {
    /** VLessInboundConfig.Flow/Testseed, the flow check, and a client falling back to them. */
    inboundDefaults: byLine(
        ['v26.3.27:infra/conf/vless.go:36-37', 'v26.3.27:infra/conf/vless.go:44-48', 'v26.3.27:infra/conf/vless.go:65-75'],
        ['v26.7.28:infra/conf/vless.go:38-39', 'v26.7.28:infra/conf/vless.go:50-54', 'v26.7.28:infra/conf/vless.go:72-82'],
        ['v26.9.9:infra/conf/vless.go:38-39', 'v26.9.9:infra/conf/vless.go:50-54', 'v26.9.9:infra/conf/vless.go:72-82'],
        ['v26.9.30:infra/conf/vless.go:38-39', 'v26.9.30:infra/conf/vless.go:50-54', 'v26.9.30:infra/conf/vless.go:72-82'],
        ['v26.10.10:infra/conf/vless.go:38-39', 'v26.10.10:infra/conf/vless.go:50-54', 'v26.10.10:infra/conf/vless.go:72-82'],
    ),
    /** The inbound's protobuf config: no flow, no testseed — a user added through the API gets neither default. */
    inboundRuntime: byLine(
        ['v26.3.27:proxy/vless/inbound/config.proto:21', 'v26.3.27:proxy/vless/inbound/inbound.go:241'],
        ['v26.7.28:proxy/vless/inbound/config.proto:21', 'v26.7.28:proxy/vless/inbound/inbound.go:241'],
        ['v26.9.9:proxy/vless/inbound/config.proto:21', 'v26.9.9:proxy/vless/inbound/inbound.go:241'],
        ['v26.9.30:proxy/vless/inbound/config.proto:21', 'v26.9.30:proxy/vless/inbound/inbound.go:241'],
        ['v26.10.10:proxy/vless/inbound/config.proto:21', 'v26.10.10:proxy/vless/inbound/inbound.go:241'],
    ),
    /** VLessOutboundConfig (flat keys), how Build() applies them, and the vnext user decoded as a vless.Account. */
    outboundKeys: byLine(
        ['v26.3.27:infra/conf/vless.go:233-246', 'v26.3.27:infra/conf/vless.go:285-298', 'v26.3.27:infra/conf/vless.go:300', 'v26.3.27:proxy/vless/account.pb.go:82-89'],
        ['v26.7.28:infra/conf/vless.go:245-258', 'v26.7.28:infra/conf/vless.go:297-310', 'v26.7.28:infra/conf/vless.go:312', 'v26.7.28:proxy/vless/account.pb.go:82-89'],
        ['v26.9.9:infra/conf/vless.go:245-258', 'v26.9.9:infra/conf/vless.go:297-310', 'v26.9.9:infra/conf/vless.go:312', 'v26.9.9:proxy/vless/account.pb.go:82-89'],
        ['v26.9.30:infra/conf/vless.go:245-258', 'v26.9.30:infra/conf/vless.go:297-310', 'v26.9.30:infra/conf/vless.go:312', 'v26.9.30:proxy/vless/account.pb.go:82-89'],
        ['v26.10.10:infra/conf/vless.go:245-258', 'v26.10.10:infra/conf/vless.go:297-310', 'v26.10.10:infra/conf/vless.go:312', 'v26.10.10:proxy/vless/account.pb.go:82-89'],
    ),
    /** The default list, the long and short padding branches, and the buffer that panics on a negative length. */
    padding: byLine(
        ['v26.3.27:proxy/proxy.go:307-309', 'v26.3.27:proxy/proxy.go:502-529', 'v26.3.27:common/buf/buffer.go:148-157'],
        ['v26.7.28:proxy/proxy.go:307-309', 'v26.7.28:proxy/proxy.go:502-529', 'v26.7.28:common/buf/buffer.go:148-157'],
        ['v26.9.9:proxy/proxy.go:307-309', 'v26.9.9:proxy/proxy.go:502-529', 'v26.9.9:common/buf/buffer.go:148-157'],
        ['v26.9.30:proxy/proxy.go:308-310', 'v26.9.30:proxy/proxy.go:504-531', 'v26.9.30:common/buf/buffer.go:148-157'],
        ['v26.10.10:proxy/proxy.go:308-310', 'v26.10.10:proxy/proxy.go:504-531', 'v26.10.10:common/buf/buffer.go:148-157'],
    ),
    /** Which side's numbers pad which direction, and the receiver reading the length from the block. */
    direction: byLine(
        ['v26.3.27:proxy/vless/encoding/addons.go:71', 'v26.3.27:proxy/vless/inbound/inbound.go:622', 'v26.3.27:proxy/vless/outbound/outbound.go:330', 'v26.3.27:proxy/proxy.go:574-576'],
        ['v26.7.28:proxy/vless/encoding/addons.go:71', 'v26.7.28:proxy/vless/inbound/inbound.go:622', 'v26.7.28:proxy/vless/outbound/outbound.go:330', 'v26.7.28:proxy/proxy.go:574-576'],
        ['v26.9.9:proxy/vless/encoding/addons.go:71', 'v26.9.9:proxy/vless/inbound/inbound.go:622', 'v26.9.9:proxy/vless/outbound/outbound.go:328', 'v26.9.9:proxy/proxy.go:574-576'],
        ['v26.9.30:proxy/vless/encoding/addons.go:71', 'v26.9.30:proxy/vless/inbound/inbound.go:622', 'v26.9.30:proxy/vless/outbound/outbound.go:328', 'v26.9.30:proxy/proxy.go:576-578'],
        ['v26.10.10:proxy/vless/encoding/addons.go:71', 'v26.10.10:proxy/vless/inbound/inbound.go:622', 'v26.10.10:proxy/vless/outbound/outbound.go:328', 'v26.10.10:proxy/proxy.go:576-578'],
    ),
    /** testpre: kept on the handler, started once, skipped with reverse. */
    preconnect: byLine(
        ['v26.3.27:proxy/vless/outbound/outbound.go:131', 'v26.3.27:proxy/vless/outbound/outbound.go:159-189'],
        ['v26.7.28:proxy/vless/outbound/outbound.go:131', 'v26.7.28:proxy/vless/outbound/outbound.go:159-189'],
        ['v26.9.9:proxy/vless/outbound/outbound.go:131', 'v26.9.9:proxy/vless/outbound/outbound.go:159-189'],
        ['v26.9.30:proxy/vless/outbound/outbound.go:131', 'v26.9.30:proxy/vless/outbound/outbound.go:159-189'],
        ['v26.10.10:proxy/vless/outbound/outbound.go:131', 'v26.10.10:proxy/vless/outbound/outbound.go:159-189'],
    ),
    /** Where Vision is refused at run time: the inbound's and the outbound's connection checks. */
    carrier: byLine(
        ['v26.3.27:proxy/vless/inbound/inbound.go:558', 'v26.3.27:proxy/vless/inbound/inbound.go:573', 'v26.3.27:proxy/vless/inbound/inbound.go:581', 'v26.3.27:proxy/vless/inbound/inbound.go:594', 'v26.3.27:proxy/vless/outbound/outbound.go:261', 'v26.3.27:proxy/vless/outbound/outbound.go:284'],
        ['v26.7.28:proxy/vless/inbound/inbound.go:558', 'v26.7.28:proxy/vless/inbound/inbound.go:573', 'v26.7.28:proxy/vless/inbound/inbound.go:581', 'v26.7.28:proxy/vless/inbound/inbound.go:594', 'v26.7.28:proxy/vless/outbound/outbound.go:261', 'v26.7.28:proxy/vless/outbound/outbound.go:284'],
        ['v26.9.9:proxy/vless/inbound/inbound.go:558', 'v26.9.9:proxy/vless/inbound/inbound.go:573', 'v26.9.9:proxy/vless/inbound/inbound.go:581', 'v26.9.9:proxy/vless/inbound/inbound.go:594', 'v26.9.9:proxy/vless/outbound/outbound.go:259', 'v26.9.9:proxy/vless/outbound/outbound.go:282'],
        ['v26.9.30:proxy/vless/inbound/inbound.go:558', 'v26.9.30:proxy/vless/inbound/inbound.go:573', 'v26.9.30:proxy/vless/inbound/inbound.go:581', 'v26.9.30:proxy/vless/inbound/inbound.go:594', 'v26.9.30:proxy/vless/outbound/outbound.go:259', 'v26.9.30:proxy/vless/outbound/outbound.go:282'],
        ['v26.10.10:proxy/vless/inbound/inbound.go:558', 'v26.10.10:proxy/vless/inbound/inbound.go:573', 'v26.10.10:proxy/vless/inbound/inbound.go:581', 'v26.10.10:proxy/vless/inbound/inbound.go:594', 'v26.10.10:proxy/vless/outbound/outbound.go:259', 'v26.10.10:proxy/vless/outbound/outbound.go:282'],
    ),
    /** The network and security switches that decide what the stream is (raw/tcp, tls, reality). */
    stream: byLine(
        ['v26.3.27:infra/conf/transport_internet.go:999-1000', 'v26.3.27:infra/conf/transport_internet.go:1750', 'v26.3.27:infra/conf/transport_internet.go:1763-1792'],
        ['v26.7.28:infra/conf/transport_internet.go:17-18', 'v26.7.28:infra/conf/transport_internet.go:69', 'v26.7.28:infra/conf/transport_internet.go:85-114'],
        ['v26.9.9:infra/conf/transport_internet.go:17-18', 'v26.9.9:infra/conf/transport_internet.go:69', 'v26.9.9:infra/conf/transport_internet.go:85-114'],
        ['v26.9.30:infra/conf/transport_internet.go:17-18', 'v26.9.30:infra/conf/transport_internet.go:75', 'v26.9.30:infra/conf/transport_internet.go:91-120'],
        ['v26.10.10:infra/conf/transport_internet.go:17-18', 'v26.10.10:infra/conf/transport_internet.go:75', 'v26.10.10:infra/conf/transport_internet.go:91-120'],
    ),
};

// ── what the four numbers are ──────────────────────────────────────────

export type SeedIndex = 0 | 1 | 2 | 3;

export const SEED_INDEXES: readonly SeedIndex[] = [0, 1, 2, 3];

/** The words for each number — the form's labels and one line each, and what a problem calls it. */
export const seedWords = (index: SeedIndex): { label: string; help: string } => {
    switch (index) {
        case 0: return {
            label: t("Short write limit"),
            help: t("Writes shorter than this many bytes get the long padding."),
        };
        case 1: return {
            label: t("Long padding spread"),
            help: t("The long padding adds a random 0 up to this many bytes, not including it."),
        };
        case 2: return {
            label: t("Long padding length"),
            help: t("The long padding makes a write this many bytes long, before its random part."),
        };
        case 3: return {
            label: t("Short padding spread"),
            help: t("Every other write gets a random padding of 0 up to this many bytes, not including it."),
        };
    }
};

// ── reading ────────────────────────────────────────────────────────────

/** What a config holds at a `testseed` key. */
export type SeedRead =
    | { state: 'absent' }
    /** Something the decoder refuses; when the key is a list, the entry that failed is named in the last field. */
    | { state: 'wrong'; held: unknown; at?: { index: number; entry: unknown } }
    /** A list of valid numbers — possibly the wrong length for the core to use. */
    | { state: 'list'; entries: number[] };

export const isUint32 = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= UINT32_MAX;

export const readTestseed = (raw: unknown): SeedRead => {
    if (raw === undefined || raw === null) return { state: 'absent' };
    if (!Array.isArray(raw)) return { state: 'wrong', held: raw };
    const entries: number[] = [];
    for (let index = 0; index < raw.length; index += 1) {
        const item: unknown = raw[index];
        // A null leaves the Go zero value in place and fails nothing.
        const value = item === null ? 0 : item;
        if (!isUint32(value)) return { state: 'wrong', held: raw, at: { index, entry: item } };
        entries.push(value);
    }
    return { state: 'list', entries };
};

export type PreRead =
    | { state: 'absent' }
    | { state: 'wrong'; held: unknown }
    | { state: 'number'; value: number };

export const readTestpre = (raw: unknown): PreRead => {
    if (raw === undefined || raw === null) return { state: 'absent' };
    return isUint32(raw) ? { state: 'number', value: raw } : { state: 'wrong', held: raw };
};

/**
 * What a typed number becomes: a whole number the core can decode. `undefined`
 * for an empty or unreadable box; a fraction is floored and a negative number
 * becomes 0, so the form never writes what would fail the decode.
 */
export const parseUint32 = (text: string | number): number | undefined => {
    if (typeof text === 'string' && text.trim() === '') return undefined;
    const value = Number(text);
    if (!Number.isFinite(value)) return undefined;
    return Math.min(UINT32_MAX, Math.max(0, Math.floor(value)));
};

/**
 * The list with one number changed, whole: a list of fewer than four is read as
 * none at all, so the numbers left alone are taken from what is held, then from
 * `base` (the inbound's list for a client; Xray's own otherwise) so that what the
 * boxes show is what is written. Entries past the fourth are kept as they were.
 */
export const withSeedEntry = (
    held: readonly number[],
    index: SeedIndex,
    value: number,
    base: readonly number[] = DEFAULT_TESTSEED,
): number[] => {
    const next = SEED_INDEXES.map(at => held[at] ?? base[at] ?? DEFAULT_TESTSEED[at]);
    next[index] = value;
    return [...next, ...held.slice(TESTSEED_LENGTH)];
};

/** The numbers a client falls back to: the inbound's list when it has all four, else Xray's own. */
export const inheritedSeed = (inbound: unknown): number[] | undefined => {
    const read = readTestseed(isPlainObject(inbound) && isPlainObject(inbound.settings) ? inbound.settings.testseed : undefined);
    return read.state === 'list' && read.entries.length >= TESTSEED_LENGTH ? read.entries.slice(0, TESTSEED_LENGTH) : undefined;
};

// ── where things sit ───────────────────────────────────────────────────

const lower = (value: unknown): string => (typeof value === 'string' ? value.toLowerCase() : '');

export const isVlessInbound = (inbound: unknown): boolean => isPlainObject(inbound) && lower(inbound.protocol) === 'vless';
export const isVlessOutbound = (outbound: unknown): boolean => isPlainObject(outbound) && lower(outbound.protocol) === 'vless';

export type OutboundShape = 'flat' | 'vnext';

export interface OutboundHolder {
    shape: OutboundShape;
    /** From the outbound down: `['settings']`, or `['settings', 'vnext', 0, 'users', 0]`. */
    path: (string | number)[];
    /** The object that carries flow, testseed and testpre; nothing while the config has not made one. */
    holder: Record<string, unknown> | undefined;
}

/**
 * Where the core reads an outbound's account from: the flat settings once
 * `address` is there, `vnext[0].users[0]` otherwise (v26.7.28:infra/conf/vless.go:263-271
 * decides it by `c.Address != nil`, and `null` is not there). VMess has the same
 * two forms, with the same test.
 */
export const outboundHolder = (outbound: unknown): OutboundHolder => {
    const settings = isPlainObject(outbound) && isPlainObject(outbound.settings) ? outbound.settings : undefined;
    if (settings && settings.address !== undefined && settings.address !== null) {
        return { shape: 'flat', path: ['settings'], holder: settings };
    }
    const vnext = settings && Array.isArray(settings.vnext) ? settings.vnext[0] : undefined;
    const user = isPlainObject(vnext) && Array.isArray(vnext.users) ? vnext.users[0] : undefined;
    return { shape: 'vnext', path: ['settings', 'vnext', 0, 'users', 0], holder: isPlainObject(user) ? user : undefined };
};

const pathText = (path: (string | number)[]): string =>
    path.reduce<string>((text, step) => (typeof step === 'number' ? `${text}[${step}]` : text === '' ? step : `${text}.${step}`), '');

/**
 * The inbound's client list as the core reads it: `clients` when that key is
 * a list, else — on 26.7 and later — `users` (v26.7.28:infra/conf/vless.go:46-48
 * copies Clients over Users when Clients is not nil; 26.3 has no `users` key).
 */
export const clientList = (
    inbound: unknown,
    version?: CoreVersionId,
): { key: 'clients' | 'users'; clients: unknown[] } | undefined => {
    const settings = isPlainObject(inbound) && isPlainObject(inbound.settings) ? inbound.settings : undefined;
    if (!settings) return undefined;
    if (Array.isArray(settings.clients)) return { key: 'clients', clients: settings.clients };
    if ((version === undefined || compareCoreVersions(version, '26.7') >= 0) && Array.isArray(settings.users)) {
        return { key: 'users', clients: settings.users };
    }
    return undefined;
};

/** A flow that is empty (or not there) takes the inbound's; anything else stands as written. */
export const effectiveClientFlow = (inbound: unknown, client: unknown): unknown => {
    const own = isPlainObject(client) ? client.flow : undefined;
    if (own !== undefined && own !== null && own !== '') return own;
    const settings = isPlainObject(inbound) && isPlainObject(inbound.settings) ? inbound.settings : undefined;
    return settings ? settings.flow : undefined;
};

export const isVisionFlow = (flow: unknown, side: 'inbound' | 'outbound'): boolean =>
    flow === VISION_FLOW || (side === 'outbound' && flow === VISION_FLOW_UDP443);

// ── problems ───────────────────────────────────────────────────────────

/**
 * Mux beside a Vision flow, read the way the core reads it — the same on
 * every supported line.
 *
 * Mux is not refused with Vision; what it may carry is. An outbound with Mux
 * on sends TCP through it unless `concurrency` is below 0 (0 means 8), and
 * UDP through XUDP when `xudpConcurrency` is above 0
 * (v26.10.10:app/proxyman/outbound/handler.go:122-136, :226-235;
 * v26.3.27 :124-138). The client lets a Mux request through Vision so that the
 * server can judge it (v26.10.10:proxy/vless/outbound/outbound.go:261-262),
 * and a server whose account has the Vision flow allows only UDP inside Mux
 * (v26.10.10:proxy/vless/inbound/inbound.go:609, v26.3.27 and v26.7.28 :609).
 * So TCP in Mux fails connection by connection while XUDP works — the
 * supported way to combine the two is `concurrency: -1` with XUDP for UDP.
 * The config loads either way; this is about every TCP connection failing.
 */
export const visionMuxProblem = (outbound: unknown): VisionProblem | null => {
    if (!isVlessOutbound(outbound) || !isPlainObject(outbound)) return null;
    const flow = outboundHolder(outbound).holder?.flow;
    if (!isVisionFlow(flow, 'outbound')) return null;
    const mux = isPlainObject(outbound.mux) ? outbound.mux : undefined;
    if (!mux || mux.enabled !== true) return null;
    const concurrency = typeof mux.concurrency === 'number' ? mux.concurrency : 0;
    if (concurrency < 0) return null;
    return {
        kind: 'mux.tcp',
        field: 'mux.concurrency',
        severity: 'critical',
        message: t("Mux is on and carries TCP (concurrency is {value}, not -1), and the flow is {flow}. A Vision server lets only UDP through inside Mux, so every TCP connection this outbound sends that way fails.", {
            value: mux.concurrency === undefined ? t("not set, which is 8") : String(mux.concurrency),
            flow: String(flow),
        }),
        suggestion: t("Set Mux concurrency to -1: TCP then goes through Vision itself, and UDP can still share connections through XUDP (xudpConcurrency)."),
    };
};

export type VisionProblemKind =
    | 'testseed.type' | 'testseed.zero' | 'testseed.overflow' | 'testseed.negative'
    | 'testseed.short' | 'testseed.extra' | 'testseed.inert'
    | 'testpre.type' | 'testpre.large' | 'testpre.reverse'
    | 'flow.type' | 'flow.transport'
    | 'mux.tcp';

export interface VisionProblem {
    kind: VisionProblemKind;
    /** From the inbound or outbound down: `settings.clients[2].testseed`. */
    field: string;
    /** Critical: the config does not load, or the core stops. Warning: the setting does nothing, or not what it says. */
    severity: 'critical' | 'warning';
    message: string;
    suggestion?: string;
    /** Which of the four numbers, for the per-number kinds. */
    entry?: SeedIndex;
    /** Which client of an inbound, for the per-client kinds. */
    client?: number;
}

export interface SeedSite {
    /** Where the key is, from the inbound or outbound down. */
    field: string;
    /** `client` has the inbound to fall back on; the other two fall back on Xray's own numbers. */
    scope: 'inbound' | 'client' | 'outbound';
    client?: number;
}

const EXAMPLE = '[900, 500, 900, 256]';

/** Everything wrong with one `testseed` key, whatever it holds. Nothing for an absent one. */
export const seedProblems = (raw: unknown, site: SeedSite): VisionProblem[] => {
    const read = readTestseed(raw);
    const { field, client } = site;
    const at = { field, client };
    if (read.state === 'absent') return [];

    if (read.state === 'wrong') {
        return [{
            ...at,
            kind: 'testseed.type',
            severity: 'critical',
            message: read.at
                ? t("{what} holds {value}, but Xray reads whole numbers from 0 to {max} in this list. It cannot decode the config, so the config will not load.", { what: `${field}[${read.at.index}]`, value: previewValue(read.at.entry), max: UINT32_MAX })
                : t("{what} holds {value}, but Xray reads a list of whole numbers there. It cannot decode the config, so the config will not load.", { what: field, value: previewValue(read.held) }),
            suggestion: t("Write it as a list of four numbers, for example {example}.", { example: EXAMPLE }),
        }];
    }

    const { entries } = read;
    if (entries.length === 0) return [];

    if (entries.length < TESTSEED_LENGTH) {
        return [{
            ...at,
            kind: 'testseed.short',
            severity: 'warning',
            message: site.scope === 'client'
                ? t("{what} has {count} of the 4 numbers Xray needs, so it ignores them: this client gets the inbound's testseed, or Xray's own numbers ({defaults}) where the inbound has none.", { what: field, count: entries.length, defaults: DEFAULT_TESTSEED.join(', ') })
                : t("{what} has {count} of the 4 numbers Xray needs, so it ignores them and pads with its own ({defaults}).", { what: field, count: entries.length, defaults: DEFAULT_TESTSEED.join(', ') }),
            suggestion: t("Give all four numbers, or remove the key."),
        }];
    }

    const problems: VisionProblem[] = [];
    const s = entries as [number, number, number, number, ...number[]];
    const name = (index: SeedIndex) => `${field}[${index}]`;

    if (entries.length > TESTSEED_LENGTH) {
        problems.push({
            ...at,
            kind: 'testseed.extra',
            severity: 'warning',
            message: t("{what} has {count} numbers; Xray reads the first four and ignores the rest.", { what: field, count: entries.length }),
        });
    }

    // [0] above int32: the comparison `length < int32(testseed[0])` is then against
    // a negative number, so no write is ever "short" and [1] and [2] are never read.
    const longPaddingUsed = s[0] > 0 && s[0] <= INT32_MAX;
    if (s[0] > INT32_MAX) {
        problems.push({
            ...at, entry: 0,
            kind: 'testseed.overflow',
            severity: 'warning',
            message: t("{what} is {value}, above {limit}. Xray works with it as a signed 32-bit number, where it is negative, so no write is ever short enough for the long padding.", { what: name(0), value: s[0], limit: INT32_MAX }),
        });
    }

    // rand(0 .. n-1) with n = 0 panics. [1] is only drawn on the long-padding path.
    if (s[1] === 0 && longPaddingUsed) {
        problems.push(zero(at, 1, name(1), seedWords(1).label));
    }
    if (s[3] === 0) {
        problems.push(zero(at, 3, name(3), seedWords(3).label));
    }

    if (longPaddingUsed) {
        if (s[1] > INT32_MAX + 1) problems.push(overflow(at, 1, name(1), s[1], INT32_MAX + 1));
        if (s[2] > INT32_MAX) problems.push(overflow(at, 2, name(2), s[2], INT32_MAX));
        // The long padding is [2] minus the write's length plus the random part;
        // a write longer than [2] has only the random part to cover the difference.
        const longest = Math.min(s[0] - 1, MAX_CONTENT);
        if (s[2] <= INT32_MAX && s[2] < longest) {
            problems.push({
                ...at, entry: 2,
                kind: 'testseed.negative',
                severity: 'warning',
                message: t("{what} is {low}, but writes up to {high} bytes get the long padding. Its length is {low} minus the write's length plus a random part, so for a write longer than {low} it can come out negative, and Xray panics on a negative padding length — the core stops.", { what: name(2), low: s[2], high: longest }),
                suggestion: t("Keep {what} at least as large as {high}.", { what: name(2), high: longest }),
            });
        }
    }
    if (s[3] > INT32_MAX + 1) problems.push(overflow(at, 3, name(3), s[3], INT32_MAX + 1));

    return problems;
};

const zero = (at: { field: string; client?: number }, entry: SeedIndex, what: string, label: string): VisionProblem => ({
    ...at, entry,
    kind: 'testseed.zero',
    severity: 'critical',
    message: t("{what} ({label}) is 0. Xray draws a random number below it for the padding, which panics for 0, and nothing catches the panic: the core stops the first time it takes that path.", { what, label }),
    suggestion: t("Use at least 1; Xray's own number is {default}.", { default: DEFAULT_TESTSEED[entry] }),
});

const overflow = (at: { field: string; client?: number }, entry: SeedIndex, what: string, value: number, limit: number): VisionProblem => ({
    ...at, entry,
    kind: 'testseed.overflow',
    severity: 'critical',
    message: t("{what} is {value}, above {limit}. Xray works with it as a signed 32-bit number, where it can come out negative, and a negative padding length panics — the core stops.", { what, value, limit }),
    suggestion: t("Use at most {limit}; Xray's own number is {default}.", { limit, default: DEFAULT_TESTSEED[entry] }),
});

/** Four or more valid numbers: a list the core actually uses. */
const usableSeed = (raw: unknown): boolean => {
    const read = readTestseed(raw);
    return read.state === 'list' && read.entries.length >= TESTSEED_LENGTH;
};

const flowText = (flow: unknown): string => (typeof flow === 'string' && flow !== '' ? flow : t("no flow"));

const inert = (
    site: { field: string; client?: number },
    flow: unknown,
): VisionProblem => ({
    ...site,
    kind: 'testseed.inert',
    severity: 'warning',
    message: t("{what} only matters with the flow {vision}; with {flow} nothing is padded and it does nothing.", { what: site.field, vision: VISION_FLOW, flow: flowText(flow) }),
});

const flowType = (field: string, held: unknown, client?: number): VisionProblem => ({
    field, client,
    kind: 'flow.type',
    severity: 'critical',
    message: t("{what} holds {value}, but Xray reads text there. It cannot decode the config, so the config will not load.", { what: field, value: previewValue(held) }),
});

const isNonText = (value: unknown): boolean => value !== undefined && value !== null && typeof value !== 'string';

/** Transport names the core builds; see versions/features.ts for the lines that add the last two. */
const KNOWN_NETWORKS = new Set([
    'raw', 'tcp', 'xhttp', 'splithttp', 'kcp', 'mkcp', 'grpc', 'ws', 'websocket', 'httpupgrade', 'hysteria', 'masque', 'xdrive',
]);

export type Carrier =
    | { ok: true }
    | { ok: false; reason: 'network'; network: string }
    | { ok: false; reason: 'security'; security: string };

/**
 * Why a stream cannot carry Vision, or `ok` when it can — or when this app
 * cannot tell: a transport name nobody knows, a legacy `xtls`, the `method`
 * alias the core lets override `network`. `encrypted` is VLESS Encryption,
 * which Vision runs over whatever the transport is.
 */
export const visionCarrier = (streamSettings: unknown, encrypted: boolean): Carrier => {
    if (encrypted) return { ok: true };
    const stream = isPlainObject(streamSettings) ? streamSettings : {};
    if (stream.method !== undefined && stream.method !== null) return { ok: true };
    const rawNetwork = stream.network;
    if (rawNetwork !== undefined && rawNetwork !== null && typeof rawNetwork !== 'string') return { ok: true };
    const network = typeof rawNetwork === 'string' ? rawNetwork.toLowerCase() : 'tcp';
    if (!KNOWN_NETWORKS.has(network)) return { ok: true };
    if (network !== 'tcp' && network !== 'raw') return { ok: false, reason: 'network', network: String(rawNetwork) };
    const rawSecurity = stream.security;
    if (rawSecurity !== undefined && rawSecurity !== null && typeof rawSecurity !== 'string') return { ok: true };
    const security = typeof rawSecurity === 'string' ? rawSecurity.toLowerCase() : '';
    if (security === '' || security === 'none') return { ok: false, reason: 'security', security: security === '' ? 'none' : security };
    return { ok: true };
};

const carrierProblem = (flowField: string, flow: unknown, carrier: Carrier, client?: number): VisionProblem | undefined => {
    if (carrier.ok) return undefined;
    return carrier.reason === 'network'
        ? {
            field: 'streamSettings.network', client,
            kind: 'flow.transport',
            severity: 'warning',
            message: t("{what} is {flow}, but the stream settings use the {network} transport. Xray runs Vision only on the TLS or REALITY connection itself, which the raw transport hands over and the others do not, so every Vision connection is refused with \"XTLS only supports TLS and REALITY directly for now.\" The node still starts.", { what: flowField, flow: String(flow), network: carrier.network }),
            suggestion: t("Use the raw (tcp) transport with TLS or REALITY, or remove the flow."),
        }
        : {
            field: 'streamSettings.security', client,
            kind: 'flow.transport',
            severity: 'warning',
            message: t("{what} is {flow}, but the stream settings have no TLS or REALITY. Xray runs Vision only on a TLS or REALITY connection, so every Vision connection is refused with \"XTLS only supports TLS and REALITY directly for now.\" The node still starts.", { what: flowField, flow: String(flow) }),
            suggestion: t("Turn on TLS or REALITY under the stream settings, or remove the flow."),
        };
};

/** VLESS Encryption is in use: anything but an empty value or the literal "none". */
const encrypts = (value: unknown): boolean => typeof value === 'string' && value !== '' && value !== 'none';

/**
 * Everything the core would refuse or quietly not do about Vision on one VLESS
 * inbound: the flows, the padding numbers inbound-wide and per client, and a
 * Vision client on a stream that cannot carry it. `version` only decides which
 * client list is read (26.3 has no `users` key).
 */
export const visionInboundProblems = (inbound: unknown, version?: CoreVersionId): VisionProblem[] => {
    if (!isVlessInbound(inbound) || !isPlainObject(inbound)) return [];
    const settings = isPlainObject(inbound.settings) ? inbound.settings : undefined;
    if (!settings) return [];
    const problems: VisionProblem[] = [];

    if (isNonText(settings.flow)) problems.push(flowType('settings.flow', settings.flow));
    problems.push(...seedProblems(settings.testseed, { field: 'settings.testseed', scope: 'inbound' }));

    const list = clientList(inbound, version);
    let visionClients = 0;
    let firstVision: { field: string; flow: unknown; client: number } | undefined;
    list?.clients.forEach((client, index) => {
        if (!isPlainObject(client)) return;
        const prefix = `settings.${list.key}[${index}]`;
        if (isNonText(client.flow)) problems.push(flowType(`${prefix}.flow`, client.flow, index));
        const flow = effectiveClientFlow(inbound, client);
        const vision = isVisionFlow(flow, 'inbound');
        if (vision) {
            visionClients += 1;
            firstVision ??= { field: client.flow ? `${prefix}.flow` : 'settings.flow', flow, client: index };
        }
        problems.push(...seedProblems(client.testseed, { field: `${prefix}.testseed`, scope: 'client', client: index }));
        if (!vision && usableSeed(client.testseed)) problems.push(inert({ field: `${prefix}.testseed`, client: index }, flow));
    });

    // The inbound-wide numbers are used by clients that run Vision; with a list
    // and no such client they have nothing to apply to.
    if (list && list.clients.length > 0 && visionClients === 0 && usableSeed(settings.testseed)) {
        problems.push(inert({ field: 'settings.testseed' }, settings.flow));
    }

    if (firstVision) {
        const carrier = carrierProblem(firstVision.field, firstVision.flow, visionCarrier(inbound.streamSettings, encrypts(settings.decryption)), firstVision.client);
        if (carrier) problems.push(carrier);
    }
    return problems;
};

/**
 * The same for one VLESS outbound, in whichever of the two forms it is written:
 * the flow, the padding numbers, the pre-connect count, and Vision on a stream
 * that cannot carry it.
 */
export const visionOutboundProblems = (outbound: unknown): VisionProblem[] => {
    if (!isVlessOutbound(outbound) || !isPlainObject(outbound)) return [];
    const { path, holder } = outboundHolder(outbound);
    if (!holder) return [];
    const prefix = pathText(path);
    const problems: VisionProblem[] = [];

    if (isNonText(holder.flow)) problems.push(flowType(`${prefix}.flow`, holder.flow));

    const flow = holder.flow;
    const seedField = `${prefix}.testseed`;
    problems.push(...seedProblems(holder.testseed, { field: seedField, scope: 'outbound' }));
    if (!isVisionFlow(flow, 'outbound') && usableSeed(holder.testseed)) problems.push(inert({ field: seedField }, flow));

    const pre = readTestpre(holder.testpre);
    const preField = `${prefix}.testpre`;
    if (pre.state === 'wrong') {
        problems.push({
            field: preField,
            kind: 'testpre.type',
            severity: 'critical',
            message: t("{what} holds {value}, but Xray reads a whole number from 0 to {max} there. It cannot decode the config, so the config will not load.", { what: preField, value: previewValue(pre.held), max: UINT32_MAX }),
        });
    } else if (pre.state === 'number' && pre.value > 0) {
        if (isPlainObject(holder.reverse)) {
            problems.push({
                field: preField,
                kind: 'testpre.reverse',
                severity: 'warning',
                message: t("{what} is ignored: Xray pre-connects only for an outbound without a reverse, and this one has one.", { what: preField }),
            });
        } else if (pre.value > TESTPRE_WARN_ABOVE) {
            problems.push({
                field: preField,
                kind: 'testpre.large',
                severity: 'warning',
                message: t("{what} is {count}: Xray opens that many connections to the server as soon as the first request goes through this outbound, and keeps each one idle until a request takes it.", { what: preField, count: pre.value }),
                suggestion: t("A handful is enough to have a connection ready; each one is a socket the server holds open."),
            });
        }
    }

    if (isVisionFlow(flow, 'outbound')) {
        const stream = (outbound as Record<string, unknown>).streamSettings;
        const carrier = carrierProblem(`${prefix}.flow`, flow, visionCarrier(stream, encrypts(holder.encryption)));
        if (carrier) problems.push(carrier);
    }
    return problems;
};
