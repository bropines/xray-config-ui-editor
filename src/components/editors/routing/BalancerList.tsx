import React from 'react';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';

export const BalancerList = ({ balancers, activeIndex, onSelect, onAdd, onDelete }) => {
    return (
        <div className="w-80 bg-slate-950 border-r border-slate-800 flex flex-col h-full shrink-0">
            <div className="p-3 border-b border-slate-800 flex justify-between bg-slate-900/50">
                <span className="text-xs font-bold text-slate-400">BALANCERS</span>
                <Button variant="ghost" icon="Plus" className="py-0 px-2 text-xs" onClick={onAdd} />
            </div>
            <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1">
                {balancers.map((b, i) => (
                    <div key={i} onClick={() => onSelect(i)} 
                        className={`p-3 rounded-lg cursor-pointer text-xs flex justify-between items-center group border transition-all
                        ${activeIndex === i ? 'bg-purple-600/20 border-purple-500/50' : 'hover:bg-slate-900 border-transparent'}`}>
                        <div>
                            <div className={`font-bold ${activeIndex === i ? 'text-white' : 'text-slate-300'}`}>{b.tag}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">Strategy: {b.strategy?.type || 'random'}</div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(i); }} className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-1">
                            <Icon name="Trash" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};