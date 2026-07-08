import React from 'react';
import { Icon } from './Icon';

interface NumberInputProps {
    value: number | undefined | '';
    onChange: (val: number | undefined) => void;
    placeholder?: string;
    className?: string;
    min?: number;
    max?: number;
}

export const NumberInput = ({
    value,
    onChange,
    placeholder,
    className = '',
    min,
    max
}: NumberInputProps) => {
    const handleIncrement = () => {
        const currentVal = value !== undefined && value !== '' ? Number(value) : 0;
        const newVal = currentVal + 1;
        if (max !== undefined && newVal > max) return;
        onChange(newVal);
    };

    const handleDecrement = () => {
        const currentVal = value !== undefined && value !== '' ? Number(value) : 0;
        const newVal = currentVal - 1;
        if (min !== undefined && newVal < min) return;
        onChange(newVal);
    };

    const displayValue = value !== undefined && value !== null ? value : '';

    return (
        <div className={`relative flex items-center w-full ${className}`}>
            <input
                type="number"
                className="input-base pr-12 font-mono"
                placeholder={placeholder}
                value={displayValue}
                min={min}
                max={max}
                onChange={e => {
                    const raw = e.target.value;
                    if (raw === '') {
                        onChange(undefined);
                    } else {
                        const parsed = Number(raw);
                        if (!isNaN(parsed)) {
                            onChange(parsed);
                        }
                    }
                }}
            />
            <div className="absolute right-1 flex flex-col h-[34px] justify-between border-l border-slate-800/80 pl-2 pr-1.5 select-none">
                <button
                    type="button"
                    onClick={handleIncrement}
                    className="text-slate-500 hover:text-indigo-400 active:text-indigo-500 transition-colors cursor-pointer flex items-center justify-center h-[14px]"
                >
                    <Icon name="CaretUp" weight="bold" className="text-[10px]" />
                </button>
                <button
                    type="button"
                    onClick={handleDecrement}
                    className="text-slate-500 hover:text-indigo-400 active:text-indigo-500 transition-colors cursor-pointer flex items-center justify-center h-[14px]"
                >
                    <Icon name="CaretDown" weight="bold" className="text-[10px]" />
                </button>
            </div>
        </div>
    );
};
