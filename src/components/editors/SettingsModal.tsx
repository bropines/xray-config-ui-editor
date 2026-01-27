import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useConfigStore } from '../../store/configStore';
import { LogEditor } from './settings/LogEditor';
import { ApiStatsEditor } from './settings/ApiStatsEditor';
import { PolicyEditor } from './settings/PolicyEditor';
import { ObservatoryEditor } from './settings/ObservatoryEditor';

export const SettingsModal = ({ onClose }) => {
    const { config, updateSection, toggleSection } = useConfigStore();
    const [activeTab, setActiveTab] = useState<'general' | 'policy' | 'observatory'>('general');

    const outboundTags = (config?.outbounds || []).map(o => o.tag).filter(t => t);

    return (
        <Modal 
            title="General Settings" 
            onClose={onClose} 
            onSave={() => onClose()} // Auto-save via store actions
            extraButtons={
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button onClick={() => setActiveTab('general')} className={`px-4 py-1.5 text-xs font-bold rounded transition-all ${activeTab === 'general' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Log & API</button>
                    <button onClick={() => setActiveTab('policy')} className={`px-4 py-1.5 text-xs font-bold rounded transition-all ${activeTab === 'policy' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Policy</button>
                    <button onClick={() => setActiveTab('observatory')} className={`px-4 py-1.5 text-xs font-bold rounded transition-all ${activeTab === 'observatory' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Observatory</button>
                </div>
            }
        >
            <div className="h-[500px] overflow-y-auto custom-scroll p-1">
                <div className="max-w-2xl mx-auto space-y-8">
                    
                    {activeTab === 'general' && (
                        <>
                            <LogEditor 
                                log={config?.log} 
                                onChange={v => updateSection('log', v)} 
                                onToggle={d => toggleSection('log', d)} 
                            />
                            <div className="border-t border-slate-800 my-6"></div>
                            <ApiStatsEditor 
                                api={config?.api} 
                                stats={config?.stats}
                                onUpdateApi={v => updateSection('api', v)}
                                onToggleApi={d => toggleSection('api', d)}
                                onToggleStats={d => toggleSection('stats', d)}
                            />
                        </>
                    )}

                    {activeTab === 'policy' && (
                        <PolicyEditor 
                            policy={config?.policy} 
                            onChange={v => updateSection('policy', v)}
                            onToggle={d => toggleSection('policy', d)}
                        />
                    )}

                    {activeTab === 'observatory' && (
                        <ObservatoryEditor 
                            observatory={config?.observatory}
                            outboundTags={outboundTags}
                            onChange={v => updateSection('observatory', v)}
                            onToggle={d => toggleSection('observatory', d)}
                        />
                    )}

                </div>
            </div>
        </Modal>
    );
};