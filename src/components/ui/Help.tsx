import React from 'react';
import { Icon } from './Icon';

export const Help = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="group relative inline-flex items-center ml-1.5 align-text-bottom cursor-help">
            {/* Иконка вопроса */}
            <Icon 
                name="Question" 
                className="text-slate-500 hover:text-indigo-400 transition-colors text-[14px]" 
                weight="bold" 
            />

            {/* Всплывашка */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 
                          bg-slate-800 border border-slate-700 rounded-lg shadow-xl 
                          text-xs text-slate-200 font-normal normal-case tracking-normal
                          opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                          transition-all duration-200 z-50 pointer-events-none text-center">
                {children}
                
                {/* Стрелочка вниз */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 
                              border-4 border-transparent border-t-slate-700"></div>
            </div>
        </div>
    );
};