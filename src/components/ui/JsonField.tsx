import React, { useState, useEffect, useRef } from "react";
import { JsonEditor } from "./JsonEditor";

interface JsonFieldProps {
    label?: string;
    value: any;
    onChange: (val: any) => void;
    className?: string;
    schemaMode?: 'full' | 'inbound' | 'outbound' | 'rule' | 'dns' | 'balancer'; // Новый проп
}

export const JsonField = ({ label, value, onChange, className = "", schemaMode = 'full' }: JsonFieldProps) => {
    const [text, setText] = useState("");
    const [error, setError] = useState(false);
    const isInternalUpdate = useRef(false);

    useEffect(() => {
        if (!isInternalUpdate.current) {
            setText(JSON.stringify(value, null, 2));
        }
        isInternalUpdate.current = false;
    }, [value]);

    const handleEditorChange = (newVal: string | undefined) => {
        const v = newVal || "";
        setText(v);
        try {
            if (v.trim() === "") {
                onChange(undefined);
                setError(false);
            } else {
                const parsed = JSON.parse(v);
                isInternalUpdate.current = true;
                onChange(parsed);
                setError(false);
            }
        } catch (err) {
            setError(true);
        }
    };

    return (
        <div className={`flex flex-col gap-2 h-full ${className}`}>
            {label && (
                <label className="text-xs uppercase font-bold text-slate-500 flex justify-between">
                    {label}
                    {error && <span className="text-rose-500 font-bold animate-pulse">Invalid JSON syntax</span>}
                </label>
            )}
            <div className={`flex-1 min-h-[300px] rounded-lg overflow-hidden transition-all ${error ? 'ring-1 ring-rose-500' : ''}`}>
                <JsonEditor 
                    value={text} 
                    onChange={handleEditorChange} 
                    schemaMode={schemaMode} // Передаем режим
                />
            </div>
        </div>
    );
};