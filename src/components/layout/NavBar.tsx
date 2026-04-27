import React from 'react';
import { Button, ButtonGroup, cn } from '../ui/Button';
import { Icon } from '../ui/Icon';

interface NavBarProps {
    remnawave: any;
    pushStage: 'idle' | 'confirm';
    setPushStage: (stage: 'idle' | 'confirm') => void;
    handleRealPush: () => void;
    disconnectRemnawave: () => void;
    setRemnawaveModalOpen: (open: boolean) => void;
    criticalCount: number;
    warningCount: number;
    setDiagnosticsOpen: (open: boolean) => void;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    downloadConfig: () => void;
    setAboutOpen: (open: boolean) => void;
    configExists: boolean;
}

export const NavBar = ({
    remnawave,
    pushStage,
    setPushStage,
    handleRealPush,
    disconnectRemnawave,
    setRemnawaveModalOpen,
    criticalCount,
    warningCount,
    setDiagnosticsOpen,
    handleFileUpload,
    downloadConfig,
    setAboutOpen,
    configExists
}: NavBarProps) => {
    return (
        <nav className="h-16 shrink-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50 px-4 shadow-2xl flex items-center justify-between">
            {/* --- Left Side: Logo & Status --- */}
            <div className="flex items-center gap-3 min-w-0">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-500/20 shrink-0">
                    <Icon name="Planet" weight="fill" className="text-xl" />
                </div>
                <div className="flex flex-col leading-tight hidden sm:flex">
                    <span className="font-black text-sm tracking-tight text-white uppercase">Xray GUI</span>
                    {remnawave.connected ? (
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            Cloud Linked
                        </span>
                    ) : (
                        <span className="text-[10px] text-slate-500 font-medium">Local Mode</span>
                    )}
                </div>

                {/* --- Diagnostics Indicator --- */}
                {(criticalCount > 0 || warningCount > 0) && (
                    <div 
                        onClick={() => setDiagnosticsOpen(true)}
                        className={cn(
                            "flex items-center h-8 gap-2 px-3 rounded-full border cursor-pointer transition-all hover:scale-105 active:scale-95 ml-2",
                            criticalCount > 0 
                                ? "text-rose-400 bg-rose-400/10 border-rose-400/20 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.2)]" 
                                : "text-amber-400 bg-amber-400/10 border-amber-400/20"
                        )}
                    >
                        <Icon name={criticalCount > 0 ? "XCircle" : "Warning"} weight="bold" />
                        <span className="text-[10px] font-black uppercase hidden md:inline">
                            {criticalCount > 0 ? `${criticalCount} Critical` : `${warningCount} Warnings`}
                        </span>
                    </div>
                )}
            </div>

            {/* --- Right Side: Actions --- */}
            <div className="flex items-center gap-3">
                {/* --- Remnawave / Cloud Actions --- */}
                {remnawave.connected ? (
                    <ButtonGroup>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            icon="ListDashes" 
                            iconWeight="bold"
                            onClick={() => setRemnawaveModalOpen(true)}
                            title="Switch Profile"
                        />
                        <Button 
                            variant={pushStage === 'confirm' ? 'warning' : 'secondary'} 
                            size="sm" 
                            icon={pushStage === 'confirm' ? "SealCheck" : "CloudArrowUp"}
                            iconWeight="bold"
                            onClick={pushStage === 'idle' ? () => setPushStage('confirm') : handleRealPush}
                            className={cn(
                                "transition-all duration-300 min-w-[36px] md:min-w-[90px]",
                                pushStage === 'confirm' && "animate-pulse"
                            )}
                        >
                            <span className="hidden md:inline">{pushStage === 'confirm' ? 'Confirm?' : 'Push'}</span>
                        </Button>
                        <div className="w-px h-4 bg-slate-800 mx-0.5" />
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            icon="LinkBreak" 
                            iconWeight="bold"
                            onClick={disconnectRemnawave}
                            title="Disconnect"
                            className="text-slate-500 hover:text-rose-500"
                        />
                    </ButtonGroup>
                ) : (
                    <Button 
                        variant="secondary" 
                        size="md" 
                        icon="Cloud" 
                        onClick={() => setRemnawaveModalOpen(true)}
                        className="border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10"
                    >
                        <span className="hidden md:inline">Connect Cloud</span>
                    </Button>
                )}

                <div className="w-px h-8 bg-slate-800/50 mx-1 hidden sm:block" />

                {/* --- Local Config Actions --- */}
                <div className="flex gap-2">
                    <label className="flex">
                        <Button as="div" variant="secondary" size="md" icon="FolderOpen" className="cursor-pointer">
                            <span className="hidden md:inline">Open</span>
                            <input type="file" className="hidden" accept=".json" onChange={handleFileUpload} />
                        </Button>
                    </label>
                    <Button 
                        variant="success" 
                        size="md" 
                        icon="DownloadSimple" 
                        onClick={downloadConfig} 
                        disabled={!configExists}
                    >
                        <span className="hidden md:inline">Download</span>
                    </Button>
                </div>

                <div className="w-px h-8 bg-slate-800/50 mx-1 hidden sm:block" />

                {/* --- Secondary Actions --- */}
                <div className="flex items-center gap-1">
                    <Button 
                        variant="outline"
                        color="secondary"
                        size="sm" 
                        icon="Info" 
                        onClick={() => setAboutOpen(true)} 
                        title="About"
                    />
                    <a href="https://xtls.github.io/" target="_blank" rel="noopener noreferrer" className="hidden sm:block">
                        <Button variant="outline" color="info" size="sm" icon="BookOpen">
                            Docs
                        </Button>
                    </a>
                </div>
            </div>
        </nav>
    );
};
