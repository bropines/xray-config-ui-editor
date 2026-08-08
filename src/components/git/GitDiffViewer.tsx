import React from 'react';
import type { Change } from 'diff';
import { Icon } from '../ui/Icon';

interface GitDiffViewerProps {
    changes: Change[];
    titleOld?: string;
    titleNew?: string;
}

export const GitDiffViewer: React.FC<GitDiffViewerProps> = ({
    changes,
    titleOld = "Previous Version",
    titleNew = "New Version"
}) => {
    let lineNoOld = 1;
    let lineNoNew = 1;

    return (
        <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs shadow-2xl">
            {/* Diff Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2 text-slate-300 font-bold">
                    <Icon name="GitDiff" className="text-indigo-400 text-sm" />
                    <span>Config Diff</span>
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                    <span className="flex items-center gap-1.5 text-rose-400">
                        <span className="w-2 h-2 rounded-full bg-rose-500" /> {titleOld}
                    </span>
                    <span className="text-slate-600">→</span>
                    <span className="flex items-center gap-1.5 text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> {titleNew}
                    </span>
                </div>
            </div>

            {/* Line-by-line Diff List */}
            <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-0.5 select-text">
                {changes.map((part, index) => {
                    const lines = part.value.replace(/\n$/, '').split('\n');

                    return lines.map((line, lIdx) => {
                        const isAdd = part.added;
                        const isDel = part.removed;

                        let oldNumStr = '';
                        let newNumStr = '';

                        if (isDel) {
                            oldNumStr = String(lineNoOld++);
                        } else if (isAdd) {
                            newNumStr = String(lineNoNew++);
                        } else {
                            oldNumStr = String(lineNoOld++);
                            newNumStr = String(lineNoNew++);
                        }

                        return (
                            <div
                                key={`${index}-${lIdx}`}
                                className={`flex items-start leading-5 font-mono text-[11px] rounded px-2 ${
                                    isAdd
                                        ? 'bg-emerald-950/40 text-emerald-200 border-l-2 border-emerald-500'
                                        : isDel
                                            ? 'bg-rose-950/40 text-rose-300 border-l-2 border-rose-500 opacity-80'
                                            : 'text-slate-400 hover:bg-slate-900/50'
                                }`}
                            >
                                <span className="w-8 text-right pr-2 text-slate-600 select-none shrink-0 text-[10px]">
                                    {oldNumStr}
                                </span>
                                <span className="w-8 text-right pr-3 text-slate-600 select-none shrink-0 text-[10px]">
                                    {newNumStr}
                                </span>
                                <span className={`w-4 select-none shrink-0 font-bold ${isAdd ? 'text-emerald-400' : isDel ? 'text-rose-400' : 'text-slate-600'}`}>
                                    {isAdd ? '+' : isDel ? '-' : ' '}
                                </span>
                                <span className="whitespace-pre flex-1 break-all">
                                    {line}
                                </span>
                            </div>
                        );
                    });
                })}
            </div>
        </div>
    );
};
