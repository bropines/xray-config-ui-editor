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
    suggestions: Suggestion[]; // Данные от воркера
    prefix: string; // "geosite:" или "geoip:"
    placeholder?: string;
    isLoading?: boolean;
}

export const SmartTagInput = ({ label, value = [], onChange, suggestions, prefix, placeholder, isLoading }: SmartTagInputProps) => {
    const [input, setInput] = useState("");
    const [showSuggest, setShowSuggest] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Фильтрация подсказок
    const filteredSuggestions = input
        ? suggestions.filter(s => s.code.toLowerCase().includes(input.toLowerCase().replace(prefix, ""))).slice(0, 10)
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
            e.preventDefault(); // Останавливаем переход к следующему полю
            e.stopPropagation();
            addTag(input);
        }
        if (e.key === 'Backspace' && !input && value.length > 0) {
            removeTag(value[value.length - 1]);
        }
    };

    // Закрытие дропдауна при клике вне
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggest(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="flex flex-col gap-2" ref={wrapperRef}>
            <label className="text-xs uppercase font-bold text-slate-500 flex justify-between items-center">
                {label}
                {isLoading && <span className="text-indigo-400 flex items-center gap-1"><Icon name="spinner" className="animate-spin" /> Loading DB...</span>}
            </label>

            <div
                className="bg-slate-950 border border-slate-700 rounded-lg p-2 flex flex-wrap gap-2 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all min-h-[42px]"
                onClick={() => wrapperRef.current?.querySelector('input')?.focus()}
            >
                {value.map((tag, i) => (
                    <span key={i} className="bg-slate-800 text-slate-200 px-2 py-1 rounded text-xs font-mono flex items-center gap-1 border border-slate-700">
                        {tag}
                        <button onClick={(e) => { e.stopPropagation(); removeTag(tag); }} className="hover:text-red-400"><Icon name="x" /></button>
                    </span>
                ))}

                <div className="relative flex-1 min-w-[120px]">
                    <input
                        className="bg-transparent outline-none text-sm text-white w-full h-full font-mono placeholder:text-slate-600"
                        value={input}
                        onChange={e => { setInput(e.target.value); setShowSuggest(true); }}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setShowSuggest(true)}
                        placeholder={placeholder}
                        enterKeyHint="done" // Меняет иконку на клавиатуре на "Готово" или "Enter"
                        inputMode="text"
                        autoComplete="off"
                    />

                    {/* Autocomplete Dropdown */}
                    {showSuggest && input && filteredSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 mt-2 w-full min-w-[200px] bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto custom-scroll">
                            {filteredSuggestions.map((s) => (
                                <button
                                    key={s.code}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-600 hover:text-white text-slate-300 flex justify-between group"
                                    onClick={() => addTag(`${prefix}${s.code}`)}
                                >
                                    <span className="font-bold">{prefix}<span className="text-white group-hover:text-white">{s.code}</span></span>
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