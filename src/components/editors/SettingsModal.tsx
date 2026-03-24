import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { useConfigStore } from '../../store/configStore';
import { JsonField } from '../ui/JsonField';

// Возвращаем твои родные компоненты!
import { LogEditor } from './settings/LogEditor';
import { ApiStatsEditor } from './settings/ApiStatsEditor';
import { PolicyEditor } from './settings/PolicyEditor';
import { ObservatoryEditor } from './settings/ObservatoryEditor';
import { BurstObservatoryEditor } from './settings/BurstObservatoryEditor';

export const SettingsModal = ({ onClose }: { onClose: () => void }) => {
    const { config, updateSection, toggleSection } = useConfigStore();
    const [activeTab, setActiveTab] = useState<'general' | 'policy' | 'observatory'>('general');
    
    // Тот самый флаг для переключения в JSON режим
    const [rawMode, setRawMode] = useState(false);

    const outboundTags = (config?.outbounds || []).map(o => o.tag).filter(t => t);

    // Функция экспорта (собираем все настройки ядра)
    const downloadCoreJson = () => {
        const coreSettings = {
            log: config?.log,
            api: config?.api,
            policy: config?.policy,
            observatory: config?.observatory,
            burstObservatory: config?.burstObservatory,
            stats: config?.stats
        };
        const blob = new Blob([JSON.stringify(coreSettings, null, 2)], { type: "application/json" });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = "core-settings.json";
        a.click();
    };

    // --- РЕЖИМ JSON (Отображается вместо форм) ---
    if (rawMode) {
        const coreSettings = {
            log: config?.log,
            api: config?.api,
            policy: config?.policy,
            observatory: config?.observatory,
            burstObservatory: config?.burstObservatory,
            stats: config?.stats
        };
        
        const handleRawUpdate = (newVal: any) => {
            if (!newVal) return;
            if (newVal.log !== undefined) updateSection('log', newVal.log);
            if (newVal.api !== undefined) updateSection('api', newVal.api);
            if (newVal.policy !== undefined) updateSection('policy', newVal.policy);
            if (newVal.observatory !== undefined) updateSection('observatory', newVal.observatory);
            if (newVal.burstObservatory !== undefined) updateSection('burstObservatory', newVal.burstObservatory);
            if (newVal.stats !== undefined) updateSection('stats', newVal.stats);
        };

        return (
            <Modal title="Core Settings (JSON)" onClose={onClose} onSave={onClose}
                extraButtons={
                    <div className="flex gap-2">
                        <Button variant="success" className="text-xs py-1" onClick={downloadCoreJson} icon="DownloadSimple">Export JSON</Button>
                        <Button variant="secondary" className="text-xs py-1" onClick={() => setRawMode(false)} icon="Layout">Form Mode</Button>
                    </div>
                }
            >
                <div className="h-[500px] flex flex-col">
                    <div className="bg-slate-800/50 border border-slate-700/50 p-2 rounded text-[10px] text-slate-400 mb-2">
                        Here you can edit all core modules at once natively.
                    </div>
                    <JsonField label="Core Settings (Combined)" value={coreSettings} onChange={handleRawUpdate} schemaMode="full" className="flex-1" />
                </div>
            </Modal>
        );
    }

    // --- РЕЖИМ UI (Твои формы) ---
    return (
        <Modal 
            title="General Settings" 
            onClose={onClose} 
            onSave={() => onClose()} 
            extraButtons={
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
                    <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
                        <button onClick={() => setActiveTab('general')} className={`px-4 py-1.5 text-xs font-bold rounded transition-all ${activeTab === 'general' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Log & API</button>
                        <button onClick={() => setActiveTab('policy')} className={`px-4 py-1.5 text-xs font-bold rounded transition-all ${activeTab === 'policy' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Policy</button>
                        <button onClick={() => setActiveTab('observatory')} className={`px-4 py-1.5 text-xs font-bold rounded transition-all ${activeTab === 'observatory' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Observatory</button>
                    </div>
                    <Button variant="success" className="text-xs py-1 shrink-0" onClick={downloadCoreJson} icon="DownloadSimple">Export</Button>
                    <Button variant="secondary" className="text-xs py-1 shrink-0" onClick={() => setRawMode(true)} icon="Code">JSON</Button>
                </div>
            }
        >
            <div className="h-[500px] overflow-y-auto custom-scroll p-1">
                <div className="max-w-2xl mx-auto space-y-8">
                    
                    {activeTab === 'general' && (
                        <>
                            <LogEditor 
                                log={config?.log} 
                                onChange={(v: any) => updateSection('log', v)} 
                                onToggle={(d: any) => toggleSection('log', d)} 
                            />
                            <div className="border-t border-slate-800 my-6"></div>
                            <ApiStatsEditor 
                                api={config?.api} 
                                stats={config?.stats}
                                onUpdateApi={(v: any) => updateSection('api', v)}
                                onToggleApi={(d: any) => toggleSection('api', d)}
                                onToggleStats={(d: any) => toggleSection('stats', d)}
                            />
                        </>
                    )}

                    {activeTab === 'policy' && (
                        <PolicyEditor 
                            policy={config?.policy} 
                            onChange={(v: any) => updateSection('policy', v)}
                            onToggle={(d: any) => toggleSection('policy', d)}
                        />
                    )}

                    {activeTab === 'observatory' && (
                        <div className="space-y-6">
                            <div className="p-3 bg-indigo-900/20 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 mb-4 flex items-start gap-2">
                                <Icon name="Info" className="shrink-0 mt-0.5" />
                                <span>
                                    Use <b>Observatory</b> for standard periodic checks, or <b>Burst Observatory</b> for randomized stealth checks. Choose one based on your balancers setup.
                                </span>
                            </div>
                            
                            <ObservatoryEditor 
                                observatory={config?.observatory}
                                outboundTags={outboundTags}
                                onChange={(v: any) => updateSection('observatory', v)}
                                onToggle={(d: any) => toggleSection('observatory', d)}
                            />
                            
                            <BurstObservatoryEditor 
                                burstObservatory={config?.burstObservatory}
                                outboundTags={outboundTags}
                                onChange={(v: any) => updateSection('burstObservatory', v)}
                                onToggle={(d: any) => toggleSection('burstObservatory', d)}
                            />
                        </div>
                    )}

                </div>
            </div>
        </Modal>
    );
};