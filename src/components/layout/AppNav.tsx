import React from 'react';
import { Icon } from '../ui';
import { Button } from '../ui';
import { Select } from '../ui/Select';
import { useConfigStore } from '../../store/configStore';

interface AppNavProps {
    /** Whether Remnawave panel is connected */
    connected: boolean;
    /** Active push button stage */
    pushStage: 'idle' | 'confirm';
    /** Number of critical diagnostic errors */
    criticalCount: number;
    /** Number of warnings */
    warningCount: number;
    onOpenDiagnostics: () => void;
    onOpenRemnawave: () => void;
    onOpenSwitchProfile: () => void;
    onPush: () => void;
    onDisconnect: () => void;
    onOpenAbout: () => void;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDownload: () => void;
    hasConfig: boolean;
    onOpenEditorSettings?: () => void;
    onClearConfig?: () => void;
}

/**
 * Top navigation bar with responsive mobile support.
 */
export const AppNav = ({
    connected,
    pushStage,
    criticalCount,
    warningCount,
    onOpenDiagnostics,
    onOpenRemnawave,
    onOpenSwitchProfile,
    onPush,
    onDisconnect,
    onOpenAbout,
    onFileUpload,
    onDownload,
    hasConfig,
    onOpenEditorSettings,
    onClearConfig,
}: AppNavProps) => {
    const {
        profiles,
        activeProfileId,
        switchProfile,
        createProfile,
        remnawave,
        loadRemnawaveProfile,
        config
    } = useConfigStore();

    // Compute selector options for cloud + local profiles
    const selectorOptions = React.useMemo(() => {
        const opts: Array<{ value: string; label: string; description?: string }> = [];

        // Remnawave Cloud Profiles (if connected)
        if (remnawave.connected && remnawave.profiles?.length > 0) {
            remnawave.profiles.forEach((rp) => {
                opts.push({
                    value: `cloud:${rp.uuid}`,
                    label: `☁ ${rp.name || 'Unnamed Cloud Profile'}`,
                    description: `Remnawave Cloud Config (${rp.uuid.substring(0, 8)})`
                });
            });
        }

        // Local Config Profiles
        profiles.forEach((p) => {
            const isCurrent = p.id === activeProfileId && !remnawave.activeProfileUuid;
            const inCount = isCurrent ? (config?.inbounds?.length || 0) : (p.config?.inbounds?.length || 0);
            const outCount = isCurrent ? (config?.outbounds?.length || 0) : (p.config?.outbounds?.length || 0);
            const name = p.name === 'Default Profile' ? 'Default' : p.name;

            opts.push({
                value: `local:${p.id}`,
                label: remnawave.connected ? `💻 Local: ${name}` : name,
                description: `${inCount} inbounds, ${outCount} outbounds`
            });
        });

        // Action to create new local profile
        opts.push({
            value: `action:new_local`,
            label: `+ New Local Profile`,
            description: `Create a new local profile`
        });

        return opts;
    }, [remnawave.connected, remnawave.profiles, profiles, activeProfileId, remnawave.activeProfileUuid, config]);

    // Active option value
    const currentOptionValue = React.useMemo(() => {
        if (remnawave.connected && remnawave.activeProfileUuid) {
            return `cloud:${remnawave.activeProfileUuid}`;
        }
        const activeExists = profiles.some(p => p.id === activeProfileId);
        const fallbackId = activeExists ? activeProfileId : (profiles[0]?.id || 'default');
        return `local:${fallbackId}`;
    }, [remnawave.connected, remnawave.activeProfileUuid, activeProfileId, profiles]);

    const handleSelectChange = (val: string) => {
        if (val.startsWith('cloud:')) {
            const uuid = val.replace('cloud:', '');
            loadRemnawaveProfile(uuid);
        } else if (val.startsWith('local:')) {
            const id = val.replace('local:', '');
            switchProfile(id);
        } else if (val === 'action:new_local') {
            const name = prompt("Enter new local profile name:");
            if (name && name.trim()) {
                createProfile(name.trim());
            }
        }
    };

    return (
        <nav className="h-14 shrink-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/50 px-2 sm:px-4 shadow-2xl flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            {/* Left: Logo + Status */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/20 shrink-0">
                    <Icon name="Planet" weight="fill" className="text-xl" />
                </div>
                <div className="flex flex-col leading-tight hidden sm:flex">
                    <span className="font-black text-sm tracking-tight text-white uppercase">Xray GUI</span>
                    {connected ? (
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            Cloud Linked
                        </span>
                    ) : (
                        <span className="text-[10px] text-slate-500 font-medium">Local Mode</span>
                    )}
                </div>

                {/* Diagnostics badge */}
                {(criticalCount > 0 || warningCount > 0) && (
                    <div
                        onClick={onOpenDiagnostics}
                        className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 rounded-full border cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                            criticalCount > 0
                                ? 'text-rose-400 bg-rose-400/10 border-rose-400/20 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                                : 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                        }`}
                    >
                        <Icon name={criticalCount > 0 ? 'XCircle' : 'Warning'} weight="bold" />
                        <span className="text-[10px] font-black uppercase hidden md:inline">
                            {criticalCount > 0 ? `${criticalCount} Critical` : `${warningCount} Warn`}
                        </span>
                    </div>
                )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Independent Selector OUTSIDE container when config is loaded */}
                {hasConfig && (
                    <div className="w-28 sm:w-36 md:w-52 shrink-0">
                        <Select
                            value={currentOptionValue}
                            onChange={handleSelectChange}
                            options={selectorOptions}
                        />
                    </div>
                )}

                {/* Container for Profiles & Clear buttons */}
                {hasConfig && (
                    <div className="flex items-center gap-1 bg-slate-950/50 p-1 rounded-xl border border-slate-800 h-11 shrink-0">
                        {onOpenEditorSettings && (
                            <Button
                                variant="secondary"
                                onClick={onOpenEditorSettings}
                                icon="FolderUser"
                                className="h-9 px-2 sm:px-3 text-xs rounded-lg shadow-none border-slate-700/60"
                                title="Profiles & Editor Settings"
                            >
                                <span className="hidden sm:inline">Profiles</span>
                            </Button>
                        )}

                        {onClearConfig && (
                            <Button
                                variant="danger"
                                onClick={() => {
                                    if (confirm("Clear config?")) onClearConfig();
                                }}
                                icon="XCircle"
                                className="h-9 px-2 sm:px-3 text-xs rounded-lg shadow-none bg-rose-600 hover:bg-rose-500 text-white font-bold"
                                title="Clear Config"
                            >
                                <span className="hidden sm:inline">Clear</span>
                            </Button>
                        )}
                    </div>
                )}

                {/* Cloud controls (connected) */}
                {connected && (
                    <div className="flex items-center bg-slate-950/50 border border-slate-800 rounded-xl p-1 gap-1 h-11 shrink-0">
                        <button
                            onClick={onOpenSwitchProfile}
                            className="w-9 h-9 flex items-center justify-center hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-400 transition-all"
                            title="Switch Profile"
                        >
                            <Icon name="ListDashes" weight="bold" />
                        </button>
                        <button
                            onClick={onPush}
                            className={`flex items-center justify-center gap-2 px-3 sm:px-4 h-9 rounded-lg font-bold text-xs transition-all duration-300 ${
                                pushStage === 'confirm'
                                    ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-bounce'
                                    : 'bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white'
                            }`}
                        >
                            <Icon name={pushStage === 'confirm' ? 'SealCheck' : 'CloudArrowUp'} weight="bold" className="text-base" />
                            <span className="hidden lg:inline">{pushStage === 'confirm' ? 'Confirm Push?' : 'Push'}</span>
                        </button>
                        <div className="w-px h-4 bg-slate-800 mx-1" />
                        <button
                            onClick={onDisconnect}
                            className="w-9 h-9 flex items-center justify-center hover:bg-rose-500/10 rounded-lg text-slate-600 hover:text-rose-500 transition-all"
                            title="Disconnect"
                        >
                            <Icon name="LinkBreak" weight="bold" />
                        </button>
                    </div>
                )}

                {/* Connect Cloud (disconnected) */}
                {!connected && (
                    <Button
                        variant="secondary"
                        onClick={onOpenRemnawave}
                        className="text-xs h-11 px-2.5 sm:px-4 border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 shrink-0"
                        title="Connect Cloud"
                    >
                        <Icon name="Cloud" /> <span className="hidden md:inline">Connect Cloud</span>
                    </Button>
                )}

                <div className="w-px h-8 bg-slate-800/50 mx-0.5 hidden sm:block shrink-0" />

                {/* File / Download */}
                <div className="flex gap-1 h-11 items-center bg-slate-950/50 p-1 rounded-xl border border-slate-800 shrink-0">
                    <label
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 w-9 h-9 rounded-lg cursor-pointer transition-all border border-slate-700 flex items-center justify-center text-sm"
                        title="Load JSON"
                    >
                        <Icon name="FolderOpen" />
                        <input type="file" className="hidden" accept=".json" onChange={onFileUpload} />
                    </label>
                    <Button variant="success" onClick={onDownload} icon="DownloadSimple" className="rounded-lg h-9 px-2.5 sm:px-4 text-sm shadow-none" disabled={!hasConfig} title="Download">
                        <span className="hidden md:inline text-xs">Download</span>
                    </Button>
                </div>

                <div className="w-px h-8 bg-slate-800/50 mx-0.5 hidden sm:block shrink-0" />

                <button
                    onClick={onOpenAbout}
                    className="h-11 w-11 flex items-center justify-center hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all border border-slate-800 bg-slate-950/50 shrink-0"
                    title="About / Repository"
                >
                    <Icon name="Info" className="text-lg" />
                </button>

                <a
                    href="https://xtls.github.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden lg:flex items-center gap-2 px-3 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all font-bold text-xs uppercase tracking-wider shrink-0"
                >
                    <Icon name="BookOpen" weight="bold" />
                    Docs
                </a>
            </div>
        </nav>
    );
};
