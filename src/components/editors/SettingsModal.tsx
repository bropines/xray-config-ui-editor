import React from 'react';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { EditorLayout } from '../ui/EditorLayout';
import { Card } from '../ui/Card';
import { Select } from '../ui/Select';

import { LogEditor } from './settings/LogEditor';
import { ApiStatsEditor } from './settings/ApiStatsEditor';
import { PolicyEditor } from './settings/PolicyEditor';
import { ObservatoryEditor } from './settings/ObservatoryEditor';
import { BurstObservatoryEditor } from './settings/BurstObservatoryEditor';
import { SpiderPathsEditor } from './settings/SpiderPathsEditor';
import { WarpRelaySettings } from './settings/WarpRelaySettings';

import { useSettingsEditor } from '../../hooks/useSettingsEditor';
import { useConfigStore } from '../../store/configStore';
import { useShallow } from 'zustand/react/shallow';
import { CORE_VERSIONS, type CoreVersion } from '../../core/xray/versions';
import { t } from '../../i18n';

const VERSION_ROLE_LABELS = (): Record<CoreVersion['role'], string> => ({
    minimum: t("Oldest supported release"),
    remnawave: t("What Remnawave nodes run"),
    previous: t("Previous release"),
    latest: t("Newest release"),
});

export const SettingsModal = ({ onClose }: { onClose: () => void }) => {
    const { rawConfigText } = useConfigStore(useShallow(state => ({ rawConfigText: state.rawConfigText })));
    const {
        coreVersion,
        setCoreVersion,
        activeTab,
        setActiveTab,
        rawMode,
        setRawMode,
        rawText,
        outboundTags,
        coreSettings,
        handleRawUpdate,
        downloadCoreJson,
        config,
        updateSection,
        toggleSection
    } = useSettingsEditor();


    // Same switch as DNS's footer: the tab strip is navigation, so it sits
    // with the other controls at the foot rather than above the content.
    const tabButton = (id: typeof activeTab, label: string) => (
        <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-2.5 py-1.5 text-xs font-bold rounded transition-all ${
                activeTab === id ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
        >
            {label}
        </button>
    );
    const tabs = (
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
            {tabButton('general', t("General"))}
            {tabButton('policy', t("Policy"))}
            {tabButton('observatory', t("Observatory"))}
        </div>
    );

    const extraButtons = (
        <>
            <Button variant="success" className="text-xs py-1" onClick={downloadCoreJson} icon="DownloadSimple">{t("Export")}</Button>
        </>
    );

    return (
        <EditorLayout
            title={t("General Settings")}
            local={coreSettings}
            setLocal={handleRawUpdate}
            rawText={rawText}
            rawMode={rawMode}
            setRawMode={setRawMode}
            errors={[]}
            onSave={onClose}
            onClose={onClose}
            schemaMode="full"
            extraButtons={extraButtons}
            tabs={tabs}
            rawConfigText={rawConfigText}
            onSaveShortcut={() => useConfigStore.getState().saveActiveProfile()}
            onCommitShortcut={() => useConfigStore.getState().recordSnapshot("Manual Commit (Ctrl+Shift+S)")}
        >
            <div className="max-w-3xl mx-auto space-y-6">
                {activeTab === 'general' && (
                    <>
                        <Card title={t("Core Compatibility & Generators")} icon="Cpu">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* The options used to be v1.8.10 / v1.8.0 / v1.5.0 and
                                    changed nothing, because nothing read them. These are
                                    the lines the feature table in core/xray/versions
                                    actually describes. */}
                                <Select
                                    label={t("Target Xray-core Version")}
                                    hint={t("What the editors offer and what diagnostics call refused or silently ignored both follow this.")}
                                    value={coreVersion}
                                    onChange={val => setCoreVersion(val)}
                                    options={CORE_VERSIONS.slice().reverse().map(version => ({
                                        value: version.id,
                                        label: version.tag,
                                        description: VERSION_ROLE_LABELS()[version.role],
                                    }))}
                                />
                                <WarpRelaySettings />
                            </div>
                        </Card>

                        <SpiderPathsEditor />

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
                        <div className="p-3 bg-indigo-900/10 border border-indigo-500/20 rounded-xl text-[11px] text-indigo-300 flex items-start gap-2">
                            <Icon name="Info" className="shrink-0 mt-0.5" />
                            <span>{t("Use Observatory for steady periodic checks, or Burst Observatory for randomised stealth checks. Pick one based on how your balancers are set up.")}</span>
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
