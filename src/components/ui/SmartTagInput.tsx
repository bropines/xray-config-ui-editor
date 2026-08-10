import React, { useEffect, useState, useRef } from "react";
import { Icon } from "./Icon";
import { toast } from "sonner";
import { useSmartTagInput } from "../../hooks/useSmartTagInput";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Suggestion {
    code: string;
    count: number;
}

interface SmartTagInputProps {
    label: React.ReactNode;
    value: string[];
    onChange: (val: string[]) => void;
    suggestions?: Suggestion[];
    prefix: string;
    placeholder?: string;
    isLoading?: boolean;
    invalidTags?: string[];
    warnTags?: string[];
    onTagClick?: (tag: string) => void;
    errorTooltip?: string;
    warnTooltip?: string;
    allowedPattern?: RegExp;
    cleanRegex?: RegExp;
    actionIcon?: string;
    actionTooltip?: string;
    onActionClick?: () => void;
}

const SortableChipTag = ({
    id,
    tag,
    isInvalid,
    isWarn,
    errorTooltip,
    warnTooltip,
    onTagClick,
    removeTag,
}: {
    id: string;
    tag: string;
    isInvalid: boolean;
    isWarn: boolean;
    errorTooltip: string;
    warnTooltip: string;
    onTagClick?: (tag: string) => void;
    removeTag: (tag: string) => void;
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const [holdProgress, setHoldProgress] = useState(0);
    const holdTimerRef = useRef<any>(null);
    const intervalRef = useRef<any>(null);
    const isHoldingRef = useRef(false);

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 999 : 'auto',
        opacity: isDragging ? 0.6 : 1,
    };

    const startHold = () => {
        isHoldingRef.current = true;
        setHoldProgress(0);
        const startTime = Date.now();
        const duration = 1500;

        intervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(100, (elapsed / duration) * 100);
            setHoldProgress(progress);
            if (progress >= 100) {
                clearInterval(intervalRef.current);
            }
        }, 30);

        holdTimerRef.current = setTimeout(() => {
            isHoldingRef.current = false;
        }, duration);
    };

    const cancelHold = () => {
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
        isHoldingRef.current = false;
        setHoldProgress(0);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        startHold();
        listeners?.onPointerDown?.(e as any);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        const wasHoldingShort = isHoldingRef.current && holdProgress < 100;
        cancelHold();

        if (wasHoldingShort) {
            if (e.ctrlKey || e.metaKey) {
                if (onTagClick) onTagClick(tag);
            } else {
                if (navigator?.clipboard?.writeText) {
                    navigator.clipboard.writeText(tag)
                        .then(() => toast.success(`Copied: ${tag}`))
                        .catch(() => {
                            try {
                                const el = document.createElement('textarea');
                                el.value = tag;
                                document.body.appendChild(el);
                                el.select();
                                document.execCommand('copy');
                                document.body.removeChild(el);
                                toast.success(`Copied: ${tag}`);
                            } catch (err) { toast.error("Copy failed"); }
                        });
                } else {
                    try {
                        const el = document.createElement('textarea');
                        el.value = tag;
                        document.body.appendChild(el);
                        el.select();
                        document.execCommand('copy');
                        document.body.removeChild(el);
                        toast.success(`Copied: ${tag}`);
                    } catch (err) { toast.error("Copy failed"); }
                }
            }
        }
    };

    return (
        <span
            ref={setNodeRef}
            style={style}
            {...attributes}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={cancelHold}
            onPointerCancel={cancelHold}
            title={isInvalid ? errorTooltip : isWarn ? warnTooltip : "Hold 1.5s to drag & reorder | Click to copy | Ctrl+Click for details"}
            className={`relative overflow-hidden px-2 py-1 rounded text-xs font-mono flex items-center gap-1 border transition-all cursor-grab active:cursor-grabbing select-none hover:ring-1 hover:ring-indigo-500 ${
                isDragging ? 'ring-2 ring-indigo-400 scale-105 shadow-lg bg-indigo-950 border-indigo-500 z-[999]'
                : isInvalid
                    ? 'bg-rose-900/40 border-rose-500/70 text-rose-200'
                    : isWarn
                        ? 'bg-amber-900/30 border-amber-500/50 text-amber-200'
                        : 'bg-slate-800 border-slate-700 text-slate-200'
            }`}
        >
            {holdProgress > 0 && holdProgress < 100 && (
                <span
                    className="absolute inset-0 bg-indigo-500/40 transition-all pointer-events-none rounded"
                    style={{ width: `${holdProgress}%` }}
                />
            )}
            {isInvalid && <Icon name="WarningOctagon" weight="fill" className="text-rose-400 text-[10px]" />}
            {isWarn && <Icon name="Warning" weight="fill" className="text-amber-400 text-[10px]" />}
            <span className="relative z-10">{tag}</span>
            <button
                type="button"
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); removeTag(tag); }}
                className={`relative z-10 ${
                    isInvalid ? 'hover:text-red-300 text-rose-400'
                        : isWarn ? 'hover:text-amber-100 text-amber-400'
                            : 'hover:text-red-400 text-slate-400'
                }`}
            >
                <Icon name="x" />
            </button>
        </span>
    );
};

export const SmartTagInput = ({
    label,
    value = [],
    onChange,
    suggestions = [],
    prefix,
    placeholder,
    isLoading,
    invalidTags = [],
    warnTags = [],
    onTagClick,
    errorTooltip = "Invalid tag",
    warnTooltip = "Style lint warning",
    cleanRegex = /\[\d+\]/g,
    allowedPattern,
    actionIcon,
    actionTooltip,
    onActionClick
}: SmartTagInputProps) => {
    const {
        input, setInput,
        showSuggest, setShowSuggest,
        focusedIndex, setFocusedIndex,
        wrapperRef, suggestionsRef,
        filteredSuggestions,
        processAndAddTags,
        removeTag
    } = useSmartTagInput(value, onChange, suggestions, prefix, cleanRegex);

    const [showSortMenu, setShowSortMenu] = useState(false);
    const sortMenuRef = useRef<HTMLDivElement>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                delay: 1500,
                tolerance: 5,
            },
        })
    );

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (showSuggest && filteredSuggestions.length > 0) {
                setFocusedIndex(prev => Math.min(prev + 1, filteredSuggestions.length - 1));
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (showSuggest && filteredSuggestions.length > 0) {
                setFocusedIndex(prev => Math.max(prev - 1, -1));
            }
        } else if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            e.stopPropagation();
            
            if (showSuggest && focusedIndex >= 0 && focusedIndex < filteredSuggestions.length) {
                processAndAddTags(`${prefix}${filteredSuggestions[focusedIndex].code}`);
            } else {
                processAndAddTags(input);
            }
        } else if (e.key === 'Escape') {
            setShowSuggest(false);
            setFocusedIndex(-1);
        } else if (e.key === 'Backspace' && !input && value.length > 0) {
            removeTag(value[value.length - 1]);
        }
    };

    useEffect(() => {
        if (showSuggest && focusedIndex >= 0 && suggestionsRef.current) {
            const container = suggestionsRef.current;
            const activeElement = container.children[focusedIndex] as HTMLElement;
            if (activeElement) {
                const containerTop = container.scrollTop;
                const containerBottom = containerTop + container.clientHeight;
                const elemTop = activeElement.offsetTop;
                const elemBottom = elemTop + activeElement.clientHeight;

                if (elemTop < containerTop) container.scrollTop = elemTop;
                else if (elemBottom > containerBottom) container.scrollTop = elemBottom - container.clientHeight;
            }
        }
    }, [focusedIndex, showSuggest]);

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData("Text");
        processAndAddTags(pastedText);
    };

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setShowSuggest(false);
                setFocusedIndex(-1);
            }
            if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
                setShowSortMenu(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const itemIds = value.map((t, i) => `${t}-${i}`);
        const oldIndex = itemIds.indexOf(active.id);
        const newIndex = itemIds.indexOf(over.id);

        if (oldIndex < 0 || newIndex < 0) return;

        const newValue = [...value];
        const [moved] = newValue.splice(oldIndex, 1);
        newValue.splice(newIndex, 0, moved);
        onChange(newValue);
        toast.success("Tags reordered");
    };

    const prefixName = prefix ? prefix.replace(/:$/, '').toUpperCase() : 'PREFIX';

    const sortAlphabetical = () => {
        const sorted = [...value].sort((a, b) => a.localeCompare(b));
        onChange(sorted);
        setShowSortMenu(false);
        toast.success("Sorted alphabetically (A-Z)");
    };

    const sortPrefixFirst = () => {
        const pLower = prefix.toLowerCase();
        const isPref = (s: string) => {
            const sl = s.toLowerCase();
            return sl.startsWith(pLower) || sl.startsWith('geosite:') || sl.startsWith('geoip:');
        };
        const sorted = [...value].sort((a, b) => {
            const aP = isPref(a);
            const bP = isPref(b);
            if (aP && !bP) return -1;
            if (!aP && bP) return 1;
            return a.localeCompare(b);
        });
        onChange(sorted);
        setShowSortMenu(false);
        toast.success(`Sorted: ${prefixName} first`);
    };

    const sortPlainFirst = () => {
        const pLower = prefix.toLowerCase();
        const isPref = (s: string) => {
            const sl = s.toLowerCase();
            return sl.startsWith(pLower) || sl.startsWith('geosite:') || sl.startsWith('geoip:');
        };
        const sorted = [...value].sort((a, b) => {
            const aP = isPref(a);
            const bP = isPref(b);
            if (!aP && bP) return -1;
            if (aP && !bP) return 1;
            return a.localeCompare(b);
        });
        onChange(sorted);
        setShowSortMenu(false);
        toast.success("Sorted: Plain items first");
    };

    const hasInvalid = invalidTags.length > 0;
    const hasWarn = warnTags.length > 0;

    const containerBorder = hasInvalid
        ? 'border-rose-500/70 focus-within:border-rose-500 focus-within:ring-rose-500/30'
        : hasWarn
            ? 'border-amber-500/50 focus-within:border-amber-400 focus-within:ring-amber-400/20'
            : 'border-slate-700 focus-within:border-indigo-500 focus-within:ring-indigo-500/50';

    const itemIds = value.map((t, i) => `${t}-${i}`);

    return (
        <div className="flex flex-col gap-2" ref={wrapperRef}>
            {label && (
                <label className="text-xs uppercase font-bold text-slate-500 flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                        {label}
                        {hasInvalid && (
                            <span className="text-rose-400 flex items-center gap-1 normal-case font-normal text-[10px]">
                                <Icon name="WarningOctagon" weight="fill" className="text-[11px]" />
                                {invalidTags.length} error{invalidTags.length > 1 ? 's' : ''}
                            </span>
                        )}
                        {!hasInvalid && hasWarn && (
                            <span className="text-amber-400 flex items-center gap-1 normal-case font-normal text-[10px]">
                                <Icon name="Warning" weight="fill" className="text-[11px]" />
                                {warnTags.length} lint
                            </span>
                        )}
                    </span>
                    <div className="flex items-center gap-2">
                        {isLoading && (
                            <span className="text-indigo-400 flex items-center gap-1">
                                <Icon name="spinner" className="animate-spin" /> Loading DB...
                            </span>
                        )}

                        {value.length > 1 && (
                            <div className="relative" ref={sortMenuRef}>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setShowSortMenu(!showSortMenu); }}
                                    className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-indigo-400 bg-slate-900 border border-slate-800 rounded px-2 py-0.5 transition-colors uppercase tracking-wider"
                                    title="Sort options"
                                >
                                    <Icon name="ArrowsDownUp" className="text-xs text-indigo-400" />
                                    Sort
                                </button>

                                {showSortMenu && (
                                    <div className="absolute right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[100] py-1.5 min-w-[170px] text-xs animate-in fade-in">
                                        <button
                                            type="button"
                                            onClick={sortAlphabetical}
                                            className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-slate-300 flex items-center gap-2 transition-colors"
                                        >
                                            <Icon name="SortAscending" className="text-sm text-indigo-400" />
                                            Alphabetical (A-Z)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={sortPrefixFirst}
                                            className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-slate-300 flex items-center gap-2 transition-colors"
                                        >
                                            <Icon name="Tag" className="text-sm text-purple-400" />
                                            {prefixName ? `${prefixName} first` : 'Prefix first'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={sortPlainFirst}
                                            className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white text-slate-300 flex items-center gap-2 transition-colors"
                                        >
                                            <Icon name="Globe" className="text-sm text-blue-400" />
                                            Plain items first
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </label>
            )}

            <div
                className={`bg-slate-950 border rounded-lg py-1.5 px-3 flex items-center justify-between focus-within:ring-1 transition-all min-h-[44px] ${containerBorder}`}
            >
                <div 
                    className="flex flex-wrap gap-2 flex-1 cursor-text"
                    onClick={() => wrapperRef.current?.querySelector('input')?.focus()}
                >
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={itemIds} strategy={rectSortingStrategy}>
                            {value.map((tag, i) => {
                                const isInvalid = invalidTags.includes(tag);
                                const isWarn = !isInvalid && warnTags.includes(tag);
                                const itemId = `${tag}-${i}`;

                                return (
                                    <SortableChipTag
                                        key={itemId}
                                        id={itemId}
                                        tag={tag}
                                        isInvalid={isInvalid}
                                        isWarn={isWarn}
                                        errorTooltip={errorTooltip}
                                        warnTooltip={warnTooltip}
                                        onTagClick={onTagClick}
                                        removeTag={removeTag}
                                    />
                                );
                            })}
                        </SortableContext>
                    </DndContext>

                    <div className="relative flex-1 min-w-[120px]">
                        <input
                            className="bg-transparent outline-none text-sm text-white w-full h-full font-mono placeholder:text-slate-600"
                            value={input}
                            onChange={e => { 
                                let val = e.target.value;
                                if (allowedPattern) {
                                    val = val.replace(allowedPattern, '');
                                }
                                if (val.includes(',') || val.includes(' ') || val.includes('\n')) {
                                    processAndAddTags(val);
                                } else {
                                    setInput(val); 
                                    setShowSuggest(true);
                                    setFocusedIndex(-1);
                                }
                            }}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            onFocus={() => setShowSuggest(true)}
                            placeholder={placeholder}
                            enterKeyHint="done"
                            inputMode="text"
                            autoComplete="off"
                        />
                        
                        {showSuggest && input && filteredSuggestions.length > 0 && (
                            <div 
                                ref={suggestionsRef}
                                className="absolute top-full left-0 mt-2 w-full min-w-[250px] bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-56 overflow-y-auto custom-scroll"
                            >
                                {filteredSuggestions.map((s, index) => {
                                    const isFocused = focusedIndex === index;
                                    return (
                                        <button
                                            key={s.code}
                                            onMouseEnter={() => setFocusedIndex(index)}
                                            className={`w-full text-left px-3 py-2 text-xs flex justify-between items-center group transition-colors ${
                                                isFocused 
                                                    ? 'bg-indigo-600 text-white' 
                                                    : 'hover:bg-indigo-600 hover:text-white text-slate-300'
                                            }`}
                                            onClick={() => processAndAddTags(`${prefix}${s.code}`)}
                                        >
                                            <span className="font-bold font-mono">
                                                <span className={isFocused ? 'text-indigo-200' : 'text-slate-500 group-hover:text-indigo-200'}>{prefix}</span>
                                                <span className={isFocused ? 'text-white' : 'text-slate-200 group-hover:text-white'}>{s.code}</span>
                                            </span>
                                            <span className={`text-[10px] ${isFocused ? 'text-indigo-200' : 'text-slate-500 group-hover:text-indigo-200'}`}>
                                                {s.count} recs
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
                {onActionClick && actionIcon && (
                    <div className="flex items-center h-[34px] border-l border-slate-800/80 pl-2 pr-1.5 select-none ml-1">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onActionClick(); }}
                            title={actionTooltip}
                            className="text-slate-500 hover:text-indigo-400 active:text-indigo-500 transition-colors cursor-pointer flex items-center justify-center h-full w-[24px]"
                        >
                            <Icon name={actionIcon} className="text-base" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};