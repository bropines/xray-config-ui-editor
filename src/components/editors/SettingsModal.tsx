import React from 'react';
import { Icon } from '../ui/Icon';
import { Button, ButtonGroup, cn } from '../ui/Button';
import { EditorLayout } from '../ui/EditorLayout';
import { Card } from '../ui/Card';
import { FormField } from '../ui/FormField';
import { Select } from '../ui/Select';

import { LogEditor } from './settings/LogEditor';
import { ApiStatsEditor } from './settings/ApiStatsEditor';
import { PolicyEditor } from './settings/PolicyEditor';
import { ObservatoryEditor } from './settings/ObservatoryEditor';
import { BurstObservatoryEditor } from './settings/BurstObservatoryEditor';

import { useSettingsEditor } from '../../hooks/useSettingsEditor';

export const SettingsModal = ({ onClose }: { onClose: () => void }) => {
    const {
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
        config,
        updateSection,
        toggleSection
    } = useSettingsEditor();

    const tabs = (
        <ButtonGroup className="bg-slate-950/80 border-slate-800">
            <Button 
                variant={activeTab === 'general' ? 'primary' : 'ghost'} 
                size="xs" 
                onClick={() => setActiveTab('general')}
                className={cn("px-4 uppercase tracking-tighter", activeTab !== 'general' && "text-slate-500")}
            >
                Log & API
            </Button>
            <Button 
                variant={activeTab === 'policy' ? 'primary' : 'ghost'} 
                size="xs" 
                onClick={() => setActiveTab('policy')}
                className={cn("px-4 uppercase tracking-tighter", activeTab !== 'policy' && "text-slate-500")}
            >
                Policy
            </Button>
            <Button 
                variant={activeTab === 'observatory' ? 'primary' : 'ghost'} 
                size="xs" 
                onClick={() => setActiveTab('observatory')}
                className={cn("px-4 uppercase tracking-tighter", activeTab !== 'observatory' && "text-slate-500")}
            >
                Observatory
            </Button>
        </ButtonGroup>
    );

    const extraButtons = (
        <div className="flex items-center gap-4">
            {!rawMode && tabs}
            <Button variant="success" size="sm" onClick={downloadCoreJson} icon="DownloadSimple" iconWeight="bold">
                Export
            </Button>
        </div>
    );

    return (
        <EditorLayout
            title="Core Settings"
            local={coreSettings}
            setLocal={handleRawUpdate}
            rawMode={rawMode}
            setRawMode={setRawMode}
            errors={[]}
            onSave={onClose}
            onClose={onClose}
            schemaMode="full"
            extraButtons={extraButtons}
        >
            <div className="max-w-4xl mx-auto space-y-8 py-2">
                {activeTab === 'general' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                        <Card title="Core Compatibility" icon="Cpu" iconColor="bg-slate-700">
                            <FormField label="Target Xray-core Version" help="Adjusts UI fields and validation based on core features.">
                                <Select 
                                    value={coreVersion}
                                    onChange={e => setCoreVersion(e.target.value)}
                                    className="font-black text-indigo-400"
                                >
                                    <option value="v1.8.10">Latest (v1.8.10+)</option>
                                    <option value="v1.8.0">Stable (v1.8.0)</option>
                                    <option value="v1.5.0">Legacy (v1.5.0)</option>
                                </Select>
                            </FormField>
                        </Card>
                        
                        <LogEditor 
                            log={config?.log} 
                            onChange={(v: any) => updateSection('log', v)} 
                            onToggle={(d: any) => toggleSection('log', d)} 
                        />
                        
                        <ApiStatsEditor 
                            api={config?.api} 
                            stats={config?.stats}
                            onUpdateApi={(v: any) => updateSection('api', v)}
                            onToggleApi={(d: any) => toggleSection('api', d)}
                            onToggleStats={(d: any) => toggleSection('stats', d)}
                        />
                    </div>
                )}

                {activeTab === 'policy' && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                        <PolicyEditor 
                            policy={config?.policy} 
                            onChange={(v: any) => updateSection('policy', v)}
                            onToggle={(d: any) => toggleSection('policy', d)}
                        />
                    </div>
                )}

                {activeTab === 'observatory' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl flex items-start gap-4">
                            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                                <Icon name="Info" weight="fill" className="text-xl" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-xs font-black text-indigo-300 uppercase tracking-wider">Observatory Guide</h4>
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                    Use <b>Observatory</b> for standard periodic health checks, or <b>Burst Observatory</b> for randomized stealth checks. Choose the one that fits your traffic pattern.
                                </p>
                            </div>
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
        </EditorLayout>
    );
};
