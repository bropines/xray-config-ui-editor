import React, { useState, useMemo } from 'react';
import { Icon } from './Icon';

export interface OutboundSelectorProps {
    availableTags: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    label?: React.ReactNode;
    help?: React.ReactNode;
    placeholder?: string;
    error?: string;
    colorScheme?: 'indigo' | 'purple';
    className?: string;
    maxGridHeight?: string;
}

export interface MatchResult {
    exact: boolean;
    prefixMatch: boolean;
    pendingMatch: boolean;
    matchedPrefix?: string;
}

export function checkOutboundMatch(
    tag: string,
    selected: string[],
    pendingInput: string = ''
): MatchResult {
    const exact = selected.includes(tag);
    let matchedPrefix: string | undefined;

    const prefixMatch = !exact && selected.some(s => {
        if (s && tag.startsWith(s)) {
            matchedPrefix = s;
            return true;
        }
        return false;
    });

    const cleanInput = pendingInput.trim();
    const pendingMatch =
        !exact &&
        !prefixMatch &&
        cleanInput.length > 0 &&
        tag.startsWith(cleanInput);

    return { exact, prefixMatch, pendingMatch, matchedPrefix };
}

export const OutboundSelector: React.FC<OutboundSelectorProps> = ({
    availableTags = [],
    selected = [],
    onChange,
    label = 'Target Outbounds',
    help,
    placeholder = "e.g. 'us-', 'vless-' (prefix) or exact tag",
    error,
    colorScheme = 'indigo',
    className = '',
    maxGridHeight = 'max-h-[220px]'
}) => {
    const [inputValue, setInputValue] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [lastClickedIdx, setLastClickedIdx] = useState<number | null>(null);

    const currentSelected = useMemo(() => Array.isArray(selected) ? selected : [], [selected]);

    const filteredOutbounds = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return availableTags;
        return availableTags.filter(tag => tag.toLowerCase().includes(query));
    }, [availableTags, searchQuery]);

    // Statistics on matched outbounds
    const stats = useMemo(() => {
        let exactCount = 0;
        let prefixCount = 0;

        availableTags.forEach(tag => {
            const { exact, prefixMatch } = checkOutboundMatch(tag, currentSelected, '');
            if (exact) exactCount++;
            else if (prefixMatch) prefixCount++;
        });

        return {
            total: availableTags.length,
            matched: exactCount + prefixCount,
            exactCount,
            prefixCount
        };
    }, [availableTags, currentSelected]);

    const toggleExactTag = (tag: string) => {
        if (currentSelected.includes(tag)) {
            onChange(currentSelected.filter(s => s !== tag));
        } else {
            onChange([...currentSelected, tag]);
        }
    };

    const handleTagClick = (e: React.MouseEvent, tag: string, idx: number) => {
        if (e.ctrlKey || e.metaKey) {
            toggleExactTag(tag);
            setLastClickedIdx(idx);
            return;
        }

        if (e.shiftKey && lastClickedIdx !== null) {
            const start = Math.min(lastClickedIdx, idx);
            const end = Math.max(lastClickedIdx, idx);
            const rangeTags = filteredOutbounds.slice(start, end + 1);
            const merged = Array.from(new Set([...currentSelected, ...rangeTags]));
            onChange(merged);
            setLastClickedIdx(idx);
            return;
        }

        toggleExactTag(tag);
        setLastClickedIdx(idx);
    };

    const handleSelectAll = () => {
        const merged = Array.from(new Set([...currentSelected, ...filteredOutbounds]));
        onChange(merged);
    };

    const handleDeselectAll = () => {
        const toRemove = new Set(filteredOutbounds);
        // Also remove any prefixes if we are deselecting everything shown
        if (!searchQuery) {
            onChange([]);
        } else {
            onChange(currentSelected.filter(s => !toRemove.has(s)));
        }
    };

    const handleAddPrefix = () => {
        const val = inputValue.trim();
        if (val && !currentSelected.includes(val)) {
            onChange([...currentSelected, val]);
            setInputValue('');
        }
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddPrefix();
        }
    };

    const removeSelectorItem = (itemToRemove: string) => {
        onChange(currentSelected.filter(s => s !== itemToRemove));
    };

    // Color theme variants
    const isPurple = colorScheme === 'purple';
    const activeExactClass = isPurple
        ? 'bg-purple-600 border-purple-500 text-white shadow-sm shadow-purple-500/20'
        : 'bg-indigo-600 border-indigo-500 text-white shadow-sm shadow-indigo-500/20';
    
    const activePrefixClass = isPurple
        ? 'bg-purple-950/60 border-purple-500/50 text-purple-200'
        : 'bg-indigo-950/60 border-indigo-500/50 text-indigo-200';

    const activeSelectorChipClass = isPurple
        ? 'bg-purple-900/50 border-purple-700/60 text-purple-200 hover:border-purple-500'
        : 'bg-indigo-900/50 border-indigo-700/60 text-indigo-200 hover:border-indigo-500';

    const addBtnClass = isPurple
        ? 'bg-purple-600 hover:bg-purple-500 text-white'
        : 'bg-indigo-600 hover:bg-indigo-500 text-white';

    return (
        <div className={`bg-slate-900/50 p-4 rounded-xl border relative z-10 transition-colors ${error ? 'border-rose-500/60' : 'border-slate-800/60'} ${className}`}>
            {/* Header: Label, Help, Stats, Quick Actions & Search */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-3">
                <div>
                    <div className="flex items-center gap-2">
                        {label && (
                            <label className={`text-xs font-bold uppercase tracking-wider ${error ? 'text-rose-400' : 'text-slate-400'}`}>
                                {label}
                            </label>
                        )}
                        {stats.total > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">
                                {stats.matched}/{stats.total} matched
                            </span>
                        )}
                    </div>
                    {help && (
                        <p className="text-[10px] text-slate-500 mt-0.5">{help}</p>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={handleSelectAll}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-md border transition-colors ${
                                isPurple
                                    ? 'text-purple-300 hover:text-white bg-purple-950/60 border-purple-800/60 hover:bg-purple-900/60'
                                    : 'text-indigo-300 hover:text-white bg-indigo-950/60 border-indigo-800/60 hover:bg-indigo-900/60'
                            }`}
                        >
                            Select All
                        </button>
                        <button
                            type="button"
                            onClick={handleDeselectAll}
                            className="text-[11px] font-bold text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 hover:bg-slate-850 px-2.5 py-1 rounded-md transition-colors"
                        >
                            Deselect All
                        </button>
                    </div>

                    {availableTags.length > 4 && (
                        <div className="relative w-full md:w-44 shrink-0">
                            <Icon name="MagnifyingGlass" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
                            <input
                                className="w-full bg-slate-950 border border-slate-700 rounded-md pl-8 pr-6 py-1 text-[11px] text-white outline-none focus:border-indigo-500/50 transition-colors"
                                placeholder="Filter nodes..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs font-mono"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Visual Legend */}
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 mb-3 bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-800/40">
                <span className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${isPurple ? 'bg-purple-500' : 'bg-indigo-500'}`} />
                    <span>Exact match</span>
                </span>
                <span className="flex items-center gap-1">
                    <Icon name="GitMerge" className={isPurple ? 'text-purple-400' : 'text-indigo-400'} />
                    <span>Prefix match</span>
                </span>
                <span className="flex items-center gap-1">
                    <Icon name="Eye" className="text-amber-400 animate-pulse" />
                    <span className="text-amber-400/90">Preview (typing)</span>
                </span>
            </div>

            {/* Outbounds Grid */}
            <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 ${maxGridHeight} overflow-y-auto custom-scroll pr-1`}>
                {filteredOutbounds.map((tag: string, idx: number) => {
                    const { exact, prefixMatch, pendingMatch, matchedPrefix } = checkOutboundMatch(
                        tag,
                        currentSelected,
                        inputValue
                    );

                    let styleClass = 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300';

                    if (exact) {
                        styleClass = activeExactClass;
                    } else if (prefixMatch) {
                        styleClass = activePrefixClass;
                    } else if (pendingMatch) {
                        styleClass = 'bg-amber-950/40 border-amber-500 text-amber-200 animate-pulse';
                    }

                    return (
                        <div
                            key={tag}
                            onClick={(e) => handleTagClick(e, tag, idx)}
                            title={prefixMatch ? `Matched by prefix "${matchedPrefix}"` : tag}
                            className={`cursor-pointer px-2.5 py-1.5 rounded-lg border text-xs font-mono flex justify-between items-center transition-all select-none ${styleClass}`}
                        >
                            <span className="truncate mr-1">{tag}</span>
                            {exact && <Icon name="CheckCircle" className="text-white shrink-0" weight="fill" />}
                            {prefixMatch && <Icon name="GitMerge" className={`shrink-0 ${isPurple ? 'text-purple-400' : 'text-indigo-400'}`} />}
                            {pendingMatch && <Icon name="Eye" className="text-amber-400 shrink-0" />}
                        </div>
                    );
                })}

                {filteredOutbounds.length === 0 && (
                    <div className="col-span-full py-4 text-center text-xs text-slate-500 italic">
                        {availableTags.length === 0 ? 'No outbounds available' : 'No outbounds match filter'}
                    </div>
                )}
            </div>

            {/* Add Custom Prefix / Selector Input */}
            <div className="mt-4 pt-3.5 border-t border-slate-800/80">
                <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Add Prefix or Tag Filter
                    </label>
                    <span className="text-[10px] text-slate-500">
                        Press Enter to add
                    </span>
                </div>
                <div className="flex gap-2 items-center">
                    <input
                        className="flex-1 input-base text-xs font-mono placeholder:text-slate-600"
                        placeholder={placeholder}
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                    />
                    <button
                        type="button"
                        onClick={handleAddPrefix}
                        disabled={!inputValue.trim()}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${addBtnClass}`}
                    >
                        Add
                    </button>
                </div>

                {/* Active Selectors / Prefixes List */}
                {currentSelected.length > 0 && (
                    <div className="mt-3">
                        <div className="text-[10px] font-semibold text-slate-500 mb-1.5">Active Selectors:</div>
                        <div className="flex flex-wrap gap-1.5">
                            {currentSelected.map((sel: string) => {
                                const isExact = availableTags.includes(sel);
                                const matchCount = availableTags.filter(t => t.startsWith(sel)).length;
                                
                                return (
                                    <span
                                        key={sel}
                                        className={`text-[11px] font-mono px-2 py-0.5 rounded-md border flex items-center gap-1.5 transition-colors ${activeSelectorChipClass}`}
                                    >
                                        {!isExact && <Icon name="GitMerge" className="text-[10px] opacity-70" />}
                                        <span>{sel}</span>
                                        {!isExact && matchCount > 0 && (
                                            <span className="text-[9px] opacity-70 bg-black/30 px-1 rounded">
                                                {matchCount} {matchCount === 1 ? 'node' : 'nodes'}
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeSelectorItem(sel)}
                                            className="hover:text-white ml-0.5 opacity-60 hover:opacity-100 transition-opacity font-bold"
                                            title={`Remove ${sel}`}
                                        >
                                            ×
                                        </button>
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <p className="text-[11px] text-rose-400 mt-2 flex items-center gap-1">
                    <Icon name="WarningOctagon" /> {error}
                </p>
            )}
        </div>
    );
};
