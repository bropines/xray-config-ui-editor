import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { createProtoWorker } from '../../utils/proto-worker';
import { useConfigStore } from '../../store/configStore';
import { Icon } from '../ui/Icon'; // Импорт иконки для кнопки "Back"

// Суб-компоненты
import { RuleList } from './routing/RuleList';
import { RuleEditor } from './routing/RuleEditor';
import { BalancerList } from './routing/BalancerList';
import { BalancerEditor } from './routing/BalancerEditor';

export const RoutingModal = ({ onClose }) => {
    // ... (Данные из стора - теги, rules, balancers - БЕЗ ИЗМЕНЕНИЙ) ...
    const { config, updateSection, reorderRules } = useConfigStore();
    const rules = config?.routing?.rules || [];
    const balancers = config?.routing?.balancers || [];
    const outboundTags = (config?.outbounds || []).map(o => o.tag).filter(t => t);
    const inboundTags = (config?.inbounds || []).map(i => i.tag).filter(t => t);
    const balancerTags = balancers.map(b => b.tag).filter(t => t);

    // UI State
    const [activeTab, setActiveTab] = useState<'rules' | 'balancers'>('rules');
    const [activeRuleIdx, setActiveRuleIdx] = useState<number | null>(null);
    const [activeBalancerIdx, setActiveBalancerIdx] = useState<number | null>(null);
    const [rawMode, setRawMode] = useState(false);
    
    // NEW: Мобильный режим редактирования (показываем ли мы редактор вместо списка)
    const [mobileEditMode, setMobileEditMode] = useState(false);

    // Geo Data (БЕЗ ИЗМЕНЕНИЙ)
    const [geoSites, setGeoSites] = useState([]);
    const [geoIps, setGeoIps] = useState([]);
    const [loadingGeo, setLoadingGeo] = useState(false);

    useEffect(() => {
        setLoadingGeo(true);
        const worker = createProtoWorker();
        const timeout = setTimeout(() => setLoadingGeo(false), 5000);
        worker.onmessage = (e) => {
            if (e.data.type === 'geosite') setGeoSites(e.data.data);
            if (e.data.type === 'geoip') setGeoIps(e.data.data);
            setLoadingGeo(false); 
        };
        worker.postMessage({ type: 'geosite' });
        worker.postMessage({ type: 'geoip' });
        return () => { worker.terminate(); clearTimeout(timeout); };
    }, []);

    // ... (HANDLERS - Немного модифицируем для мобилки) ...
    
    // Rules
    const handleAddRule = () => {
        const newRule = { type: "field", outboundTag: outboundTags[0] || "direct", domain: [] };
        reorderRules([newRule, ...rules]);
        setActiveRuleIdx(0);
        setRawMode(false);
        setMobileEditMode(true); // Сразу открываем на мобилке
    };

    const handleSelectRule = (idx) => {
        setActiveRuleIdx(idx);
        setRuleRawMode(false);
        setMobileEditMode(true); // Открываем редактор
    };

    const handleDeleteRule = (idx) => {
        const n = [...rules];
        n.splice(idx, 1);
        reorderRules(n);
        if (activeRuleIdx === idx) {
            setActiveRuleIdx(null);
            setMobileEditMode(false);
        }
    };

    const handleReorderRules = (newRules, oldIdx, newIdx) => {
        reorderRules(newRules);
        if (activeRuleIdx === oldIdx) setActiveRuleIdx(newIdx);
        else if (activeRuleIdx === newIdx && oldIdx < newIdx) setActiveRuleIdx(activeRuleIdx - 1); 
        else if (activeRuleIdx === newIdx && oldIdx > newIndex) setActiveRuleIdx(activeRuleIdx + 1);
    };

    const handleUpdateRule = (updatedRule) => {
        const n = [...rules];
        n[activeRuleIdx] = updatedRule;
        reorderRules(n);
    };

    // Balancers
    const updateBalancerList = (newList) => {
        updateSection('routing', { ...config.routing, balancers: newList });
    };

    const handleAddBalancer = () => {
        const newBalancer = { tag: "bal-" + (balancers.length + 1), selector: [], strategy: { type: "random" } };
        updateBalancerList([...balancers, newBalancer]);
        setActiveBalancerIdx(balancers.length);
        setRawMode(false);
        setMobileEditMode(true);
    };

    const handleSelectBalancer = (idx) => {
        setActiveBalancerIdx(idx);
        setMobileEditMode(true);
    }

    const handleDeleteBalancer = (idx) => {
        const n = [...balancers];
        n.splice(idx, 1);
        updateBalancerList(n);
        if (activeBalancerIdx === idx) {
            setActiveBalancerIdx(null);
            setMobileEditMode(false);
        }
    };

    const handleUpdateBalancer = (updatedBalancer) => {
        const n = [...balancers];
        n[activeBalancerIdx] = updatedBalancer;
        updateBalancerList(n);
    };

    // --- RENDER ---

    return (
        <Modal 
            title="Routing Manager" 
            onClose={onClose} 
            onSave={() => onClose()} 
            extraButtons={
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button onClick={() => { setActiveTab('rules'); setRawMode(false); setMobileEditMode(false); }} className={`px-3 md:px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'rules' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Rules</button>
                    <button onClick={() => { setActiveTab('balancers'); setRawMode(false); setMobileEditMode(false); }} className={`px-3 md:px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'balancers' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Balancers</button>
                </div>
            }
        >
            <div className="mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                {/* Back button for Mobile Edit Mode */}
                {mobileEditMode && (
                    <div className="md:hidden w-full">
                        <Button variant="secondary" className="w-full text-xs" onClick={() => setMobileEditMode(false)} icon="ArrowLeft">Back to List</Button>
                    </div>
                )}

                <div className={`flex flex-col w-full md:w-auto ${mobileEditMode ? 'hidden md:flex' : ''}`}>
                    <label className="label-xs">Domain Strategy</label>
                    <select className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-indigo-500 mt-0.5" 
                        value={config?.routing?.domainStrategy || "AsIs"} 
                        onChange={e => updateSection('routing', { ...config.routing, domainStrategy: e.target.value })}>
                        {["AsIs", "IPIfNonMatch", "IPOnDemand"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                
                {((activeTab === 'rules' && activeRuleIdx !== null) || (activeTab === 'balancers' && activeBalancerIdx !== null)) && (
                    <Button variant="secondary" className={`text-xs py-1 h-8 ${mobileEditMode ? 'w-full md:w-auto' : 'hidden md:flex'}`} onClick={() => setRawMode(!rawMode)} icon={rawMode ? "Layout" : "Code"}>
                        {rawMode ? "UI Mode" : "JSON"}
                    </Button>
                )}
            </div>

            <div className="flex flex-col md:flex-row h-[500px] md:h-[600px] border border-slate-800 rounded-2xl overflow-hidden bg-slate-900 shadow-2xl relative">
                {activeTab === 'rules' ? (
                    <>
                        {/* LIST (Hidden on mobile if editing) */}
                        <div className={`w-full md:w-80 bg-slate-950 border-r border-slate-800 flex flex-col h-full shrink-0 ${mobileEditMode ? 'hidden md:flex' : 'flex'}`}>
                            <div className="p-3 border-b border-slate-800 flex justify-between">
                                <span className="text-xs font-bold text-slate-400">RULES</span>
                                <Button variant="ghost" icon="Plus" className="py-0 px-2 text-xs" onClick={handleAddRule} />
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1">
                                <RuleList 
                                    rules={rules} 
                                    activeIndex={activeRuleIdx}
                                    onSelect={handleSelectRule} // Используем обертку
                                    onAdd={handleAddRule}
                                    onDelete={handleDeleteRule}
                                    onReorder={handleReorderRules}
                                />
                            </div>
                        </div>
                        
                        {/* EDITOR (Hidden on mobile if NOT editing) */}
                        <div className={`flex-1 flex flex-col h-full bg-slate-900/50 ${mobileEditMode ? 'flex' : 'hidden md:flex'}`}>
                            <RuleEditor 
                                rule={rules[activeRuleIdx]}
                                onChange={handleUpdateRule}
                                outboundTags={outboundTags}
                                balancerTags={balancerTags}
                                inboundTags={inboundTags}
                                geoData={{ sites: geoSites, ips: geoIps, loading: loadingGeo }}
                                rawMode={rawMode}
                            />
                        </div>
                    </>
                ) : (
                    <>
                        <div className={`w-full md:w-80 bg-slate-950 border-r border-slate-800 flex flex-col h-full shrink-0 ${mobileEditMode ? 'hidden md:flex' : 'flex'}`}>
                            <div className="p-3 border-b border-slate-800 flex justify-between">
                                <span className="text-xs font-bold text-slate-400">BALANCERS</span>
                                <Button variant="ghost" icon="Plus" className="py-0 px-2 text-xs" onClick={handleAddBalancer} />
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1">
                                <BalancerList 
                                    balancers={balancers}
                                    activeIndex={activeBalancerIdx}
                                    onSelect={handleSelectBalancer}
                                    onAdd={handleAddBalancer}
                                    onDelete={handleDeleteBalancer}
                                />
                            </div>
                        </div>
                        <div className={`flex-1 flex flex-col h-full bg-slate-900/50 ${mobileEditMode ? 'flex' : 'hidden md:flex'}`}>
                            <BalancerEditor 
                                balancer={balancers[activeBalancerIdx]}
                                onChange={handleUpdateBalancer}
                                outboundTags={outboundTags}
                                rawMode={rawMode}
                            />
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};