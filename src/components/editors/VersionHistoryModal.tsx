import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { useConfigStore } from '../../store/configStore';
import { JsonField } from '../ui/JsonField';

export const VersionHistoryModal = ({ onClose }: { onClose: () => void }) => {
    const { histories, activeProfileId, remnawave, restoreSnapshot, clearHistory, historyLimit } = useConfigStore();

    // Per-profile history
    const activeKey = remnawave.activeProfileUuid
        ? `rw:${remnawave.activeProfileUuid}`
        : activeProfileId;
    const history = histories[activeKey] || [];

    const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(
        history.length > 0 ? history[0].id : null
    );

    const selectedSnapshot = history.find(h => h.id === selectedSnapshotId);

    const handleRestore = (id: string) => {
        restoreSnapshot(id);
        onClose();
    };

    const handleClear = () => {
        if (confirm("Are you sure you want to clear all local version history?")) {
            clearHistory();
            setSelectedSnapshotId(null);
        }
    };

    return (
        <Modal
            title={`Local History Timeline (${history.length}/${historyLimit})`}
            onClose={onClose}
            className="max-w-5xl h-[85vh]"
            extraButtons={
                <div className="flex items-center gap-2">
                    {history.length > 0 && (
                        <Button
                            variant="danger"
                            className="text-xs py-1"
                            onClick={handleClear}
                            icon="Trash"
                        >
                            Clear History
                        </Button>
                    )}
                </div>
            }
        >
            <div className="flex flex-col md:flex-row h-full gap-4 overflow-hidden">
                {/* Left Panel: Timeline List */}
                <div className="w-full md:w-80 flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shrink-0">
                    <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Icon name="GitBranch" className="text-indigo-400" />
                            Snapshots
                        </span>
                        <div className="text-[10px] text-slate-500 font-mono">
                            Max {historyLimit} saves
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-2">
                        {history.length === 0 ? (
                            <div className="py-12 text-center text-slate-500 italic text-xs">
                                No history snapshots recorded yet.<br />
                                Edits and saves will automatically create rollback points.
                            </div>
                        ) : (
                            history.map((snapshot, index) => {
                                const isSelected = snapshot.id === selectedSnapshotId;
                                const dateStr = new Date(snapshot.timestamp).toLocaleString();
                                const isLatest = index === 0;

                                return (
                                    <div
                                        key={snapshot.id}
                                        onClick={() => setSelectedSnapshotId(snapshot.id)}
                                        className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                                            isSelected
                                                ? 'bg-indigo-950/70 border-indigo-500/80 ring-1 ring-indigo-500/30'
                                                : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center gap-2 mb-1">
                                            <span className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                                                {isLatest && (
                                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                                )}
                                                {snapshot.label || "Config Edit"}
                                            </span>
                                            <span className="text-[10px] font-mono text-slate-500 shrink-0">
                                                {new Date(snapshot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </span>
                                        </div>
                                        
                                        <div className="text-[10px] text-slate-400 font-mono flex justify-between items-center">
                                            <span className="truncate">{snapshot.summary}</span>
                                            <span className="text-slate-600 text-[9px]">{dateStr.split(',')[0]}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Panel: Snapshot Preview & Restore */}
                <div className="flex-1 flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden min-h-0">
                    {selectedSnapshot ? (
                        <>
                            <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center shrink-0">
                                <div>
                                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                                        <Icon name="ClockCounterClockwise" className="text-indigo-400" />
                                        {selectedSnapshot.label}
                                    </h4>
                                    <p className="text-[10px] text-slate-400 font-mono">
                                        Saved on {new Date(selectedSnapshot.timestamp).toLocaleString()} • {selectedSnapshot.summary}
                                    </p>
                                </div>
                                <Button
                                    variant="indigo"
                                    className="text-xs py-1.5"
                                    onClick={() => handleRestore(selectedSnapshot.id)}
                                    icon="ArrowCounterClockwise"
                                >
                                    Restore This Version
                                </Button>
                            </div>

                            <div className="flex-1 p-3 overflow-hidden">
                                <JsonField
                                    label="Snapshot JSON Preview"
                                    value={selectedSnapshot.config}
                                    onChange={() => {}}
                                    readOnly={true}
                                    className="h-full"
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-6 text-center">
                            <Icon name="ClockCounterClockwise" className="text-5xl mb-3 opacity-20" />
                            <p className="text-sm">Select a history snapshot from the left timeline to preview and restore</p>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
