import React from 'react';
import { useSyncedText } from '../../hooks/useSyncedText';
import { t } from '../../i18n';

/** Which JSON value a key takes; `any` leaves that to whoever reads it. */
export type JsonKind = 'object' | 'array' | 'any';

const isKind = (value: unknown, kind: JsonKind): boolean => {
    if (kind === 'any') return true;
    if (kind === 'array') return Array.isArray(value);
    return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const formatJson = (value: unknown) => (value === undefined ? '' : JSON.stringify(value, null, 2));
const parseJson = (text: string) => (text.trim() === '' ? undefined : JSON.parse(text));

/**
 * What the text in the box is, right now. Derived from the text on every
 * render instead of remembered from the last keystroke, so a box refilled
 * from outside is judged on what it now holds.
 */
const statusOf = (text: string, expects: JsonKind): 'ok' | 'invalid' | 'wrong-kind' => {
    let parsed: unknown;
    try {
        parsed = parseJson(text);
    } catch {
        return 'invalid';
    }
    return parsed === undefined || isKind(parsed, expects) ? 'ok' : 'wrong-kind';
};

/**
 * A small JSON box for one value inside a form.
 *
 * It writes the parsed value, never the text: the config changes only when
 * the box holds complete JSON of the kind the key takes, and until then it
 * keeps the last value that was — and says so, because a box that looks
 * edited while the config still holds the old value is how a change gets
 * lost. Emptying the box writes `undefined`, which every caller turns into
 * "remove the key"; an empty string is not something a JSON key should be
 * left holding.
 *
 * JsonField is the other JSON editor, and the wrong one for a field: it is
 * the whole-document CodeMirror view, sized for a screen, and an emptied one
 * writes a skeleton config (`{ inbounds: [], outbounds: [] }`).
 */
export const JsonInput = ({ value, onChange, expects = 'any', placeholder, ariaLabel }: {
    value: unknown;
    onChange: (value: unknown) => void;
    /** Refuse valid JSON of another kind — a string where the key is an object. */
    expects?: JsonKind;
    placeholder?: string;
    ariaLabel?: string;
}) => {
    const [text, setText] = useSyncedText(value, formatJson, parseJson);
    const status = statusOf(text, expects);
    return (
        <div className="flex flex-col gap-1">
            <textarea
                className={`input-base text-xs font-mono min-h-[80px] resize-y ${status === 'ok' ? '' : 'border-rose-500/70'}`}
                value={text}
                spellCheck={false}
                placeholder={placeholder}
                aria-label={ariaLabel}
                aria-invalid={status !== 'ok'}
                onChange={e => {
                    const next = e.target.value;
                    setText(next);
                    if (statusOf(next, expects) === 'ok') onChange(parseJson(next));
                }}
            />
            {status === 'invalid' && (
                <span className="text-[10px] text-rose-400">{t("Not valid JSON yet — the config keeps the last valid value.")}</span>
            )}
            {status === 'wrong-kind' && (
                <span className="text-[10px] text-rose-400">
                    {expects === 'array'
                        ? t("This key takes a JSON list, in square brackets — the config keeps the last valid value.")
                        : t("This key takes a JSON object, in braces — the config keeps the last valid value.")}
                </span>
            )}
        </div>
    );
};
