import React from 'react';
import { Icon } from '../../ui/Icon';
import { JsonField } from '../../ui/JsonField';

export const BalancerEditor = ({ balancer, onChange, outboundTags, rawMode }) => {
    if (!balancer) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 h-full">
                <Icon name="Scales" className="text-6xl mb-4 opacity-10" />
                <p>Select a balancer to configure</p>
            </div>
        );
    }

    // Исправление: w-full вместо w-0
    if (rawMode) {
        return (
            <div className="flex-1 w-full h-full p-4 bg-slate-950">
                <JsonField label="Raw Balancer JSON" value={balancer} onChange={onChange} className="h-full"/>
            </div>
        );
    }

    const currentSelector = balancer.selector || [];

    const update = (field, val) => {
        onChange({ ...balancer, [field]: val });
    };

    const toggleSelector = (tag) => {
        const index = currentSelector.indexOf(tag);
        if (index > -1) {
            const newSel = [...currentSelector];
            newSel.splice(index, 1);
            update('selector', newSel);
        } else {
            update('selector', [...currentSelector, tag]);
        }
    };

    const checkMatch = (tag) => {
        const exact = currentSelector.includes(tag);
        const prefix = currentSelector.find(s => tag.startsWith(s) && tag !== s);
        return { exact, prefix };
    };

    return (
        <div className="flex-1 w-full overflow-y-auto custom-scroll p-6 space-y-6 bg-slate-950/30 h-full">
            {/* Добавляем КРИТИЧЕСКОЕ ПРЕДУПРЕЖДЕНИЕ в самом верху */}
            {balancer.selector?.length === 0 && (
                <div className="p-4 rounded-xl bg-rose-900/20 border border-rose-500/50 text-rose-200 flex gap-3 items-start animate-pulse">
                    <Icon name="WarningOctagon" className="mt-1 shrink-0 text-xl" weight="fill" />
                    <div>
                        <strong className="block text-sm">Empty Selector!</strong>
                        <p className="text-xs opacity-80">Xray node will crash if you push a balancer without target outbounds. Select at least one tag below.</p>
                    </div>
                </div>
            )}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 grid grid-cols-2 gap-4">
                <div>
                    <label className="label-xs">Balancer Tag</label>
                    <input className="input-base font-bold font-mono" value={balancer.tag} onChange={e => update('tag', e.target.value)} />
                </div>
                <div>
                    <label className="label-xs">Strategy</label>
                    <select className="input-base font-mono" 
                        value={balancer.strategy?.type || "random"} 
                        // Исправлено: сохраняем остальные поля strategy (если они есть), меняем только type
                        onChange={e => update('strategy', { ...balancer.strategy, type: e.target.value })}>
                        <option value="random">Random</option>
                        <option value="roundRobin">Round Robin</option>
                        <option value="leastPing">Least Ping</option>
                        <option value="leastLoad">Least Load</option> {/* Добавлено */}
                    </select>
                </div>
            </div>

            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <label className="label-xs block">Target Outbounds</label>
                        <span className="text-[10px] text-slate-500">Xray matches by prefix.</span>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto custom-scroll">
                    {outboundTags.map(tag => {
                        const { exact, prefix } = checkMatch(tag);
                        return (
                            <div key={tag} onClick={() => toggleSelector(tag)} 
                                className={`cursor-pointer px-3 py-2 rounded-lg border text-xs font-mono flex justify-between items-center transition-all select-none
                                ${exact ? 'bg-purple-600 border-purple-500 text-white' : (prefix ? 'bg-purple-900/30 border-purple-500/60 text-purple-200' : 'bg-slate-950 border-slate-700 text-slate-400')}`}
                            >
                                <span className="truncate">{tag}</span>
                                {exact && <Icon name="CheckCircle" className="text-white shrink-0 ml-2"/>}
                                {prefix && <Icon name="GitMerge" className="text-purple-400 shrink-0 ml-2" />}
                            </div>
                        )
                    })}
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-800">
                    <label className="label-xs">Add Prefix / Selector</label>
                    <div className="flex gap-2 items-center">
                        <input className="flex-1 input-base text-xs font-mono" 
                            placeholder="e.g. 'NEO-asia' (will match all NEO-asia-*)" 
                            onKeyDown={e => {
                                if(e.key === 'Enter') {
                                    const val = e.currentTarget.value.trim();
                                    if(val && !currentSelector.includes(val)) {
                                        update('selector', [...currentSelector, val]);
                                        e.currentTarget.value = '';
                                    }
                                }
                            }}
                        />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {currentSelector.map(sel => (
                            <span key={sel} className="text-[10px] px-2 py-1 rounded border flex items-center gap-1 bg-purple-900/50 border-purple-800 text-purple-300">
                                {sel}
                                <button onClick={() => update('selector', currentSelector.filter(s => s !== sel))} className="hover:text-white ml-1">×</button>
                            </span>
                        ))}
                    </div>
                </div>
            </div>
            
            {(balancer.strategy?.type === 'leastPing' || balancer.strategy?.type === 'leastLoad') && (
                <div className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-700/50 text-xs text-yellow-200 flex gap-2 items-start">
                    <Icon name="Warning" className="mt-0.5 shrink-0" weight="fill" />
                    <div>
                        <strong>Observatory Required:</strong> For "{balancer.strategy.type}" to work, you must configure <b>Observatory</b> in Settings and ensure the selector matches these outbounds.
                    </div>
                </div>
            )}
        </div>
    );
};