import React from 'react';
import { Icon } from './Icon';

export const Button = ({ onClick, children, variant = "primary", className = "", title = "", icon = null }) => {
  const base = "flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const styles = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20",
    success: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20",
    danger: "bg-rose-600 hover:bg-rose-500 text-white",
    secondary: "bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600",
    ghost: "bg-transparent hover:bg-slate-700/50 text-slate-400 hover:text-white"
  };
  return (
    <button onClick={onClick} className={`${base} ${styles[variant]} ${className}`} title={title}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
};