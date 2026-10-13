import { useState } from 'react';

/**
 * Text that stands for a value: kept as typed while it still means that
 * value, refilled when the value changes underneath it — the same check
 * JsonField makes, done during render so the box is never a frame behind.
 *
 * `parse` may throw on text that is not a value yet; that counts as "does not
 * mean the value", so an undo or a form edit elsewhere still refills the box.
 */
export const useSyncedText = (value: unknown, format: (value: unknown) => string, parse: (text: string) => unknown) => {
    const [text, setText] = useState(() => format(value));
    const [seen, setSeen] = useState(value);
    if (value !== seen) {
        setSeen(value);
        let same: boolean;
        try {
            same = JSON.stringify(parse(text)) === JSON.stringify(value);
        } catch {
            same = false;
        }
        if (!same) setText(format(value));
    }
    return [text, setText] as const;
};
