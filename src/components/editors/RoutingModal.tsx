import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useConfigStore } from '../../store/configStore';
import { Icon } from '../ui/Icon';
import { getCriticalRuleErrors } from '../../utils/validator';
import { getDefaultGeoList } from '../../utils/geo-data';

import { RuleList } from './routing/RuleList';
import { RuleEditor } from './routing/RuleEditor';
import { BalancerList } from './routing/BalancerList';
import { BalancerEditor } from './routing/BalancerEditor';

export const RoutingModal = ({ onClose }: any) => {
    const { config, updateSection, reorderRules } = useConfigStore();
    const rules     = config?.routing?.rules    || [];
    const balancers = config?.routing?.balancers || [];
    const outboundTags = (config?.outbounds || []).map((o: any) => o.tag).filter(Boolean);
    const inboundTags  = (config?.inbounds  || []).map((i: any) => i.tag).filter(Boolean);
    const balancerTags = balancers.map((b: any) => b.tag).filter(Boolean);

    // ── UI state ──────────────────────────────────────────────────────────────
    const [activeTab,         setActiveTab]         = useState<'rules' | 'balancers'>('rules');
    const [activeRuleIdx,     setActiveRuleIdx]     = useState<number | null>(null);
    const [activeBalancerIdx, setActiveBalancerIdx] = useState<number | null>(null);
    const [rawMode,           setRawMode]           = useState(false);
    const [mobileEditMode,    setMobileEditMode]    = useState(false);
    const [searchQuery,       setSearchQuery]       = useState("");

    // ── Все сломанные правила (блокируют Close) ───────────────────────────────
    const brokenRules = rules
        .map((r: any, i: number) => ({
            idx:    i,
            label:  r.ruleTag || r.outboundTag || r.balancerTag || `Rule #${i + 1}`,
            errors: getCriticalRuleErrors(r)
        }))
        .filter(r => r.errors.length > 0);

    const hasCriticalErrors = brokenRules.length > 0;

    // ── handleClose: блокируем если есть ошибки ───────────────────────────────
    const handleClose = () => {
        if (hasCriticalErrors) {
            // Переходим к первому сломанному правилу
            const first = brokenRules[0];
            if (first) {
                setActiveTab('rules');
                setActiveRuleIdx(first.idx);
                setMobileEditMode(true);
                setRawMode(false);
            }
            return; // не закрываем
        }
        onClose();
    };

    // ── Search ────────────────────────────────────────────────────────────────
    const filteredRules = rules
        .map((r: any, originalIndex: number) => ({ ...r, originalIndex }))
        .filter((rule: any) => {
            const q = searchQuery.toLowerCase();
            if (!q) return true;
            return (
                rule.ruleTag?.toLowerCase().includes(q)     ||
                rule.outboundTag?.toLowerCase().includes(q) ||
                rule.balancerTag?.toLowerCase().includes(q) ||
                rule.domain?.some((d: string) => d.toLowerCase().includes(q)) ||
                rule.ip?.some((ip: string)   => ip.toLowerCase().includes(q)) ||
                rule.inboundTag?.some((t: string) => t.toLowerCase().includes(q)) ||
                rule.protocol?.some((p: string)   => p.toLowerCase().includes(q))
            );
        });

    // ── Resizer ───────────────────────────────────────────────────────────────
    const [sidebarWidth, setSidebarWidth] = useState(380);
    const [isResizing,   setIsResizing]   = useState(false);
    const startResizing = useCallback(() => setIsResizing(true), []);
    const stopResizing  = useCallback(() => setIsResizing(false), []);
    const resize = useCallback((e: MouseEvent) => {
        if (isResizing) setSidebarWidth(prev => Math.min(800, Math.max(250, prev + e.movementX)));
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

// ── Geo data ──────────────────────────────────────────────────────────────
    const[geoSites,   setGeoSites]   = useState([]);
    const [geoIps,     setGeoIps]     = useState([]);
    const [loadingGeo, setLoadingGeo] = useState(false);

    useEffect(() => {
        let isMounted = true;
        setLoadingGeo(true);
        Promise.all([
            getDefaultGeoList('geosite'),
            getDefaultGeoList('geoip')
        ]).then(([sites, ips]) => {
            if (isMounted) {
                setGeoSites(sites);
                setGeoIps(ips);
                setLoadingGeo(false);
            }
        });
        return () => { isMounted = false; };
    },[]);

    // ── Rule handlers ─────────────────────────────────────────────────────────
    const handleAddRule = () => {
        // Новое правило сразу валидное: есть destination + матчер network:tcp,udp
        const newRule = {
            type:       "field",
            outboundTag: outboundTags[0] || "direct",
            network:    "tcp,udp"
        };
        reorderRules([newRule, ...rules]);
        setActiveRuleIdx(0);
        setRawMode(false);
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
        if (activeRuleIdx === originalIdx) { setActiveRuleIdx(null); setMobileEditMode(false); }
    };

    const handleUpdateRule = (updatedRule: any) => {
        if (activeRuleIdx === null) return;
        const cleanRule = { ...updatedRule };
        delete cleanRule.originalIndex;
        const n = [...rules];
        n[activeRuleIdx] = cleanRule;
        reorderRules(n);
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Modal
            title="Routing Manager"
            onClose={handleClose}
            onSave={handleClose}
            extraButtons={
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                        onClick={() => { setActiveTab('rules'); setMobileEditMode(false); }}
                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'rules' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                    >Rules</button>
                    <button
                        onClick={() => { setActiveTab('balancers'); setMobileEditMode(false); }}
                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'balancers' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
                    >Balancers</button>
                </div>
            }
        >
            {/* ── Верхняя панель ────────────────────────────────────────────── */}
            <div className="mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                {mobileEditMode && (
                    <Button variant="secondary" className="md:hidden w-full" onClick={() => setMobileEditMode(false)} icon="ArrowLeft">Back</Button>
                )}
                <div className={`flex flex-col w-full md:w-auto ${mobileEditMode ? 'hidden md:flex' : ''}`}>
                    <label className="label-xs">Domain Strategy</label>
                    <select
                        className="input-base py-1.5 text-xs"
                        value={config?.routing?.domainStrategy || "AsIs"}
                        onChange={e => updateSection('routing', { ...config.routing, domainStrategy: e.target.value })}
                    >
                        {["AsIs", "IPIfNonMatch", "IPOnDemand"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                {((activeTab === 'rules' && activeRuleIdx !== null) || (activeTab === 'balancers' && activeBalancerIdx !== null)) && (
                    <Button
                        variant="secondary"
                        className={`text-xs py-1 ${mobileEditMode ? 'w-full md:w-auto' : 'hidden md:flex'}`}
                        onClick={() => setRawMode(!rawMode)}
                        icon={rawMode ? "Layout" : "Code"}
                    >
                        {rawMode ? "UI Mode" : "JSON"}
                    </Button>
                )}
            </div>

            {/* ── Баннер критических ошибок (блокирует Close) ──────────────── */}
            {hasCriticalErrors && (
                <div className="mb-4 p-3.5 bg-rose-950/50 border border-rose-500/60 rounded-xl animate-in fade-in">
                    <div className="flex items-start gap-2.5">
                        <Icon name="WarningOctagon" weight="fill" className="text-rose-400 text-xl shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-rose-200 font-bold text-sm mb-1">
                                Cannot close — {brokenRules.length} rule{brokenRules.length > 1 ? 's have' : ' has'} errors that will crash Xray
                            </p>
                            <p className="text-rose-300/60 text-[11px] mb-2">
                                Click a rule below to jump to it and fix the issue.
                            </p>
                            <ul className="space-y-1">
                                {brokenRules.map(r => (
                                    <li key={r.idx}>
                                        <button
                                            className="text-[11px] text-left w-full text-rose-300 hover:text-white bg-rose-900/30 hover:bg-rose-800/50 border border-rose-700/40 rounded-lg px-3 py-1.5 transition-colors flex items-start gap-2"
                                            onClick={() => {
                                                setActiveTab('rules');
                                                setActiveRuleIdx(r.idx);
                                                setMobileEditMode(true);
                                                setRawMode(false);
                                            }}
                                        >
                                            <Icon name="ArrowRight" className="shrink-0 mt-0.5" />
                                            <span>
                                                <b className="text-rose-200">{r.label}</b>
                                                {" — "}
                                                {r.errors[0].message}
                                                {r.errors.length > 1 && <span className="text-rose-400/60"> (+{r.errors.length - 1} more)</span>}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Основной блок ─────────────────────────────────────────────── */}
            <div
                className="flex flex-col md:flex-row h-[520px] border border-slate-800 rounded-2xl overflow-hidden bg-slate-900 shadow-2xl relative"
                style={{ '--sidebar-width': `${sidebarWidth}px` } as any}
            >
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
                                    <input
                                        className="w-full bg-slate-950 border border-slate-700 rounded-md pl-8 pr-2 py-1.5 text-[11px] text-white outline-none focus:border-indigo-500 transition-colors"
                                        placeholder="Search by name, domain, ip..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            <RuleList
                                rules={filteredRules}
                                activeIndex={activeRuleIdx}
                                onSelect={(idx: number) => handleSelectRule(filteredRules[idx].originalIndex)}
                                onDelete={(idx: number) => handleDeleteRule(filteredRules[idx].originalIndex)}
                                onReorder={searchQuery ? undefined : (newRules: any) => {
                                    reorderRules(newRules.map(({ originalIndex: _, ...rest }: any) => rest));
                                }}
                            />
                        </div>

                        <div className="hidden md:block w-1 bg-slate-800 hover:bg-indigo-500 cursor-col-resize z-10 shrink-0" onMouseDown={startResizing} />

                        <div className={`flex-1 flex flex-col h-full bg-slate-900/50 min-w-0 ${mobileEditMode ? 'flex' : 'hidden md:flex'}`}>
                            <RuleEditor
                                rule={rules[activeRuleIdx!]}
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
                        <div className={`w-full md:w-[var(--sidebar-width)] bg-slate-950 border-r border-slate-800 flex flex-col h-full shrink-0 ${mobileEditMode ? 'hidden md:flex' : 'flex'}`}>
                            <div className="p-3 border-b border-slate-800 flex justify-between bg-slate-900/50 items-center">
                                <span className="text-xs font-bold text-slate-400 pl-2 uppercase tracking-widest">Balancers</span>
                                <Button variant="ghost" icon="Plus" className="py-1 px-2" onClick={() => {
                                    const nb = { tag: "bal-" + (balancers.length + 1), selector: [], strategy: { type: "random" } };
                                    updateSection('routing', { ...config.routing, balancers: [...balancers, nb] });
                                }} />
                            </div>
                            <BalancerList
                                balancers={balancers}
                                activeIndex={activeBalancerIdx}
                                onSelect={(idx: number) => { setActiveBalancerIdx(idx); setMobileEditMode(true); }}
                                onDelete={(idx: number) => {
                                    const n = [...balancers];
                                    n.splice(idx, 1);
                                    updateSection('routing', { ...config.routing, balancers: n });
                                }}
                            />
                        </div>

                        <div className="hidden md:block w-1 bg-slate-800 hover:bg-indigo-500 cursor-col-resize z-10 shrink-0" onMouseDown={startResizing} />

                        <div className={`flex-1 flex flex-col h-full bg-slate-900/50 min-w-0 ${mobileEditMode ? 'flex' : 'hidden md:flex'}`}>
                            <BalancerEditor
                                balancer={balancers[activeBalancerIdx!]}
                                onChange={(val: any) => {
                                    const n = [...balancers];
                                    n[activeBalancerIdx!] = val;
                                    updateSection('routing', { ...config.routing, balancers: n });
                                }}
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