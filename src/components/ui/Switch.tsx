import React from 'react';

interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
}

export const Switch = ({ checked, onChange, label, disabled = false }: SwitchProps) => {
    return (
        <label className={`flex items-center gap-3 cursor-pointer group ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <div className="relative">
                <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={(e) => !disabled && onChange(e.target.checked)}
                />
                <div className={`w-10 h-5 rounded-full transition-colors duration-200 ${checked ? 'bg-indigo-600' : 'bg-slate-700'}`}></div>
                <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`}></div>
            </div>
            {label && <span className="text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-200 transition-colors">{label}</span>}
        </label>
    );
};
