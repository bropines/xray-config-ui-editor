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
    prefix: string;
    placeholder?: string;
    isLoading?: boolean;
    invalidTags?: string[];
    warnTags?: string[];
    onTagClick?: (tag: string) => void;
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
    warnTags = [],
    onTagClick,
}: SmartTagInputProps) => {
    const [input, setInput] = useState("");
    const [showSuggest, setShowSuggest] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const filteredSuggestions = input
        ? suggestions
            .filter(s => s.code.toLowerCase().includes(input.toLowerCase().replace(prefix, "")))
            .slice(0, 10)
        : [];

    // Универсальный супер-парсер: ест пробелы, запятые, табы, переносы строк и сноски [1]
    const processAndAddTags = (rawInput: string) => {
        // Разбиваем по любому сочетанию запятых, пробелов и переносов строк
        const rawTags = rawInput.split(/[\n,\s]+/);
        let newTags = [...value];
        let added = false;

        rawTags.forEach(rawTag => {
            // Вырезаем сноски вроде [1], [23] и чистим края
            const cleanTag = rawTag.replace(/\[\d+\]/g, '').trim();
            if (cleanTag && !newTags.includes(cleanTag)) {
                newTags.push(cleanTag);
                added = true;
            }
        });

        if (added) {
            onChange(newTags);
        }
        setInput("");
        setShowSuggest(false);
    };

    const removeTag = (t: string) => onChange(value.filter(v => v !== t));

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            e.stopPropagation();
            processAndAddTags(input);
        }
        if (e.key === 'Backspace' && !input && value.length > 0) {
            removeTag(value[value.length - 1]);
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData("Text");
        processAndAddTags(pastedText);
    };

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node))
                setShowSuggest(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const hasInvalid = invalidTags.length > 0;
    const hasWarn = warnTags.length > 0;

    const containerBorder = hasInvalid
        ? 'border-rose-500/70 focus-within:border-rose-500 focus-within:ring-rose-500/30'
        : hasWarn
            ? 'border-amber-500/50 focus-within:border-amber-400 focus-within:ring-amber-400/20'
            : 'border-slate-700 focus-within:border-indigo-500 focus-within:ring-indigo-500/50';

    return (
        <div className="flex flex-col gap-2" ref={wrapperRef}>
            <label className="text-xs uppercase font-bold text-slate-500 flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                    {label}
                    {hasInvalid && (
                        <span className="text-rose-400 flex items-center gap-1 normal-case font-normal text-[10px]">
                            <Icon name="WarningOctagon" weight="fill" className="text-[11px]" />
                            {invalidTags.length} error{invalidTags.length > 1 ? 's' : ''}
                        </span>
                    )}
                    {!hasInvalid && hasWarn && (
                        <span className="text-amber-400 flex items-center gap-1 normal-case font-normal text-[10px]">
                            <Icon name="Warning" weight="fill" className="text-[11px]" />
                            {warnTags.length} lint
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
                className={`bg-slate-950 border rounded-lg p-2 flex flex-wrap gap-2 focus-within:ring-1 transition-all min-h-[42px] ${containerBorder}`}
                onClick={() => wrapperRef.current?.querySelector('input')?.focus()}
            >
                {value.map((tag, i) => {
                    const isInvalid = invalidTags.includes(tag);
                    const isWarn = !isInvalid && warnTags.includes(tag);

                    return (
                        <span
                            key={i}
                            title={isInvalid ? "Error — will crash Xray" : isWarn ? "Style lint — works but convention is lowercase" : "Click to view contents"}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onTagClick) onTagClick(prefix + tag);
                            }}
                            className={`px-2 py-1 rounded text-xs font-mono flex items-center gap-1 border transition-colors cursor-pointer hover:ring-1 hover:ring-indigo-500 ${isInvalid
                                    ? 'bg-rose-900/40 border-rose-500/70 text-rose-200'
                                    : isWarn
                                        ? 'bg-amber-900/30 border-amber-500/50 text-amber-200'
                                        : 'bg-slate-800 border-slate-700 text-slate-200'
                                }`}
                        >
                            {isInvalid && <Icon name="WarningOctagon" weight="fill" className="text-rose-400 text-[10px]" />}
                            {isWarn && <Icon name="Warning" weight="fill" className="text-amber-400 text-[10px]" />}
                            {tag}
                            <button
                                onClick={e => { e.stopPropagation(); removeTag(tag); }}
                                className={
                                    isInvalid ? 'hover:text-red-300 text-rose-400'
                                        : isWarn ? 'hover:text-amber-100 text-amber-400'
                                            : 'hover:text-red-400 text-slate-400'
                                }
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
                        onPaste={handlePaste}
                        onFocus={() => setShowSuggest(true)}
                        placeholder={placeholder}
                        enterKeyHint="done"
                        inputMode="text"
                        autoComplete="off"
                    />
                    {showSuggest && input && filteredSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 mt-2 w-full min-w-[200px] bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto custom-scroll">
                            {filteredSuggestions.map(s => (
                                <button
                                    key={s.code}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-600 hover:text-white text-slate-300 flex justify-between group"
                                    onClick={() => processAndAddTags(`${prefix}${s.code}`)}
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