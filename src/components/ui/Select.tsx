import React from 'react';
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
    placeholder,
    disabled = false,
    className = '',
    id,
}: SelectProps<T>) {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const border = error
        ? 'border-rose-500/70 focus:border-rose-500'
        : 'border-slate-700 focus:border-indigo-500';

    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && (
                <label
                    htmlFor={selectId}
                    className="text-[10px] uppercase text-slate-500 font-bold tracking-widest"
                >
                    {label}
                </label>
            )}
            <div className="relative">
                <select
                    id={selectId}
                    value={value}
                    onChange={(e) => onChange(e.target.value as T)}
                    disabled={disabled}
                    className={`
                        w-full bg-slate-950 border rounded-lg outline-none
                        text-white py-2 pl-3 pr-9 text-sm
                        appearance-none cursor-pointer
                        focus:ring-1 focus:ring-indigo-500/30 transition-all
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${border}
                    `}
                >
                    {placeholder && (
                        <option value="" disabled>
                            {placeholder}
                        </option>
                    )}
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <Icon
                    name="CaretDown"
                    weight="bold"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-xs"
                />
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
