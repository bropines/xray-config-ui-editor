import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { useConfigStore } from '../../store/configStore';
import { calculateConfigStats, generateShortHash } from '../../core/git/gitEngine';

interface CommitModalProps {
    onClose: () => void;
    onCommitSuccess?: () => void;
}

export const CommitModal: React.FC<CommitModalProps> = ({ onClose, onCommitSuccess }) => {
    const { config, profiles, activeProfileId, saveActiveProfile, recordSnapshot } = useConfigStore();
    const activeProfile = profiles.find(p => p.id === activeProfileId);

    const stats = React.useMemo(() => {
        return calculateConfigStats(activeProfile?.config || null, config);
    }, [activeProfile, config]);

    const [message, setMessage] = useState(() => {
        const inbounds = config.inbounds?.length || 0;
        const outbounds = config.outbounds?.length || 0;
        const rules = config.routing?.rules?.length || 0;
        return `Update config (${inbounds} Inbounds, ${outbounds} Outbounds, ${rules} Rules)`;
    });

    const shortHash = React.useMemo(() => generateShortHash(), []);

    const handleCommit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        recordSnapshot(message.trim());
        saveActiveProfile();
        if (onCommitSuccess) onCommitSuccess();
        onClose();
    };

    return (
        <Modal
            title="Git Commit Changes"
            onClose={onClose}
            className="max-w-lg"
            extraButtons={null}
        >
            <form onSubmit={handleCommit} className="space-y-4">
                {/* Branch & Commit Header */}
                <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Icon name="GitBranch" className="text-indigo-400 text-lg" />
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Branch</p>
                            <p className="text-xs font-bold text-white">{activeProfile?.name || 'main'}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">New Commit Hash</p>
                        <p className="text-xs font-mono font-bold text-indigo-400">{shortHash}</p>
                    </div>
                </div>

                {/* Diff Stats Banner */}
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                        <Icon name="GitDiff" className="text-amber-400" />
                        <span className="text-slate-300 font-medium">Staged Changes</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono font-bold">
                        <span className="text-emerald-400">+{stats.additions}</span>
                        <span className="text-rose-400">-{stats.deletions}</span>
                    </div>
                </div>

                {/* Commit Message Input */}
                <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                        Commit Message <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                        required
                        rows={3}
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Describe what changed in this config version..."
                        className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl p-3 text-xs text-white outline-none transition-colors custom-scroll resize-none"
                    />
                </div>

                {/* Footer Action Buttons */}
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={onClose} type="button">
                        Cancel
                    </Button>
                    <Button variant="indigo" type="submit" icon="GitCommit">
                        Commit ({shortHash})
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
