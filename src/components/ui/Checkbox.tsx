import React from 'react';
import { Icon } from './Icon';

export interface CheckboxProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: React.ReactNode;
    description?: string;
    disabled?: boolean;
    indeterminate?: boolean;
    id?: string;
    className?: string;
}

/**
 * Checkbox — renders as a styled square with checkmark.
 * For toggle/switch style, use the Switch component instead.
 */
export const Checkbox = ({
    checked,
    onChange,
    label,
    description,
    disabled = false,
    indeterminate = false,
    id,
    className = '',
}: CheckboxProps) => {
    const checkboxId = id ?? (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
        <label
            htmlFor={checkboxId}
            className={`flex items-start gap-3 cursor-pointer group select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        >
            {/* Custom checkbox box */}
            <div className="relative mt-0.5 shrink-0">
                <input
                    type="checkbox"
                    id={checkboxId}
                    checked={checked}
                    ref={(el) => {
                        if (el) el.indeterminate = indeterminate;
                    }}
                    onChange={(e) => !disabled && onChange(e.target.checked)}
                    disabled={disabled}
                    className="sr-only"
                />
                <div
                    className={`
                        w-4.5 h-4.5 w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-all duration-150
                        ${checked || indeterminate
                            ? 'bg-indigo-600 border-indigo-600'
                            : 'bg-slate-900 border-slate-600 group-hover:border-indigo-500'}
                    `}
                >
                    {indeterminate ? (
                        <span className="w-2.5 h-0.5 bg-white rounded-full" />
                    ) : checked ? (
                        <Icon name="Check" weight="bold" className="text-white text-[11px]" />
                    ) : null}
                </div>
            </div>

            {/* Labels */}
            {(label || description) && (
                <div className="flex flex-col gap-0.5">
                    {label && (
                        <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors uppercase tracking-wider">
                            {label}
                        </span>
                    )}
                    {description && (
                        <span className="text-[10px] text-slate-500 font-normal normal-case tracking-normal">
                            {description}
                        </span>
                    )}
                </div>
            )}
        </label>
    );
};
