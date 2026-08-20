import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';

interface ExtendedSectionProps {
    title?: string;
    description?: string;
    badgeText?: string;
    activeCount?: number;
    defaultOpen?: boolean;
    hasActiveValues?: boolean;
    children: React.ReactNode;
    className?: string;
}

export const ExtendedSection: React.FC<ExtendedSectionProps> = ({
    title = "Extended / Experimental Settings",
    description = "Advanced parameters, kernel optimizations and low-level protocol tweaks.",
    badgeText = "Advanced",
    activeCount,
    defaultOpen = false,
    hasActiveValues = false,
    children,
    className = ""
}) => {
    const shouldDefaultOpen = defaultOpen || hasActiveValues || (activeCount !== undefined && activeCount > 0);
    const [isOpen, setIsOpen] = useState(shouldDefaultOpen);

    useEffect(() => {
        if (hasActiveValues || (activeCount !== undefined && activeCount > 0)) {
            setIsOpen(true);
        }
    }, [hasActiveValues, activeCount]);

    return (
        <div className={`border border-slate-800/80 bg-slate-950/40 rounded-xl overflow-hidden transition-all duration-200 ${isOpen ? 'ring-1 ring-indigo-500/20' : 'hover:border-slate-700/80'} ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3.5 text-left select-none cursor-pointer bg-slate-900/40 hover:bg-slate-900/80 transition-colors"
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="text-indigo-400 shrink-0">
                        <Icon name="Sliders" className="text-sm" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-slate-200">{title}</span>
                            {badgeText && (
                                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                    {badgeText}
                                </span>
                            )}
                            {activeCount !== undefined && activeCount > 0 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-in fade-in">
                                    {activeCount} active
                                </span>
                            )}
                        </div>
                        {description && (
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">{description}</p>
                        )}
                    </div>
                </div>
                <div className={`text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${isOpen ? 'rotate-180 text-indigo-400' : ''}`}>
                    <Icon name="CaretDown" className="text-sm" />
                </div>
            </button>

            {isOpen && (
                <div className="p-4 border-t border-slate-800/60 animate-in fade-in slide-in-from-top-1 duration-200 space-y-4">
                    {children}
                </div>
            )}
        </div>
    );
};
