import React from 'react';
import { Icon } from '../../ui/Icon';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getCriticalRuleErrors } from '../../../core/validators';

const SortableRuleItem = ({ rule, id, isActive, onClick, onDelete, warnings = [] }: any) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: transform ? 999 : 'auto'
    };

    const errors  = getCriticalRuleErrors(rule);
    const broken  = errors.length > 0;
    const hasWarnings = warnings.length > 0 && !broken;

    return (
        <div ref={setNodeRef} style={style} {...attributes}
            onClick={onClick}
            className={`p-2 rounded-lg cursor-pointer text-xs flex items-center gap-2 group transition-all border select-none mb-1
                ${isActive
                    ? 'bg-indigo-600/20 border-indigo-500/50'
                    : broken
                        ? 'bg-rose-950/30 border-rose-800/50 hover:border-rose-600/60'
                        : hasWarnings
                            ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500/60'
                            : 'bg-slate-900 border-transparent hover:border-slate-700'
                }`}
        >
            <div {...listeners} className="cursor-grab text-slate-600 hover:text-slate-300 p-2 touch-none">
                <Icon name="DotsSixVertical" className="text-base" />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        broken ? 'bg-rose-500 animate-pulse'
                        : hasWarnings ? 'bg-amber-400'
                        : rule.balancerTag ? 'bg-purple-400'
                        : 'bg-blue-400'
                    }`} />
                    <span className="font-bold truncate text-slate-200 text-sm">
                        {rule.ruleTag || rule.outboundTag || rule.balancerTag || "Unnamed Rule"}
                    </span>
                    {broken && (
                        <Icon name="WarningOctagon" weight="fill"
                            className="text-rose-400 shrink-0 text-base"
                            title={errors.map((e: any) => e.message).join(' | ')}
                        />
                    )}
                    {hasWarnings && (
                        <Icon name="Warning" weight="fill"
                            className="text-amber-400 shrink-0 text-base"
                            title={warnings.join('\n')}
                        />
                    )}
                </div>

                {rule.ruleTag && (
                    <div className="text-[9px] text-slate-500 uppercase flex items-center gap-1 ml-3 mt-0.5">
                        <Icon name="ArrowElbowDownRight" className="text-[8px]" />
                        Target: {rule.outboundTag || rule.balancerTag || <span className="text-rose-400">none!</span>}
                    </div>
                )}

                <div className={`text-[10px] text-slate-500 font-mono truncate ml-3 ${rule.ruleTag ? 'mt-0.5' : 'mt-1'}`}>
                    {hasWarnings ? (
                        <span className="text-amber-400/80 font-bold">⚠️ Duplicate matchers detected</span>
                    ) : rule.domain ? `dom:${rule.domain.length}` : rule.ip ? `ip:${rule.ip.length}` : rule.network ? `net:${rule.network}` : 'no matchers!'}
                </div>
            </div>

            <button
                onClick={e => { e.stopPropagation(); onDelete(); }}
                className="text-slate-600 hover:text-rose-500 p-2 rounded-md hover:bg-rose-500/10 transition-colors"
                title="Delete Rule"
            >
                <Icon name="Trash" className="text-lg" />
            </button>
        </div>
    );
};

export const RuleList = ({ rules, activeIndex, onSelect, onDelete, onReorder }: any) => {
    const brokenCount = rules.filter((r: any) => getCriticalRuleErrors(r).length > 0).length;

    // Calculate duplicate matchers across all rules
    const warningsMap = React.useMemo(() => {
        const map = new Map<number, string[]>();
        const seenDomains = new Map<string, { index: number; name: string }>();
        const seenIPs = new Map<string, { index: number; name: string }>();

        rules.forEach((rule: any, i: number) => {
            const name = rule.ruleTag || rule.outboundTag || rule.balancerTag || `Rule #${i + 1}`;
            const ruleWarnings: string[] = [];

            if (Array.isArray(rule.domain)) {
                rule.domain.forEach((d: string) => {
                    if (!d || typeof d !== 'string') return;
                    const k = d.trim().toLowerCase();
                    if (seenDomains.has(k)) {
                        const first = seenDomains.get(k)!;
                        ruleWarnings.push(`Duplicate domain/geosite matcher "${d}" — already matched in ${first.name} (Rule #${first.index + 1})`);
                    } else {
                        seenDomains.set(k, { index: i, name });
                    }
                });
            }

            if (Array.isArray(rule.ip)) {
                rule.ip.forEach((ip: string) => {
                    if (!ip || typeof ip !== 'string') return;
                    const k = ip.trim().toLowerCase();
                    if (seenIPs.has(k)) {
                        const first = seenIPs.get(k)!;
                        ruleWarnings.push(`Duplicate IP/geoip matcher "${ip}" — already matched in ${first.name} (Rule #${first.index + 1})`);
                    } else {
                        seenIPs.set(k, { index: i, name });
                    }
                });
            }

            if (ruleWarnings.length > 0) {
                map.set(i, ruleWarnings);
            }
        });

        return map;
    }, [rules]);

    const duplicateCount = warningsMap.size;

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = rules.findIndex((_: any, i: number) => `rule-${i}` === active.id);
        const newIndex = rules.findIndex((_: any, i: number) => `rule-${i}` === over.id);
        const newRules = [...rules];
        const [moved] = newRules.splice(oldIndex, 1);
        newRules.splice(newIndex, 0, moved);
        onReorder(newRules, oldIndex, newIndex);
    };

    return (
        <div className="flex-1 overflow-y-auto custom-scroll p-2 flex flex-col gap-1">
            {brokenCount > 0 && (
                <div className="mx-1 mb-1.5 px-3 py-2 bg-rose-900/20 border border-rose-500/40 rounded-lg text-rose-300 text-[10px] flex items-center gap-2">
                    <Icon name="WarningOctagon" weight="fill" className="shrink-0" />
                    <span>
                        <b>{brokenCount}</b> rule{brokenCount > 1 ? 's' : ''} will crash Xray — fix before closing
                    </span>
                </div>
            )}

            {duplicateCount > 0 && (
                <div className="mx-1 mb-2 px-3 py-2 bg-amber-950/30 border border-amber-500/40 rounded-lg text-amber-300 text-[10px] flex items-center gap-2">
                    <Icon name="Warning" weight="fill" className="shrink-0 text-amber-400 text-xs" />
                    <span>
                        <b>{duplicateCount}</b> rule{duplicateCount > 1 ? 's' : ''} contain shadowed duplicate matchers
                    </span>
                </div>
            )}

            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={rules.map((_: any, i: number) => `rule-${i}`)} strategy={verticalListSortingStrategy}>
                    {rules.map((rule: any, i: number) => {
                        const isActive = rule.originalIndex !== undefined ? rule.originalIndex === activeIndex : activeIndex === i;
                        const warnings = warningsMap.get(rule.originalIndex !== undefined ? rule.originalIndex : i) || [];
                        return (
                            <SortableRuleItem
                                key={`rule-${i}`} id={`rule-${i}`}
                                rule={rule}
                                isActive={isActive}
                                onClick={() => onSelect(i)}
                                onDelete={() => onDelete(i)}
                                warnings={warnings}
                            />
                        );
                    })}
                </SortableContext>
            </DndContext>
        </div>
    );
};