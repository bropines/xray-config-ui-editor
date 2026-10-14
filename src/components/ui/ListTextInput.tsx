import React from 'react';
import { useSyncedText } from '../../hooks/useSyncedText';

const splitList = (text: string): string[] => text.split(/[\s,]+/).filter(Boolean);

const show = (value: unknown): string => (Array.isArray(value) ? value.map(String).join(', ') : '');

/**
 * A list of short values typed as one line (or box) of text.
 *
 * The config only ever receives whole entries. What is being typed — a comma
 * and a space waiting for the next entry — stays in the box: the text is kept
 * for as long as it still means the list the config holds, and refilled the
 * moment the list changes underneath it (an undo, a WARP registration, the
 * raw editor), the same rule JsonInput follows. A box that rebuilt its text
 * from the list on every keystroke would drop the comma the instant it was
 * typed, which is what these boxes used to do.
 *
 * Emptied, the list is *left out* (`undefined`), never `[]`: for the keys
 * this is used on the core treats an absent list as "use the default", and an
 * empty one as "use none".
 *
 * `allowed` keeps characters out of the box itself, for a list of numbers;
 * `read` turns each entry into the value the list holds.
 */
export const ListTextInput = <T extends string | number = string>({
    value,
    onChange,
    read,
    allowed,
    multiline = false,
    className = '',
    ...rest
}: {
    /** Whatever the config holds under the key — not necessarily a list. */
    value: unknown;
    onChange: (next: T[] | undefined) => void;
    read?: (entry: string) => T;
    /** The inside of a character class, such as `0-9`: every other character is dropped as it is typed (a comma and a space always stay). */
    allowed?: string;
    multiline?: boolean;
    className?: string;
    placeholder?: string;
    'aria-label'?: string;
    'aria-invalid'?: boolean;
    spellCheck?: boolean;
    autoComplete?: string;
}) => {
    const parse = (text: string): T[] | undefined => {
        const entries = splitList(text).map(entry => (read ? read(entry) : entry as T));
        return entries.length > 0 ? entries : undefined;
    };
    const [text, setText] = useSyncedText(value, show, parse as (text: string) => unknown);

    const handle = (typed: string) => {
        const next = allowed ? typed.replace(new RegExp(`[^${allowed}\\s,]`, 'g'), '') : typed;
        setText(next);
        onChange(parse(next));
    };

    const shared = {
        value: text,
        className,
        spellCheck: false,
        autoComplete: 'off',
        ...rest,
    };
    return multiline
        ? <textarea {...shared} onChange={e => handle(e.target.value)} />
        : <input {...shared} onChange={e => handle(e.target.value)} />;
};
