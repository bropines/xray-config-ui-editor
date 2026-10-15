import { t } from '../../../i18n';

export interface FlowOption {
    value: string;
    label: string;
}

/**
 * What a flow chooser lists: the line's values, plus the one the config holds
 * when the line does not take it — shown, labelled for what it is, never
 * swapped for a value the config does not have (a flow the core refuses fails
 * the load, and the chooser is where someone looks for the cause).
 *
 * `empty` is the word for "no flow of its own": "None", or "Inherits …" for a
 * client under an inbound that has a default.
 */
export const flowOptions = (
    offered: readonly string[],
    held: string,
    { tag, empty }: { tag: string; empty: string },
): FlowOption[] => {
    const values = held !== '' && !offered.includes(held) ? [...offered, held] : [...offered];
    if (!values.includes('')) values.unshift('');
    return values.map(value => ({
        value,
        label: value === ''
            ? empty
            : offered.includes(value) ? value : t("{value} (Xray {tag} refuses it)", { value, tag }),
    }));
};
