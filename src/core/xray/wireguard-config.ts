/**
 * The parts of a WireGuard config that an inbound and an outbound judge the
 * same way.
 *
 * The loader has one struct for both, WireGuardConfig, and tells them apart
 * with a flag it sets itself (`IsClient`, v26.7.28:infra/conf/xray.go:32 and
 * :51). Build() runs for both before it knows which it is building, so what
 * it refuses — a key it cannot decode, a `reserved` of the wrong length — is
 * refused for either. Past Build() each side builds its own device, and the
 * two read `address` and the peers differently; those rules live with their
 * side (wireguard-inbound.ts, wireguard-outbound.ts).
 *
 * This file is only the decisions, not the wording: "the inbound will not
 * start" and "every connection through this outbound fails" are different
 * sentences about the same fact.
 */

import validator from 'validator';
import { parseWireguardKey } from '../generators/crypto';
import { t } from '../../i18n';
import { compareCoreVersions, type CoreVersionId } from './versions';

const { isIP } = validator;

/** The length of every WireGuard key: Curve25519 points, and a pre-shared key to match. */
export const KEY_BYTES = 32;

export type Json = Record<string, unknown>;

export const isObject = (value: unknown): value is Json =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

export const isBlank = (value: unknown): boolean => value === undefined || value === null || value === '';

export const addressFamily = (value: string): 4 | 6 | null => (isIP(value, 4) ? 4 : isIP(value, 6) ? 6 : null);

/** The prefix length of one host: /32 for IPv4, /128 for IPv6. */
export const hostBits = (family: 4 | 6): number => (family === 4 ? 32 : 128);

/**
 * `netip.ParsePrefix`: an address, a slash, and a length that fits the
 * family. A bare address is not a prefix, a zone is not allowed, and the
 * length takes no sign and no leading zero.
 */
export const prefixOf = (value: string): { family: 4 | 6; bits: number } | null => {
    const slash = value.lastIndexOf('/');
    if (slash < 0 || value.includes('%')) return null;
    const family = addressFamily(value.slice(0, slash));
    const bits = value.slice(slash + 1);
    if (!family || !/^(0|[1-9]\d{0,2})$/.test(bits)) return null;
    return Number(bits) <= hostBits(family) ? { family, bits: Number(bits) } : null;
};

export const KEY_SHAPE = (): string => t("A key is 32 bytes — 44 characters of base64, or 64 of hex.");

/**
 * What a key that is there turns out to be: one Xray cannot decode, one that
 * decodes to the wrong number of bytes, or a good one. Empty is the caller's
 * to say — whether it is an error depends on which key.
 */
export type KeyShape =
    | { ok: true }
    | { ok: false; reason: 'invalid' }
    | { ok: false; reason: 'length'; bytes: number };

export const keyShape = (value: unknown): KeyShape => {
    const bytes = parseWireguardKey(value);
    if (!bytes) return { ok: false, reason: 'invalid' };
    return bytes.length === KEY_BYTES ? { ok: true } : { ok: false, reason: 'length', bytes: bytes.length };
};

/** How many bytes a base64 string holds; undefined when it is not base64 at all. */
export const base64Length = (text: string): number | undefined => {
    try {
        return atob(text).length;
    } catch {
        return undefined;
    }
};

export interface AddressIssue {
    value: string;
    /**
     * `not-ip`: neither an address nor a prefix, so the device is never built.
     * `not-host`: a prefix that is not one host, which only 26.3 refuses.
     */
    why: 'not-ip' | 'not-host';
    /** For `not-host`: the address written as the one host it has to be. */
    host?: string;
}

/**
 * What an interface `address` list holds that the core refuses.
 *
 * Both sides read it the same way on each line. 26.7 and 26.9 take an address
 * or any prefix (v26.7.28:proxy/wireguard/server.go:83-96 for a server,
 * v26.7.28:proxy/wireguard/client.go:86-99 for a client). 26.3 sends both
 * through one parseEndpoints, which wants an address, or a prefix that is
 * exactly one host — /32 for IPv4, /128 for IPv6
 * (v26.3.27:proxy/wireguard/wireguard.go:29-46; the client calls it at
 * v26.3.27:proxy/wireguard/client.go:64 when it is created). So `10.0.0.1/24`
 * starts on 26.7 and not on 26.3, and is only an issue when a line is given.
 */
export const addressIssues = (entries: readonly unknown[], version?: CoreVersionId): AddressIssue[] => {
    const hostOnly = version !== undefined && compareCoreVersions(version, '26.7') < 0;
    const issues: AddressIssue[] = [];
    for (const entry of entries) {
        const value = String(entry);
        const prefix = typeof entry === 'string' ? prefixOf(entry) : null;
        if (typeof entry !== 'string' || (!prefix && !addressFamily(entry))) {
            issues.push({ value, why: 'not-ip' });
        } else if (hostOnly && prefix && prefix.bits !== hostBits(prefix.family)) {
            issues.push({ value, why: 'not-host', host: `${entry.slice(0, entry.lastIndexOf('/'))}/${hostBits(prefix.family)}` });
        }
    }
    return issues;
};

export interface AllowedIpIssue {
    value: string;
    /** For a bare address: the same thing written as a network of one. */
    example?: string;
}

/**
 * The entries of a peer's `allowedIPs` that are not a network written as
 * address/prefix. Every line hands them to the device's IpcSet, which parses
 * a prefix (v26.3.27:proxy/wireguard/wireguard.go:83-85,
 * v26.7.28:proxy/wireguard/client.go:325-327), so a bare address is refused
 * there as well as by a 26.7 server's own parse
 * (v26.7.28:proxy/wireguard/config.go:17-23).
 */
export const allowedIpIssues = (entries: readonly unknown[]): AllowedIpIssue[] => {
    const issues: AllowedIpIssue[] = [];
    for (const entry of entries) {
        if (typeof entry === 'string' && prefixOf(entry)) continue;
        const value = String(entry);
        const family = typeof entry === 'string' ? addressFamily(entry) : null;
        issues.push({ value, ...(family ? { example: `${value}/${hostBits(family)}` } : {}) });
    }
    return issues;
};

/**
 * What is wrong with `reserved`, which is `[]byte` in the core: a JSON list
 * of numbers or a base64 string.
 *
 *   length  Build() answers `"reserved" should be empty or 3 bytes`
 *           (v26.3.27:infra/conf/wireguard.go:100-102,
 *           v26.7.28:infra/conf/wireguard.go:122-124,
 *           v26.9.9:infra/conf/wireguard.go:123-125)
 *   range   a list entry that is not a whole number from 0 to 255 is a type
 *           error for a byte, and the decode of the settings returns it
 *           (v26.7.28:infra/conf/loader.go:51-53)
 *
 * Both refuse the config. A string that is not base64 is refused the same
 * way, but atob is more forgiving than Go's padded decoder, so it is not
 * judged here.
 */
export type ReservedIssue = 'length' | 'range';

export const reservedIssue = (reserved: unknown): ReservedIssue | null => {
    if (Array.isArray(reserved)) {
        if (reserved.some(entry => typeof entry !== 'number' || !Number.isInteger(entry) || entry < 0 || entry > 255)) {
            return 'range';
        }
        return reserved.length === 0 || reserved.length === 3 ? null : 'length';
    }
    if (typeof reserved === 'string') {
        const length = base64Length(reserved);
        return length === undefined || length === 0 || length === 3 ? null : 'length';
    }
    return null;
};
