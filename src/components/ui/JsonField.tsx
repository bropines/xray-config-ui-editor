import React, { useState, useEffect } from "react";

export const JsonField = ({ label, value, onChange, className="" }) => {
    const [text, setText] = useState("");
    const [error, setError] = useState(false);

    useEffect(() => {
        setText(value === undefined ? "" : JSON.stringify(value, null, 2));
    }, [value]);

    const handleChange = (e) => {
        const newVal = e.target.value;
        setText(newVal);
        try {
            if (newVal.trim() === "") {
                onChange(undefined);
                setError(false);
            } else {
                onChange(JSON.parse(newVal));
                setError(false);
            }
        } catch (err) {
            setError(true);
        }
    };

    return (
        <div className={`flex flex-col gap-2 flex-1 ${className}`}>
            <label className="text-xs uppercase font-bold text-slate-500 flex justify-between">
                {label}
                {error && <span className="text-rose-500 font-bold">Invalid JSON</span>}
            </label>
            <textarea 
                className={`w-full h-full bg-slate-950 border rounded-lg p-3 font-mono text-xs leading-relaxed outline-none resize-none custom-scroll ${error ? 'border-rose-500 text-rose-300' : 'border-slate-700 text-emerald-400 focus:border-indigo-500'}`}
                value={text}
                onChange={handleChange}
                spellCheck="false"
            />
        </div>
    );
};