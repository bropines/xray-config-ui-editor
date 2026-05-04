import React from 'react';
import { Icon } from './Icon';

export type ButtonVariant = 'primary' | 'success' | 'danger' | 'secondary' | 'ghost' | 'warning';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: string;
    iconWeight?: 'regular' | 'bold' | 'fill' | 'duotone';
    loading?: boolean;
    children?: React.ReactNode;
}

const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-2 py-1.5 text-xs gap-1.5',
    md: 'px-3 py-2.5 text-sm gap-2',
    lg: 'px-4 py-3 text-base gap-2.5',
};

const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/10 hover:ring-white/20',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 ring-1 ring-white/10 hover:ring-white/20',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/10 ring-1 ring-white/10 hover:ring-white/20',
    warning: 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/10',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/50 hover:border-slate-600 shadow-lg ring-1 ring-white/5',
    ghost: 'bg-transparent hover:bg-white/5 text-slate-400 hover:text-white',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'primary',
            size = 'md',
            icon,
            iconWeight = 'regular',
            loading = false,
            children,
            className = '',
            disabled,
            ...rest
        },
        ref,
    ) => {
        const base =
            'inline-flex items-center justify-center rounded-lg font-bold transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900';

        return (
            <button
                ref={ref}
                disabled={disabled || loading}
                className={`${base} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
                {...rest}
            >
                {loading ? (
                    <Icon name="CircleNotch" className="animate-spin" />
                ) : (
                    icon && <Icon name={icon} weight={iconWeight} />
                )}
                {children}
            </button>
        );
    },
);

Button.displayName = 'Button';