/**
 * What a Shadowsocks inbound and a Shadowsocks outbound agree on, so that
 * each is judged by the same words: how a line reads a cipher name, how it
 * reads a 2022 key, and what the protocol itself is called.
 *
 * The two ends are different code in the core and ask different things of a
 * config — see shadowsocks-inbound.ts and shadowsocks-outbound.ts, which cite
 * the loader for each. They share three facts, and these are the ones that
 * differ from one line to the next.
 *
 * The lines (v26.9.30 took the core's own 2022 package that 26.10 has —
 * `git diff v26.9.30 v26.10.10` is empty for infra/conf/shadowsocks.go and
 * proxy/shadowsocks_2022 — so the two read a cipher and a key the same way):
 *
 *                      26.3            26.7, 26.9        26.9.30, 26.10
 *   users list read    `clients`       `clients`, else   as 26.7
 *   (inbound)                          `users`
 *   2022 name matched  exactly         exactly           lower-cased first
 *   "none" / "plain"   a cipher        unknown           unknown
 *   2022 key           base64, at      base64, at        base64 else the
 *                      least N bytes   least N bytes     raw string; exactly
 *                      (more is cut down)                 N bytes
 *   UDP over TCP       read (outbound, 2022 builder only)  no such key
 *
 * where N is 16 for 2022-blake3-aes-128-gcm and 32 for the other two. "26.9"
 * in this table is v26.9.9: v26.9.30 is the last column.
 *
 * Citations, `tag:file:line`:
 *
 *   cipher names   the classic ones go through `cipherFromString`, which
 *                  lower-cases first: v26.3.27:infra/conf/shadowsocks.go:16-31
 *                  (lower-cased :17, none/plain :26), v26.7.28:infra/conf/
 *                  shadowsocks.go:17-30 (the same file at v26.9.9),
 *                  v26.9.30:infra/conf/shadowsocks.go:15-28 (the same lines at
 *                  v26.10.10).
 *   2022 names     chosen by an exact match against sing-shadowsocks' list up to
 *                  v26.9.9 — `C.Contains(shadowaead_2022.List, ...)`, inbound
 *                  v26.3.27:infra/conf/shadowsocks.go:54, v26.7.28 :58, outbound
 *                  v26.3.27 :207 and :231, v26.7.28 :219 and :241 — and by
 *                  `GetCipherMethod` from v26.9.30, which lower-cases
 *                  (v26.9.30:proxy/shadowsocks_2022/cipher.go:24-30; inbound
 *                  v26.9.30:infra/conf/shadowsocks.go:56, outbound :229; the
 *                  same lines at v26.10.10).
 *   keys           26.3, 26.7, 26.9 hand them to sing-shadowsocks v0.2.7 (go.mod
 *                  pins it on all three tags: v26.3.27:go.mod:18, v26.7.28:go.mod:21,
 *                  v26.9.9:go.mod:22). In the dependency (not in this
 *                  repository): an empty key is refused, one that is not base64 is
 *                  refused, one shorter than N is refused, one longer is cut down
 *                  to N through SHA-256 (sing-shadowsocks@v0.2.7:shadowaead_2022/
 *                  protocol.go:75-76 and :111-117, :153-156). v26.9.30 and 26.10
 *                  have no dependency (v26.9.30:go.mod has no sagernet module):
 *                  `ParseKey` decodes base64 and, when that fails, takes the
 *                  string's own bytes; the length must be N exactly
 *                  (v26.9.30:proxy/shadowsocks_2022/kdf.go:16-25, the same
 *                  lines at v26.10.10).
 *   the protocol   `shadowsocks` is the only name either loader registers —
 *                  inbounds v26.3.27:infra/conf/xray.go:29, v26.7.28 :26,
 *                  v26.9.9 :27, v26.10.10 :28; outbounds v26.3.27 :47,
 *                  v26.7.28 :44, v26.9.9 :45, v26.10.10 :47 — and a name it does
 *                  not know stops the load: "unknown config id"
 *                  (infra/conf/loader.go:26 on all four tags, reached from
 *                  xray.go inbound v26.7.28 :194, outbound :357).
 */
import { t } from '../../i18n';
import { SHADOWSOCKS_METHOD_ALIASES, SS_2022, SS_CLASSIC } from './versions/features.inbound';
import { ss2022KeyBytes } from './shadowsocks-keys';
import { compareCoreVersions, coreVersion, type CoreVersionId } from './versions';

export type Json = Record<string, unknown>;

export const isObject = (value: unknown): value is Json =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/** A string setting, or '' for anything else. */
export const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/** Go decodes `null` into a nil pointer, which every Build() treats as unset. */
export const present = (value: unknown): boolean => value !== undefined && value !== null;

/** What the lines differ in; see the table above. */
export const shadowsocksLine = (version: CoreVersionId) => ({
    usersAlias: compareCoreVersions(version, '26.7') >= 0,
    noneAtTop: compareCoreVersions(version, '26.7') < 0,
    exact2022Names: compareCoreVersions(version, '26.9.30') < 0,
    exactKeySize: compareCoreVersions(version, '26.9.30') >= 0,
    /** The client config has `uot` and `uotVersion` (v26.3.27:infra/conf/shadowsocks.go:168-169 and :179-180); later lines do not. */
    readsUot: compareCoreVersions(version, '26.7') < 0,
});

// ── the protocol's name ───────────────────────────────────────────────

/**
 * `shadowsocks-2022` is this app's old name for Shadowsocks with a 2022
 * cipher. It is not a protocol: the loader has one Shadowsocks, and the cipher
 * is the `method`. The loader lower-cases the protocol before looking it up
 * (v26.7.28:infra/conf/loader.go:46), so the case does not matter either way.
 */
export const isShadowsocksProtocol = (protocol: unknown): boolean =>
    typeof protocol === 'string' && ['shadowsocks', 'shadowsocks-2022'].includes(protocol.toLowerCase());

export const isPseudoShadowsocksProtocol = (protocol: unknown): boolean =>
    typeof protocol === 'string' && protocol.toLowerCase() === 'shadowsocks-2022';

/** The name a config may carry: `shadowsocks` for ours, anything else as it was. */
export const canonicalProtocol = (protocol: string): string =>
    isPseudoShadowsocksProtocol(protocol) ? 'shadowsocks' : protocol;

/** What the loader does with the name this app used to write, said once for both ends. */
export const protocolNameProblem = (protocol: unknown): { message: string; suggestion: string } | undefined =>
    isPseudoShadowsocksProtocol(protocol)
        ? {
            message: t("{name} is not a protocol Xray knows — its loader stops at \"unknown config id\" and the config will not load. The 2022 ciphers are methods of shadowsocks.", { name: JSON.stringify(protocol) }),
            suggestion: t("Set protocol to shadowsocks and keep the 2022 method."),
        }
        : undefined;

// ── cipher names ──────────────────────────────────────────────────────

/** The classic AEAD names every line takes for an account, lower case. */
const AEAD = new Set(SS_CLASSIC);

/** The names a chooser shows: no `aead_*` spelling, no `plain`. */
export const canonicalNames = (names: string[]): string[] => names.filter(name => !SHADOWSOCKS_METHOD_ALIASES.has(name));

/** Whether a name is an AEAD cipher an account may carry, on any line (lower-cased, as the core does). */
export const isAeadCipher = (method: string): boolean => AEAD.has(method.toLowerCase());

/** The AEAD names, as a chooser lists them. */
export const aeadNames = (): string[] => canonicalNames(SS_CLASSIC);

/**
 * The 2022 name this line reads in `method`, lower case — undefined when the
 * line does not take it for one. Exact up to 26.9; lower-cased first from v26.9.30.
 */
export const named2022 = (method: string, version: CoreVersionId): string | undefined => {
    const lowered = method.toLowerCase();
    const { exact2022Names } = shadowsocksLine(version);
    return (exact2022Names ? SS_2022.includes(method) : SS_2022.includes(lowered)) ? lowered : undefined;
};

/** Spelled like a 2022 name but not matched by this line — which is only where the comparison is exact. */
export const miscased2022 = (method: string, version: CoreVersionId): string | undefined => {
    const lowered = method.toLowerCase();
    return shadowsocksLine(version).exact2022Names && !named2022(method, version) && SS_2022.includes(lowered)
        ? lowered
        : undefined;
};

/** How to write a name this line did not match, when the only thing wrong is its case. */
export const caseHint = (method: string, version: CoreVersionId): string | undefined => {
    const name = miscased2022(method, version);
    return name
        ? t("Xray {tag} matches 2022 method names exactly, in lower case: write {name}.", { tag: coreVersion(version).tag, name })
        : undefined;
};

/** Whether a line takes this as the cipher of one classic account: an AEAD name, and on 26.3 `none` and `plain`. */
export const isClassicCipher = (method: string, version: CoreVersionId): boolean => {
    const lowered = method.toLowerCase();
    return AEAD.has(lowered) || (shadowsocksLine(version).noneAtTop && (lowered === 'none' || lowered === 'plain'));
};

/** What a chooser lists for one account on this line. */
export const singleAccountNames = (version: CoreVersionId): string[] => [
    ...canonicalNames(SS_2022),
    ...canonicalNames(SS_CLASSIC),
    ...(shadowsocksLine(version).noneAtTop ? ['none'] : []),
];

// ── 2022 keys ─────────────────────────────────────────────────────────

/**
 * Go's `base64.StdEncoding.DecodeString`: the standard alphabet with padding,
 * `\r` and `\n` skipped. The number of bytes it yields, or undefined when it
 * fails.
 */
export const base64Bytes = (value: string): number | undefined => {
    const clean = value.replace(/[\r\n]/g, '');
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(clean)) return undefined;
    const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
    return (clean.length / 4) * 3 - padding;
};

export type KeyProblemKind = 'key.empty' | 'key.base64' | 'key.short' | 'key.size';

export interface KeyProblem {
    kind: KeyProblemKind;
    message: string;
    suggestion: string;
}

/**
 * What a line says about one 2022 key. `what` is where it is, as the message
 * should name it; `method` is the 2022 cipher it belongs to.
 */
export const keyProblem = (key: string, what: string, method: string, version: CoreVersionId): KeyProblem | undefined => {
    const line = shadowsocksLine(version);
    const { tag } = coreVersion(version);
    const need = ss2022KeyBytes(method);
    const suggestion = t("A 2022 key is {need} random bytes in base64: openssl rand -base64 {need} writes one.", { need });
    if (key === '') {
        return {
            kind: 'key.empty',
            message: t("{what} is empty, and Xray {tag} cannot run a 2022 method without its key — the config will not load.", { what, tag }),
            suggestion,
        };
    }
    const decoded = base64Bytes(key);
    if (!line.exactKeySize) {
        if (decoded === undefined) {
            return { kind: 'key.base64', message: t("{what} is not base64. Xray {tag} decodes a 2022 key from base64 and refuses the config when it cannot.", { what, tag }), suggestion };
        }
        if (decoded < need) {
            return { kind: 'key.short', message: t("{what} decodes to {bytes} bytes, and {method} needs a key of at least {need} — Xray {tag} refuses the config.", { what, bytes: decoded, method, need, tag }), suggestion };
        }
        return undefined;
    }
    // v26.9.30 and later: what base64 cannot read is taken as the bytes it is.
    const bytes = decoded ?? new TextEncoder().encode(key).length;
    if (bytes !== need) {
        return { kind: 'key.size', message: t("{what} is {bytes} bytes, and {method} takes a key of exactly {need} — Xray {tag} refuses the config.", { what, bytes, method, need, tag }), suggestion };
    }
    return undefined;
};
