import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon';
import { cn } from '../../utils/cn';

export type TimeUnit = 'ms' | 's' | 'm' | 'h';

export interface DurationInputProps {
    value: string | number | undefined | null;
    onChange: (value: any) => void;
    placeholder?: string;
    className?: string;
    unitOptions?: TimeUnit[];
    defaultUnit?: TimeUnit;
    mode?: 'string' | 'number';
    baseUnit?: TimeUnit;
    min?: number;
    max?: number;
    disabled?: boolean;
}

const UNIT_LABELS: Record<TimeUnit, { short: string; label: string }> = {
    ms: { short: 'ms', label: 'Milliseconds' },
    s: { short: 's', label: 'Seconds' },
    m: { short: 'm', label: 'Minutes' },
    h: { short: 'h', label: 'Hours' }
};

const TO_SECONDS: Record<TimeUnit, number> = {
    ms: 0.001,
    s: 1,
    m: 60,
    h: 3600
};

export function parseDuration(raw: string | number | undefined | null, fallbackUnit: TimeUnit = 's'): { amount: string; unit: TimeUnit } {
    if (raw === undefined || raw === null || raw === '') {
        return { amount: '', unit: fallbackUnit };
    }
    const str = String(raw).trim();
    const match = str.match(/^([+-]?\d+(?:\.\d+)?)\s*(ms|s|m|h)?$/i);
    if (match) {
        const numStr = match[1];
        const unitStr = (match[2]?.toLowerCase() as TimeUnit) || fallbackUnit;
        return { amount: numStr, unit: unitStr };
    }
    return { amount: str, unit: fallbackUnit };
}

export const DurationInput: React.FC<DurationInputProps> = ({
    value,
    onChange,
    placeholder = 'e.g. 1',
    className = '',
    unitOptions = ['ms', 's', 'm', 'h'],
    defaultUnit = 's',
    mode = 'string',
    baseUnit = 's',
    min,
    max,
    disabled = false
}) => {
    const { amount: parsedAmount, unit: parsedUnit } = parseDuration(value, defaultUnit);
    const [selectedUnit, setSelectedUnit] = useState<TimeUnit>(
        unitOptions.includes(parsedUnit) ? parsedUnit : defaultUnit
    );
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Keep internal unit in sync if value specifies a different valid unit
    useEffect(() => {
        if (value !== undefined && value !== null && value !== '') {
            const { unit } = parseDuration(value, defaultUnit);
            if (unitOptions.includes(unit)) {
                setSelectedUnit(unit);
            }
        }
    }, [value, defaultUnit, unitOptions]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(e.target as Node)
            ) {
                setIsDropdownOpen(false);
            }
        };
        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDropdownOpen]);

    const emitValue = (amt: string, unit: TimeUnit) => {
        if (amt === '') {
            onChange(undefined);
            return;
        }

        const num = Number(amt);
        if (isNaN(num)) {
            onChange(amt);
            return;
        }

        if (mode === 'string') {
            onChange(`${amt}${unit}`);
        } else {
            // mode === 'number': convert from selected unit to baseUnit
            const baseFactor = TO_SECONDS[baseUnit];
            const currentFactor = TO_SECONDS[unit];
            const inBase = (num * currentFactor) / baseFactor;
            // Round to avoid floating point imprecision when whole numbers are expected
            const rounded = Math.round(inBase * 1000000) / 1000000;
            onChange(rounded);
        }
    };

    const handleAmountChange = (raw: string) => {
        // Check if user pasted/typed a string with unit e.g. "500ms" or "2m"
        const match = raw.match(/^([+-]?\d+(?:\.\d+)?)\s*(ms|s|m|h)?$/i);
        if (match && match[2]) {
            const numPart = match[1];
            const unitPart = match[2].toLowerCase() as TimeUnit;
            if (unitOptions.includes(unitPart)) {
                setSelectedUnit(unitPart);
                emitValue(numPart, unitPart);
                return;
            }
        }

        // Just numeric or empty
        const cleaned = raw.replace(/[^0-9.]/g, '');
        emitValue(cleaned, selectedUnit);
    };

    const handleUnitSelect = (newUnit: TimeUnit) => {
        setSelectedUnit(newUnit);
        setIsDropdownOpen(false);
        if (parsedAmount !== '') {
            emitValue(parsedAmount, newUnit);
        }
    };

    const handleIncrement = () => {
        const current = parsedAmount !== '' ? Number(parsedAmount) : 0;
        const next = current + 1;
        if (max !== undefined && next > max) return;
        emitValue(String(next), selectedUnit);
    };

    const handleDecrement = () => {
        const current = parsedAmount !== '' ? Number(parsedAmount) : 0;
        const next = current - 1;
        if (min !== undefined && next < min) return;
        if (next < 0 && (min === undefined || min >= 0)) return;
        emitValue(String(next), selectedUnit);
    };

    return (
        <div className={cn('relative flex items-center w-full', className)}>
            {/* Numeric input */}
            <input
                type="text"
                inputMode="decimal"
                className="input-base font-mono pr-24 w-full"
                placeholder={placeholder}
                value={parsedAmount}
                disabled={disabled}
                onChange={e => handleAmountChange(e.target.value)}
            />

            {/* Stepper buttons (Up/Down) */}
            <div className="absolute right-14 flex flex-col h-[34px] justify-between border-l border-slate-800/80 pl-1.5 pr-1.5 select-none">
                <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={disabled}
                    className="text-slate-500 hover:text-indigo-400 active:text-indigo-500 transition-colors cursor-pointer flex items-center justify-center h-[14px] disabled:opacity-30"
                >
                    <Icon name="CaretUp" weight="bold" className="text-[10px]" />
                </button>
                <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={disabled}
                    className="text-slate-500 hover:text-indigo-400 active:text-indigo-500 transition-colors cursor-pointer flex items-center justify-center h-[14px] disabled:opacity-30"
                >
                    <Icon name="CaretDown" weight="bold" className="text-[10px]" />
                </button>
            </div>

            {/* Unit Dropdown Trigger */}
            <div className="absolute right-1 h-[34px] flex items-center border-l border-slate-800/80 pl-1">
                <button
                    ref={buttonRef}
                    type="button"
                    disabled={disabled}
                    onClick={() => setIsDropdownOpen(prev => !prev)}
                    className="px-2 h-[30px] rounded-md flex items-center gap-1 text-xs font-mono font-bold text-indigo-400 hover:text-indigo-300 hover:bg-slate-800/80 active:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40"
                    title="Select time unit"
                >
                    <span>{selectedUnit}</span>
                    <Icon
                        name="CaretDown"
                        weight="bold"
                        className={cn('text-[10px] text-slate-400 transition-transform duration-200', isDropdownOpen && 'rotate-180 text-indigo-400')}
                    />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                    <div
                        ref={dropdownRef}
                        className="absolute right-0 top-full mt-1.5 z-50 bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl overflow-hidden py-1 w-36 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
                    >
                        <div className="px-2.5 py-1 text-[9px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-800 mb-1">
                            Time Unit
                        </div>
                        {unitOptions.map(u => {
                            const isSelected = u === selectedUnit;
                            return (
                                <button
                                    key={u}
                                    type="button"
                                    onClick={() => handleUnitSelect(u)}
                                    className={cn(
                                        'w-full px-3 py-1.5 text-left text-xs font-mono flex items-center justify-between transition-colors',
                                        isSelected
                                            ? 'bg-indigo-600/30 text-indigo-300 font-bold'
                                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                    )}
                                >
                                    <span>
                                        <b className="font-bold">{u}</b> <span className="text-[10px] opacity-60 font-sans">({UNIT_LABELS[u].label})</span>
                                    </span>
                                    {isSelected && <Icon name="Check" weight="bold" className="text-indigo-400 text-xs" />}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
