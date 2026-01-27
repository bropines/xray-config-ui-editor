import React from 'react';
import { Icon } from '../../ui/Icon';

export const BalancerList = ({ balancers, activeIndex, onSelect, onDelete }) => {
    return (
        <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1">
            {balancers.map((b, i) => (
                <div key={i} onClick={() => onSelect(i)} 
                    className={`p-3 rounded-lg cursor-pointer text-xs flex justify-between items-center group border transition-all mb-1
                    ${activeIndex === i ? 'bg-purple-600/20 border-purple-500/50' : 'hover:bg-slate-900 border-transparent'}`}>
                    <div>
                        <div className={`font-bold ${activeIndex === i ? 'text-white' : 'text-slate-300'}`}>{b.tag}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Strategy: {b.strategy?.type || 'random'}</div>
                    </div>
                    {/* Кнопка теперь всегда видна и увеличена */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(i); }} 
                        className="text-slate-600 hover:text-rose-400 p-2 rounded-md hover:bg-rose-500/10 transition-colors"
                        title="Delete Balancer"
                    >
                        <Icon name="Trash" className="text-lg" />
                    </button>
                </div>
            ))}
        </div>
    );
};