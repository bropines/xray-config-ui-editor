import React from 'react';
import { Icon } from '../../ui/Icon';

// Убрали проп onAdd
export const BalancerList = ({ balancers, activeIndex, onSelect, onDelete }) => {
    return (
        // Убрали ширину и бордеры, оставили только контейнер скролла
        <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1">
            {balancers.map((b, i) => (
                <div key={i} onClick={() => onSelect(i)} 
                    className={`p-3 rounded-lg cursor-pointer text-xs flex justify-between items-center group border transition-all mb-1
                    ${activeIndex === i ? 'bg-purple-600/20 border-purple-500/50' : 'hover:bg-slate-900 border-transparent'}`}>
                    <div>
                        <div className={`font-bold ${activeIndex === i ? 'text-white' : 'text-slate-300'}`}>{b.tag}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Strategy: {b.strategy?.type || 'random'}</div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(i); }} className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition-colors">
                        <Icon name="Trash" />
                    </button>
                </div>
            ))}
        </div>
    );
};