import React from 'react';
import { Help } from './Help';
import { cn } from './Button';

interface FormFieldProps {
    label: string;
    help?: string;
    error?: string;
    children: React.ReactNode;
    className?: string;
    horizontal?: boolean;
}

export const FormField = ({ label, help, error, children, className = "", horizontal = false }: FormFieldProps) => {
    if (horizontal) {
        return (
            <div className={cn("flex items-center justify-between gap-4 py-1.5", className)}>
                <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-300 font-bold uppercase tracking-wider cursor-pointer select-none">
                        {label}
                    </label>
                    {help && <Help>{help}</Help>}
                </div>
                <div className="flex flex-col items-end min-w-0">
                    {children}
                    {error && (
                        <span className="text-[10px] text-rose-400 mt-1 font-bold animate-in fade-in slide-in-from-top-1">
                            {error}
                        </span>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col gap-2", className)}>
            <div className="flex items-center justify-between px-0.5">
                <div className="flex items-center gap-2">
                    <label className="text-[10px] uppercase text-slate-400 font-black tracking-widest select-none">
                        {label}
                    </label>
                    {help && <Help>{help}</Help>}
                </div>
                {error && (
                    <span className="text-[10px] text-rose-400 font-bold animate-in fade-in slide-in-from-right-1">
                        {error}
                    </span>
                )}
            </div>
            <div className="relative group">
                {children}
            </div>
        </div>
    );
};
