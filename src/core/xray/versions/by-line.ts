/**
 * One value per supported line — the shape every per-line table here is made of.
 *
 * Written oldest first: 26.3, 26.7, 26.9, and then, only when it has to be said,
 * 26.9.30 and 26.10 together.
 *
 *   byLine('absent', 'accepted', 'accepted')
 *       26.9.30 and 26.10 follow 26.9. Nothing to write when v26.9.30 and
 *       v26.10.10 both do what v26.9.9 does.
 *
 *   byLine('rejected', 'rejected', 'rejected', 'accepted', 'accepted')
 *       Any row whose 26.9 and 26.10 values differ names its 26.9.30 value too
 *       — the signature has no four-value form, so there is no way to leave it
 *       to a default. 26.9.30 sits between the two lines it follows in turn:
 *       it can match 26.9 (dns scripts, `useSystemCA`, `masqueSettings.warp`),
 *       match 26.10 (MASQUE, xdrive, the tun keys, Shadowsocks) or be neither
 *       (xdns), and a table that guessed would be wrong about one of them.
 *
 * Every value cites its source in the row it belongs to; `features.v2693.test.ts`
 * holds the rows that differ to a `v26.9.30:file:line` citation.
 */
import type { CoreVersionId } from './index';

export function byLine<T>(v263: T, v267: T, v269: T): Record<CoreVersionId, T>;
export function byLine<T>(v263: T, v267: T, v269: T, v2693: T, v2610: T): Record<CoreVersionId, T>;
export function byLine<T>(v263: T, v267: T, v269: T, ...rest: [] | [T, T]): Record<CoreVersionId, T> {
    // The types allow nothing between three values and five; a JavaScript caller that
    // names one of the last two is told, not given a default for the other.
    if ((rest as unknown[]).length === 1) throw new Error('byLine: name 26.9.30 and 26.10 together, or neither');
    const [v2693, v2610] = rest.length === 2 ? rest : [v269, v269];
    return { '26.3': v263, '26.7': v267, '26.9': v269, '26.9.30': v2693, '26.10': v2610 };
}

/** The same value on every line. */
export const onEveryLine = <T>(value: T): Record<CoreVersionId, T> => byLine(value, value, value);
