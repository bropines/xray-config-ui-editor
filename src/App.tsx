import React from "react";
import { Toaster } from 'sonner';

// UI Atoms & Molecules
import { Icon } from "./components/ui/Icon";
import { JsonField } from "./components/ui/JsonField";

// Layout & Dashboard Components
import { NavBar } from "./components/layout/NavBar";
import { WelcomeScreen } from "./components/layout/WelcomeScreen";
import { CoreModulesBar } from "./components/layout/CoreModulesBar";
import { InboundsColumn } from "./components/dashboard/InboundsColumn";
import { RoutingColumn } from "./components/dashboard/RoutingColumn";
import { OutboundsColumn } from "./components/dashboard/OutboundsColumn";
import { DnsColumn } from "./components/dashboard/DnsColumn";

// Modals
import { InboundModal } from "./components/editors/InboundModal";
import { OutboundModal } from "./components/editors/OutboundModal";
import { RoutingModal } from "./components/editors/RoutingModal";
import { DnsModal } from "./components/editors/DnsModal";
import { SettingsModal } from "./components/editors/SettingsModal";
import { ReverseModal } from "./components/editors/ReverseModal";
import { TopologyModal } from "./components/topology/TopologyModal";
import { RemnawaveModal } from "./components/editors/RemnawaveModal";
import { SectionJsonModal } from "./components/editors/SectionJsonModal";
import { BatchOutboundModal } from "./components/editors/outbound/BatchOutboundModal";
import { GeoViewerModal } from "./components/editors/GeoViewerModal";
import { DiagnosticsPanel } from "./components/DiagnosticsPanel";
import { AboutModal } from './components/AboutModal';

// Logic & Utils
import { getPresets } from "./utils/presets";
import { useAppLogic } from "./hooks/useAppLogic";

export const App = () => {
    const [modulesVisible, setModulesVisible] = React.useState(false);
    const {
        config, setConfig, deleteItem, remnawave, disconnectRemnawave, initDns,
        modal, setModal,
        sectionModal, setSectionModal,
        remnawaveModalOpen, setRemnawaveModalOpen,
        batchModalOpen, setBatchModalOpen,
        geoViewerOpen, setGeoViewerOpen,
        diagnosticsOpen, setDiagnosticsOpen,
        aboutOpen, setAboutOpen,
        rawMode, setRawMode,
        isDragging,
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
        filteredOutbounds
    } = useAppLogic();

    const presets = getPresets();

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
                toastOptions={{ style: { background: '#0f172a', border: '1px solid #1e293b', color: 'white', borderRadius: '1rem' } }} 
            />

            {/* --- Drag & Drop Overlay --- */}
            {isDragging && (
                <div className="absolute inset-0 z-50 bg-indigo-900/80 backdrop-blur-md border-4 border-indigo-500 border-dashed flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-300">
                    <Icon name="FileArrowDown" className="text-8xl text-indigo-400 mb-4 animate-bounce" weight="fill" />
                    <h2 className="text-2xl md:text-3xl font-black text-white text-center px-4 uppercase tracking-tighter">Drop config.json here</h2>
                </div>
            )}

            {/* --- Navigation Bar --- */}
            <NavBar 
                remnawave={remnawave}
                pushStage={pushStage}
                setPushStage={setPushStage}
                handleRealPush={handleRealPush}
                disconnectRemnawave={disconnectRemnawave}
                setRemnawaveModalOpen={setRemnawaveModalOpen}
                criticalCount={criticalCount}
                warningCount={warningCount}
                setDiagnosticsOpen={setDiagnosticsOpen}
                handleFileUpload={handleFileUpload}
                downloadConfig={downloadConfig}
                setAboutOpen={setAboutOpen}
                configExists={!!config}
            />

            <main className="flex-1 min-h-0 flex flex-col p-3 md:p-4 max-w-[1800px] mx-auto w-full overflow-hidden">
                {!config ? (
                    <WelcomeScreen 
                        presets={presets}
                        setConfig={setConfig}
                        handleFileUpload={handleFileUpload}
                        setRemnawaveModalOpen={setRemnawaveModalOpen}
                    />
                ) : (
                    <div className="flex-1 min-h-0 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* --- Core Modules Action Bar --- */}
                        <CoreModulesBar 
                            modulesVisible={modulesVisible}
                            setModulesVisible={setModulesVisible}
                            setModal={setModal}
                            setGeoViewerOpen={setGeoViewerOpen}
                            rawMode={rawMode}
                            setRawMode={setRawMode}
                            setConfig={setConfig}
                        />

                        {rawMode ? (
                            <div className="flex-1 min-h-0 bg-slate-900 border border-slate-800/80 rounded-3xl overflow-hidden p-6 shadow-2xl flex flex-col">
                                <JsonField 
                                    label="Full Configuration (Auto-saved)" 
                                    value={config} 
                                    onChange={(newConfig: any) => { if (newConfig) setConfig(newConfig); }} 
                                    className="flex-1 relative min-h-0" 
                                />
                            </div>
                        ) : (
                            <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto custom-scroll pb-6 pr-1">
                                <div className="flex flex-col xl:grid xl:grid-cols-3 gap-4 xl:flex-1 xl:min-h-0">
                                    <InboundsColumn 
                                        inbounds={config.inbounds}
                                        openSectionJson={openSectionJson}
                                        setModal={setModal}
                                        deleteItem={deleteItem}
                                    />

                                    <RoutingColumn 
                                        routing={config.routing}
                                        openSectionJson={openSectionJson}
                                        setModal={setModal}
                                    />

                                    <OutboundsColumn 
                                        outbounds={config.outbounds}
                                        filteredOutbounds={filteredOutbounds}
                                        obSearch={obSearch}
                                        setObSearch={setObSearch}
                                        openSectionJson={openSectionJson}
                                        setModal={setModal}
                                        deleteItem={deleteItem}
                                        setBatchModalOpen={setBatchModalOpen}
                                    />
                                </div>

                                <DnsColumn 
                                    dns={config.dns}
                                    initDns={initDns}
                                    openSectionJson={openSectionJson}
                                    setModal={setModal}
                                />
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* --- Global Modals --- */}
            {modal.type === 'inbound' && <InboundModal data={modal.data} onClose={() => setModal({ type: null, data: null, index: null })} onSave={handleSaveModal} />}
            {modal.type === 'outbound' && <OutboundModal data={modal.data} onClose={() => setModal({ type: null, data: null, index: null })} index={modal.index} onSave={handleSaveModal} />}
            {modal.type === 'routing' && <RoutingModal onClose={() => setModal({ type: null, data: null, index: null })} />}
            {modal.type === 'dns' && <DnsModal onClose={() => setModal({ type: null, data: null, index: null })} />}
            {modal.type === 'settings' && <SettingsModal onClose={() => setModal({ type: null, data: null, index: null })} />}
            {modal.type === 'reverse' && <ReverseModal onClose={() => setModal({ type: null, data: null, index: null })} />}
            {modal.type === 'topology' && <TopologyModal onClose={() => setModal({ type: null, data: null, index: null })} />}

            {batchModalOpen && <BatchOutboundModal onClose={() => setBatchModalOpen(false)} />}
            {geoViewerOpen && <GeoViewerModal onClose={() => setGeoViewerOpen(false)} />}

            {sectionModal.open && (
                <SectionJsonModal
                    title={sectionModal.title}
                    data={sectionModal.data}
                    schemaMode={sectionModal.schemaMode}
                    onClose={() => setSectionModal({ ...sectionModal, open: false })}
                    onSave={handleSaveSection}
                />
            )}
            {remnawaveModalOpen && <RemnawaveModal onClose={() => setRemnawaveModalOpen(false)} />}
            {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
            {diagnosticsOpen && <DiagnosticsPanel diagnostics={diagnostics} onClose={() => setDiagnosticsOpen(false)} />}
        </div>
    );
};
