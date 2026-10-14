/**
 * What a MASQUE endpoint has to hold before a core will load and run it.
 *
 * MASQUE is three things in a config, and a core checks each at its own
 * moment:
 *
 *   the proxy       `protocol: "masque"` and its `settings`. An outbound is
 *                   {address, port, remoteDNS}
 *                   (v26.10.10:infra/conf/masque.go:14-39); an inbound is
 *                   {users | clients, address, mtu} (:47-103).
 *   the transport   `streamSettings.network: "masque"` with `masqueSettings`
 *                   {host, path, user, pass, headers, warp}
 *                   (v26.10.10:infra/conf/transport_method.go:798-887), the
 *                   HTTP request that carries the tunnel.
 *   the pairing     the two only work together. The loader refuses the
 *                   transport on any other proxy
 *                   (v26.10.10:infra/conf/xray.go:209-211 inbound, :351-353
 *                   outbound), and the proxy refuses to start on any other
 *                   transport or without TLS
 *                   (v26.10.10:proxy/masque/client.go:58-63, server.go:126-131).
 *
 * v26.9.30 has all of it but `warp`: infra/conf/masque.go (outbound :14-39,
 * inbound :47-103), proxy/masque (client.go:58-63, server.go:126-131), the
 * loader's checks (infra/conf/xray.go:209-211 and :351-353) and the
 * listener's (transport/internet/masque/hub.go:54-56) are the same files and
 * lines at v26.9.30 as at v26.10.10, and `MasqueConfig` is {host, path, user,
 * pass, headers} there (v26.9.30:infra/conf/transport_method.go:793-848,
 * whose Build() has no warp branch). The shared rules below hold on both
 * lines; the warp ones are asked only of a line that reads the key
 * (`lineReadsWarp`).
 *
 * Everything here is critical: each is either an error from Build() — the
 * config does not load — or an error from the handler's constructor, which
 * stops the core starting. Which side a rule belongs to is in the note beside
 * it. A line that does not register MASQUE (see features.masque.ts) is
 * answered by the version table alone, so this returns nothing for it.
 *
 * The same functions draw the notes beside the fields and fill the
 * diagnostics, so the two cannot say different things.
 */

import validator from 'validator';
import { t } from '../../i18n';
import { LATEST_CORE_VERSION, coreVersion, type CoreVersionId } from './versions';
import { featureStatus } from './versions/features';
import { effectiveNetwork } from './transport-networks';
import { warpPrivateKeyFailure, warpPublicKeyFailure, type WarpKeyFailure } from './warp-keys';

const { isIP } = validator;

export type MasqueSide = 'inbound' | 'outbound';

export interface MasqueProblem {
    kind: string;
    /** From the inbound or outbound down: `streamSettings.masqueSettings.warp.privateKey`. */
    field: string;
    message: string;
    suggestion?: string;
}

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/** The loader lower-cases the protocol before it looks it up (v26.10.10:infra/conf/loader.go:46). */
export const isMasque = (item: unknown): boolean =>
    isObject(item) && typeof item.protocol === 'string' && item.protocol.toLowerCase() === 'masque';

/** Unset as the decoder sees it: absent or `null`. */
const unset = (value: unknown): boolean => value === undefined || value === null;

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/** Whether a line registers MASQUE at all — the version table's answer, asked once. */
export const lineHasMasque = (version: CoreVersionId): boolean =>
    featureStatus(version, 'outbound.protocol.masque') !== 'rejected';

/**
 * Whether a line reads `masqueSettings.warp`: 26.10 only. v26.9.30 has the
 * transport but not WARP over it — `MasqueConfig` has no `warp` field
 * (v26.9.30:infra/conf/transport_method.go:793-799), so the key is dropped
 * and a config that holds one is told so by the version table, not here.
 */
export const lineReadsWarp = (version: CoreVersionId): boolean =>
    featureStatus(version, 'outbound.masqueSettings.warp') === 'accepted';

const shorten = (value: unknown): string => {
    let out: string;
    try {
        out = JSON.stringify(value) ?? String(value);
    } catch {
        out = String(value);
    }
    return out.length > 48 ? `${out.slice(0, 47)}…` : out;
};

// ── Addresses ─────────────────────────────────────────────────────────

/** An IPv4 or IPv6 address as one integer, with its family; null when it is neither. */
const addressValue = (value: string): { family: 4 | 6; value: bigint; zone: boolean } | null => {
    if (isIP(value, 4)) {
        return { family: 4, value: value.split('.').reduce((sum, part) => sum * 256n + BigInt(part), 0n), zone: false };
    }
    if (!isIP(value, 6)) return null;
    const zone = value.includes('%');
    let bare = zone ? value.slice(0, value.indexOf('%')) : value;
    // An embedded dotted quad is the last 32 bits.
    const dotted = /(\d+\.\d+\.\d+\.\d+)$/.exec(bare);
    if (dotted) {
        const four = dotted[1]!.split('.').map(Number);
        bare = bare.slice(0, dotted.index) + ((four[0]! << 8) | four[1]!).toString(16) + ':' + ((four[2]! << 8) | four[3]!).toString(16);
    }
    const halves = bare.split('::');
    const head = halves[0] ? halves[0].split(':') : [];
    const tail = halves.length > 1 && halves[1] ? halves[1].split(':') : [];
    const groups = halves.length > 1 ? [...head, ...Array(8 - head.length - tail.length).fill('0'), ...tail] : head;
    if (groups.length !== 8) return null;
    return { family: 6, value: groups.reduce((sum, group) => sum * 65536n + BigInt(`0x${group || '0'}`), 0n), zone };
};

/** `netip.ParseAddr`, which is what a `remoteDNS` entry goes through (v26.10.10:infra/conf/masque.go:28). */
export const isIpLiteral = (value: string): boolean => addressValue(value) !== null;

interface Prefix {
    family: 4 | 6;
    address: bigint;
    bits: number;
    zone: boolean;
}

/**
 * `netip.ParsePrefix`: an address, a slash, and a length that fits the family
 * (no sign, no leading zero). A zone is not allowed in a prefix.
 */
const parsePrefix = (value: string): Prefix | null => {
    const slash = value.lastIndexOf('/');
    if (slash < 0 || value.includes('%')) return null;
    const address = addressValue(value.slice(0, slash));
    const bits = value.slice(slash + 1);
    if (!address || !/^(0|[1-9]\d{0,2})$/.test(bits)) return null;
    const length = Number(bits);
    return length <= (address.family === 4 ? 32 : 128)
        ? { family: address.family, address: address.value, bits: length, zone: false }
        : null;
};

/**
 * Whether a prefix, handed to the inbound as `address`, can serve as the pool
 * clients are given addresses from. The server takes the prefix's own address
 * for itself, so it has to be a host in the network — not the network address,
 * and for IPv4 not the broadcast address — with at least one address left
 * (v26.10.10:proxy/masque/pool.go:20-45, called from server.go:145-160).
 */
const poolProblem = (prefix: Prefix): 'invalid' | 'host' | 'empty' | null => {
    const size = prefix.family === 4 ? 32 : 128;
    const host = BigInt(size - prefix.bits);
    const mask = (1n << host) - 1n;
    const network = prefix.address & ~mask & ((1n << BigInt(size)) - 1n);
    let last = network | mask;
    // ::ffff:a.b.c.d, an IPv4 address in IPv6 clothes: `Is4In6`.
    if (prefix.family === 6 && (prefix.address >> 32n) === 0xffffn) return 'invalid';
    if (prefix.address === network || (prefix.family === 4 && prefix.address === last)) return 'host';
    if (prefix.family === 4) last -= 1n;
    return network + 1n === last ? 'empty' : null;
};

// ── Wording ───────────────────────────────────────────────────────────

const tagOf = (version: CoreVersionId): string => coreVersion(version).tag;

const keyReason = (failure: WarpKeyFailure): string => {
    switch (failure) {
        case 'empty': return t("it is empty");
        case 'encoding': return t("it is neither a PEM block nor standard base64");
        case 'private-format': return t("it is neither a PKCS #8 nor a SEC 1 private key");
        case 'curve': return t("it is not an ECDSA key on P-256");
        case 'public-format': return t("it is not a PKIX public key");
    }
};

const KEY_SUGGESTION = (): string =>
    t("WARP's own keys are an ECDSA P-256 pair: the private key as PEM or base64 (PKCS #8 or SEC 1), the public key as PEM or base64 (PKIX).");

const wrongType = (what: string, held: unknown, expected: string, tag: string): string =>
    t("{what} holds {value}, but Xray {tag} reads {expected} there — it cannot read the config until that is fixed.", {
        what, value: shorten(held), expected, tag,
    });

// ── masqueSettings ────────────────────────────────────────────────────

/**
 * The target and ipproto variables a path may use, written out the way the
 * core replaces them (v26.10.10:infra/conf/transport_method.go:844-849); what
 * is left must start with a slash and hold no braces (:850-851).
 */
const PATH_VARIABLES: [RegExp, string][] = [
    [/\{target\}/g, '*'],
    [/\{ipproto\}/g, '*'],
    [/\{\?target,ipproto\}/g, '?target=*&ipproto=*'],
    [/\{\?ipproto,target\}/g, '?ipproto=*&target=*'],
    [/\{&target,ipproto\}/g, '&target=*&ipproto=*'],
    [/\{&ipproto,target\}/g, '&ipproto=*&target=*'],
];

/** The path Build() ends up with, or why it refuses it. */
export const masquePathProblem = (path: string): boolean => {
    let result = path;
    for (const [pattern, replacement] of PATH_VARIABLES) result = result.replace(pattern, replacement);
    return !result.startsWith('/') || /[{}]/.test(result);
};

/** A control character (below a space, or DEL), with the tab let through when asked. */
const hasControl = (value: string, allowTab = false): boolean => {
    for (const char of value) {
        const code = char.codePointAt(0)!;
        if ((code < 0x20 || code === 0x7f) && !(allowTab && code === 0x09)) return true;
    }
    return false;
};

/**
 * `url.Parse("https://" + host)` followed by `u.Host == host`
 * (v26.10.10:infra/conf/transport_method.go:853-857, v26.9.30 :814-818): the host may carry a
 * port, and nothing else that makes a URL — no path, query, fragment or
 * credentials — and none of the characters Go's host parser refuses.
 */
export const masqueHostProblem = (host: string): boolean => {
    if (/[/?#@\\^`{|}\s]/.test(host) || hasControl(host)) return true;
    const port = /:([^:\]]*)$/.exec(host);
    if (port && !host.startsWith('[') && port[1] !== '' && !/^\d+$/.test(port[1]!)) return true;
    return false;
};

/** `httpguts.ValidHeaderFieldName`: a token (RFC 7230 §3.2.6). */
const validHeaderName = (name: string): boolean => /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(name);

/** `httpguts.ValidHeaderFieldValue`: no control characters but tab. */
const validHeaderValue = (value: string): boolean => !hasControl(value, true);

/** Headers the core sets itself (v26.10.10:infra/conf/transport_method.go:862-864, v26.9.30 :824-826). */
const RESERVED_HEADERS = ['host', 'capsule-protocol'];

/**
 * Everything about `masqueSettings` that `MasqueConfig.Build()` refuses.
 *
 * Built whenever the object is there, whatever `network` says
 * (v26.10.10:infra/conf/transport_internet.go:201-210, the same lines at
 * v26.9.30): a leftover one that is wrong stops the whole config loading. The
 * second argument is where it sits.
 */
export const masqueSettingsProblems = (
    settings: unknown,
    at = 'streamSettings.masqueSettings',
    version: CoreVersionId = LATEST_CORE_VERSION,
): MasqueProblem[] => {
    if (unset(settings) || !lineHasMasque(version)) return [];
    const tag = tagOf(version);
    const out: MasqueProblem[] = [];
    const push = (kind: string, field: string, message: string, suggestion?: string) =>
        out.push({ kind, field: field ? `${at}.${field}` : at, message, suggestion });

    // A wrong JSON type fails the decode of the whole document, not just the key.
    if (!isObject(settings)) {
        push('type', '', wrongType(at, settings, t("an object"), tag));
        return out;
    }
    const stringKeys = ['host', 'path', 'user', 'pass'] as const;
    for (const key of stringKeys) {
        if (!unset(settings[key]) && typeof settings[key] !== 'string') {
            push('type', key, wrongType(`${at}.${key}`, settings[key], t("text"), tag));
        }
    }

    const user = text(settings.user);
    const pass = text(settings.pass);
    const credentials = user !== '' || pass !== '';
    const warp = settings.warp;
    // A line that does not read `warp` drops it before Build() looks, so it can
    // neither conflict with user and pass nor be wrong in itself.
    const hasWarp = lineReadsWarp(version) && !unset(warp);

    if (hasWarp) {
        if (!isObject(warp)) {
            push('type', 'warp', wrongType(`${at}.warp`, warp, t("an object"), tag));
        } else {
            if (credentials) {
                for (const key of ['user', 'pass'] as const) {
                    if (text(settings[key]) === '') continue;
                    push(
                        'warp.credentials', key,
                        t("{what} cannot be used together with warp — Xray {tag} refuses the config when both are set.", { what: `${at}.${key}`, tag }),
                        t("WARP signs in with its key. Remove user and pass, or remove warp."),
                    );
                }
            }
            for (const [key, check] of [['privateKey', warpPrivateKeyFailure], ['publicKey', warpPublicKeyFailure]] as const) {
                const held = warp[key];
                if (!unset(held) && typeof held !== 'string') {
                    push('type', `warp.${key}`, wrongType(`${at}.warp.${key}`, held, t("text"), tag));
                    continue;
                }
                const failure = check(text(held));
                if (failure) {
                    push(
                        `warp.${key}`, `warp.${key}`,
                        t("{what} is not a usable key: {reason}. Xray {tag} refuses the config.", { what: `${at}.warp.${key}`, reason: keyReason(failure), tag }),
                        KEY_SUGGESTION(),
                    );
                }
            }
            out.push(...warpAddressProblems(warp.address, `${at}.warp.address`, tag));
        }
    }

    // Defaults first: a path is "/" under warp and the well-known one otherwise, a
    // host is cloudflareaccess.com under warp; neither default can be wrong.
    const path = text(settings.path);
    if (path !== '' && masquePathProblem(path)) {
        push(
            'path', 'path',
            t("{what} is \"{value}\": it has to start with a slash and may use only the variables target and ipproto, in braces — Xray {tag} refuses the config.", { what: `${at}.path`, value: path, tag }),
            t("The default is /.well-known/masque/ip/*/*/ ; leave the path empty to use it."),
        );
    }
    const host = text(settings.host);
    if (host !== '' && masqueHostProblem(host)) {
        push(
            'host', 'host',
            t("{what} is \"{value}\", which is not a host name with an optional port — Xray {tag} refuses the config.", { what: `${at}.host`, value: host, tag }),
            t("Write only the name, like example.com or example.com:8443 — no scheme and no path."),
        );
    }

    const headers = settings.headers;
    if (!unset(headers)) {
        if (!isObject(headers)) {
            push('type', 'headers', wrongType(`${at}.headers`, headers, t("an object of text values"), tag));
        } else {
            for (const [name, held] of Object.entries(headers)) {
                // null decodes to "" (encoding/json leaves a string at its
                // zero value), so it loads — as string-map.ts reads it too.
                const value = held === null ? '' : held;
                if (typeof value !== 'string') {
                    push('type', `headers.${name}`, wrongType(`${at}.headers.${name}`, value, t("text"), tag));
                    continue;
                }
                if (!validHeaderName(name) || !validHeaderValue(value)) {
                    push('headers', `headers.${name}`, t("{what} is not a valid HTTP header — Xray {tag} refuses the config.", { what: `${at}.headers.${name}`, tag }));
                    continue;
                }
                const lower = name.toLowerCase();
                if (RESERVED_HEADERS.includes(lower)) {
                    push(
                        'headers.reserved', `headers.${name}`,
                        t("{what} cannot be set: Xray {tag} manages that header itself and refuses the config.", { what: `${at}.headers.${name}`, tag }),
                        lower === 'host' ? t("Use the host field for the Host header.") : undefined,
                    );
                } else if (lower === 'authorization' && credentials) {
                    push(
                        'headers.authorization', `headers.${name}`,
                        t("{what} cannot be set while user or pass is: they build the Authorization header, and Xray {tag} refuses the config when both are there.", { what: `${at}.headers.${name}`, tag }),
                    );
                }
            }
        }
    }

    if (credentials && user.includes(':')) {
        push(
            'user', 'user',
            t("{what} cannot contain a colon — it separates the user from the password in the sign-in, and Xray {tag} refuses the config.", { what: `${at}.user`, tag }),
        );
    }
    return out;
};

/** `parseWarpAddress`: a prefix or a bare address, at most one of each family (transport_method.go:889-912). */
const warpAddressProblems = (list: unknown, at: string, tag: string): MasqueProblem[] => {
    const problem = (kind: string, message: string, suggestion?: string): MasqueProblem[] =>
        [{ kind, field: at, message, suggestion }];
    if (unset(list)) {
        return problem('warp.address', t("{what} is empty — with warp set, Xray {tag} needs the address WARP gave this device, and refuses the config without one.", { what: at, tag }));
    }
    if (!Array.isArray(list)) {
        return problem('type', wrongType(at, list, t("a list of text"), tag));
    }
    if (list.length === 0) {
        return problem('warp.address', t("{what} is empty — with warp set, Xray {tag} needs the address WARP gave this device, and refuses the config without one.", { what: at, tag }));
    }
    const out: MasqueProblem[] = [];
    const seen = new Set<4 | 6>();
    for (const entry of list) {
        if (typeof entry !== 'string') {
            return problem('type', wrongType(at, entry, t("a list of text"), tag));
        }
        const parsed = parsePrefix(entry);
        const address = parsed ?? (() => {
            const bare = addressValue(entry);
            return bare ? { family: bare.family } : null;
        })();
        if (!address) {
            out.push(...problem(
                'warp.address.invalid',
                t("{what} lists \"{value}\", which is not an IP address or prefix — Xray {tag} refuses the config.", { what: at, value: entry, tag }),
            ));
            continue;
        }
        if (seen.has(address.family)) {
            out.push(...problem(
                'warp.address.families',
                t("{what} takes at most one IPv4 and one IPv6 address — Xray {tag} refuses a second of either.", { what: at, tag }),
            ));
            continue;
        }
        seen.add(address.family);
    }
    return out;
};

// ── The proxy ─────────────────────────────────────────────────────────

const proxyTransportProblems = (item: Json, side: MasqueSide, version: CoreVersionId): MasqueProblem[] => {
    const tag = tagOf(version);
    const stream = isObject(item.streamSettings) ? item.streamSettings : {};
    const network = effectiveNetwork(stream, version);
    const out: MasqueProblem[] = [];
    if (network !== 'masque') {
        out.push({
            kind: 'transport.network',
            field: 'streamSettings.network',
            message: side === 'outbound'
                ? t("A masque outbound runs only over the masque transport: Xray {tag} refuses to start it on {network}.", { tag, network })
                : t("A masque inbound runs only over the masque transport: Xray {tag} refuses to start it on {network}.", { tag, network }),
            suggestion: t("Set the network to masque."),
        });
    }
    if (String(stream.security ?? '').toLowerCase() !== 'tls') {
        out.push({
            kind: 'transport.security',
            field: 'streamSettings.security',
            message: side === 'outbound'
                ? t("A masque outbound needs security tls: Xray {tag} refuses to start it without.", { tag })
                : t("A masque inbound needs security tls: Xray {tag} refuses to start it without.", { tag }),
            suggestion: t("Set security to tls."),
        });
    }
    return out;
};

/** Port as a `uint16`: a whole number; 0 or none is "not set". */
const portProblems = (port: unknown, tag: string): MasqueProblem[] => {
    if (unset(port) || port === 0) {
        return [{
            kind: 'port', field: 'settings.port',
            message: t("{what} is not set — Xray {tag} refuses a masque outbound without a port.", { what: 'settings.port', tag }),
        }];
    }
    if (typeof port !== 'number' || !Number.isInteger(port) || port < 0 || port > 65535) {
        return [{
            kind: 'type', field: 'settings.port',
            message: wrongType('settings.port', port, t("a whole number from 1 to 65535"), tag),
        }];
    }
    return [];
};

const outboundProblems = (item: Json, version: CoreVersionId): MasqueProblem[] => {
    const tag = tagOf(version);
    const settings = isObject(item.settings) ? item.settings : {};
    const out: MasqueProblem[] = [];

    if (unset(settings.address) || settings.address === '') {
        out.push({
            kind: 'address', field: 'settings.address',
            message: t("{what} is not set — Xray {tag} refuses a masque outbound without a server address.", { what: 'settings.address', tag }),
        });
    } else if (typeof settings.address !== 'string') {
        out.push({ kind: 'type', field: 'settings.address', message: wrongType('settings.address', settings.address, t("text"), tag) });
    }
    out.push(...portProblems(settings.port, tag));

    const dns = settings.remoteDNS;
    if (!unset(dns)) {
        if (!Array.isArray(dns) || dns.some(entry => typeof entry !== 'string')) {
            out.push({ kind: 'type', field: 'settings.remoteDNS', message: wrongType('settings.remoteDNS', dns, t("a list of text"), tag) });
        } else {
            for (const entry of dns as string[]) {
                if (isIpLiteral(entry)) continue;
                out.push({
                    kind: 'remoteDNS', field: 'settings.remoteDNS',
                    message: t("{what} lists \"{value}\", which is not an IP address — Xray {tag} refuses the config. Host names are not accepted there.", { what: 'settings.remoteDNS', value: entry, tag }),
                });
            }
        }
    }

    const mux = isObject(item.mux) ? item.mux : undefined;
    if (mux && mux.enabled === true) {
        out.push({
            kind: 'mux', field: 'mux.enabled',
            message: t("A masque outbound cannot use Mux — Xray {tag} refuses the config.", { tag }),
            suggestion: t("Turn Mux off."),
        });
    }
    return out;
};

/** The users a masque server reads: `clients` replaces `users` whenever it is there, even empty. */
export const masqueUserList = (settings: Json): { key: 'clients' | 'users'; users: unknown[] } => {
    const clients = settings.clients;
    if (!unset(clients)) return { key: 'clients', users: Array.isArray(clients) ? clients : [] };
    return { key: 'users', users: Array.isArray(settings.users) ? settings.users : [] };
};

const inboundProblems = (item: Json, version: CoreVersionId): MasqueProblem[] => {
    const tag = tagOf(version);
    const settings = isObject(item.settings) ? item.settings : {};
    const out: MasqueProblem[] = [];

    const { key, users } = masqueUserList(settings);
    const seen = new Set<string>();
    users.forEach((user, index) => {
        if (!isObject(user)) return;
        const at = `settings.${key}[${index}]`;
        const email = user.email;
        const pass = user.pass;
        if (!unset(email) && typeof email !== 'string') {
            out.push({ kind: 'type', field: `${at}.email`, message: wrongType(`${at}.email`, email, t("text"), tag) });
            return;
        }
        if (!unset(pass) && typeof pass !== 'string') {
            out.push({ kind: 'type', field: `${at}.pass`, message: wrongType(`${at}.pass`, pass, t("text"), tag) });
            return;
        }
        const address = text(email);
        if (address === '') {
            out.push({ kind: 'user.email', field: `${at}.email`, message: t("{what} is empty — every masque user needs an email, and Xray {tag} refuses the config without one.", { what: `${at}.email`, tag }) });
        } else if (address.includes(':')) {
            out.push({ kind: 'user.email', field: `${at}.email`, message: t("{what} \"{value}\" contains a colon — Xray {tag} refuses it, because the colon separates the user from the password in the sign-in.", { what: `${at}.email`, value: address, tag }) });
        } else if (text(pass) === '') {
            out.push({ kind: 'user.pass', field: `${at}.pass`, message: t("{what} is empty — Xray {tag} refuses a masque user without a password.", { what: `${at}.pass`, tag }) });
        } else if (seen.has(address.toLowerCase())) {
            out.push({ kind: 'user.duplicate', field: `${at}.email`, message: t("{what} \"{value}\" is used twice (case does not matter) — Xray {tag} refuses a duplicate user.", { what: `${at}.email`, value: address, tag }) });
        }
        if (address !== '') seen.add(address.toLowerCase());
    });

    const addresses = settings.address;
    if (unset(addresses) || (Array.isArray(addresses) && addresses.length === 0)) {
        out.push({
            kind: 'address', field: 'settings.address',
            message: t("{what} is not set — a masque inbound hands out addresses from it, and Xray {tag} refuses the config without at least one prefix.", { what: 'settings.address', tag }),
            suggestion: t("Add a prefix like 10.250.0.1/24: the server takes that address and clients get the rest."),
        });
    } else if (!Array.isArray(addresses) || addresses.some(entry => typeof entry !== 'string')) {
        out.push({ kind: 'type', field: 'settings.address', message: wrongType('settings.address', addresses, t("a list of text"), tag) });
    } else {
        const families = new Set<4 | 6>();
        for (const entry of addresses as string[]) {
            const prefix = parsePrefix(entry);
            if (!prefix) {
                out.push({
                    kind: 'address.invalid', field: 'settings.address',
                    message: t("{what} lists \"{value}\", which is not an address prefix like 10.250.0.1/24 — Xray {tag} refuses the config.", { what: 'settings.address', value: entry, tag }),
                });
                continue;
            }
            if (families.has(prefix.family)) {
                out.push({
                    kind: 'address.families', field: 'settings.address',
                    message: t("{what} takes at most one IPv4 and one IPv6 prefix — Xray {tag} refuses a second of either.", { what: 'settings.address', tag }),
                });
                continue;
            }
            families.add(prefix.family);
            const pool = poolProblem(prefix);
            if (pool === 'invalid') {
                out.push({ kind: 'address.invalid', field: 'settings.address', message: t("{what} lists \"{value}\", which is not an address prefix like 10.250.0.1/24 — Xray {tag} refuses the config.", { what: 'settings.address', value: entry, tag }) });
            } else if (pool === 'host') {
                out.push({
                    kind: 'address.host', field: 'settings.address',
                    message: t("{what} lists \"{value}\", which is the network's own address — the server takes the address it is given for itself, and Xray {tag} will not start with one that is not a host address.", { what: 'settings.address', value: entry, tag }),
                    suggestion: t("Write the server's address inside the network, like 10.250.0.1/24."),
                });
            } else if (pool === 'empty') {
                out.push({
                    kind: 'address.empty', field: 'settings.address',
                    message: t("{what} lists \"{value}\", which leaves no address to give a client — Xray {tag} will not start.", { what: 'settings.address', value: entry, tag }),
                    suggestion: t("Use a larger network, like a /24."),
                });
            }
        }
    }

    const mtu = settings.mtu;
    if (!unset(mtu)) {
        if (typeof mtu !== 'number' || !Number.isInteger(mtu) || mtu < 0 || mtu > 4294967295) {
            out.push({ kind: 'type', field: 'settings.mtu', message: wrongType('settings.mtu', mtu, t("a whole number"), tag) });
        } else if (mtu !== 0 && (mtu < 1280 || mtu > 65535)) {
            out.push({
                kind: 'mtu', field: 'settings.mtu',
                message: t("{what} is {value}; Xray {tag} takes 0 (the default) or 1280 to 65535.", { what: 'settings.mtu', value: mtu, tag }),
            });
        }
    }

    // The listener takes an address, not a name (v26.10.10:transport/internet/masque/hub.go:54-56).
    const listen = item.listen;
    if (typeof listen === 'string' && listen !== '' && !isIpLiteral(listen)) {
        out.push({
            kind: 'listen', field: 'listen',
            message: t("A masque inbound listens on an IP address, not on \"{value}\" — Xray {tag} fails to start it.", { value: listen, tag }),
            suggestion: t("Leave listen empty to use every address."),
        });
    }
    return out;
};

/**
 * Every refusal for one inbound or outbound that has anything to do with
 * MASQUE: the proxy, its transport, and the pairing between them.
 *
 * Without `version` the newest line that registers MASQUE answers. A line
 * that registers none is answered by the version table (the protocol is
 * refused there), so nothing comes back for it.
 */
export const masqueProblems = (
    item: unknown,
    side: MasqueSide,
    version: CoreVersionId = LATEST_CORE_VERSION,
): MasqueProblem[] => {
    if (!isObject(item) || !lineHasMasque(version)) return [];
    const stream = isObject(item.streamSettings) ? item.streamSettings : undefined;
    const out: MasqueProblem[] = [];
    const tag = tagOf(version);

    if (isMasque(item)) {
        out.push(...(side === 'outbound' ? outboundProblems(item, version) : inboundProblems(item, version)));
        out.push(...proxyTransportProblems(item, side, version));
    } else if (stream && effectiveNetwork(stream, version) === 'masque') {
        // The loader's own check, before any proxy is built.
        out.push({
            kind: 'transport.owner',
            field: 'streamSettings.network',
            message: side === 'outbound'
                ? t("The masque transport can only be used by the masque outbound — Xray {tag} refuses the config.", { tag })
                : t("The masque transport can only be used by the masque inbound — Xray {tag} refuses the config.", { tag }),
            suggestion: t("Pick another network, or change the protocol to masque."),
        });
    }
    if (stream && !unset(stream.masqueSettings)) out.push(...masqueSettingsProblems(stream.masqueSettings, undefined, version));
    return out;
};
