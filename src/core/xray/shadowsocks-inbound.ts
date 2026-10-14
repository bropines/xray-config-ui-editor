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
 * What the inbound shares with the outbound — how a line reads a cipher name
 * and a key, and the protocol's own name — is in shadowsocks-rules.ts; the
 * outbound's half is shadowsocks-outbound.ts.
 */
import { t } from '../../i18n';
import {
    aeadNames,
    caseHint,
    isAeadCipher,
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
} from './shadowsocks-rules';
import { coreVersion, type CoreVersionId } from './versions';

export type ShadowsocksInboundProblemKind =
    | 'protocol.name'
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
    isObject(inbound) && isShadowsocksProtocol(inbound.protocol);

/**
 * Everything about a Shadowsocks inbound's cipher and 2022 keys that stops a
 * core running it — each entry is a config that does not load or an inbound
 * that does not start, and nothing a core merely ignores.
 */
export const shadowsocksInboundProblems = (inbound: unknown, version: CoreVersionId): ShadowsocksInboundProblem[] => {
    if (!isShadowsocksInbound(inbound)) return [];
    const settings: Json = isObject((inbound as Json).settings) ? ((inbound as Json).settings as Json) : {};
    const line = shadowsocksLine(version);
    const { tag } = coreVersion(version);
    const problems: ShadowsocksInboundProblem[] = [];
    const add = (kind: ShadowsocksInboundProblemKind, field: string, message: string, suggestion?: string) =>
        problems.push({ kind, field, message, suggestion });

    // Not a name the loader has: nothing below runs until it is `shadowsocks`,
    // but what is wrong with the rest is worth saying now rather than after.
    const name = protocolNameProblem((inbound as Json).protocol);
    if (name) add('protocol.name', 'protocol', name.message, name.suggestion);

    // The users list the line reads — `clients` wins whenever it is an array,
    // empty or not; 26.3 has no other spelling.
    const listKey: 'clients' | 'users' | undefined = Array.isArray(settings.clients)
        ? 'clients'
        : line.usersAlias && Array.isArray(settings.users) ? 'users' : undefined;
    const users: unknown[] | undefined = listKey ? (settings[listKey] as unknown[]) : undefined;

    const method = text(settings.method);
    // A 2022 name, as this line compares it.
    const is2022 = named2022(method, version);
    const hint = caseHint(method, version);

    const checkKey = (value: unknown, field: string, methodName: string) => {
        const found = keyProblem(text(value), field, methodName, version);
        if (found) add(found.kind, field, found.message, found.suggestion);
    };

    if (is2022) {
        // ── 2022 ───────────────────────────────────────────────────────
        const entries = users ?? [];
        if (entries.length > 0) {
            if (!is2022.includes('aes')) {
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
                checkKey(entry.password, `${at}.password`, is2022);
            });
        }
        checkKey(settings.password, 'settings.password', is2022);
        return problems;
    }

    if (!users) {
        // ── classic, one account ───────────────────────────────────────
        if (text(settings.password) === '') {
            add('password.empty', 'settings.password', t("{what} is empty, and Xray {tag} refuses a Shadowsocks account without a password — the config will not load.", { what: 'settings.password', tag }));
        }
        if (!isClassicCipher(method, version)) {
            add('method.unknown', 'settings.method', t("{what} is {shown}, which Xray {tag} does not know as a Shadowsocks cipher — the config will not load.", { what: 'settings.method', shown: JSON.stringify(method), tag }),
                hint ?? t("Xray {tag} takes: {values}.", { tag, values: singleAccountNames(version).join(', ') }));
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
        if (!isAeadCipher(text(entry.method))) {
            add('user.method', `${at}.method`, t("{what} is {shown}, which is not an AEAD cipher — Xray {tag} refuses a user without one and the config will not load.", { what: `${at}.method`, shown: JSON.stringify(text(entry.method)), tag }),
                hint ?? t("Xray {tag} takes: {values}.", { tag, values: aeadNames().join(', ') }));
        }
    });
    return problems;
};
