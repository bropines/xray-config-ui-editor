/**
 * What a Shadowsocks outbound has to say before a core will run it: which of
 * its two shapes holds the server, the cipher, the 2022 key, and what the
 * UDP-over-TCP switch does on the line.
 *
 * The inbound's half is shadowsocks-inbound.ts; how a line reads a cipher name
 * and a key, which both ends share, is shadowsocks-rules.ts (with its
 * citations). This is the client: `ShadowsocksClientConfig.Build()`.
 *
 * Two shapes, on every line. The flat one keeps `address`, `port`, `method`,
 * `password` (and on 26.3 `uot`, `uotVersion`) in `settings`; the list one keeps
 * them in `settings.servers[0]`. `Build()` takes the flat one whenever `address`
 * is there — `null` is not there — and replaces `servers` with it, so a config
 * holding both is the flat one as far as the core is concerned
 * (v26.3.27:infra/conf/shadowsocks.go:187-200, v26.7.28 :201-212,
 * v26.9.30 and v26.10.10 :202-213; the same test as socks and http, core/xray/outbound-
 * credentials.ts, which this reads the shape through). v26.9.9 is the same file
 * as v26.7.28. The list must have exactly one member (v26.3.27 :201-203,
 * v26.7.28 :213-215, v26.9.30 and v26.10.10 :214-216) — checked after the flat
 * copy, so a flat config never fails on `servers`.
 *
 * What `Build()` then refuses, the same on every line, for the one server:
 *
 *                     26.3 (2022 / classic)   26.7, 26.9 (2022 / classic)   26.9.30, 26.10
 *   address missing   :208 / :234             :220 / :244                   :219
 *   port 0 or missing :211 / :237             :223 / :247                   :222
 *   password empty    :214 / :240             :226 / :250                   :225
 *
 * `method` is never defaulted. It is looked up as a 2022 name first — exactly up
 * to v26.9.9 (v26.3.27 :207, v26.7.28 :219; both with `C.Contains`), lower-cased
 * from v26.9.30 (v26.9.30 :229, `GetCipherMethod`) — and anything else goes to the
 * classic builder, where an empty or unknown name is "unknown cipher method"
 * (v26.3.27 :246-249, v26.7.28 :256-259, v26.9.30 and v26.10.10 :241-244). So an empty
 * `method` is refused on every line, unlike the inbound, which does not read it
 * at all when users are listed. The classic names are lower-cased first;
 * `none` and `plain` are ciphers on 26.3 only (v26.3.27 :26, gone from
 * v26.7.28 :17-30).
 *
 * The 2022 password is read when the outbound is created, by
 * `shadowaead_2022.NewWithPassword` up to v26.9.9 (v26.3.27:proxy/shadowsocks_2022/
 * outbound.go:46-57, v26.7.28 :45-56, v26.9.9 :45-56) and `ParsePSKList` from v26.9.30
 * (v26.9.30 and v26.10.10:proxy/shadowsocks_2022/outbound.go:37-71, kdf.go:27-38). Both split
 * it on `:` — a client of a multi-user server sends `masterKey:userKey` — and
 * read each part as one key (sing-shadowsocks@v0.2.7:shadowaead_2022/
 * protocol.go:67-82, v26.10.10 kdf.go:28); the rule for one key, per line, is
 * shadowsocks-rules.ts. The chacha cipher takes one key only (protocol.go:99-102;
 * v26.10.10:proxy/shadowsocks_2022/outbound.go:48-50). An error there ends
 * the start of the instance (handler creation, v26.3.27:app/proxyman/outbound/
 * handler.go:112, v26.7.28 :113, v26.9.9 and v26.10.10 :110; an error from it
 * ends the build, v26.7.28:core/xray.go:140-145 and :249-251).
 *
 * UDP over TCP is a different story and a different answer per line. The 26.3
 * client config declares `uot` and `uotVersion` (flat v26.3.27:infra/conf/
 * shadowsocks.go:179-180, in a server entry :168-169) and passes them on to
 * the 2022 builder only (:223-224); the classic builder (:229-263) never looks
 * at them, so beside a classic cipher they are read and thrown away. The 2022
 * outbound of 26.3 does use them (v26.3.27:proxy/shadowsocks_2022/outbound.go:58-60,
 * :84-88 and :148-153). From 26.7 the structs have no such fields
 * (v26.7.28:infra/conf/shadowsocks.go:179-186 and :188-196, v26.9.30 and
 * v26.10.10 :180-187 and :189-197) and the 2022 outbound has no UoT code (v26.7.28, v26.9.30 and v26.10.10:
 * proxy/shadowsocks_2022/outbound.go) — Go's decoder drops the keys. So it
 * does something only on 26.3, only beside a 2022 cipher.
 *
 * The protocol name is checked here too, for what the app used to write
 * (shadowsocks-rules.ts says why it is no protocol).
 */
import { t } from '../../i18n';
import { serverPath, serverShape, type ServerShape } from './outbound-credentials';
import {
    caseHint,
    isClassicCipher,
    isObject,
    isShadowsocksProtocol,
    keyProblem,
    named2022,
    present,
    protocolNameProblem,
    shadowsocksLine,
    singleAccountNames,
    text,
    type Json,
    type KeyProblemKind,
} from './shadowsocks-rules';
import { coreVersion, type CoreVersionId } from './versions';

export type ShadowsocksOutboundProblemKind =
    | 'protocol.name'
    | 'servers.count' | 'address.missing' | 'port.missing' | 'password.empty'
    | 'method.empty' | 'method.unknown'
    | KeyProblemKind | 'key.multi'
    | 'uot.method';

export interface ShadowsocksOutboundProblem {
    kind: ShadowsocksOutboundProblemKind;
    /** The key within the server, for the form: `method`, `password`, `address`, `port`, `uot`, `servers`. */
    key: string;
    /** Where it is, from the outbound down: `settings.servers[0].method`, or `settings.method` on the flat shape. */
    field: string;
    message: string;
    suggestion?: string;
    /** `critical` keeps the config from loading or the outbound from starting; `warning` is a switch that does nothing. */
    severity: 'critical' | 'warning';
}

export const isShadowsocksOutbound = (outbound: unknown): boolean =>
    isObject(outbound) && isShadowsocksProtocol(outbound.protocol);

/** Where the server of an outbound is, in the shape the core will read. */
export interface ShadowsocksServer {
    shape: ServerShape;
    /** The path to the object holding `address`, `port`, `method`, `password`: `['settings']` or `['settings', 'servers', 0]`. */
    path: (string | number)[];
    /** That path as a field name: `settings` or `settings.servers[0]`. */
    base: string;
    /** The object itself, when there is one. */
    server: Json | undefined;
    /** How many members `servers` has — the core wants exactly one when the shape is `servers`. */
    count: number;
}

export const shadowsocksServer = (outbound: unknown): ShadowsocksServer => {
    const settings: Json = isObject(outbound) && isObject(outbound.settings) ? outbound.settings : {};
    const shape = serverShape(outbound);
    const path = serverPath(outbound);
    if (shape === 'flat') return { shape, path, base: 'settings', server: settings, count: 1 };
    const list = Array.isArray(settings.servers) ? settings.servers : [];
    return { shape, path, base: 'settings.servers[0]', server: isObject(list[0]) ? list[0] : undefined, count: list.length };
};

/** A value of a type the core would refuse to decode is that class of problem, not this one. */
const wrongType = (value: unknown): boolean => present(value) && typeof value !== 'string';

// ── UDP over TCP ──────────────────────────────────────────────────────

/**
 * What the switch does here. `works`: the line reads it and a 2022 cipher
 * uses it. `method`: the line reads it and the cipher does not (26.3 with a
 * classic cipher). `line`: the line has no such key.
 */
export type UotEffect = 'works' | 'method' | 'line';

export interface ShadowsocksUot {
    effect: UotEffect;
    /** Which of the two keys the config holds, in the shape the core reads. */
    held: ('uot' | 'uotVersion')[];
}

export const shadowsocksUot = (outbound: unknown, version: CoreVersionId): ShadowsocksUot => {
    const { server } = shadowsocksServer(outbound);
    const held = (['uot', 'uotVersion'] as const).filter(key => server !== undefined && server[key] !== undefined);
    if (!shadowsocksLine(version).readsUot) return { effect: 'line', held };
    return { effect: named2022(text(server?.method), version) ? 'works' : 'method', held };
};

// ── the check ─────────────────────────────────────────────────────────

/**
 * Everything about a Shadowsocks outbound that stops a core loading or
 * starting it, and the one switch that does nothing beside a classic cipher.
 */
export const shadowsocksOutboundProblems = (outbound: unknown, version: CoreVersionId): ShadowsocksOutboundProblem[] => {
    if (!isShadowsocksOutbound(outbound)) return [];
    const { tag } = coreVersion(version);
    const where = shadowsocksServer(outbound);
    const { base, server, count } = where;
    const problems: ShadowsocksOutboundProblem[] = [];
    const add = (
        kind: ShadowsocksOutboundProblemKind, key: string, field: string, message: string,
        suggestion?: string, severity: 'critical' | 'warning' = 'critical',
    ) => problems.push({ kind, key, field, message, suggestion, severity });

    const name = protocolNameProblem((outbound as Json).protocol);
    if (name) add('protocol.name', 'protocol', 'protocol', name.message, name.suggestion);

    if (where.shape === 'servers' && count !== 1) {
        add('servers.count', 'servers', 'settings.servers',
            t("{what} has {count} entries, and Xray {tag} wants exactly one server — the config will not load.", { what: 'settings.servers', count, tag }),
            t("Set address and port beside method and password, or list exactly one server. Several servers are several outbounds behind a balancer."));
        // There is no server to read the rest from.
        return problems;
    }
    if (!server) return problems;

    if (!present(server.address)) {
        add('address.missing', 'address', `${base}.address`,
            t("{what} is missing, and Xray {tag} refuses a Shadowsocks server without an address — the config will not load.", { what: `${base}.address`, tag }));
    }
    if (server.port === undefined || server.port === null || server.port === 0) {
        add('port.missing', 'port', `${base}.port`,
            t("{what} is missing or 0, and Xray {tag} refuses a Shadowsocks server without a port — the config will not load.", { what: `${base}.port`, tag }));
    }

    const password = text(server.password);
    if (!wrongType(server.password) && password === '') {
        add('password.empty', 'password', `${base}.password`,
            t("{what} is empty, and Xray {tag} refuses a Shadowsocks account without a password — the config will not load.", { what: `${base}.password`, tag }));
    }

    const method = text(server.method);
    if (wrongType(server.method)) return problems;
    const is2022 = named2022(method, version);
    if (is2022) {
        // ── 2022: the password is one key, or several joined with a colon ──
        if (password !== '' && !wrongType(server.password)) {
            const keys = password.split(':');
            if (keys.length > 1 && is2022.includes('chacha')) {
                add('key.multi', 'password', `${base}.password`,
                    t("{what} lists {count} keys, and {method} takes one — Xray {tag} refuses the config.", { what: `${base}.password`, count: keys.length, method: is2022, tag }),
                    t("Keep one key, or use an AES method to join a master key and a user key with a colon."));
            }
            keys.forEach((key, index) => {
                const what = keys.length > 1
                    ? t("{field}, key {n} of {count}", { field: `${base}.password`, n: index + 1, count: keys.length })
                    : `${base}.password`;
                const found = keyProblem(key, what, is2022, version);
                if (found) add(found.kind, 'password', `${base}.password`, found.message, found.suggestion);
            });
        }
    } else if (method === '') {
        // An outbound has no default: the classic builder reads "" as an unknown cipher.
        add('method.empty', 'method', `${base}.method`,
            t("{what} is empty, and an outbound has no default cipher: Xray {tag} reads it as an unknown cipher method — the config will not load.", { what: `${base}.method`, tag }),
            t("Xray {tag} takes: {values}.", { tag, values: singleAccountNames(version).join(', ') }));
    } else if (!isClassicCipher(method, version)) {
        add('method.unknown', 'method', `${base}.method`,
            t("{what} is {shown}, which Xray {tag} does not know as a Shadowsocks cipher — the config will not load.", { what: `${base}.method`, shown: JSON.stringify(method), tag }),
            caseHint(method, version) ?? t("Xray {tag} takes: {values}.", { tag, values: singleAccountNames(version).join(', ') }));
    }

    // UDP over TCP beside a classic cipher on the one line that reads it. (A
    // line without the key is the version table's to say.)
    const uot = shadowsocksUot(outbound, version);
    if (uot.effect === 'method') {
        for (const key of uot.held) {
            add('uot.method', 'uot', `${base}.${key}`,
                t("{what} is read by Xray {tag} only with a 2022 method, and {method} is not one — it does nothing here.", { what: `${base}.${key}`, tag, method: JSON.stringify(method) }),
                undefined, 'warning');
        }
    }
    return problems;
};
