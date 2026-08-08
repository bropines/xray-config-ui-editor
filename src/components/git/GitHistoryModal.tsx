import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { useConfigStore } from '../../store/configStore';
import { GitDiffViewer } from './GitDiffViewer';
import { computeJsonDiff, type GitCommit } from '../../core/git/gitEngine';

export const GitHistoryModal = ({ onClose }: { onClose: () => void }) => {
    const { history, restoreSnapshot, clearHistory, historyLimit, config } = useConfigStore();
    const [selectedCommitId, setSelectedCommitId] = useState<string | null>(
        history.length > 0 ? history[0].id : null
    );

    const selectedSnapshot = history.find(h => h.id === selectedCommitId);
    const selectedIdx = history.findIndex(h => h.id === selectedCommitId);

    // Compute diff between selected snapshot and its parent (or empty)
    const diffChanges = React.useMemo(() => {
        if (!selectedSnapshot) return [];
        const parentSnapshot = selectedIdx < history.length - 1 ? history[selectedIdx + 1] : null;
        return computeJsonDiff(parentSnapshot?.config || null, selectedSnapshot.config);
    }, [selectedSnapshot, selectedIdx, history]);

    const handleRestore = (id: string) => {
        restoreSnapshot(id);
        onClose();
    };

    const handleClear = () => {
        if (confirm("Clear all commit history for this project?")) {
            clearHistory();
            setSelectedSnapshotId(null);
        }
    };

    return (
        <Modal
            title={`Git Repository Log (${history.length} commits)`}
            onClose={onClose}
            className="max-w-6xl h-[88vh]"
            extraButtons={
                <div className="flex items-center gap-2">
                    {history.length > 0 && (
                        <Button
                            variant="danger"
                            className="text-xs py-1"
                            onClick={handleClear}
                            icon="Trash"
                        >
                            Purge Commit Log
                        </Button>
                    )}
                </div>
            }
        >
            <div className="flex flex-col md:flex-row h-full gap-4 overflow-hidden">
                {/* Left Panel: Git Commit Graph & List */}
                <div className="w-full md:w-96 flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shrink-0">
                    <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Icon name="GitCommit" className="text-indigo-400 text-sm" />
                            Git Commits
                        </span>
                        <div className="text-[10px] text-slate-500 font-mono">
                            {history.length} commits
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-2">
                        {history.length === 0 ? (
                            <div className="py-12 text-center text-slate-500 italic text-xs">
                                No git commits recorded yet.<br />
                                Save or edit your config to create commits.
                            </div>
                        ) : (
                            history.map((commit, index) => {
                                const isSelected = commit.id === selectedCommitId;
                                const isLatest = index === 0;
                                const shortHash = commit.id.substring(0, 7);

                                return (
                                    <div
                                        key={commit.id}
                                        onClick={() => setSelectedCommitId(commit.id)}
                                        className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                                            isSelected
                                                ? 'bg-indigo-950/70 border-indigo-500/80 ring-1 ring-indigo-500/30 shadow-lg'
                                                : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start gap-2 mb-1">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="px-1.5 py-0.5 rounded bg-indigo-900/60 border border-indigo-500/40 text-[10px] font-mono font-bold text-indigo-300 shrink-0">
                                                    {shortHash}
                                                </span>
                                                <span className="text-xs font-bold text-white truncate">
                                                    {commit.label || "Config update"}
                                                </span>
                                            </div>
                                            {isLatest && (
                                                <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-[9px] font-bold text-emerald-400 shrink-0">
                                                    HEAD
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="text-[10px] text-slate-400 font-mono flex justify-between items-center mt-1.5">
                                            <span className="truncate text-slate-400">{commit.summary}</span>
                                            <span className="text-slate-500 text-[9px] shrink-0">
                                                {new Date(commit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Panel: Git Visual Diff & Checkout */}
                <div className="flex-1 flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden min-h-0">
                    {selectedSnapshot ? (
                        <>
                            <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center shrink-0">
                                <div>
                                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                                        <Icon name="GitCommit" className="text-indigo-400" />
                                        Commit {selectedSnapshot.id.substring(0, 7)} — {selectedSnapshot.label}
                                    </h4>
                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                        Committed on {new Date(selectedSnapshot.timestamp).toLocaleString()} • {selectedSnapshot.summary}
                                    </p>
                                </div>
                                <Button
                                    variant="indigo"
                                    className="text-xs py-1.5"
                                    onClick={() => handleRestore(selectedSnapshot.id)}
                                    icon="GitPullRequest"
                                >
                                    git checkout ({selectedSnapshot.id.substring(0, 7)})
                                </Button>
                            </div>

                            <div className="flex-1 p-3 overflow-hidden">
                                <GitDiffViewer
                                    changes={diffChanges}
                                    titleOld={selectedIdx < history.length - 1 ? `Commit #${history[selectedIdx + 1].id.substring(0, 7)}` : 'Initial Baseline'}
                                    titleNew={`Commit #${selectedSnapshot.id.substring(0, 7)}`}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-6 text-center">
                            <Icon name="GitCommit" className="text-5xl mb-3 opacity-20" />
                            <p className="text-sm">Select a git commit from the left log to inspect visual diff and checkout</p>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
