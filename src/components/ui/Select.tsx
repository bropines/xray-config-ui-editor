import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon';

export interface SelectOption<T extends string = string> {
    value: T;
    label: string;
    description?: string;
    disabled?: boolean;
}

export interface SelectProps<T extends string = string> {
    value: T;
    onChange: (value: T) => void;
    options: SelectOption<T>[];
    label?: string;
    error?: string;
    hint?: string;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    id?: string;
}

export function Select<T extends string = string>({
    value,
    onChange,
    options,
    label,
    error,
    hint,
    placeholder = "Select option...",
    disabled = false,
    className = '',
    id,
}: SelectProps<T>) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const selectedOption = options.find(opt => opt.value === value);
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (val: T) => {
        onChange(val);
        setIsOpen(false);
    };

    const border = error
        ? 'border-rose-500/70'
        : isOpen ? 'border-indigo-500 ring-1 ring-indigo-500/20' : 'border-slate-700';

    return (
        <div className={`flex flex-col gap-1.5 ${isOpen ? 'relative z-[110]' : ''} ${className}`} ref={containerRef}>
            {label && (
                <label className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">
                    {label}
                </label>
            )}
            
            <div className="relative">
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={`
                        w-full bg-slate-950 border rounded-lg h-11
                        text-white px-4 text-sm flex items-center justify-between
                        transition-all duration-200 text-left
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${border}
                    `}
                >
                    <span className={!selectedOption ? 'text-slate-500' : 'text-white'}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <Icon
                        name="CaretDown"
                        weight="bold"
                        className={`text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                </button>

                {isOpen && (
                    <div className="absolute left-0 right-0 z-[500] mt-1.5 bg-[#0f172a] border border-slate-700 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden origin-top ring-1 ring-white/10 opacity-100">
                        <div className="max-h-[250px] overflow-y-auto custom-scroll p-1.5 space-y-0.5 bg-[#0f172a] opacity-100">
                            {options.length === 0 ? (
                                <div className="p-3 text-xs text-slate-600 text-center italic">No options</div>
                            ) : (
                                options.map((opt) => {
                                    const isActive = opt.value === value;
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => !opt.disabled && handleSelect(opt.value)}
                                            disabled={opt.disabled}
                                            className={`
                                                w-full text-left px-3 py-2 rounded-lg transition-all duration-200
                                                ${isActive 
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-400/30' 
                                                    : 'text-slate-300 hover:bg-white/5 hover:text-white'}
                                                ${opt.disabled ? 'opacity-30 cursor-not-allowed' : ''}
                                            `}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-xs">{opt.label}</span>
                                                {isActive && <Icon name="Check" weight="bold" className="text-[10px]" />}
                                            </div>
                                            {opt.description && (
                                                <div className={`text-[10px] mt-0.5 leading-tight ${isActive ? 'text-indigo-100/70' : 'text-slate-500'}`}>
                                                    {opt.description}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <span className="text-[10px] text-rose-500 font-bold animate-in fade-in">
                    {error}
                </span>
            )}
            {hint && !error && <span className="text-[10px] text-slate-600">{hint}</span>}
        </div>
    );
}
