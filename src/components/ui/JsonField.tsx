import React, { useState } from "react";
import { JsonEditor } from "./JsonEditor";
import { parseJsonc } from "../../utils/jsonc";
import { pickDisplayText } from "../../core/xray/json-display-text";
import { t } from '../../i18n';

interface JsonFieldProps {
    label?: string;
    value: any;
    onChange: (val: any, rawText?: string) => void;
    className?: string;
    schemaMode?: 'full' | 'inbound' | 'inbounds' | 'outbound' | 'outbounds' | 'rule' | 'dns' | 'balancer' | 'routing' | 'reverse' | 'none';
    rawText?: string | null;
    /**
     * The full config document's current raw JSONC text (store's
     * `rawConfigText`), used only to preserve comments/formatting when this
     * field's value happens to structurally match a slice of it. Optional —
     * pass it from a caller that already has store access; JsonField itself
     * has none (see the plan: ui/ primitives stay store-free).
     */
    rawConfigText?: string | null;
    /** Forwarded to JsonEditor — see its own doc comment. */
    onSaveShortcut?: () => void;
    onCommitShortcut?: () => { id: string; additions?: number; deletions?: number } | null | undefined;
    /**
     * Sized by its container instead of claiming most of the viewport.
     *
     * The default minimum is for a field that IS the screen — a JSON mode, a
     * section editor. Inside a form field it would push everything else off
     * the page for the sake of a two-line array.
     */
    inline?: boolean;
    /** Forwarded to JsonEditor. Previously accepted but silently dropped here — the prop wasn't declared, so callers passing it (e.g. VersionHistoryModal's snapshot preview) got an editable field despite asking for read-only. */
    readOnly?: boolean;
}

export const JsonField = ({ label, value, onChange, className = "", schemaMode = 'full', rawText, rawConfigText, onSaveShortcut, onCommitShortcut, readOnly = false, inline = false }: JsonFieldProps) => {
    const [text, setText] = useState("");
    const [error, setError] = useState(false);

    // True while the change came from this editor, so the refill below can
    // let it be. State rather than a ref: the check runs during render, and
    // refs may not be read there.
    const [localEdit, setLocalEdit] = useState(false);

    // Refill the box when the value changes elsewhere — an undo, a form
    // edit, a profile switch — choosing the text that keeps the most of what
    // the author wrote (see core/xray/json-display-text). Done during render,
    // so the box is never a frame behind the value it claims to show.
    const [synced, setSynced] = useState<{
        value: any;
        rawText?: string | null;
        rawConfigText?: string | null;
        schemaMode: string;
    } | null>(null);

    if (!synced
        || value !== synced.value
        || rawText !== synced.rawText
        || rawConfigText !== synced.rawConfigText
        || schemaMode !== synced.schemaMode) {
        setSynced({ value, rawText, rawConfigText, schemaMode });
        if (localEdit) {
            setLocalEdit(false);
        } else {
            const next = pickDisplayText({ value, text, rawText, rawConfigText, schemaMode });
            if (next !== null) setText(next);
        }
    }

    const handleEditorChange = (v: string) => {
        setText(v);
        setLocalEdit(true);
        try {
            if (v.trim() === "") {
                onChange({ inbounds: [], outbounds: [] }, v);
                setError(false);
            } else {
                const parsed = parseJsonc(v);

            // Recursively remove 'i' property and ignore nulls, preserving comment Symbols
            const sanitize = (obj: any): any => {
                if (Array.isArray(obj)) {
                    const arr = obj.map(sanitize).filter(i => i !== null);
                    Object.getOwnPropertySymbols(obj).forEach(sym => {
                        (arr as any)[sym] = (obj as any)[sym];
                    });
                    return arr;
                }
                if (obj && typeof obj === 'object') {
                    const newObj: any = {};
                    for (const key in obj) {
                        if (key === 'i') continue;
                        const val = sanitize(obj[key]);
                        if (val !== null && val !== undefined) newObj[key] = val;
                    }
                    Object.getOwnPropertySymbols(obj).forEach(sym => {
                        newObj[sym] = obj[sym];
                    });
                    return newObj;
                }
                return obj;
            };

            const sanitized = sanitize(parsed);

            // Reject if resulting object is invalid (e.g. empty or not matching Xray structure)
            if (sanitized && typeof sanitized === 'object') {
                onChange(sanitized, v);
                setError(false);
            }
        }
    } catch {
        setError(true);
    }
};

    return (
        <div className={`flex flex-col gap-2 h-full w-full min-w-0 ${className}`}>
            {label && (
                <div className="flex justify-between items-end">
                    <label className="text-xs uppercase font-bold text-slate-500">
                        {label}
                    </label>
                    {error && <span className="text-rose-500 font-bold text-[10px] animate-pulse">{t("Invalid JSON Syntax")}</span>}
                </div>
            )}
            
            <div className={`flex-1 ${inline ? 'min-h-0' : 'min-h-[45dvh] md:min-h-[65vh]'} relative rounded-lg overflow-hidden border transition-all bg-[#282c34] ${error ? 'border-rose-500/50' : 'border-slate-700'}`}>
                <div className="absolute inset-0">
                    <JsonEditor
                        value={text}
                        onChange={handleEditorChange}
                        schemaMode={schemaMode}
                        onSaveShortcut={onSaveShortcut}
                        onCommitShortcut={onCommitShortcut}
                        readOnly={readOnly}
                    />
                </div>
            </div>
        </div>
    );
};