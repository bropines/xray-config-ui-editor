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
