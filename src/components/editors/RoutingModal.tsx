import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { createProtoWorker } from '../../utils/proto-worker';
import { useConfigStore } from '../../store/configStore';
import { Icon } from '../ui/Icon';

import { RuleList } from './routing/RuleList';
import { RuleEditor } from './routing/RuleEditor';
import { BalancerList } from './routing/BalancerList';
import { BalancerEditor } from './routing/BalancerEditor';

export const RoutingModal = ({ onClose }: any) => {
    const { config, updateSection, reorderRules } = useConfigStore();
    const rules = config?.routing?.rules || [];
    const balancers = config?.routing?.balancers || [];
    const outboundTags = (config?.outbounds || []).map((o: any) => o.tag).filter((t: any) => t);
    const inboundTags = (config?.inbounds || []).map((i: any) => i.tag).filter((t: any) => t);
    const balancerTags = balancers.map((b: any) => b.tag).filter((t: any) => t);

    const [activeTab, setActiveTab] = useState<'rules' | 'balancers'>('rules');
    const [activeRuleIdx, setActiveRuleIdx] = useState<number | null>(null);
    const [activeBalancerIdx, setActiveBalancerIdx] = useState<number | null>(null);
    const [rawMode, setRawMode] = useState(false);
    const [mobileEditMode, setMobileEditMode] = useState(false);

    // --- SEARCH LOGIC ---
    const [searchQuery, setSearchQuery] = useState("");

    const filteredRules = rules.map((r, originalIndex) => ({ ...r, originalIndex }))
        .filter(rule => {
            const q = searchQuery.toLowerCase();
            if (!q) return true;
            return (
                rule.ruleTag?.toLowerCase().includes(q) ||
                rule.outboundTag?.toLowerCase().includes(q) ||
                rule.balancerTag?.toLowerCase().includes(q) ||
                rule.domain?.some((d: string) => d.toLowerCase().includes(q)) ||
                rule.ip?.some((i: string) => i.toLowerCase().includes(q)) ||
                rule.inboundTag?.some((i: string) => i.toLowerCase().includes(q)) ||
                rule.protocol?.some((p: string) => p.toLowerCase().includes(q))
            );
        });

    // --- RESIZER ---
    const [sidebarWidth, setSidebarWidth] = useState(380);
    const [isResizing, setIsResizing] = useState(false);
    const startResizing = useCallback(() => setIsResizing(true), []);
    const stopResizing = useCallback(() => setIsResizing(false), []);
    const resize = useCallback((e: MouseEvent) => {
        if (isResizing) {
            setSidebarWidth((prev) => {
                const nw = prev + e.movementX;
                return nw < 250 ? 250 : nw > 800 ? 800 : nw;
            });
        }
    }, [isResizing]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener("mousemove", resize);
            window.addEventListener("mouseup", stopResizing);
            document.body.style.cursor = "col-resize";
        } else {
            document.body.style.cursor = "default";
        }
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [isResizing, resize, stopResizing]);

    // --- GEO DATA ---
    const [geoSites, setGeoSites] = useState([]);
    const [geoIps, setGeoIps] = useState([]);
    const [loadingGeo, setLoadingGeo] = useState(false);

    useEffect(() => {
        setLoadingGeo(true);
        const worker = createProtoWorker();
        worker.onmessage = (e) => {
            if (e.data.type === 'geosite') setGeoSites(e.data.data);
            if (e.data.type === 'geoip') setGeoIps(e.data.data);
            setLoadingGeo(false);
        };
        worker.postMessage({ type: 'geosite' });
        worker.postMessage({ type: 'geoip' });
        return () => worker.terminate();
    }, []);

    // --- HANDLERS ---
    const handleAddRule = () => {
        const newRule = { type: "field", outboundTag: outboundTags[0] || "direct", domain: [] };
        reorderRules([newRule, ...rules]);
        setActiveRuleIdx(0);
        setMobileEditMode(true);
    };

    const handleSelectRule = (originalIdx: number) => {
        setActiveRuleIdx(originalIdx);
        setRawMode(false);
        setMobileEditMode(true);
    };

    const handleDeleteRule = (originalIdx: number) => {
        const n = [...rules];
        n.splice(originalIdx, 1);
        reorderRules(n);
        if (activeRuleIdx === originalIdx) {
            setActiveRuleIdx(null);
            setMobileEditMode(false);
        }
    };

    const handleUpdateRule = (updatedRule: any) => {
        if (activeRuleIdx === null) return;
        const n = [...rules];
        n[activeRuleIdx] = updatedRule;
        reorderRules(n);
    };

    return (
        <Modal
            title="Routing Manager"
            onClose={onClose}
            onSave={onClose}
            extraButtons={
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button onClick={() => { setActiveTab('rules'); setMobileEditMode(false); }} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'rules' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Rules</button>
                    <button onClick={() => { setActiveTab('balancers'); setMobileEditMode(false); }} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'balancers' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}>Balancers</button>
                </div>
            }
        >
            <div className="mb-4 flex flex-col md:flex-row items-center justify-between gap-4">
                {mobileEditMode && (
                    <Button variant="secondary" className="md:hidden w-full" onClick={() => setMobileEditMode(false)} icon="ArrowLeft">Back</Button>
                )}
                <div className={`flex flex-col w-full md:w-auto ${mobileEditMode ? 'hidden md:flex' : ''}`}>
                    <label className="label-xs">Domain Strategy</label>
                    <select className="input-base py-1.5 text-xs"
                        value={config?.routing?.domainStrategy || "AsIs"}
                        onChange={e => updateSection('routing', { ...config.routing, domainStrategy: e.target.value })}>
                        {["AsIs", "IPIfNonMatch", "IPOnDemand"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                {((activeTab === 'rules' && activeRuleIdx !== null) || (activeTab === 'balancers' && activeBalancerIdx !== null)) && (
                    <Button variant="secondary" className={`text-xs py-1 ${mobileEditMode ? 'w-full md:w-auto' : 'hidden md:flex'}`} onClick={() => setRawMode(!rawMode)} icon={rawMode ? "Layout" : "Code"}>
                        {rawMode ? "UI Mode" : "JSON"}
                    </Button>
                )}
            </div>

            <div className="flex flex-col md:flex-row h-[600px] border border-slate-800 rounded-2xl overflow-hidden bg-slate-900 shadow-2xl relative" style={{ '--sidebar-width': `${sidebarWidth}px` } as any}>
                {activeTab === 'rules' ? (
                    <>
                        <div className={`w-full md:w-[var(--sidebar-width)] bg-slate-950 border-r border-slate-800 flex flex-col h-full shrink-0 ${mobileEditMode ? 'hidden md:flex' : 'flex'}`}>
                            <div className="p-3 border-b border-slate-800 space-y-3 bg-slate-900/50">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 pl-2 uppercase tracking-widest">Rules</span>
                                    <Button variant="ghost" icon="Plus" className="py-1 px-2" onClick={handleAddRule} />
                                </div>
                                <div className="relative">
                                    <Icon name="MagnifyingGlass" className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600 text-xs" />
                                    <input className="w-full bg-slate-950 border border-slate-700 rounded-md pl-8 pr-2 py-1.5 text-[11px] text-white outline-none focus:border-indigo-500"
                                        placeholder="Search by name, domain, ip..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                                </div>
                            </div>
                            <RuleList
                                rules={filteredRules}
                                activeIndex={activeRuleIdx}
                                onSelect={(idx: number) => handleSelectRule(filteredRules[idx].originalIndex)}
                                onDelete={(idx: number) => handleDeleteRule(filteredRules[idx].originalIndex)}
                                onReorder={searchQuery ? undefined : (newRules: any) => reorderRules(newRules)}
                            />
                        </div>
                        <div className="hidden md:block w-1 bg-slate-800 hover:bg-indigo-500 cursor-col-resize z-10" onMouseDown={startResizing} />
                        <div className={`flex-1 flex flex-col h-full bg-slate-900/50 min-w-0 ${mobileEditMode ? 'flex' : 'hidden md:flex'}`}>
                            <RuleEditor
                                rule={rules[activeRuleIdx!]} onChange={handleUpdateRule}
                                outboundTags={outboundTags} balancerTags={balancerTags} inboundTags={inboundTags}
                                geoData={{ sites: geoSites, ips: geoIps, loading: loadingGeo }} rawMode={rawMode}
                            />
                        </div>
                    </>
                ) : (
                    <>
                        <div className={`w-full md:w-[var(--sidebar-width)] bg-slate-950 border-r border-slate-800 flex flex-col h-full shrink-0 ${mobileEditMode ? 'hidden md:flex' : 'flex'}`}>
                            <div className="p-3 border-b border-slate-800 flex justify-between bg-slate-900/50 items-center">
                                <span className="text-xs font-bold text-slate-400 pl-2 uppercase tracking-widest">Balancers</span>
                                <Button variant="ghost" icon="Plus" onClick={() => {
                                    const nb = { tag: "bal-" + (balancers.length + 1), selector: [], strategy: { type: "random" } };
                                    updateSection('routing', { ...config.routing, balancers: [...balancers, nb] });
                                }} />
                            </div>
                            <BalancerList
                                balancers={balancers} activeIndex={activeBalancerIdx}
                                onSelect={(idx: number) => { setActiveBalancerIdx(idx); setMobileEditMode(true); }}
                                onDelete={(idx: number) => {
                                    const n = [...balancers]; n.splice(idx, 1);
                                    updateSection('routing', { ...config.routing, balancers: n });
                                }}
                            />
                        </div>
                        <div className="hidden md:block w-1 bg-slate-800 hover:bg-indigo-500 cursor-col-resize z-10" onMouseDown={startResizing} />
                        <div className={`flex-1 flex flex-col h-full bg-slate-900/50 min-w-0 ${mobileEditMode ? 'flex' : 'hidden md:flex'}`}>
                            <BalancerEditor
                                balancer={balancers[activeBalancerIdx!]} outboundTags={outboundTags} rawMode={rawMode}
                                onChange={(val: any) => {
                                    const n = [...balancers]; n[activeBalancerIdx!] = val;
                                    updateSection('routing', { ...config.routing, balancers: n });
                                }}
                            />
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};