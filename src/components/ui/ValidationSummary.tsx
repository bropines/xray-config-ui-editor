import React from 'react';
import { Icon } from './Icon';
import { cn } from './Button';

interface ValidationSummaryProps {
    errors: any[];
    title?: string;
    className?: string;
}

export const ValidationSummary = ({ 
    errors, 
    title = "Validation Errors", 
    className = "" 
}: ValidationSummaryProps) => {
    if (!errors || errors.length === 0) return null;

    return (
        <div className={cn(
            "mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-200 text-xs animate-in fade-in slide-in-from-top-4 shrink-0 shadow-lg shadow-rose-500/5",
            className
        )}>
            <div className="flex items-center gap-2.5 mb-2.5 font-black uppercase tracking-widest text-[10px] text-rose-400">
                <div className="p-1 bg-rose-500/20 rounded-lg">
                    <Icon name="WarningCircle" weight="fill" className="text-sm" />
                </div>
                {title}
            </div>
            <ul className="list-disc pl-9 space-y-1 opacity-90 font-medium">
                {errors.map((err, i) => (
                    <li key={i} className="leading-relaxed">
                        {err.message || err}
                    </li>
                ))}
            </ul>
        </div>
    );
};
