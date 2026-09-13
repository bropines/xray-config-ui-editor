import { useEffect, useRef, useState } from 'react';
import { JsonEditor } from '../../ui/JsonEditor';
import { parseJsonc, stringifyJsonc } from '../../../utils/jsonc';

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
    const isLocalEdit = useRef(false);

    // Keep the editor in sync with external changes (a different snippet
    // selected, "Capture current rules"), but never stomp on in-progress
    // typing — including text that does not parse yet.
    useEffect(() => {
        if (isLocalEdit.current) {
            isLocalEdit.current = false;
            return;
        }
        try {
            if (text.trim() !== '' && JSON.stringify(parseJsonc(text)) === JSON.stringify(value)) return;
        } catch {
            return;
        }
        setText(stringifyJsonc(value ?? [], 2));
        setError(false);
        onSyntaxError?.(false);
    }, [value]);

    const handleChange = (next: string) => {
        setText(next);
        isLocalEdit.current = true;
        if (next.trim() === '') {
            setError(false);
            onSyntaxError?.(false);
            onChange?.([]);
            return;
        }
        try {
            const parsed = parseJsonc(next);
            setError(false);
            onSyntaxError?.(false);
            onChange?.(parsed as any[]);
        } catch {
            setError(true);
            onSyntaxError?.(true);
        }
    };

    return (
        <div className="flex flex-col gap-2 w-full min-w-0">
            {label && (
                <div className="flex justify-between items-end">
                    <label className="text-xs uppercase font-bold text-slate-500">{label}</label>
                    {error && (
                        <span className="text-rose-500 font-bold text-[10px] animate-pulse">
                            Invalid JSON Syntax
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
