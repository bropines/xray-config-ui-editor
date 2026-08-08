import React, { useState, useEffect, useRef } from "react";
import { JsonEditor } from "./JsonEditor";
import { parseJsonc, stringifyJsonc, stripJsoncComments } from "../../utils/jsonc";

interface JsonFieldProps {
    label?: string;
    value: any;
    onChange: (val: any) => void;
    className?: string;
    schemaMode?: 'full' | 'inbound' | 'inbounds' | 'outbound' | 'outbounds' | 'rule' | 'dns' | 'balancer' | 'routing' | 'reverse';
}

export const JsonField = ({ label, value, onChange, className = "", schemaMode = 'full' }: JsonFieldProps) => {
    const [text, setText] = useState("");
    const [error, setError] = useState(false);
    const isLocalEditRef = useRef(false);

    // Synchronize external value -> internal text only when external data is structurally different
    useEffect(() => {
        let displayValue = value;
        if (value && typeof value === 'object' && !Array.isArray(value) && 'i' in value) {
            displayValue = { ...value };
            Object.getOwnPropertySymbols(value).forEach(sym => {
                (displayValue as any)[sym] = (value as any)[sym];
            });
            delete (displayValue as any).i;
        }
        
        try {
            if (text.trim() !== "") {
                const currentObj = parseJsonc(text);
                if (JSON.stringify(currentObj) === JSON.stringify(displayValue)) {
                    return; // Retain user's text (with comments, spacing, formatting)!
                }
            }
        } catch (e) {
            // While text has syntax error or in-progress edits, do not overwrite!
            return;
        }

        const newText = stringifyJsonc(displayValue, 2);
        setText(newText);
    }, [value]);

    const handleEditorChange = (v: string) => {
        setText(v);
        isLocalEditRef.current = true;
        try {
            if (v.trim() === "") {
                onChange({ inbounds: [], outbounds: [] });
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
                onChange(sanitized);
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
                    />
                </div>
            </div>
        </div>
    );
};