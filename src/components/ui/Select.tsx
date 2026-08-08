import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
    const [searchQuery, setSearchQuery] = useState("");
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 200 });

    const selectedOption = options.find(opt => opt.value === value);

    const updateCoords = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const minWidth = Math.max(rect.width, 220);
            // Ensure dropdown doesn't go off right edge of viewport
            const left = Math.min(rect.left, window.innerWidth - minWidth - 12);
            setCoords({
                top: rect.bottom + 6,
                left: Math.max(8, left),
                width: minWidth
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updateCoords();
            const handleScrollOrResize = () => updateCoords();
            window.addEventListener('resize', handleScrollOrResize);
            window.addEventListener('scroll', handleScrollOrResize, true);
            return () => {
                window.removeEventListener('resize', handleScrollOrResize);
                window.removeEventListener('scroll', handleScrollOrResize, true);
            };
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                buttonRef.current && !buttonRef.current.contains(target) &&
                dropdownRef.current && !dropdownRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setSearchQuery("");
        }
    }, [isOpen]);

    const handleSelect = (val: T) => {
        onChange(val);
        setIsOpen(false);
    };

    const border = error
        ? 'border-rose-500/70'
        : isOpen ? 'border-indigo-500 ring-1 ring-indigo-500/20' : 'border-slate-700';

    const filteredOptions = options.filter(opt => {
        const q = searchQuery.toLowerCase();
        return (
            opt.label.toLowerCase().includes(q) ||
            opt.value.toLowerCase().includes(q) ||
            (opt.description && opt.description.toLowerCase().includes(q))
        );
    });

    const dropdownMenu = isOpen ? (
        <div
            ref={dropdownRef}
            style={{
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                width: `${coords.width}px`,
                zIndex: 99999
            }}
            className="bg-[#0f172a] border border-slate-700 rounded-xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden origin-top ring-1 ring-white/10 opacity-100 flex flex-col backdrop-blur-xl animate-in fade-in duration-150"
        >
            {options.length > 5 && (
                <div className="p-1.5 border-b border-slate-800 bg-[#0b0f19]">
                    <div className="relative">
                        <Icon name="MagnifyingGlass" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
                        <input
                            className="w-full bg-slate-900 border border-slate-700/50 rounded-md pl-8 pr-6 py-1.5 text-[11px] text-white outline-none focus:border-indigo-500/50 transition-colors"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            autoFocus
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSearchQuery("");
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs font-mono"
                            >
                                ×
                            </button>
                        )}
                    </div>
                </div>
            )}
            <div className="max-h-[260px] overflow-y-auto custom-scroll p-1.5 space-y-0.5 bg-[#0f172a] opacity-100">
                {filteredOptions.length === 0 ? (
                    <div className="p-3 text-xs text-slate-600 text-center italic">No options found</div>
                ) : (
                    filteredOptions.map((opt) => {
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
                                    <span className="font-bold text-xs truncate">{opt.label}</span>
                                    {isActive && <Icon name="Check" weight="bold" className="text-[10px] shrink-0" />}
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
    ) : null;

    return (
        <div className={`flex flex-col gap-1.5 ${className}`} id={id}>
            {label && (
                <label className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">
                    {label}
                </label>
            )}
            
            <button
                ref={buttonRef}
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
                    w-full bg-slate-950 border rounded-lg h-11
                    text-white px-3 text-xs md:text-sm flex items-center justify-between gap-1
                    transition-all duration-200 text-left min-w-0
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${border}
                `}
            >
                <span className={`truncate min-w-0 font-bold ${!selectedOption ? 'text-slate-500' : 'text-white'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <Icon
                    name="CaretDown"
                    weight="bold"
                    className={`text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-400' : ''}`}
                />
            </button>

            {typeof document !== 'undefined' && createPortal(dropdownMenu, document.body)}

            {error && (
                <span className="text-[10px] text-rose-500 font-bold animate-in fade-in">
                    {error}
                </span>
            )}
            {hint && !error && <span className="text-[10px] text-slate-600">{hint}</span>}
        </div>
    );
}
