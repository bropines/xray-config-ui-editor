import React from 'react';
import { Modal } from '../ui/Modal';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { JsonField } from '../ui/JsonField';

// Возвращаем твои родные компоненты!
import { LogEditor } from './settings/LogEditor';
import { ApiStatsEditor } from './settings/ApiStatsEditor';
import { PolicyEditor } from './settings/PolicyEditor';
import { ObservatoryEditor } from './settings/ObservatoryEditor';
import { BurstObservatoryEditor } from './settings/BurstObservatoryEditor';

import { useSettingsEditor } from '../../hooks/useSettingsEditor';

export const SettingsModal = ({ onClose }: { onClose: () => void }) => {
    const {
        config,
        coreVersion,
        setCoreVersion,
        activeTab,
        setActiveTab,
        rawMode,
        setRawMode,
        outboundTags,
        coreSettings,
        handleRawUpdate,
        downloadCoreJson,
        updateSection,
        toggleSection
    } = useSettingsEditor();

    // --- РЕЖИМ JSON (Отображается вместо форм) ---
    if (rawMode) {
        return (
            <Modal title="Core Settings (JSON)" onClose={onClose} onSave={onClose}
                extraButtons={
                    <div className="flex gap-2">
                        <Button variant="success" className="text-xs py-1" onClick={downloadCoreJson} icon="DownloadSimple">Export JSON</Button>
                        <Button variant="secondary" className="text-xs py-1" onClick={() => setRawMode(false)} icon="Layout">Form Mode</Button>
                    </div>
                }
                className="h-full overflow-hidden"
            >
                <div className="flex-1 min-h-0 h-full flex flex-col">
                    <div className="bg-slate-800/50 border border-slate-700/50 p-2 rounded text-[10px] text-slate-400 mb-2 shrink-0">
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
            <div className="h-full md:max-h-[60vh] adaptive-height overflow-y-auto custom-scroll p-1">
                <div className="max-w-2xl mx-auto space-y-8">
                    
                    {activeTab === 'general' && (
                        <>
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                                    <Icon name="Cpu" /> Core Compatibility
                                </h4>
                                <div>
                                    <label className="label-xs">Target Xray-core Version</label>
                                    <select className="input-base"
                                        value={coreVersion}
                                        onChange={e => setCoreVersion(e.target.value)}
                                    >
                                        <option value="v1.8.10">Latest (v1.8.10+)</option>
                                        <option value="v1.8.0">Stable (v1.8.0)</option>
                                        <option value="v1.5.0">Legacy (v1.5.0)</option>
                                    </select>
                                    <p className="text-[10px] text-slate-500 mt-2 italic">
                                        Adjusts UI fields and validation based on core features (e.g., XHTTP requires v1.8.10+).
                                    </p>
                                </div>
                            </div>
                            <div className="border-t border-slate-800 my-6"></div>
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