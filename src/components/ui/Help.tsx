import React from 'react';
import { Icon } from './Icon';

interface HelpProps {
    children: React.ReactNode;
    position?: 'top' | 'bottom';
}

export const Help = ({ children, position = 'top' }: HelpProps) => {
    return (
        <div className="group relative inline-flex items-center ml-1.5 align-middle cursor-help">
            {/* Иконка вопроса */}
            <Icon 
                name="Question" 
                className="text-slate-500 hover:text-indigo-400 transition-colors text-[14px]" 
                weight="bold" 
            />

            {/* Всплывашка */}
            <div className={`
                absolute left-1/2 -translate-x-1/2 w-56 p-2.5 
                bg-slate-800 border border-slate-600 rounded-xl shadow-2xl 
                text-[11px] text-slate-200 font-medium normal-case tracking-normal leading-relaxed
                opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                transition-all duration-200 z-[100] pointer-events-none text-center
                ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}
            `}>
                <div className="relative z-10">{children}</div>
                
                {/* Стрелочка */}
                <div className={`
                    absolute left-1/2 -translate-x-1/2 border-4 border-transparent
                    ${position === 'top' ? 'top-full border-t-slate-600' : 'bottom-full border-b-slate-600'}
                `}></div>
            </div>
        </div>
    );
};
