import React, { useState, useEffect, useRef } from "react";
import { Icon } from "./Icon";

interface Suggestion {
    code: string;
    count: number;
}

interface SmartTagInputProps {
    label: string;
    value: string[];
    onChange: (val: string[]) => void;
    suggestions: Suggestion[];
    prefix: string;           // "geosite:" или "geoip:"
    placeholder?: string;
    isLoading?: boolean;
    invalidTags?: string[];   // Теги с ошибкой — подсвечиваются красным
}

export const SmartTagInput = ({
    label,
    value = [],
    onChange,
    suggestions,
    prefix,
    placeholder,
    isLoading,
    invalidTags = [],
}: SmartTagInputProps) => {
    const [input, setInput] = useState("");
    const [showSuggest, setShowSuggest] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const filteredSuggestions = input
        ? suggestions.filter(s =>
            s.code.toLowerCase().includes(input.toLowerCase().replace(prefix, ""))
          ).slice(0, 10)
        : [];

    const addTag = (tag: string) => {
        const cleanTag = tag.trim();
        if (!cleanTag) return;
        if (!value.includes(cleanTag)) {
            onChange([...value, cleanTag]);
        }
        setInput("");
        setShowSuggest(false);
    };

    const removeTag = (tagToRemove: string) => {
        onChange(value.filter(t => t !== tagToRemove));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            e.stopPropagation();
            addTag(input);
        }
        if (e.key === 'Backspace' && !input && value.length > 0) {
            removeTag(value[value.length - 1]);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggest(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const hasInvalid = invalidTags.length > 0;

    return (
        <div className="flex flex-col gap-2" ref={wrapperRef}>
            <label className="text-xs uppercase font-bold text-slate-500 flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                    {label}
                    {hasInvalid && (
                        <span className="text-rose-400 flex items-center gap-1 normal-case font-normal">
                            <Icon name="Warning" className="text-[12px]" />
                            {invalidTags.length} invalid
                        </span>
                    )}
                </span>
                {isLoading && (
                    <span className="text-indigo-400 flex items-center gap-1">
                        <Icon name="spinner" className="animate-spin" /> Loading DB...
                    </span>
                )}
            </label>

            <div
                className={`bg-slate-950 border rounded-lg p-2 flex flex-wrap gap-2 focus-within:ring-1 transition-all min-h-[42px] ${
                    hasInvalid
                        ? 'border-rose-500/70 focus-within:border-rose-500 focus-within:ring-rose-500/30'
                        : 'border-slate-700 focus-within:border-indigo-500 focus-within:ring-indigo-500/50'
                }`}
                onClick={() => wrapperRef.current?.querySelector('input')?.focus()}
            >
                {value.map((tag, i) => {
                    const isInvalid = invalidTags.includes(tag);
                    return (
                        <span
                            key={i}
                            className={`px-2 py-1 rounded text-xs font-mono flex items-center gap-1 border ${
                                isInvalid
                                    ? 'bg-rose-900/40 border-rose-500/70 text-rose-200'
                                    : 'bg-slate-800 border-slate-700 text-slate-200'
                            }`}
                            title={isInvalid ? "Invalid entry — will crash Xray" : undefined}
                        >
                            {isInvalid && <Icon name="Warning" className="text-rose-400 text-[11px]" />}
                            {tag}
                            <button
                                onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                                className={isInvalid ? 'hover:text-red-300 text-rose-400' : 'hover:text-red-400'}
                            >
                                <Icon name="x" />
                            </button>
                        </span>
                    );
                })}

                <div className="relative flex-1 min-w-[120px]">
                    <input
                        className="bg-transparent outline-none text-sm text-white w-full h-full font-mono placeholder:text-slate-600"
                        value={input}
                        onChange={e => { setInput(e.target.value); setShowSuggest(true); }}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setShowSuggest(true)}
                        placeholder={placeholder}
                        enterKeyHint="done"
                        inputMode="text"
                        autoComplete="off"
                    />

                    {showSuggest && input && filteredSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 mt-2 w-full min-w-[200px] bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto custom-scroll">
                            {filteredSuggestions.map((s) => (
                                <button
                                    key={s.code}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-600 hover:text-white text-slate-300 flex justify-between group"
                                    onClick={() => addTag(`${prefix}${s.code}`)}
                                >
                                    <span className="font-bold">
                                        {prefix}<span className="text-white group-hover:text-white">{s.code}</span>
                                    </span>
                                    <span className="opacity-50">{s.count} recs</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};