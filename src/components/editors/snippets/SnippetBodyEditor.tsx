import { useEffect, useRef, useState } from 'react';
import { JsonEditor } from '../../ui/JsonEditor';
import { parseJsonc, stringifyJsonc } from '../../../utils/jsonc';
import { t } from '../../../i18n';

interface SnippetBodyEditorProps {
    label?: string;
    /** The snippet body: an array of rules or outbounds. */
    value: any[];
    /** Called with the parsed array on every syntactically valid edit. */
    onChange?: (value: any[]) => void;
    readOnly?: boolean;
    /**
     * Fires whenever the text stops or starts parsing. Callers need it because
     * a body that does not parse never reaches `onChange`: without this the
     * last valid value stays in state and a "save" would quietly store it
     * instead of what is on screen.
     */
    onSyntaxError?: (hasError: boolean) => void;
    /** Tailwind height for the editor box — it never grows past this. */
    heightClass?: string;
}

/**
 * JSON editor for a snippet body.
 *
 * Deliberately not `JsonField`: that one reserves `min-h-[65vh]` for a
 * full-config document, which in a two-column library modal pushes the
 * action buttons off screen. This keeps the same CodeMirror editor at a
 * caller-chosen height, and does not coerce an empty document into a
 * config-shaped object the way JsonField does — an empty snippet body is
 * simply `[]`.
 */
export const SnippetBodyEditor = ({
    label,
    value,
    onChange,
    readOnly = false,
    onSyntaxError,
    heightClass = 'h-[38vh]',
}: SnippetBodyEditorProps) => {
    const [text, setText] = useState(() => stringifyJsonc(value ?? [], 2));
    const [error, setError] = useState(false);

    // True while this editor is what changed the value, so the refill below
    // leaves it alone. State rather than a ref, since the check runs during
    // render and refs may not be read there.
    const [localEdit, setLocalEdit] = useState(false);

    // Whether the box already says what the value says. Unparseable text
    // counts as "yes": it is being typed, and must not be replaced.
    const alreadyShows = (candidate: string, next: unknown): boolean => {
        try {
            return candidate.trim() !== '' && JSON.stringify(parseJsonc(candidate)) === JSON.stringify(next);
        } catch {
            return true;
        }
    };

    // Follow a value that changed elsewhere — a different snippet selected,
    // "Capture current rules" — during render rather than an effect later,
    // so the previous snippet's body is never on screen under the new name.
    const [synced, setSynced] = useState(value);
    if (value !== synced) {
        setSynced(value);
        if (localEdit) {
            setLocalEdit(false);
        } else if (!alreadyShows(text, value)) {
            setText(stringifyJsonc(value ?? [], 2));
            setError(false);
        }
    }

    // The parent wants to know whether the body parses. Reported from one
    // place, when it changes, instead of at each of the five sites that used
    // to change it — and through a box, so a parent that passes a fresh
    // arrow every render does not make this fire every render.
    const report = useRef(onSyntaxError);
    useEffect(() => {
        report.current = onSyntaxError;
    });
    useEffect(() => {
        report.current?.(error);
    }, [error]);

    const handleChange = (next: string) => {
        setText(next);
        setLocalEdit(true);
        if (next.trim() === '') {
            setError(false);
            onChange?.([]);
            return;
        }
        try {
            const parsed = parseJsonc(next);
            setError(false);
            onChange?.(parsed as any[]);
        } catch {
            setError(true);
        }
    };

    return (
        <div className="flex flex-col gap-2 w-full min-w-0">
            {label && (
                <div className="flex justify-between items-end">
                    <label className="text-xs uppercase font-bold text-slate-500">{label}</label>
                    {error && (
                        <span className="text-rose-500 font-bold text-[10px] animate-pulse">
                            {t("Invalid JSON Syntax")}
                            </span>
                    )}
                </div>
            )}
            <div className={`${heightClass} relative rounded-lg overflow-hidden border transition-all bg-[#282c34] ${
                error ? 'border-rose-500/50' : 'border-slate-700'
            }`}>
                <div className="absolute inset-0">
                    <JsonEditor
                        value={text}
                        onChange={handleChange}
                        schemaMode="rule"
                        readOnly={readOnly}
                    />
                </div>
            </div>
        </div>
    );
};
