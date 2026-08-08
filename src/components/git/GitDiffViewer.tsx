import React, { useState, useMemo } from 'react';
import type { Change } from 'diff';
import { Icon } from '../ui/Icon';

interface GitDiffViewerProps {
    changes: Change[];
    titleOld?: string;
    titleNew?: string;
    contextSize?: number; // default 10 lines
}

interface FlatLine {
    index: number;
    type: 'add' | 'del' | 'normal';
    oldLine?: number;
    newLine?: number;
    content: string;
}

export const GitDiffViewer: React.FC<GitDiffViewerProps> = ({
    changes,
    titleOld = "Previous Version",
    titleNew = "New Version",
    contextSize = 10
}) => {
    const [viewMode, setViewMode] = useState<'hunks' | 'full'>('hunks');
    const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(new Set());

    // 1. Flatten changes into indexed lines
    const flatLines = useMemo(() => {
        let lineNoOld = 1;
        let lineNoNew = 1;
        const result: FlatLine[] = [];

        changes.forEach((part) => {
            const lines = part.value.replace(/\n$/, '').split('\n');
            lines.forEach((line) => {
                if (part.removed) {
                    result.push({
                        index: result.length,
                        type: 'del',
                        oldLine: lineNoOld++,
                        content: line
                    });
                } else if (part.added) {
                    result.push({
                        index: result.length,
                        type: 'add',
                        newLine: lineNoNew++,
                        content: line
                    });
                } else {
                    result.push({
                        index: result.length,
                        type: 'normal',
                        oldLine: lineNoOld++,
                        newLine: lineNoNew++,
                        content: line
                    });
                }
            });
        });

        return result;
    }, [changes]);

    // 2. Identify visible line indices for Hunk mode (changes + 10 context lines)
    const visibleRanges = useMemo(() => {
        if (viewMode === 'full') {
            return [{ start: 0, end: flatLines.length - 1 }];
        }

        const changedIndices: number[] = [];
        flatLines.forEach((line, idx) => {
            if (line.type !== 'normal') {
                changedIndices.push(idx);
            }
        });

        if (changedIndices.length === 0) {
            return [{ start: 0, end: Math.min(flatLines.length - 1, 20) }];
        }

        // Build ranges [i - contextSize, i + contextSize]
        const rawRanges = changedIndices.map(idx => ({
            start: Math.max(0, idx - contextSize),
            end: Math.min(flatLines.length - 1, idx + contextSize)
        }));

        // Merge overlapping ranges
        const merged: Array<{ start: number; end: number }> = [];
        let current = rawRanges[0];

        for (let i = 1; i < rawRanges.length; i++) {
            const next = rawRanges[i];
            if (next.start <= current.end + 1) {
                current.end = Math.max(current.end, next.end);
            } else {
                merged.push(current);
                current = next;
            }
        }
        if (current) merged.push(current);

        return merged;
    }, [flatLines, viewMode, contextSize]);

    // Count additions & deletions
    const stats = useMemo(() => {
        let additions = 0;
        let deletions = 0;
        flatLines.forEach(l => {
            if (l.type === 'add') additions++;
            if (l.type === 'del') deletions++;
        });
        return { additions, deletions };
    }, [flatLines]);

    const toggleBlockExpand = (blockIndex: number) => {
        setExpandedBlocks(prev => {
            const next = new Set(prev);
            if (next.has(blockIndex)) next.delete(blockIndex);
            else next.add(blockIndex);
            return next;
        });
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs shadow-2xl">
            {/* Toolbar & View Mode Switch */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 font-bold text-slate-200">
                        <Icon name="GitDiff" className="text-indigo-400 text-sm" />
                        <span>Diff View</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                        <span className="text-emerald-400 font-bold">+{stats.additions}</span>
                        <span className="text-rose-400 font-bold">-{stats.deletions}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 text-[11px]">
                    {/* View Mode Toggle Button Group */}
                    <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
                        <button
                            type="button"
                            onClick={() => setViewMode('hunks')}
                            className={`px-2.5 py-1 rounded text-[10px] font-bold transition-colors ${
                                viewMode === 'hunks'
                                    ? 'bg-indigo-600 text-white shadow'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                            title="Show only changes + 10 lines of context"
                        >
                            Compact (+10 context)
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('full')}
                            className={`px-2.5 py-1 rounded text-[10px] font-bold transition-colors ${
                                viewMode === 'full'
                                    ? 'bg-indigo-600 text-white shadow'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                            title="Show entire file"
                        >
                            Full File
                        </button>
                    </div>

                    <div className="hidden sm:flex items-center gap-3">
                        <span className="flex items-center gap-1 text-rose-400">
                            <span className="w-2 h-2 rounded-full bg-rose-500" /> {titleOld}
                        </span>
                        <span className="text-slate-600">→</span>
                        <span className="flex items-center gap-1 text-emerald-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> {titleNew}
                        </span>
                    </div>
                </div>
            </div>

            {/* Line List */}
            <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-0.5 select-text">
                {flatLines.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 italic text-xs">
                        No changes detected between versions
                    </div>
                ) : viewMode === 'full' ? (
                    // FULL FILE MODE
                    flatLines.map(line => (
                        <DiffLineRow key={line.index} line={line} />
                    ))
                ) : (
                    // COMPACT HUNK MODE WITH COLLAPSIBLE SECTIONS
                    (() => {
                        const items: React.ReactNode[] = [];
                        let lastEnd = -1;

                        visibleRanges.forEach((range, rangeIdx) => {
                            // Check if there are collapsed lines before this hunk
                            if (range.start > lastEnd + 1) {
                                const collapsedStart = lastEnd + 1;
                                const collapsedEnd = range.start - 1;
                                const collapsedCount = collapsedEnd - collapsedStart + 1;
                                const isExpanded = expandedBlocks.has(rangeIdx);

                                items.push(
                                    <div
                                        key={`collapsed-${rangeIdx}`}
                                        onClick={() => toggleBlockExpand(rangeIdx)}
                                        className="my-1 py-1.5 px-3 bg-slate-900/80 hover:bg-slate-800 border border-dashed border-slate-700/60 rounded-lg text-indigo-300 hover:text-white cursor-pointer text-[11px] font-mono flex items-center justify-between transition-colors group select-none"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Icon name="ArrowsDownUp" className="text-indigo-400 group-hover:scale-110 transition-transform" />
                                            <span>
                                                @@ {collapsedCount} unchanged line{collapsedCount > 1 ? 's' : ''} hidden (lines {collapsedStart + 1}–{collapsedEnd + 1}) @@
                                            </span>
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-500 group-hover:text-indigo-300">
                                            {isExpanded ? 'Click to collapse' : 'Click to expand'}
                                        </span>
                                    </div>
                                );

                                if (isExpanded) {
                                    for (let idx = collapsedStart; idx <= collapsedEnd; idx++) {
                                        items.push(<DiffLineRow key={idx} line={flatLines[idx]} />);
                                    }
                                }
                            }

                            // Render current hunk lines
                            for (let idx = range.start; idx <= range.end; idx++) {
                                items.push(<DiffLineRow key={idx} line={flatLines[idx]} />);
                            }

                            lastEnd = range.end;
                        });

                        // Check if there are trailing collapsed lines after the last hunk
                        if (lastEnd < flatLines.length - 1) {
                            const collapsedStart = lastEnd + 1;
                            const collapsedEnd = flatLines.length - 1;
                            const collapsedCount = collapsedEnd - collapsedStart + 1;
                            const isExpanded = expandedBlocks.has(99999);

                            items.push(
                                <div
                                    key="collapsed-tail"
                                    onClick={() => toggleBlockExpand(99999)}
                                    className="my-1 py-1.5 px-3 bg-slate-900/80 hover:bg-slate-800 border border-dashed border-slate-700/60 rounded-lg text-indigo-300 hover:text-white cursor-pointer text-[11px] font-mono flex items-center justify-between transition-colors group select-none"
                                >
                                    <span className="flex items-center gap-2">
                                        <Icon name="ArrowsDownUp" className="text-indigo-400 group-hover:scale-110 transition-transform" />
                                        <span>
                                            @@ {collapsedCount} unchanged line{collapsedCount > 1 ? 's' : ''} hidden (lines {collapsedStart + 1}–{collapsedEnd + 1}) @@
                                        </span>
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-500 group-hover:text-indigo-300">
                                        {isExpanded ? 'Click to collapse' : 'Click to expand'}
                                    </span>
                                </div>
                            );

                            if (isExpanded) {
                                for (let idx = collapsedStart; idx <= collapsedEnd; idx++) {
                                    items.push(<DiffLineRow key={idx} line={flatLines[idx]} />);
                                }
                            }
                        }

                        return items;
                    })()
                )}
            </div>
        </div>
    );
};

const DiffLineRow: React.FC<{ line: FlatLine }> = ({ line }) => {
    const isAdd = line.type === 'add';
    const isDel = line.type === 'del';

    return (
        <div
            className={`flex items-start leading-5 font-mono text-[11px] rounded px-2 ${
                isAdd
                    ? 'bg-emerald-950/40 text-emerald-200 border-l-2 border-emerald-500 font-semibold'
                    : isDel
                        ? 'bg-rose-950/40 text-rose-300 border-l-2 border-rose-500 opacity-80'
                        : 'text-slate-400 hover:bg-slate-900/50'
            }`}
        >
            <span className="w-9 text-right pr-2 text-slate-600 select-none shrink-0 text-[10px]">
                {line.oldLine ?? ''}
            </span>
            <span className="w-9 text-right pr-3 text-slate-600 select-none shrink-0 text-[10px]">
                {line.newLine ?? ''}
            </span>
            <span className={`w-4 select-none shrink-0 font-bold ${isAdd ? 'text-emerald-400' : isDel ? 'text-rose-400' : 'text-slate-600'}`}>
                {isAdd ? '+' : isDel ? '-' : ' '}
            </span>
            <span className="whitespace-pre flex-1 break-all">
                {line.content}
            </span>
        </div>
    );
};
