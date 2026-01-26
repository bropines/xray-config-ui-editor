import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { createProtoWorker } from '../../utils/proto-worker';
import { useConfigStore } from '../../store/configStore';

// Суб-компоненты
import { RuleList } from './routing/RuleList';
import { RuleEditor } from './routing/RuleEditor';
import { BalancerList } from './routing/BalancerList';
import { BalancerEditor } from './routing/BalancerEditor';

export const RoutingModal = ({ onClose }) => {
    // Данные из стора
    const { config, updateSection, reorderRules } = useConfigStore();
    
    // Массивы данных
    const rules = config?.routing?.rules || [];
    const balancers = config?.routing?.balancers || [];
    
    // Теги для селектов
    const outboundTags = (config?.outbounds || []).map(o => o.tag).filter(t => t);
    const inboundTags = (config?.inbounds || []).map(i => i.tag).filter(t => t);
    const balancerTags = balancers.map(b => b.tag).filter(t => t);

    // UI State
    const [activeTab, setActiveTab] = useState<'rules' | 'balancers'>('rules');
    const [activeRuleIdx, setActiveRuleIdx] = useState<number | null>(null);
    const [activeBalancerIdx, setActiveBalancerIdx] = useState<number | null>(null);
    const [rawMode, setRawMode] = useState(false); // Единый rawMode для обоих табов для простоты

    // Geo Data Loading
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

    // --- Handlers: Rules ---
    const handleAddRule = () => {
        const newRule = { type: "field", outboundTag: outboundTags[0] || "direct", domain: [] };
        reorderRules([newRule, ...rules]);
        setActiveRuleIdx(0);
        setRawMode(false);
    };

    const handleDeleteRule = (idx) => {
        const n = [...rules];
        n.splice(idx, 1);
        reorderRules(n);
        if (activeRuleIdx === idx) setActiveRuleIdx(null);
    };

    const handleReorderRules = (newRules, oldIdx, newIdx) => {
        reorderRules(newRules);
        // Корректировка активного индекса
        if (activeRuleIdx === oldIdx) setActiveRuleIdx(newIdx);
        else if (activeRuleIdx === newIdx && oldIdx < newIdx) setActiveRuleIdx(activeRuleIdx - 1); 
        else if (activeRuleIdx === newIdx && oldIdx > newIndex) setActiveRuleIdx(activeRuleIdx + 1);
    };

    const handleUpdateRule = (updatedRule) => {
        const n = [...rules];
        n[activeRuleIdx] = updatedRule;
        reorderRules(n);
    };

    // --- Handlers: Balancers ---
    const updateBalancerList = (newList) => {
        updateSection('routing', { ...config.routing, balancers: newList });
    };

    const handleAddBalancer = () => {
        const newBalancer = { tag: "bal-" + (balancers.length + 1), selector: [], strategy: { type: "random" } };
        updateBalancerList([...balancers, newBalancer]);
        setActiveBalancerIdx(balancers.length);
        setRawMode(false);
    };

    const handleDeleteBalancer = (idx) => {
        const n = [...balancers];
        n.splice(idx, 1);
        updateBalancerList(n);
        if (activeBalancerIdx === idx) setActiveBalancerIdx(null);
    };

    const handleUpdateBalancer = (updatedBalancer) => {
        const n = [...balancers];
        n[activeBalancerIdx] = updatedBalancer;
        updateBalancerList(n);
    };

    return (
        <Modal 
            title="Routing Manager" 
            onClose={onClose} 
            onSave={() => onClose()} 
            extraButtons={
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button onClick={() => { setActiveTab('rules'); setRawMode(false); }} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'rules' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Rules</button>
                    <button onClick={() => { setActiveTab('balancers'); setRawMode(false); }} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'balancers' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Balancers</button>
                </div>
            }
        >
            <div className="mb-4 flex items-center justify-between px-1">
                <div className="flex flex-col">
                    <label className="label-xs">Domain Strategy</label>
                    <select className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500 mt-0.5" 
                        value={config?.routing?.domainStrategy || "AsIs"} 
                        onChange={e => updateSection('routing', { ...config.routing, domainStrategy: e.target.value })}>
                        {["AsIs", "IPIfNonMatch", "IPOnDemand"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                
                {((activeTab === 'rules' && activeRuleIdx !== null) || (activeTab === 'balancers' && activeBalancerIdx !== null)) && (
                    <Button variant="secondary" className="text-xs py-1 h-8" onClick={() => setRawMode(!rawMode)} icon={rawMode ? "Layout" : "Code"}>
                        {rawMode ? "UI Mode" : "JSON"}
                    </Button>
                )}
            </div>

            <div className="flex h-[600px] border border-slate-800 rounded-2xl overflow-hidden bg-slate-900 shadow-2xl">
                {activeTab === 'rules' ? (
                    <>
                        <RuleList 
                            rules={rules} 
                            activeIndex={activeRuleIdx}
                            onSelect={setActiveRuleIdx}
                            onAdd={handleAddRule}
                            onDelete={handleDeleteRule}
                            onReorder={handleReorderRules}
                        />
                        <RuleEditor 
                            rule={rules[activeRuleIdx]}
                            onChange={handleUpdateRule}
                            outboundTags={outboundTags}
                            balancerTags={balancerTags}
                            inboundTags={inboundTags}
                            geoData={{ sites: geoSites, ips: geoIps, loading: loadingGeo }}
                            rawMode={rawMode}
                        />
                    </>
                ) : (
                    <>
                        <BalancerList 
                            balancers={balancers}
                            activeIndex={activeBalancerIdx}
                            onSelect={setActiveBalancerIdx}
                            onAdd={handleAddBalancer}
                            onDelete={handleDeleteBalancer}
                        />
                        <BalancerEditor 
                            balancer={balancers[activeBalancerIdx]}
                            onChange={handleUpdateBalancer}
                            outboundTags={outboundTags}
                            rawMode={rawMode}
                        />
                    </>
                )}
            </div>
        </Modal>
    );
};