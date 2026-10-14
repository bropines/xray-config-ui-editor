/**
 * What a Shadowsocks inbound has to say before a core will run it — the
 * cipher, and the 2022 keys that go with it.
 *
 * `method` does not mean one thing. `ShadowsocksServerConfig.Build()` reads it
 * to choose between three different servers, and in one of them it is not
 * read at all:
 *
 *   a 2022 name            the 2022 server. With no users it serves one key
 *                          (`password`); with users and no `address` on the
 *                          first it is multi-user (a master key, a key per
 *                          user, and a user's own `method` must be empty);
 *                          with an `address` on the first it is a relay.
 *                          Users need an AES method (never chacha20).
 *   anything else, and     a classic server for ONE account. The `method` has
 *   no users list          to be a known AEAD cipher, and `password` a
 *                          password. On 26.3 only, "none" and "plain" count.
 *   anything else, and     a classic MULTI-user server. `method` and
 *   a users list           `password` at the top are not read — an empty
 *                          `method` is fine — and each user carries its own,
 *                          which has to be an AEAD cipher ("none" and "plain"
 *                          included in the refusal, on every line). An empty
 *                          list is a server with no accounts, which loads.
 *
 * Per line:
 *
 *                      26.3            26.7, 26.9        26.10
 *   users list read    `clients`       `clients`, else   as 26.7
 *                                      `users`
 *   2022 name matched  exactly         exactly           lower-cased first
 *   "none" / "plain"   a single         refused           refused
 *   2022 key           base64, at      base64, at        base64 else the
 *                      least N bytes   least N bytes     raw string; exactly
 *                      (more is cut down)                 N bytes
 *
 * where N is 16 for 2022-blake3-aes-128-gcm and 32 for the other two.
 *
 * Citations, `tag:file:line`. The loader, all of it in
 * infra/conf/shadowsocks.go:
 *
 *   26.3    cipherFromString :16-31 (lower-cased :17, none/plain :26); users
 *           are `clients` :47; Build :51 — 2022 chosen by exact match :54,
 *           multi-user `Users != nil` :61, per-user range check :70-73,
 *           single account :80-90 (password :85, UNKNOWN refused :88);
 *           buildShadowsocks2022 :101 — multi needs "aes" :114, multi/relay
 *           chosen by `Users[0].Address` :118, empty user method :125 and :145,
 *           relay address :148.
 *   26.7    v26.7.28 and v26.9.9 are the same file. cipherFromString :17-30
 *           (no none/plain); `users` :46 and `clients` :47, `clients` wins when
 *           present, even empty :54-56; 2022 :58; multi-user :65-91; single
 *           :92-108; buildShadowsocks2022 :113 — "aes" :126, multi/relay :130,
 *           user method :139 and :163, relay address :166.
 *   26.10   v26.10.10:infra/conf/shadowsocks.go, the same shape: 2022 chosen by
 *           `GetCipherMethod` :56, which lower-cases (proxy/shadowsocks_2022/
 *           cipher.go:24-30), and the name lower-cased again :112. The classic
 *           branches are at :63-106, the 2022 ones at :111-178.
 *
 * Keys, which the loader passes on untouched:
 *
 *   26.3, 26.7, 26.9   the constructors in proxy/shadowsocks_2022 hand them to
 *                      sing-shadowsocks v0.2.7 (go.mod pins it on all three
 *                      tags: v26.3.27:go.mod:18, v26.7.28:go.mod:21,
 *                      v26.9.9:go.mod:22) — single v26.3.27:inbound.go:55,
 *                      v26.7.28:inbound.go:57; multi v26.3.27:inbound_multi.go:70-80
 *                      ("missing key", StdEncoding), v26.7.28 :72-82; relay
 *                      v26.3.27:inbound_relay.go:53-67, v26.7.28 :55-69. In the
 *                      dependency (not in this repository): an empty key is
 *                      refused, one that is not base64 is refused, one shorter
 *                      than N is refused, one longer is cut down to N through
 *                      SHA-256 (sing-shadowsocks@v0.2.7:shadowaead_2022/
 *                      service.go:59-64 and :99-107, service_multi.go:40-46
 *                      and :78-82 and :106-112, relay.go:58-62 and :86-92 and
 *                      :99-105 and :133-139, protocol.go:153-156).
 *   26.10              no dependency: `ParseKey` decodes base64 and, when that
 *                      fails, takes the string's own bytes; the length must be
 *                      N exactly (v26.10.10:proxy/shadowsocks_2022/kdf.go:16-25,
 *                      used by inbound.go:51, inbound_multi.go:66,
 *                      inbound_relay.go:64 and :90; a user's key
 *                      config.go:19-27 and inbound_multi.go:124).
 *
 * The same words are shown beside the inbound (editors/inbound/core-notes) and
 * in the diagnostics (versions/rules.ts); this is the only place that decides.
 */
import { t } from '../../i18n';
import { SHADOWSOCKS_METHOD_ALIASES, SS_2022, SS_CLASSIC } from './versions/features.inbound';
import { ss2022KeyBytes } from './shadowsocks-keys';
import { compareCoreVersions, coreVersion, type CoreVersionId } from './versions';

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

export type ShadowsocksInboundProblemKind =
    | 'method.unknown' | 'user.method' | 'password.empty'
    | 'method.chacha' | 'user.method2022' | 'relay.address'
    | 'key.empty' | 'key.base64' | 'key.short' | 'key.size';

export interface ShadowsocksInboundProblem {
    kind: ShadowsocksInboundProblemKind;
    /** Where it is, from the inbound down: `settings.clients[1].method`. */
    field: string;
    message: string;
    suggestion?: string;
}

/** The two names this app uses; the loader lower-cases the protocol before looking it up (v26.7.28:infra/conf/loader.go:46). */
export const isShadowsocksInbound = (inbound: unknown): boolean =>
    isObject(inbound)
    && typeof inbound.protocol === 'string'
    && ['shadowsocks', 'shadowsocks-2022'].includes(inbound.protocol.toLowerCase());

/** What the lines differ in; see the table above. */
const lineOf = (version: CoreVersionId) => ({
    usersAlias: compareCoreVersions(version, '26.7') >= 0,
    noneAtTop: compareCoreVersions(version, '26.7') < 0,
    exact2022Names: compareCoreVersions(version, '26.10') < 0,
    exactKeySize: compareCoreVersions(version, '26.10') >= 0,
});

/** The classic AEAD names every line takes for an account, lower case. */
const AEAD = new Set(SS_CLASSIC);

/** The names a chooser shows: no `aead_*` spelling, no `plain`. */
const canonical = (names: string[]): string[] => names.filter(name => !SHADOWSOCKS_METHOD_ALIASES.has(name));

/**
 * Go's `base64.StdEncoding.DecodeString`: the standard alphabet with padding,
 * `\r` and `\n` skipped. The number of bytes it yields, or undefined when it
 * fails.
 */
const base64Bytes = (text: string): number | undefined => {
    const clean = text.replace(/[\r\n]/g, '');
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(clean)) return undefined;
    const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
    return (clean.length / 4) * 3 - padding;
};

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

const present = (value: unknown): boolean => value !== undefined && value !== null;

/**
 * Everything about a Shadowsocks inbound's cipher and 2022 keys that stops a
 * core running it — each entry is a config that does not load or an inbound
 * that does not start, and nothing a core merely ignores.
 */
export const shadowsocksInboundProblems = (inbound: unknown, version: CoreVersionId): ShadowsocksInboundProblem[] => {
    if (!isShadowsocksInbound(inbound)) return [];
    const settings: Json = isObject((inbound as Json).settings) ? ((inbound as Json).settings as Json) : {};
    const line = lineOf(version);
    const { tag } = coreVersion(version);
    const problems: ShadowsocksInboundProblem[] = [];
    const add = (kind: ShadowsocksInboundProblemKind, field: string, message: string, suggestion?: string) =>
        problems.push({ kind, field, message, suggestion });

    // The users list the line reads — `clients` wins whenever it is an array,
    // empty or not; 26.3 has no other spelling.
    const listKey: 'clients' | 'users' | undefined = Array.isArray(settings.clients)
        ? 'clients'
        : line.usersAlias && Array.isArray(settings.users) ? 'users' : undefined;
    const users: unknown[] | undefined = listKey ? (settings[listKey] as unknown[]) : undefined;

    const method = text(settings.method);
    const lowered = method.toLowerCase();
    // A 2022 name, as this line compares it.
    const named2022 = (line.exact2022Names ? SS_2022.includes(method) : SS_2022.includes(lowered)) ? lowered : undefined;
    // Spelled like one, but not matched: only where the comparison is exact.
    const missCased2022 = line.exact2022Names && !named2022 && SS_2022.includes(lowered) ? lowered : undefined;
    const caseHint = missCased2022
        ? t("Xray {tag} matches 2022 method names exactly, in lower case: write {name}.", { tag, name: missCased2022 })
        : undefined;
    // What the chooser would list for a single account on this line.
    const singleNames = [...canonical(SS_2022), ...canonical(SS_CLASSIC), ...(line.noneAtTop ? ['none'] : [])];

    const checkKey = (value: unknown, field: string, methodName: string) => {
        const key = text(value);
        const need = ss2022KeyBytes(methodName);
        const how = t("A 2022 key is {need} random bytes in base64: openssl rand -base64 {need} writes one.", { need });
        if (key === '' && !line.exactKeySize) {
            add('key.empty', field, t("{what} is empty, and Xray {tag} cannot run a 2022 method without its key — the config will not load.", { what: field, tag }), how);
            return;
        }
        const decoded = base64Bytes(key);
        if (!line.exactKeySize) {
            if (decoded === undefined) {
                add('key.base64', field, t("{what} is not base64. Xray {tag} decodes a 2022 key from base64 and refuses the config when it cannot.", { what: field, tag }), how);
            } else if (decoded < need) {
                add('key.short', field, t("{what} decodes to {bytes} bytes, and {method} needs a key of at least {need} — Xray {tag} refuses the config.", { what: field, bytes: decoded, method: methodName, need, tag }), how);
            }
            return;
        }
        // 26.10: what base64 cannot read is taken as the bytes it is.
        const bytes = decoded ?? new TextEncoder().encode(key).length;
        if (key === '') {
            add('key.empty', field, t("{what} is empty, and Xray {tag} cannot run a 2022 method without its key — the config will not load.", { what: field, tag }), how);
        } else if (bytes !== need) {
            add('key.size', field, t("{what} is {bytes} bytes, and {method} takes a key of exactly {need} — Xray {tag} refuses the config.", { what: field, bytes, method: methodName, need, tag }), how);
        }
    };

    if (named2022) {
        // ── 2022 ───────────────────────────────────────────────────────
        const entries = users ?? [];
        if (entries.length > 0) {
            if (!named2022.includes('aes')) {
                add('method.chacha', 'settings.method', t("{what} is {shown}: with users listed, Xray {tag} serves only the AES 2022 methods — the config will not load.", { what: 'settings.method', shown: JSON.stringify(method), tag }),
                    t("Use 2022-blake3-aes-128-gcm or 2022-blake3-aes-256-gcm, or list no users to serve one key."));
            }
            const first = entries[0];
            const relay = isObject(first) && present(first.address);
            entries.forEach((entry, index) => {
                if (!isObject(entry)) return;
                const at = `settings.${listKey}[${index}]`;
                if (text(entry.method) !== '') {
                    add('user.method2022', `${at}.method`, t("{what} is {shown}. With a 2022 method a user is told apart by its key alone, and Xray {tag} refuses a method on it — the config will not load.", { what: `${at}.method`, shown: JSON.stringify(text(entry.method)), tag }),
                        t("Remove the method from this user."));
                }
                if (relay && !present(entry.address)) {
                    add('relay.address', `${at}.address`, t("{what} is missing. Once the first user has an address this inbound is a relay, and Xray {tag} wants an address on every user.", { what: `${at}.address`, tag }));
                }
                checkKey(entry.password, `${at}.password`, named2022);
            });
        }
        checkKey(settings.password, 'settings.password', named2022);
        return problems;
    }

    if (!users) {
        // ── classic, one account ───────────────────────────────────────
        if (text(settings.password) === '') {
            add('password.empty', 'settings.password', t("{what} is empty, and Xray {tag} refuses a Shadowsocks account without a password — the config will not load.", { what: 'settings.password', tag }));
        }
        const known = AEAD.has(lowered) || (line.noneAtTop && (lowered === 'none' || lowered === 'plain'));
        if (!known) {
            add('method.unknown', 'settings.method', t("{what} is {shown}, which Xray {tag} does not know as a Shadowsocks cipher — the config will not load.", { what: 'settings.method', shown: JSON.stringify(method), tag }),
                caseHint ?? t("Xray {tag} takes: {values}.", { tag, values: singleNames.join(', ') }));
        }
        return problems;
    }

    // ── classic, several accounts: the top-level method and password are not read ──
    users.forEach((entry, index) => {
        if (!isObject(entry)) return;
        const at = `settings.${listKey}[${index}]`;
        if (text(entry.password) === '') {
            add('password.empty', `${at}.password`, t("{what} is empty, and Xray {tag} refuses a Shadowsocks account without a password — the config will not load.", { what: `${at}.password`, tag }));
        }
        if (!AEAD.has(text(entry.method).toLowerCase())) {
            add('user.method', `${at}.method`, t("{what} is {shown}, which is not an AEAD cipher — Xray {tag} refuses a user without one and the config will not load.", { what: `${at}.method`, shown: JSON.stringify(text(entry.method)), tag }),
                caseHint ?? t("Xray {tag} takes: {values}.", { tag, values: canonical(SS_CLASSIC).join(', ') }));
        }
    });
    return problems;
};
