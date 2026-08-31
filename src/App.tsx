import React from 'react';
import { Toaster } from 'sonner';
import { useAppLogic } from './hooks/useAppLogic';
import { getPresets } from './core/presets';
import {
    AppNav,
    WelcomeScreen,
    ConfigDashboard,
    DragDropOverlay,
    ModalManager,
} from './components/layout';

export const App = () => {
    const [modulesVisible, setModulesVisible] = React.useState(false);
    const {
        config, setConfig, deleteItem, deleteItems, addItem, remnawave, disconnectRemnawave, initDns,
        modal, setModal,
        sectionModal, setSectionModal,
        remnawaveModalOpen, setRemnawaveModalOpen,
        batchModalOpen, setBatchModalOpen,
        geoViewerOpen, setGeoViewerOpen,
        diagnosticsOpen, setDiagnosticsOpen,
        aboutOpen, setAboutOpen,
        warpModalOpen, setWarpModalOpen,
        configInspectorOpen, setConfigInspectorOpen,
        historyModalOpen, setHistoryModalOpen,
        onOpenHistory, onCloseHistory,
        editorSettingsOpen, setEditorSettingsOpen,
        onOpenEditorSettings, onCloseEditorSettings,
        rawMode, setRawMode,
        isDragging,
        hasHydrated,
        obSearch, setObSearch,
        pushStage, setPushStage,
        handleRealPush,
        handleFileUpload,
        downloadConfig,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleSaveModal,
        handleSaveSection,
        openSectionJson,
        diagnostics,
        criticalCount,
        warningCount,
        filteredOutbounds,
        moveItem,
    } = useAppLogic();

    const closeModal = () => setModal({ type: null, data: null, index: null });

    // The persisted store reads from IndexedDB asynchronously. Render nothing
    // interactive until that resolves — otherwise a preset pick / import
    // that happens in this window can be silently overwritten once the
    // async rehydration lands (see configStore's onRehydrateStorage).
    if (!hasHydrated) {
        return (
            <div className="h-dvh flex items-center justify-center bg-slate-950 text-slate-400 font-sans">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 rounded-full border-2 border-slate-700 border-t-indigo-500 animate-spin" />
                    <span className="text-sm">Loading your workspace…</span>
                </div>
            </div>
        );
    }

    return (
        <div
            className="h-dvh flex flex-col bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <Toaster
                theme="dark"
                position="bottom-right"
                toastOptions={{ style: { background: '#1e293b', border: '1px solid #334155', color: 'white' } }}
            />

            <DragDropOverlay visible={isDragging} />

            <AppNav
                connected={remnawave.connected}
                pushStage={pushStage}
                criticalCount={criticalCount}
                warningCount={warningCount}
                hasConfig={!!config}
                onOpenDiagnostics={() => setDiagnosticsOpen(true)}
                onOpenRemnawave={() => setRemnawaveModalOpen(true)}
                onOpenSwitchProfile={() => setRemnawaveModalOpen(true)}
                onPush={pushStage === 'idle' ? () => setPushStage('confirm') : handleRealPush}
                onDisconnect={disconnectRemnawave}
                onOpenAbout={() => setAboutOpen(true)}
                onFileUpload={handleFileUpload}
                onDownload={downloadConfig}
                onOpenEditorSettings={onOpenEditorSettings}
                onOpenHistory={onOpenHistory}
                onClearConfig={() => setConfig(null as any)}
            />

            <main className="flex-1 min-h-0 flex flex-col p-3 md:p-4 max-w-[1800px] mx-auto w-full overflow-hidden">
                {!config ? (
                    <WelcomeScreen
                        presets={getPresets()}
                        onSelectPreset={(cfg) => setConfig(cfg)}
                        onFileUpload={handleFileUpload}
                        onOpenRemnawave={() => setRemnawaveModalOpen(true)}
                    />
                ) : (
                    <ConfigDashboard
                        config={config}
                        rawMode={rawMode}
                        setRawMode={setRawMode}
                        setConfig={setConfig}
                        filteredOutbounds={filteredOutbounds}
                        obSearch={obSearch}
                        setObSearch={setObSearch}
                        modulesVisible={modulesVisible}
                        setModulesVisible={setModulesVisible}
                        onEditInbound={(data, index) => setModal({ type: 'inbound', data, index })}
                        onDeleteInbound={(i) => deleteItem('inbounds', i)}
                        onAddInbound={() => setModal({ type: 'inbound', data: null, index: null })}
                        onOpenInboundJson={() => openSectionJson('inbounds', 'Inbounds')}
                        onEditRouting={() => setModal({ type: 'routing', data: null, index: null })}
                        onOpenRoutingJson={() => openSectionJson('routing', 'Routing')}
                        onEditOutbound={(data, index) => setModal({ type: 'outbound', data, index })}
                        onDeleteOutbound={(i) => deleteItem('outbounds', i)}
                        onDeleteOutbounds={(indices) => deleteItems('outbounds', indices)}
                        onMoveOutbound={(from, to) => moveItem('outbounds', from, to)}
                        onAddOutbound={() => setModal({ type: 'outbound', data: null, index: null })}
                        onOpenOutboundJson={() => openSectionJson('outbounds', 'Outbounds')}
                        onBatchImport={() => setBatchModalOpen(true)}
                        onOpenWarpModal={() => setWarpModalOpen(true)}
                        onEditDns={() => { initDns(); setModal({ type: 'dns', data: null, index: null }); }}
                        onOpenDnsJson={() => openSectionJson('dns', 'DNS Config')}
                        onOpenSettings={() => setModal({ type: 'settings', data: null, index: null })}
                        onOpenReverse={() => setModal({ type: 'reverse', data: null, index: null })}
                        onOpenTopology={() => setModal({ type: 'topology', data: null, index: null })}
                        onOpenGeoViewer={() => setGeoViewerOpen(true)}
                        onOpenConfigInspector={() => setConfigInspectorOpen(true)}
                        onOpenEditorSettings={onOpenEditorSettings}
                    />
                )}
            </main>

            <ModalManager
                modal={modal}
                onCloseModal={closeModal}
                onSaveModal={handleSaveModal}
                sectionModal={sectionModal}
                onCloseSectionModal={() => setSectionModal({ ...sectionModal, open: false })}
                onSaveSection={handleSaveSection}
                remnawaveModalOpen={remnawaveModalOpen}
                onCloseRemnawave={() => setRemnawaveModalOpen(false)}
                batchModalOpen={batchModalOpen}
                onCloseBatch={() => setBatchModalOpen(false)}
                geoViewerOpen={geoViewerOpen}
                onCloseGeoViewer={() => setGeoViewerOpen(false)}
                diagnosticsOpen={diagnosticsOpen}
                onCloseDiagnostics={() => setDiagnosticsOpen(false)}
                warpModalOpen={warpModalOpen}
                onCloseWarpModal={() => setWarpModalOpen(false)}
                onGenerateWarp={(ob: any) => addItem('outbounds', ob)}
                diagnostics={diagnostics}
                aboutOpen={aboutOpen}
                onCloseAbout={() => setAboutOpen(false)}
                configInspectorOpen={configInspectorOpen}
                onCloseConfigInspector={() => setConfigInspectorOpen(false)}
                historyModalOpen={historyModalOpen}
                onCloseHistory={onCloseHistory}
                onOpenHistory={onOpenHistory}
                editorSettingsOpen={editorSettingsOpen}
                onCloseEditorSettings={onCloseEditorSettings}
                setModal={setModal}
                openSectionJson={openSectionJson}
            />
        </div>
    );
};