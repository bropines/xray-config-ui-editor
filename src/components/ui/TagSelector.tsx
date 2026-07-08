import React, { useState } from 'react';
import { Icon } from './Icon';

interface TagSelectorProps {
    availableTags: string[];
    selected: string | string[]; // Может быть одной строкой или массивом строк
    onChange: (val: string | string[]) => void;
    multi?: boolean; // Режим множественного выбора
    placeholder?: string;
    label?: React.ReactNode;
}

export const TagSelector = ({ availableTags, selected, onChange, multi = false, placeholder = "Custom...", label }: TagSelectorProps) => {
    const [searchQuery, setSearchQuery] = useState("");

    const isSelected = (tag: string) => {
        if (multi && Array.isArray(selected)) return selected.includes(tag);
        return selected === tag;
    };

    const handleClick = (tag: string) => {
        if (multi && Array.isArray(selected)) {
            // Toggle logic for array
            if (selected.includes(tag)) onChange(selected.filter(t => t !== tag));
            else onChange([...selected, tag]);
        } else {
            // Single select logic
            onChange(tag);
        }
    };

    // Custom input handler
    const handleCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!multi) onChange(e.target.value);
    };

    const filteredTags = availableTags.filter(tag =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col gap-2">
            {label && <label className="text-xs uppercase font-bold text-slate-500">{label}</label>}
            <div className="bg-slate-950 border border-slate-700 rounded-lg p-2 min-h-[42px]">
                {availableTags.length > 5 && (
                    <div className="relative mb-2">
                        <Icon name="MagnifyingGlass" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
                        <input
                            className="w-full bg-slate-900 border border-slate-800 rounded-md pl-8 pr-6 py-1 text-[11px] text-white outline-none focus:border-indigo-500/50 transition-colors"
                            placeholder="Filter tags..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs font-mono"
                            >
                                ×
                            </button>
                        )}
                    </div>
                )}

                <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto custom-scroll">
                    {filteredTags.map(tag => {
                        const active = isSelected(tag);
                        const radius = multi ? 'rounded-md' : 'rounded-full';
                        
                        return (
                            <button
                                type="button"
                                key={tag}
                                onClick={() => handleClick(tag)}
                                className={`px-4 py-1.5 ${radius} text-xs font-mono border transition-all duration-200 ${
                                    active
                                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20 font-bold'
                                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                                }`}
                            >
                                {tag}
                            </button>
                        );
                    })}
                    {filteredTags.length === 0 && (
                        <span className="text-xs text-slate-600 italic px-2 py-1">No matches found</span>
                    )}
                </div>
                
                {/* Custom Input area only for single select mode mostly, or if needed */}
                {!multi && (
                    <div className="mt-2 pt-2 border-t border-slate-800">
                        <input 
                            className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-700 font-mono"
                            placeholder={placeholder}
                            value={typeof selected === 'string' ? selected : ''}
                            onChange={handleCustomInput}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};