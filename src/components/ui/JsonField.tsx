import React, { useState, useEffect, useRef } from "react";
import { JsonEditor } from "./JsonEditor";
import { parseJsonc, stringifyJsonc, stripJsoncComments } from "../../utils/jsonc";

interface JsonFieldProps {
    label?: string;
    value: any;
    onChange: (val: any, rawText?: string) => void;
    className?: string;
    schemaMode?: 'full' | 'inbound' | 'inbounds' | 'outbound' | 'outbounds' | 'rule' | 'dns' | 'balancer' | 'routing' | 'reverse';
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
    /** Forwarded to JsonEditor. Previously accepted but silently dropped here — the prop wasn't declared, so callers passing it (e.g. VersionHistoryModal's snapshot preview) got an editable field despite asking for read-only. */
    readOnly?: boolean;
}

export const JsonField = ({ label, value, onChange, className = "", schemaMode = 'full', rawText, rawConfigText, onSaveShortcut, onCommitShortcut, readOnly = false }: JsonFieldProps) => {
    const [text, setText] = useState("");
    const [error, setError] = useState(false);
    const isLocalEditRef = useRef(false);

    // Synchronize external value -> internal text while preserving comments
    useEffect(() => {
        // If this update was triggered by local typing/pasting in this component, do NOT overwrite text!
        if (isLocalEditRef.current) {
            isLocalEditRef.current = false;
            return;
        }

        let displayValue = value;
        if (value && typeof value === 'object' && !Array.isArray(value) && 'i' in value) {
            displayValue = { ...value };
            Object.getOwnPropertySymbols(value).forEach(sym => {
                (displayValue as any)[sym] = (value as any)[sym];
            });
            delete (displayValue as any).i;
        }

        // 1. If explicit rawText prop passed and matches structurally, use it
        if (rawText && rawText.trim() !== "") {
            try {
                const parsed = parseJsonc(rawText);
                if (JSON.stringify(parsed) === JSON.stringify(displayValue)) {
                    setText(rawText);
                    return;
                }
            } catch (e) {}
        }

        // 2. If current text in editor matches structurally, keep it (do not wipe user's comments/formatting while typing)
        try {
            if (text.trim() !== "") {
                const currentObj = parseJsonc(text);
                if (JSON.stringify(currentObj) === JSON.stringify(displayValue)) {
                    return;
                }
            }
        } catch (e) {
            // While text has syntax error or in-progress edits, do not overwrite!
            return;
        }

        // 3. Check if rawConfigText from store can be used for full config or section
        if (rawConfigText && rawConfigText.trim() !== "") {
            try {
                const fullObj = parseJsonc(rawConfigText);
                if (schemaMode === 'full') {
                    if (JSON.stringify(fullObj) === JSON.stringify(displayValue)) {
                        setText(rawConfigText);
                        return;
                    }
                } else {
                    let sectionKey = schemaMode;
                    if (schemaMode === 'inbound') sectionKey = 'inbounds';
                    if (schemaMode === 'outbound') sectionKey = 'outbounds';

                    if (sectionKey in fullObj) {
                        const secObj = fullObj[sectionKey];
                        if (JSON.stringify(secObj) === JSON.stringify(displayValue)) {
                            const sectionText = stringifyJsonc(secObj, 2);
                            setText(sectionText);
                            return;
                        }
                    }
                }
            } catch (e) {}
        }

        // 4. Fallback to standard comment-json stringify
        const newText = stringifyJsonc(displayValue, 2);
        setText(newText);
    }, [value, rawConfigText, rawText, schemaMode]);

    const handleEditorChange = (v: string) => {
        setText(v);
        isLocalEditRef.current = true;
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
    } catch (err) {
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
                    {error && <span className="text-rose-500 font-bold text-[10px] animate-pulse">Invalid JSON Syntax</span>}
                </div>
            )}
            
            <div className={`flex-1 min-h-[65vh] relative rounded-lg overflow-hidden border transition-all bg-[#282c34] ${error ? 'border-rose-500/50' : 'border-slate-700'}`}>
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