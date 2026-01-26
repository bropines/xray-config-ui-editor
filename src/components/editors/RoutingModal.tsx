import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { JsonField } from '../ui/JsonField';
import { SmartTagInput } from '../ui/SmartTagInput';
import { createProtoWorker } from '../../utils/proto-worker';

// --- Helper Component: TagSelector ---
const TagSelector = ({ options, selected = [], onChange, color = "blue", single = false }) => {
    const toggle = (opt) => {
        if (single) {
            onChange(selected.includes(opt) ? [] : [opt]);
        } else {
            const newSet = new Set(selected);
            if (newSet.has(opt)) newSet.delete(opt);
            else newSet.add(opt);
            onChange(Array.from(newSet));
        }
    };

    const styles = {
        blue: "bg-blue-600 border-blue-500 text-white shadow-blue-500/20",
        purple: "bg-purple-600 border-purple-500 text-white shadow-purple-500/20",
        emerald: "bg-emerald-600 border-emerald-500 text-white shadow-emerald-500/20",
        rose: "bg-rose-600 border-rose-500 text-white shadow-rose-500/20",
    };

    return (
        <div className="flex flex-wrap gap-2">
            {options.map(opt => {
                const isActive = selected.includes(opt);
                return (
                    <button
                        key={opt}
                        onClick={() => toggle(opt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all select-none flex items-center gap-2
                            ${isActive ? `${styles[color]} shadow-lg` : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'}`}
                    >
                        {opt}
                        {isActive && <Icon name="check" className="text-[10px]" />}
                    </button>
                );
            })}
        </div>
    );
};

export const RoutingModal = ({ data, onSave, onClose, outbounds, inbounds }) => {
    // State
    const [local, setLocal] = useState(data || { domainStrategy: "AsIs", rules: [], balancers: [] });
    const [activeTab, setActiveTab] = useState<'rules' | 'balancers'>('rules');
    
    const [activeRuleIdx, setActiveRuleIdx] = useState(null);
    const [activeBalancerIdx, setActiveBalancerIdx] = useState(null);
    
    // UI Modes
    const [ruleRawMode, setRuleRawMode] = useState(false);
    const [balancerRawMode, setBalancerRawMode] = useState(false);
    
    // Drag & Drop
    const [draggedIdx, setDraggedIdx] = useState(null);

    // Geo Data
    const [geoSites, setGeoSites] = useState([]);
    const [geoIps, setGeoIps] = useState([]);
    const [loadingGeo, setLoadingGeo] = useState(false);

    useEffect(() => {
        setLoadingGeo(true);
        const worker = createProtoWorker();
        
        // Timeout safeguard (если воркер тупит больше 5 сек, убираем лоадер)
        const timeout = setTimeout(() => setLoadingGeo(false), 5000);

        worker.onmessage = (e) => {
            if (e.data.type === 'geosite') setGeoSites(e.data.data);
            if (e.data.type === 'geoip') setGeoIps(e.data.data);
            
            // Если пришли оба ответа (или ошибки), выключаем лоадер
            // Для простоты: выключаем лоадер по любому успешному ответу, так как они приходят быстро
            setLoadingGeo(false); 
        };
        worker.postMessage({ type: 'geosite' });
        worker.postMessage({ type: 'geoip' });
        return () => { worker.terminate(); clearTimeout(timeout); };
    }, []);

    // --- Helpers ---
    const outboundTags = (outbounds || []).map(o => o.tag).filter(t => t);
    const inboundTagsList = (inbounds || []).map(i => i.tag).filter(t => t);
    const balancerTags = (local.balancers || []).map(b => b.tag).filter(t => t);

    // --- Actions ---
    const addRule = () => {
        const newRules = [{ type: "field", outboundTag: outboundTags[0] || "direct", domain: [] }, ...(local.rules || [])];
        setLocal(prev => ({ ...prev, rules: newRules }));
        setActiveRuleIdx(0);
        setRuleRawMode(false);
    };

    const addBalancer = () => {
        const newBalancers = [...(local.balancers || []), { tag: "bal-" + ((local.balancers?.length || 0) + 1), selector: [], strategy: { type: "random" } }];
        setLocal(prev => ({ ...prev, balancers: newBalancers }));
        setActiveBalancerIdx(newBalancers.length - 1);
        setBalancerRawMode(false);
    };

    const deleteItem = (idx, type) => {
        if(!confirm("Удалить элемент?")) return;
        const list = [...(local[type] || [])];
        list.splice(idx, 1);
        setLocal(prev => ({ ...prev, [type]: list }));
        if (type === 'rules') setActiveRuleIdx(null);
        else setActiveBalancerIdx(null);
    };

    const moveRule = (idx, direction) => {
        const newRules = [...local.rules];
        const targetIdx = idx + direction;
        if (targetIdx < 0 || targetIdx >= newRules.length) return;
        
        [newRules[idx], newRules[targetIdx]] = [newRules[targetIdx], newRules[idx]];
        setLocal(prev => ({ ...prev, rules: newRules }));
        
        if (activeRuleIdx === idx) setActiveRuleIdx(targetIdx);
        else if (activeRuleIdx === targetIdx) setActiveRuleIdx(idx);
    };

    // --- Drag & Drop ---
    const onDragStart = (e, index) => { setDraggedIdx(index); e.dataTransfer.effectAllowed = "move"; e.currentTarget.style.opacity = '0.5'; };
    const onDragEnd = (e) => { setDraggedIdx(null); e.currentTarget.style.opacity = '1'; };
    const onDragOver = (e, index) => {
        e.preventDefault();
        if (draggedIdx === null || draggedIdx === index) return;
        const newRules = [...local.rules];
        const draggedItem = newRules[draggedIdx];
        newRules.splice(draggedIdx, 1);
        newRules.splice(index, 0, draggedItem);
        setLocal(prev => ({ ...prev, rules: newRules }));
        setDraggedIdx(index);
        if (activeRuleIdx === draggedIdx) setActiveRuleIdx(index);
        else if (activeRuleIdx === index) setActiveRuleIdx(draggedIdx);
    };

    // --- RENDERERS ---

    const renderRulesList = () => (
        <div className="w-80 bg-slate-950 border-r border-slate-800 flex flex-col h-full shrink-0">
            <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Priority List</span>
                <Button variant="ghost" className="px-2 py-1 text-[10px]" onClick={addRule} icon="plus">Add</Button>
            </div>
            <div className="overflow-y-auto custom-scroll flex-1 p-2 space-y-1">
                {local.rules?.map((rule, i) => {
                    const isBalancer = !!rule.balancerTag;
                    const target = rule.outboundTag || rule.balancerTag || "???";
                    const isActive = activeRuleIdx === i;
                    
                    return (
                        <div key={i} 
                            draggable onDragStart={(e) => onDragStart(e, i)} onDragEnd={onDragEnd} onDragOver={(e) => onDragOver(e, i)}
                            onClick={() => { setActiveRuleIdx(i); setRuleRawMode(false); }}
                            className={`p-2 rounded cursor-pointer text-xs flex items-center gap-2 group transition-all border 
                                ${isActive ? 'bg-indigo-600/20 border-indigo-500/50' : 'hover:bg-slate-900 border-transparent'}
                                ${draggedIdx === i ? 'opacity-50 dashed border-slate-500' : ''}
                            `}
                        >
                            <div className="flex flex-col gap-0.5 mr-1 text-slate-600 group-hover:text-slate-400">
                                <button onClick={(e)=>{e.stopPropagation(); moveRule(i, -1)}} className="hover:text-white leading-none"><Icon name="caret-up"/></button>
                                <Icon name="dots-six-vertical" className="cursor-grab text-[10px] my-0.5 opacity-50"/>
                                <button onClick={(e)=>{e.stopPropagation(); moveRule(i, 1)}} className="hover:text-white leading-none"><Icon name="caret-down"/></button>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${isBalancer ? 'bg-purple-400' : 'bg-blue-400'}`}></span>
                                    <span className={`font-bold truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>{target}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 truncate font-mono">
                                    {rule.domain ? `dom:${rule.domain.length}` : rule.ip ? `ip:${rule.ip.length}` : 'match:all'}
                                </div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); deleteItem(i, 'rules'); }} className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-1"><Icon name="trash" /></button>
                        </div>
                    )
                })}
            </div>
        </div>
    );

    const renderRuleEditor = () => {
        if (activeRuleIdx === null || !local.rules[activeRuleIdx]) return <div className="flex-1 flex flex-col items-center justify-center text-slate-600"><Icon name="arrows-split" className="text-6xl mb-4 opacity-10"/><p>Select a rule to configure routing logic</p></div>;
        const rule = local.rules[activeRuleIdx];
        
        const update = (field, val) => {
            const rules = [...local.rules];
            const newRule = { ...rules[activeRuleIdx] };
            if (val === undefined || val === "") delete newRule[field]; else newRule[field] = val;
            
            if (field === 'outboundTag') delete newRule.balancerTag;
            if (field === 'balancerTag') delete newRule.outboundTag;

            rules[activeRuleIdx] = newRule;
            setLocal(prev => ({ ...prev, rules }));
        };

        const currentTarget = rule.balancerTag ? `bal:${rule.balancerTag}` : (rule.outboundTag || "");

        if (ruleRawMode) return <JsonField label="Raw Rule JSON" value={rule} onChange={v => { const n = [...local.rules]; n[activeRuleIdx] = v; setLocal(prev => ({...prev, rules: n})); }} className="h-full p-4"/>;

        return (
            <div className="flex-1 overflow-y-auto custom-scroll p-6 space-y-6 bg-slate-950/30">
                {/* --- DESTINATION HEADER --- */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Traffic Destination</label>
                        <div className="text-[10px] text-slate-500 font-mono">Select where to route matched traffic</div>
                    </div>
                    <div className="flex gap-2">
                        <select 
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-indigo-500 outline-none font-bold"
                            value={currentTarget}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val.startsWith('bal:')) update('balancerTag', val.replace('bal:', ''));
                                else update('outboundTag', val);
                            }}
                        >
                            <option value="" disabled>Select Target...</option>
                            <optgroup label="Outbounds (Direct)">
                                {outboundTags.map(t => <option key={t} value={t}>{t}</option>)}
                            </optgroup>
                            {balancerTags.length > 0 && (
                                <optgroup label="Balancers (Load Balance)">
                                    {balancerTags.map(t => <option key={t} value={`bal:${t}`}>⚡ {t}</option>)}
                                </optgroup>
                            )}
                        </select>
                        <input className="w-1/3 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-300 text-sm focus:border-indigo-500 outline-none" 
                            placeholder="Custom tag..." value={rule.outboundTag || rule.balancerTag || ""} 
                            onChange={e => update('outboundTag', e.target.value)} />
                    </div>
                </div>

                {/* --- MATCHERS --- */}
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <SmartTagInput label="Domains" prefix="geosite:" placeholder="google, geosite:netflix..." value={rule.domain || []} onChange={v => update('domain', v)} suggestions={geoSites} isLoading={loadingGeo} />
                        </div>
                        <div className="col-span-2">
                            <SmartTagInput label="IPs" prefix="geoip:" placeholder="8.8.8.8, geoip:cn..." value={rule.ip || []} onChange={v => update('ip', v)} suggestions={geoIps} isLoading={loadingGeo} />
                        </div>
                    </div>

                    {/* --- ADVANCED MATCHERS (Grid) --- */}
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50 space-y-4">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block border-b border-slate-800 pb-2">Advanced Matchers</label>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Inbound Tag */}
                            <div>
                                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-2">Inbound Source</label>
                                <TagSelector 
                                    options={inboundTagsList} 
                                    selected={rule.inboundTag || []} 
                                    onChange={v => update('inboundTag', v.length > 0 ? v : undefined)}
                                    color="emerald"
                                />
                            </div>

                            {/* Network */}
                            <div>
                                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-2">Network (TCP/UDP)</label>
                                <TagSelector 
                                    options={['tcp', 'udp']} 
                                    selected={rule.network ? rule.network.split(',') : []} 
                                    onChange={v => update('network', v.length > 0 ? v.join(',') : undefined)}
                                    color="purple"
                                />
                            </div>

                            {/* Protocol */}
                            <div>
                                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-2">Content Protocol</label>
                                <TagSelector 
                                    options={['http', 'tls', 'bittorrent']} 
                                    selected={rule.protocol || []} 
                                    onChange={v => update('protocol', v.length > 0 ? v : undefined)}
                                    color="blue"
                                />
                            </div>

                            {/* Ports & IPs */}
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Target Port</label>
                                    <input className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-xs font-mono" 
                                        placeholder="e.g. 443, 1000-2000" value={rule.port || ""} onChange={e => update('port', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Source IP (CIDR)</label>
                                    <input className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-xs font-mono" 
                                        placeholder="e.g. 10.0.0.1/32" value={(rule.source || []).join(',')} onChange={e => update('source', e.target.value ? e.target.value.split(',') : undefined)} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

const renderBalancerEditor = () => {
        if (activeBalancerIdx === null || !local.balancers[activeBalancerIdx]) return <div className="flex-1 flex items-center justify-center text-slate-600"><Icon name="scales" className="text-6xl mb-4 opacity-10"/><p>Select a balancer to configure</p></div>;
        
        const balancer = local.balancers[activeBalancerIdx];
        const currentSelector = balancer.selector || [];
        
        const update = (field, val) => {
            const list = [...local.balancers];
            list[activeBalancerIdx] = { ...list[activeBalancerIdx], [field]: val };
            setLocal(prev => ({ ...prev, balancers: list }));
        };

        const toggleSelector = (tag) => {
            // Тут мы работаем только с точными совпадениями для клика
            const index = currentSelector.indexOf(tag);
            if (index > -1) {
                // Если был добавлен точно - удаляем
                const newSel = [...currentSelector];
                newSel.splice(index, 1);
                update('selector', newSel);
            } else {
                // Если не был - добавляем
                update('selector', [...currentSelector, tag]);
            }
        };

        // Функция проверки: подходит ли тег под селектор (префикс)
        const checkMatch = (tag) => {
            const exact = currentSelector.includes(tag);
            // Ищем, есть ли в селекторах строка, с которой начинается этот тег
            const prefixMatch = currentSelector.find(s => tag.startsWith(s) && tag !== s);
            return { exact, prefix: prefixMatch };
        };

        if (balancerRawMode) return <JsonField label="Raw Balancer JSON" value={balancer} onChange={v => { const list = [...local.balancers]; list[activeBalancerIdx] = v; setLocal(prev => ({...prev, balancers: list})); }} className="h-full p-4"/>;

        return (
            <div className="flex-1 overflow-y-auto custom-scroll p-6 space-y-6 bg-slate-950/30">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Balancer Tag</label>
                        <input className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm font-bold font-mono" value={balancer.tag} onChange={e => update('tag', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Strategy</label>
                        <select className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm font-mono" 
                            value={balancer.strategy?.type || "random"} 
                            onChange={e => update('strategy', { type: e.target.value })}>
                            <option value="random">Random</option>
                            <option value="roundRobin">Round Robin</option>
                            <option value="leastPing">Least Ping</option>
                        </select>
                    </div>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <label className="text-xs uppercase font-bold text-slate-400 block">Target Outbounds</label>
                            <span className="text-[10px] text-slate-500">Xray matches by prefix.</span>
                        </div>
                        <div className="flex gap-2 text-[10px]">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-600"></span> Exact</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border border-purple-500"></span> Prefix Match</span>
                        </div>
                    </div>
                    
                    {/* VISUAL TAG SELECTOR */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto custom-scroll">
                        {outboundTags.map(tag => {
                            const { exact, prefix } = checkMatch(tag);
                            const isSelected = exact || prefix;
                            
                            return (
                                <div key={tag} onClick={() => toggleSelector(tag)} 
                                    className={`cursor-pointer px-3 py-2 rounded-lg border text-xs font-mono flex justify-between items-center transition-all select-none relative overflow-hidden
                                    ${exact 
                                        ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20' 
                                        : (prefix 
                                            ? 'bg-purple-900/30 border-purple-500/60 text-purple-200' 
                                            : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500 hover:bg-slate-800')
                                    }`}
                                    title={prefix ? `Matched by prefix: "${prefix}"` : tag}
                                >
                                    <span className="truncate z-10">{tag}</span>
                                    {exact && <Icon name="check-circle" className="text-white shrink-0 ml-2 z-10"/>}
                                    {prefix && <Icon name="git-merge" className="text-purple-400 shrink-0 ml-2 z-10" />}
                                </div>
                            )
                        })}
                        {outboundTags.length === 0 && <div className="text-slate-500 text-xs col-span-full text-center py-4">No outbound tags found.</div>}
                    </div>
                    
                    {/* Ручное добавление префикса */}
                    <div className="mt-4 pt-4 border-t border-slate-800">
                        <label className="text-[10px] text-slate-600 uppercase font-bold block mb-1">Add Prefix / Selector</label>
                        <div className="flex gap-2 items-center">
                            <input className="flex-1 bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white focus:border-indigo-500 outline-none font-mono" 
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
                        {/* Отображение текущих "чистых" селекторов, которых нет в списке тегов (например, префиксы) */}
                        <div className="flex flex-wrap gap-2 mt-2">
                            {currentSelector.map(sel => {
                                // Показываем здесь только те селекторы, которые являются префиксами и не совпадают с реальными тегами 1-в-1
                                // Или просто показываем всё для контроля
                                const isRealTag = outboundTags.includes(sel);
                                return (
                                    <span key={sel} className={`text-[10px] px-2 py-1 rounded border flex items-center gap-1 ${isRealTag ? 'bg-purple-900/50 border-purple-800 text-purple-300' : 'bg-orange-900/30 border-orange-800 text-orange-300'}`}>
                                        {sel} {isRealTag ? '' : '(prefix)'}
                                        <button onClick={() => update('selector', currentSelector.filter(s => s !== sel))} className="hover:text-white ml-1">×</button>
                                    </span>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Modal 
            title="Routing Manager" 
            onClose={onClose} 
            onSave={() => onSave(local)}
            extraButtons={
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button onClick={() => setActiveTab('rules')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'rules' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Rules</button>
                    <button onClick={() => setActiveTab('balancers')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'balancers' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Balancers</button>
                </div>
            }
        >
            <div className="mb-4 flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Domain Strategy</label>
                        <select className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500 mt-0.5" 
                            value={local.domainStrategy} onChange={e => setLocal(p => ({...p, domainStrategy: e.target.value}))}>
                            {["AsIs", "IPIfNonMatch", "IPOnDemand"].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                
                {/* JSON Mode Toggles */}
                {activeTab === 'rules' && activeRuleIdx !== null && (
                    <Button variant="secondary" className="text-xs py-1 h-8 bg-slate-800 border-slate-700" onClick={() => setRuleRawMode(!ruleRawMode)} icon={ruleRawMode ? "layout" : "code"}>
                        {ruleRawMode ? "UI Mode" : "JSON"}
                    </Button>
                )}
                {activeTab === 'balancers' && activeBalancerIdx !== null && (
                    <Button variant="secondary" className="text-xs py-1 h-8 bg-slate-800 border-slate-700" onClick={() => setBalancerRawMode(!balancerRawMode)} icon={balancerRawMode ? "layout" : "code"}>
                        {balancerRawMode ? "UI Mode" : "JSON"}
                    </Button>
                )}
            </div>

            <div className="flex h-[600px] border border-slate-800 rounded-2xl overflow-hidden bg-slate-900 shadow-2xl">
                {activeTab === 'rules' ? (
                    <>
                        {renderRulesList()}
                        {renderRuleEditor()}
                    </>
                ) : (
                    <>
                        <div className="w-80 bg-slate-950 border-r border-slate-800 flex flex-col h-full shrink-0">
                            <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Balancers List</span>
                                <Button variant="ghost" className="px-2 py-1 text-[10px]" onClick={addBalancer} icon="plus">Add</Button>
                            </div>
                            <div className="overflow-y-auto custom-scroll flex-1 p-2 space-y-1">
                                {local.balancers?.map((b, i) => (
                                    <div key={i} onClick={() => setActiveBalancerIdx(i)} 
                                        className={`p-3 rounded-lg cursor-pointer text-xs flex justify-between items-center group border transition-all
                                        ${activeBalancerIdx === i ? 'bg-purple-600/20 border-purple-500/50' : 'hover:bg-slate-900 border-transparent'}`}>
                                        <div>
                                            <div className={`font-bold ${activeBalancerIdx === i ? 'text-white' : 'text-slate-300'}`}>{b.tag}</div>
                                            <div className="text-[10px] text-slate-500 mt-0.5">Strategy: {b.strategy?.type || 'random'}</div>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); deleteItem(i, 'balancers'); }} className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-1"><Icon name="trash" /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {renderBalancerEditor()}
                    </>
                )}
            </div>
        </Modal>
    );
};