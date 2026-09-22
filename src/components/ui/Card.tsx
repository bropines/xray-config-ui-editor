import React from 'react';
import { Icon } from './Icon';
import { cn } from '../../utils/cn';

interface CardProps {
    title?: string;
    icon?: string;
    children: React.ReactNode;
    className?: string;
    headerExtra?: React.ReactNode;
    /** Alias kept because three call sites already use this name. */
    action?: React.ReactNode;
}

export const Card = ({ title, icon, children, className = "", headerExtra, action }: CardProps) => {
    return (
        <div className={cn('bg-slate-900/50 p-4 rounded-xl border border-slate-800 transition-all hover:border-slate-700/50', className)}>
            {(title || icon || headerExtra || action) && (
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        {icon && <Icon name={icon} className="text-indigo-400" />}
                        {title}
                    </h4>
                    {headerExtra ?? action}
                </div>
            )}
            <div className="space-y-4">
                {children}
            </div>
        </div>
    );
};
