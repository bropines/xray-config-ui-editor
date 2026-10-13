/**
 * What a freedom outbound's `fragment` must have for the config to load.
 *
 * Fragmentation is switched on by the object existing, and once it exists the
 * core will not build it without a length and an interval
 * (v26.7.28:infra/conf/freedom.go:118-131 — "Length can't be empty",
 * "LengthMin can't be 0", "Interval can't be empty"; the same on 26.3 and
 * 26.9). The form lets either box be emptied, because a box that cannot be
 * emptied cannot be retyped — so the emptiness has to be said out loud rather
 * than prevented.
 */

import { t } from '../../i18n';

export type FragmentField = 'length' | 'interval';

export interface FragmentProblem {
    field: FragmentField;
    message: string;
}

const isBlank = (value: unknown): boolean =>
    value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

/** The lower bound of a range as the core reads it: "100-200", "100", or a bare number. */
const lowerBound = (value: unknown): number | null => {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return null;
    const first = value.trim().split('-')[0] ?? '';
    const parsed = Number(first);
    return first !== '' && Number.isFinite(parsed) ? parsed : null;
};

export const fragmentProblems = (fragment: unknown): FragmentProblem[] => {
    if (!fragment || typeof fragment !== 'object' || Array.isArray(fragment)) return [];
    const { length, interval } = fragment as Record<string, unknown>;
    const problems: FragmentProblem[] = [];

    if (isBlank(length)) {
        problems.push({ field: 'length', message: t("Fragmentation needs a length: the core refuses the config without one.") });
    } else if (lowerBound(length) === 0) {
        problems.push({ field: 'length', message: t("The length cannot start at 0: the core refuses a fragment of no bytes.") });
    }

    if (isBlank(interval)) {
        problems.push({ field: 'interval', message: t("Fragmentation needs an interval: the core refuses the config without one.") });
    }

    return problems;
};

// ── Noises ───────────────────────────────────────────────────────────────

export interface NoiseProblem {
    field: 'type' | 'packet';
    message: string;
}

/** The four the core switches on, matched exactly — `Rand` is the default case. */
const NOISE_TYPES = ['rand', 'str', 'hex', 'base64'];

/**
 * What one `settings.noises[]` entry has wrong, as the core will see it.
 *
 * `ParseNoise` is the same on all three tags (v26.7.28:infra/conf/freedom.go:
 * 194-249) and refuses the whole config on any of these: a type that is not
 * one of the four, a `rand` whose packet is not a range or starts at 0 —
 * which is what an empty box parses as — and `hex` or `base64` that will not
 * decode. `str` takes anything, and an empty `hex` or `base64` is an empty
 * packet rather than an error.
 */
export const noiseProblem = (noise: unknown): NoiseProblem | null => {
    if (!noise || typeof noise !== 'object' || Array.isArray(noise)) return null;
    const { type, packet } = noise as Record<string, unknown>;
    const text = typeof packet === 'string' ? packet.trim() : packet === undefined || packet === null ? '' : String(packet);

    if (typeof type !== 'string' || !NOISE_TYPES.includes(type)) {
        return { field: 'type', message: t("A noise needs a type of rand, str, hex or base64, written exactly so: the core refuses anything else.") };
    }

    if (type === 'rand') {
        const range = /^\d+(-\d+)?$/.test(text);
        if (!range) return { field: 'packet', message: t("A rand noise needs a length or a range, like 50-100: the core refuses the config without one.") };
        if (lowerBound(text) === 0) return { field: 'packet', message: t("A rand noise cannot start at 0 bytes: the core refuses it.") };
    }

    if (type === 'hex' && (text.length % 2 !== 0 || /[^0-9a-fA-F]/.test(text))) {
        return { field: 'packet', message: t("Not hex: pairs of 0-9 and a-f are what the core decodes.") };
    }

    if (type === 'base64') {
        // The core folds the standard alphabet into the URL one and drops the
        // padding before decoding, so both spellings are fine (freedom.go:226).
        const folded = text.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        if (/[^A-Za-z0-9_-]/.test(folded) || folded.length % 4 === 1) {
            return { field: 'packet', message: t("Not base64: the core cannot decode it.") };
        }
    }

    return null;
};
