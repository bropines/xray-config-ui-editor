import React from 'react';
import { cn } from './Button';
import { Icon } from './Icon';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string | boolean;
  children: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div className="relative group/select w-full">
        <select
          ref={ref}
          className={cn(
            "bg-slate-950 border border-slate-700/80 text-slate-100 px-4 py-2.5 rounded-xl text-sm font-bold transition-all outline-none cursor-pointer appearance-none w-full pr-10 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10",
            error && "border-rose-500 bg-rose-500/5 focus:border-rose-400 focus:ring-rose-500/10",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 group-hover/select:text-indigo-400 transition-colors">
          <Icon name="CaretDown" weight="bold" />
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';
