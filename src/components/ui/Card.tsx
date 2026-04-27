import React from 'react';
import { Icon } from './Icon';
import { cn } from './Button';

interface CardProps {
    title?: string;
    icon?: string;
    iconColor?: string;
    children: React.ReactNode;
    className?: string;
    actions?: React.ReactNode;
    variant?: 'default' | 'column';
}

export const Card = ({ 
    title, 
    icon, 
    iconColor = "bg-indigo-600", 
    children, 
    className = "", 
    actions,
    variant = 'default' 
}: CardProps) => {
    if (variant === 'column') {
        return (
            <div className={cn(
                "bg-slate-800 border border-slate-700/60 rounded-[2rem] flex flex-col hover:border-slate-600 transition-all duration-500 shadow-2xl overflow-hidden group/card",
                className
            )}>
                {/* Column Header */}
                <div className="flex justify-between items-center p-5 border-b border-slate-700/50 bg-slate-800/40 shrink-0 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                        {icon && (
                            <div className={cn(
                                "p-3 rounded-2xl text-white shadow-2xl transition-all group-hover/card:scale-110 group-hover/card:rotate-3 duration-500", 
                                iconColor
                            )}>
                                <Icon name={icon} className="text-2xl" weight="fill" />
                            </div>
                        )}
                        <h2 className="text-xl font-black text-slate-100 tracking-tight uppercase">{title}</h2>
                    </div>
                    <div className="flex items-center gap-2">{actions}</div>
                </div>
                
                {/* Column Content */}
                <div className="flex-1 p-5 space-y-3.5 overflow-y-auto custom-scroll bg-slate-950/40 min-h-0">
                    {children}
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "bg-slate-800/50 backdrop-blur-md p-6 rounded-[1.5rem] border border-slate-700/50 transition-all hover:border-slate-600 shadow-xl",
            className
        )}>
            {(title || icon || actions) && (
                <div className="flex justify-between items-center mb-6 px-1">
                    <h4 className="text-xs font-black text-slate-300 uppercase tracking-[0.25em] flex items-center gap-3">
                        {icon && (
                            <div className={cn("p-2 rounded-xl bg-slate-900 border border-slate-700 text-indigo-400 shadow-inner")}>
                                <Icon name={icon} weight="bold" className="text-lg" />
                            </div>
                        )}
                        {title}
                    </h4>
                    <div className="flex items-center gap-2">
                        {actions}
                    </div>
                </div>
            )}
            <div className="space-y-5">
                {children}
            </div>
        </div>
    );
};
