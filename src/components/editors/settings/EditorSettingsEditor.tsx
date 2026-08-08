import React, { useState } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { FormField } from '../../ui/FormField';
import { Switch } from '../../ui/Switch';
import { useConfigStore } from '../../../store/configStore';
import { toast } from 'sonner';

export const EditorSettingsEditor = ({ onOpenHistory }: { onOpenHistory?: () => void }) => {
    const {
        profiles,
        activeProfileId,
        createProfile,
        switchProfile,
        renameProfile,
        duplicateProfile,
        deleteProfile,
        saveActiveProfile,
        historyLimit,
        setHistoryLimit,
        autoSave,
        setAutoSave,
        history,
        clearHistory
    } = useConfigStore();

    const [newProfileName, setNewProfileName] = useState("");
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");

    const handleCreate = () => {
        if (!newProfileName.trim()) return toast.error("Please enter a profile name");
        createProfile(newProfileName.trim());
        setNewProfileName("");
    };

    const handleStartRename = (id: string, currentName: string) => {
        setEditingProfileId(id);
        setEditName(currentName);
    };

    const handleSaveRename = (id: string) => {
        if (editName.trim()) {
            renameProfile(id, editName.trim());
        }
        setEditingProfileId(null);
    };

    return (
        <div className="space-y-6">
            {/* Local Config Profiles */}
            <Card
                title="Config Profiles (Local Storage)"
                icon="FolderUser"
                action={
                    <div className="flex gap-2">
                        <input
                            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1 text-xs text-white outline-none focus:border-indigo-500 transition-colors w-44"
                            placeholder="New profile name..."
                            value={newProfileName}
                            onChange={e => setNewProfileName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                        />
                        <Button variant="indigo" className="text-xs py-1" onClick={handleCreate} icon="Plus">
                            New
                        </Button>
                    </div>
                }
            >
                <div className="space-y-2 mt-2">
                    {profiles.map(profile => {
                        const isActive = profile.id === activeProfileId;
                        const isEditing = editingProfileId === profile.id;
                        const inbounds = profile.config?.inbounds?.length || 0;
                        const outbounds = profile.config?.outbounds?.length || 0;

                        return (
                            <div
                                key={profile.id}
                                className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                                    isActive
                                        ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg ring-1 ring-indigo-500/20'
                                        : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                                }`}
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                                    <Icon
                                        name={isActive ? "CheckCircle" : "FileCode"}
                                        className={`text-lg shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`}
                                        weight={isActive ? 'fill' : 'regular'}
                                    />

                                    {isEditing ? (
                                        <div className="flex items-center gap-1 flex-1 max-w-xs">
                                            <input
                                                className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-white w-full outline-none focus:border-indigo-500"
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleSaveRename(profile.id)}
                                                autoFocus
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleSaveRename(profile.id)}
                                                className="text-xs text-indigo-400 hover:text-white p-1"
                                            >
                                                ✓
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-white truncate">
                                                    {profile.name}
                                                </span>
                                                {isActive && (
                                                    <span className="text-[9px] bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded font-mono font-bold uppercase">
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-mono">
                                                {inbounds} inbounds • {outbounds} outbounds • Updated {new Date(profile.updatedAt).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    {!isActive && (
                                        <button
                                            type="button"
                                            onClick={() => switchProfile(profile.id)}
                                            className="px-2.5 py-1 text-[11px] font-bold text-indigo-400 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/50 rounded-lg border border-indigo-800/40 transition-colors"
                                        >
                                            Switch
                                        </button>
                                    )}
                                    {isActive && (
                                        <button
                                            type="button"
                                            onClick={saveActiveProfile}
                                            className="px-2.5 py-1 text-[11px] font-bold text-emerald-400 hover:text-white bg-emerald-950/40 hover:bg-emerald-900/50 rounded-lg border border-emerald-800/40 transition-colors flex items-center gap-1"
                                        >
                                            <Icon name="FloppyDisk" /> Save
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleStartRename(profile.id, profile.name)}
                                        className="p-1.5 text-slate-400 hover:text-white transition-colors"
                                        title="Rename"
                                    >
                                        <Icon name="PencilSimple" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => duplicateProfile(profile.id)}
                                        className="p-1.5 text-slate-400 hover:text-white transition-colors"
                                        title="Duplicate"
                                    >
                                        <Icon name="Copy" />
                                    </button>
                                    {profiles.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (confirm(`Delete profile "${profile.name}"?`)) {
                                                    deleteProfile(profile.id);
                                                }
                                            }}
                                            className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                                            title="Delete"
                                        >
                                            <Icon name="Trash" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>

            {/* Version Control & History Depth */}
            <Card title="Local Version History (Git-like Snapshots)" icon="GitBranch">
                <div className="space-y-4">
                    <FormField
                        label="History Depth (Max Snapshots)"
                        help="Number of rollback snapshots saved locally in browser memory (Range: 10 - 50)."
                    >
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min={10}
                                max={50}
                                step={5}
                                value={historyLimit}
                                onChange={e => setHistoryLimit(Number(e.target.value))}
                                className="flex-1 accent-indigo-500 cursor-pointer"
                            />
                            <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950 px-3 py-1 rounded border border-indigo-800/50">
                                {historyLimit} saves
                            </span>
                        </div>
                    </FormField>

                    <FormField
                        label="Auto-Save Profile on Edit"
                        help="Automatically update active local profile when changes are made."
                        horizontal
                    >
                        <Switch checked={autoSave} onChange={setAutoSave} />
                    </FormField>

                    <div className="pt-2 flex flex-wrap items-center justify-between border-t border-slate-800 gap-2">
                        <div className="text-xs text-slate-400 flex items-center gap-2">
                            <Icon name="ClockCounterClockwise" className="text-indigo-400" />
                            Current History Size: <b>{history.length} / {historyLimit}</b> snapshots stored.
                        </div>

                        <div className="flex gap-2">
                            {onOpenHistory && (
                                <Button variant="indigo" className="text-xs py-1.5" onClick={onOpenHistory} icon="GitBranch">
                                    Open History Timeline
                                </Button>
                            )}
                            {history.length > 0 && (
                                <Button
                                    variant="secondary"
                                    className="text-xs py-1.5 text-rose-400 hover:text-rose-300"
                                    onClick={() => {
                                        if (confirm("Clear all version history snapshots?")) {
                                            clearHistory();
                                        }
                                    }}
                                    icon="Trash"
                                >
                                    Clear History
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};
