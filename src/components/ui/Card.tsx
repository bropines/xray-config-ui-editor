import React from 'react';
import { Icon } from './Icon';

interface CardProps {
    title?: string;
    icon?: string;
    children: React.ReactNode;
    className?: string;
    headerExtra?: React.ReactNode;
}

export const Card = ({ title, icon, children, className = "", headerExtra }: CardProps) => {
    return (
        <div className={`bg-slate-900/50 p-4 rounded-xl border border-slate-800 transition-all hover:border-slate-700/50 ${className}`}>
            {(title || icon || headerExtra) && (
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        {icon && <Icon name={icon} className="text-indigo-400" />}
                        {title}
                    </h4>
                    {headerExtra}
                </div>
            )}
            <div className="space-y-4">
                {children}
            </div>
        </div>
    );
};
