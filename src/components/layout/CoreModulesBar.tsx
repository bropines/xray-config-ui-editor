import React from 'react';
import { Button, ButtonGroup, cn } from '../ui/Button';
import { Icon } from '../ui/Icon';

interface CoreModulesBarProps {
    modulesVisible: boolean;
    setModulesVisible: (visible: boolean) => void;
    setModal: (modal: any) => void;
    setGeoViewerOpen: (open: boolean) => void;
    rawMode: boolean;
    setRawMode: (mode: boolean) => void;
    setConfig: (config: any) => void;
}

export const CoreModulesBar = ({
    modulesVisible,
    setModulesVisible,
    setModal,
    setGeoViewerOpen,
    rawMode,
    setRawMode,
    setConfig
}: CoreModulesBarProps) => {
    return (
        <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900/50 border border-slate-800/50 p-3 md:p-4 rounded-3xl shadow-xl gap-4 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
                {/* --- Section Title & Mobile Toggle --- */}
                <div className="flex items-center justify-between w-full md:w-auto px-1">
                    <h2 className="font-black text-slate-300 flex items-center gap-3 text-sm md:text-base uppercase tracking-tighter">
                        <div className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded-2xl border border-slate-700 shadow-inner">
                            <Icon name="SlidersHorizontal" weight="fill" className="text-indigo-400 text-lg" />
                        </div>
                        Core Modules
                    </h2>
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setModulesVisible(!modulesVisible)}
                        className="md:hidden"
                        icon={modulesVisible ? "CaretUp" : "CaretDown"}
                        iconWeight="bold"
                    />
                </div>

                <div className="hidden md:block w-px h-8 bg-slate-800/80 mx-2" />

                {/* --- Module Buttons --- */}
                <div className={cn(
                    "flex-wrap gap-2 w-full md:w-auto animate-in fade-in slide-in-from-top-1 duration-200",
                    modulesVisible ? "flex" : "hidden md:flex"
                )}>
                    <ButtonGroup className="w-full md:w-auto">
                        <Button size="sm" variant="secondary" onClick={() => setModal({ type: 'settings', data: null, index: null })} icon="Gear" iconWeight="bold">
                            Settings
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setModal({ type: 'reverse', data: null, index: null })} icon="ArrowsLeftRight" iconWeight="bold">
                            Reverse
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setModal({ type: 'topology', data: null, index: null })} icon="GitMerge" iconWeight="bold">
                            Topology
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setGeoViewerOpen(true)} icon="GlobeHemisphereWest" iconWeight="bold">
                            Geo Viewer
                        </Button>
                    </ButtonGroup>
                </div>
            </div>

            {/* --- View Mode & Clear --- */}
            <div className={cn(
                "flex-wrap gap-2 w-full md:w-auto pt-3 md:pt-0 border-t border-slate-800 md:border-transparent animate-in fade-in slide-in-from-top-1 duration-200",
                modulesVisible ? "flex" : "hidden md:flex"
            )}>
                <ButtonGroup className="w-full md:w-auto">
                    <Button 
                        variant={rawMode ? "primary" : "secondary"} 
                        size="sm"
                        onClick={() => setRawMode(!rawMode)} 
                        icon={rawMode ? "Layout" : "Code"}
                        iconWeight="bold"
                    >
                        {rawMode ? "UI Mode" : "JSON Mode"}
                    </Button>
                    <Button 
                        variant="danger" 
                        size="sm"
                        onClick={() => { if (confirm('Clear config?')) setConfig(null as any); }} 
                        icon="XCircle"
                        iconWeight="bold"
                        title="Close Config"
                    >
                        Clear
                    </Button>
                </ButtonGroup>
            </div>
        </div>
    );
};
