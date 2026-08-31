import React from 'react';
import { Icon } from '../ui';
import { Button } from '../ui';
import { Select } from '../ui/Select';
import { useAppNavLogic } from '../../hooks/useAppNavLogic';

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
    onOpenHistory?: () => void;
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
    onOpenHistory,
}: AppNavProps) => {
    // Profile-selector store access, options-building and dispatch handler
    // (switchProfile / createProfile / loadRemnawaveProfile) live in the hook —
    // both the desktop toolbar Select below and the mobile drawer Select share
    // this same handleSelectChange reference rather than each hand-rolling it.
    const { selectorOptions, currentOptionValue, handleSelectChange } = useAppNavLogic();

    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    return (
        <>
            <nav className="h-14 shrink-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/50 px-2 sm:px-4 shadow-2xl flex md:grid md:grid-cols-[1fr_auto_1fr] items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                {/* Left: Logo + Status */}
                <div className="flex items-center justify-start gap-2 sm:gap-3 shrink-0">
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

                {/* Center: Desktop (Selector, Profiles, Git Log, Clear, Cloud Sync), Mobile (Cloud Sync / Connect) */}
                <div className="flex items-center justify-center gap-1.5 sm:gap-2 min-w-0 flex-1 md:flex-initial">
                    {/* Desktop Selector */}
                    {hasConfig && (
                        <div className="hidden md:block w-52 shrink-0">
                            <Select
                                value={currentOptionValue}
                                onChange={handleSelectChange}
                                options={selectorOptions}
                            />
                        </div>
                    )}

                    {/* Desktop Profile Actions */}
                    {hasConfig && (
                        <div className="hidden md:flex items-center gap-1 bg-slate-950/50 p-1 rounded-xl border border-slate-800 h-11 shrink-0">
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

                            {onOpenHistory && (
                                <Button
                                    variant="secondary"
                                    onClick={onOpenHistory}
                                    icon="GitBranch"
                                    className="h-9 px-2 sm:px-3 text-xs rounded-lg shadow-none border-indigo-500/40 text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/60"
                                    title="Git Version History & Log"
                                >
                                    <span className="hidden sm:inline">Git Log</span>
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

                    {/* Desktop Cloud Controls */}
                    {connected && (
                        <div className="hidden md:flex items-center bg-slate-950/50 border border-slate-800 rounded-xl p-1 gap-1 h-11 shrink-0">
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

                    {!connected && (
                        <div className="hidden md:flex items-center h-11 bg-slate-950/50 p-1 rounded-xl border border-slate-800 shrink-0">
                            <Button
                                variant="secondary"
                                onClick={onOpenRemnawave}
                                className="h-9 px-2.5 sm:px-4 text-xs font-bold rounded-lg border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 shadow-none"
                                title="Connect Cloud"
                            >
                                <Icon name="Cloud" /> <span className="hidden md:inline">Connect Cloud</span>
                            </Button>
                        </div>
                    )}

                    {/* Mobile Center: Remnawave Cloud Control */}
                    <div className="flex md:hidden items-center justify-center shrink-0">
                        {connected ? (
                            <div className="flex items-center bg-slate-950/50 border border-slate-800 rounded-xl p-1 gap-1 h-11">
                                <button
                                    onClick={onPush}
                                    className={`flex items-center justify-center gap-1.5 px-3 h-9 rounded-lg font-bold text-xs transition-all ${
                                        pushStage === 'confirm'
                                            ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-bounce'
                                            : 'bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white'
                                    }`}
                                >
                                    <Icon name={pushStage === 'confirm' ? 'SealCheck' : 'CloudArrowUp'} weight="bold" />
                                    <span>{pushStage === 'confirm' ? 'Confirm?' : 'Push Cloud'}</span>
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center h-11 bg-slate-950/50 p-1 rounded-xl border border-slate-800">
                                <Button
                                    variant="secondary"
                                    onClick={onOpenRemnawave}
                                    className="h-9 px-3 text-xs font-bold rounded-lg border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 shadow-none"
                                    title="Connect Cloud"
                                >
                                    <Icon name="Cloud" /> <span>Connect Cloud</span>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Load/Download + Mobile Menu trigger + Combined TG & Xray Docs + About (Very Right End) */}
                <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
                    {/* Mobile Profiles & Git Menu Button */}
                    <div className="flex md:hidden items-center h-11 bg-slate-950/50 p-1 rounded-xl border border-slate-800 shrink-0">
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="w-9 h-9 flex items-center justify-center hover:bg-slate-800 rounded-lg text-indigo-400 hover:text-white transition-all"
                            title="Profile & Tools Menu"
                        >
                            <Icon name="SlidersHorizontal" className="text-base" />
                        </button>
                    </div>

                    {/* File / Download */}
                    <div className="flex gap-1 h-11 items-center bg-slate-950/50 p-1 rounded-xl border border-slate-800 shrink-0">
                        <label
                            className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 w-9 h-9 rounded-lg cursor-pointer transition-all border border-slate-700/60 flex items-center justify-center text-sm"
                            title="Load JSON"
                        >
                            <Icon name="FolderOpen" />
                            <input type="file" className="hidden" accept=".json" onChange={onFileUpload} />
                        </label>
                        <Button variant="success" onClick={onDownload} icon="DownloadSimple" className="rounded-lg h-9 px-2.5 sm:px-4 text-xs font-bold shadow-none" disabled={!hasConfig} title="Download">
                            <span className="hidden md:inline">Download</span>
                        </Button>
                    </div>

                    {/* Combined Telegram, Support & Xray Docs Container (Desktop) */}
                    <div className="hidden lg:flex items-center h-11 bg-slate-950/50 p-1 rounded-xl border border-slate-800 shrink-0">
                        <a
                            href="https://t.me/xcue_dev"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-9 px-3 flex items-center gap-2 rounded-lg bg-sky-500/10 hover:bg-sky-600 text-sky-400 hover:text-white transition-all font-bold text-xs uppercase tracking-wider"
                            title="Telegram Channel (@xcue_dev)"
                        >
                            <Icon name="TelegramLogo" weight="bold" />
                            <span>Telegram</span>
                        </a>
                        <div className="w-px h-4 bg-slate-800 mx-1 shrink-0" />
                        <a
                            href="https://boosty.to/pinus"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-9 px-3 flex items-center gap-2 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white transition-all font-bold text-xs uppercase tracking-wider group"
                            title="Support Developer (Boosty)"
                        >
                            <Icon name="Heart" weight="fill" className="text-rose-500 group-hover:text-white transition-all group-hover:scale-110" />
                            <span>Support</span>
                        </a>
                        <div className="w-px h-4 bg-slate-800 mx-1 shrink-0" />
                        <a
                            href="https://xtls.github.io/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-9 px-3 flex items-center gap-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white transition-all font-bold text-xs uppercase tracking-wider"
                            title="Official Xray Documentation"
                        >
                            <Icon name="BookOpen" weight="bold" />
                            <span>Xray Docs</span>
                        </a>
                    </div>

                    <div className="w-px h-8 bg-slate-800/50 mx-0.5 hidden sm:block shrink-0" />

                    {/* About / Repository at the VERY RIGHT END */}
                    <div className="flex items-center h-11 bg-slate-950/50 p-1 rounded-xl border border-slate-800 shrink-0">
                        <button
                            onClick={onOpenAbout}
                            className="w-9 h-9 flex items-center justify-center hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
                            title="About / Repository"
                        >
                            <Icon name="Info" className="text-base" />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Profile & Tools Drawer / Bottom Sheet */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md p-0 sm:p-4 animate-in fade-in" onClick={() => setMobileMenuOpen(false)}>
                    <div className="bg-slate-900 border border-slate-700/60 rounded-t-3xl sm:rounded-3xl p-5 max-w-md w-full shadow-2xl flex flex-col space-y-4 animate-in slide-in-from-bottom-5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="bg-indigo-600/20 p-2 rounded-xl text-indigo-400 border border-indigo-500/30">
                                    <Icon name="SlidersHorizontal" className="text-lg" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase text-white tracking-wide">Profiles & Tools</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mobile Management Menu</p>
                                </div>
                            </div>
                            <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-500 transition-colors">
                                <Icon name="X" weight="bold" />
                            </button>
                        </div>

                        {/* Mobile Selector in Drawer */}
                        {hasConfig && (
                            <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                                <label className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider block">Select Active Profile</label>
                                <Select
                                    value={currentOptionValue}
                                    onChange={(val) => {
                                        handleSelectChange(val);
                                        setMobileMenuOpen(false);
                                    }}
                                    options={selectorOptions}
                                />
                            </div>
                        )}

                        {hasConfig && (
                            <div className="grid grid-cols-3 gap-2">
                                {onOpenEditorSettings && (
                                    <button
                                        onClick={() => { onOpenEditorSettings(); setMobileMenuOpen(false); }}
                                        className="p-3 bg-slate-950 border border-slate-800 hover:border-indigo-500/50 rounded-2xl flex flex-col items-center gap-1.5 text-slate-300 hover:text-white transition-all group"
                                    >
                                        <Icon name="FolderUser" className="text-xl text-indigo-400 group-hover:scale-110 transition-transform" />
                                        <span className="text-xs font-bold">Profiles</span>
                                    </button>
                                )}
                                {onOpenHistory && (
                                    <button
                                        onClick={() => { onOpenHistory(); setMobileMenuOpen(false); }}
                                        className="p-3 bg-slate-950 border border-slate-800 hover:border-indigo-500/50 rounded-2xl flex flex-col items-center gap-1.5 text-indigo-300 hover:text-white transition-all group"
                                    >
                                        <Icon name="GitBranch" className="text-xl text-indigo-400 group-hover:scale-110 transition-transform" />
                                        <span className="text-xs font-bold">Git Log</span>
                                    </button>
                                )}
                                {onClearConfig && (
                                    <button
                                        onClick={() => {
                                            setMobileMenuOpen(false);
                                            if (confirm("Clear config?")) onClearConfig();
                                        }}
                                        className="p-3 bg-slate-950 border border-slate-800 hover:border-rose-500/50 rounded-2xl flex flex-col items-center gap-1.5 text-rose-400 hover:text-rose-200 transition-all group"
                                    >
                                        <Icon name="XCircle" className="text-xl text-rose-500 group-hover:scale-110 transition-transform" />
                                        <span className="text-xs font-bold">Clear</span>
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="space-y-2 pt-1 border-t border-slate-800/80">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Cloud Connection</span>
                            {connected ? (
                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="secondary" onClick={() => { onPush(); setMobileMenuOpen(false); }} icon="CloudArrowUp" className="py-2.5 text-xs rounded-xl font-bold">
                                        {pushStage === 'confirm' ? 'Confirm Push?' : 'Push Cloud'}
                                    </Button>
                                    <Button variant="danger" onClick={() => { onDisconnect(); setMobileMenuOpen(false); }} icon="LinkBreak" className="py-2.5 text-xs rounded-xl font-bold">
                                        Disconnect
                                    </Button>
                                </div>
                            ) : (
                                <Button variant="secondary" onClick={() => { onOpenRemnawave(); setMobileMenuOpen(false); }} icon="Cloud" className="w-full py-2.5 text-xs rounded-xl font-bold border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                                    Connect Remnawave Cloud
                                </Button>
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
                            <a
                                href="https://t.me/xcue_dev"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-600 hover:text-white transition-all font-bold text-xs flex items-center justify-center gap-1.5"
                            >
                                <Icon name="TelegramLogo" weight="bold" className="text-base" />
                                <span>Telegram</span>
                            </a>
                            <a
                                href="https://boosty.to/pinus"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white transition-all font-bold text-xs flex items-center justify-center gap-1.5 group"
                            >
                                <Icon name="Heart" weight="fill" className="text-base text-rose-500 group-hover:text-white transition-all group-hover:scale-110" />
                                <span>Support</span>
                            </a>
                            <a
                                href="https://xtls.github.io/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all font-bold text-xs flex items-center justify-center gap-1.5"
                            >
                                <Icon name="BookOpen" weight="bold" className="text-base" />
                                <span>Docs</span>
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
