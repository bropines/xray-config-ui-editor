import React from 'react';
import { Icon } from './Icon';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for merging Tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ButtonVariant = 'primary' | 'success' | 'danger' | 'error' | 'warning' | 'secondary' | 'ghost' | 'outline' | 'info';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconWeight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  loading?: boolean;
  as?: any;
}

export const Button = ({
  onClick,
  children,
  variant = "primary",
  size = "md",
  className = "",
  title = "",
  icon = null,
  iconWeight = "regular",
  disabled,
  loading,
  as: Component = "button",
  ...props
}: ButtonProps) => {
  
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20",
    success: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20",
    danger: "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/20",
    error: "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/20",
    warning: "bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20",
    info: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/50",
    outline: "bg-transparent border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white",
    ghost: "bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white"
  };

  // Special outline colors
  const outlineVariants: Record<string, string> = {
    info: "border-blue-500/50 text-blue-400 hover:bg-blue-500 hover:text-white hover:border-blue-500",
    secondary: "border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white hover:border-slate-600",
    success: "border-emerald-500/50 text-emerald-400 hover:bg-emerald-500 hover:text-white",
    danger: "border-rose-500/50 text-rose-400 hover:bg-rose-500 hover:text-white",
    warning: "border-amber-500/50 text-amber-400 hover:bg-amber-500 hover:text-black",
  };

  const sizes = {
    xs: "h-8 px-2 text-[10px] gap-1 rounded-lg",
    sm: "h-9 px-3 text-xs gap-1.5 rounded-xl",
    md: "h-10 px-4 text-sm gap-2 rounded-xl",
    lg: "h-12 px-6 text-base gap-2 rounded-2xl"
  };

  const isIconOnly = !children && !!icon;
  const squareStyles = isIconOnly ? {
    xs: "w-8 px-0",
    sm: "w-9 px-0",
    md: "w-10 px-0",
    lg: "w-12 px-0"
  } : {};

  const baseStyles = "inline-flex items-center justify-center font-bold transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none select-none shrink-0 cursor-pointer";

  const colorProp = (props as any).color;
  const finalVariantClass = (variant === 'outline' && colorProp && outlineVariants[colorProp]) 
    ? outlineVariants[colorProp] 
    : variants[variant];

  return (
    <Component
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        baseStyles, 
        sizes[size], 
        finalVariantClass,
        isIconOnly && squareStyles[size],
        className
      )}
      title={title}
      {...props}
    >
      {loading ? (
        <Icon name="CircleNotch" className="animate-spin" />
      ) : (
        icon && <Icon name={icon} weight={iconWeight} className={cn(!children && "text-lg")} />
      )}
      {children}
    </Component>
  );
};

export const ButtonGroup = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("flex items-center bg-slate-950/50 border border-slate-800 rounded-xl p-1 gap-1", className)}>
    {children}
  </div>
);
