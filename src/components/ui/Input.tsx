import React from 'react';
import { cn } from './Button';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string | boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "bg-slate-950 border border-slate-700/80 text-slate-100 px-4 py-2.5 rounded-xl text-sm font-medium transition-all outline-none placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 w-full",
          error && "border-rose-500 bg-rose-500/5 focus:border-rose-400 focus:ring-rose-500/10",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
