import React from 'react';
import { Icon } from '../../ui/Icon';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { validateRule, getCriticalRuleErrors } from '../../../utils/validator';

const SortableRuleItem = ({ rule, id, isActive, onClick, onDelete }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition, zIndex: transform ? 999 : 'auto' };

    // Критические = те что реально крашат (без catch-all предупреждения)
    const criticalErrors = getCriticalRuleErrors(rule);
    // Предупреждения = catch-all
    const warnings = validateRule(rule).filter(e => e.field === 'matchers');
    const hasCritical = criticalErrors.length > 0;
    const hasWarning  = !hasCritical && warnings.length > 0;

    return (
        <div ref={setNodeRef} style={style} {...attributes}
            onClick={onClick}
            className={`p-2 rounded-lg cursor-pointer text-xs flex items-center gap-2 group transition-all border select-none mb-1
                ${isActive
                    ? 'bg-indigo-600/20 border-indigo-500/50'
                    : hasCritical
                        ? 'bg-rose-950/30 border-rose-800/50 hover:border-rose-600/60'
                        : hasWarning
                            ? 'bg-amber-950/20 border-amber-800/40 hover:border-amber-600/40'
                            : 'bg-slate-900 border-transparent hover:border-slate-700'
                }`}
        >
            <div {...listeners} className="cursor-grab text-slate-600 hover:text-slate-300 p-2 touch-none">
                <Icon name="DotsSixVertical" className="text-base" />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        hasCritical  ? 'bg-rose-500 animate-pulse'
                        : hasWarning ? 'bg-amber-400'
                        : rule.balancerTag ? 'bg-purple-400'
                        : 'bg-blue-400'
                    }`} />
                    <span className="font-bold truncate text-slate-200 text-sm">
                        {rule.ruleTag || rule.outboundTag || rule.balancerTag || "Unnamed Rule"}
                    </span>
                    {hasCritical && (
                        <Icon name="WarningOctagon" weight="fill" className="text-rose-400 shrink-0 text-base"
                            title={criticalErrors.map(e => e.message).join(' | ')} />
                    )}
                    {hasWarning && (
                        <Icon name="Warning" weight="fill" className="text-amber-400 shrink-0 text-base"
                            title="Catch-all rule — matches all traffic" />
                    )}
                </div>

                {rule.ruleTag && (
                    <div className="text-[9px] text-slate-500 uppercase flex items-center gap-1 ml-3 mt-0.5">
                        <Icon name="ArrowElbowDownRight" className="text-[8px]" />
                        Target: {rule.outboundTag || rule.balancerTag || <span className="text-rose-400">none!</span>}
                    </div>
                )}

                <div className={`text-[10px] text-slate-500 font-mono truncate ml-3 ${rule.ruleTag ? 'mt-0.5' : 'mt-1'}`}>
                    {rule.domain ? `dom:${rule.domain.length}` : rule.ip ? `ip:${rule.ip.length}` : 'match:all'}
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

export const RuleList = ({ rules, activeIndex, onSelect, onDelete, onReorder }) => {
    const criticalCount = rules.filter(r => getCriticalRuleErrors(r).length > 0).length;

    const handleDragEnd = event => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = rules.findIndex((_, i) => `rule-${i}` === active.id);
        const newIndex = rules.findIndex((_, i) => `rule-${i}` === over.id);
        const newRules = [...rules];
        const [moved] = newRules.splice(oldIndex, 1);
        newRules.splice(newIndex, 0, moved);
        onReorder(newRules, oldIndex, newIndex);
    };

    return (
        <div className="flex-1 overflow-y-auto custom-scroll p-2 flex flex-col gap-1">
            {criticalCount > 0 && (
                <div className="mx-1 mb-2 px-3 py-2 bg-rose-900/20 border border-rose-500/40 rounded-lg text-rose-300 text-[10px] flex items-center gap-2">
                    <Icon name="WarningOctagon" weight="fill" className="shrink-0" />
                    <span>
                        <b>{criticalCount}</b> rule{criticalCount > 1 ? 's' : ''} will crash Xray — fix before closing
                    </span>
                </div>
            )}

            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={rules.map((_, i) => `rule-${i}`)} strategy={verticalListSortingStrategy}>
                    {rules.map((rule, i) => (
                        <SortableRuleItem
                            key={`rule-${i}`} id={`rule-${i}`}
                            rule={rule}
                            isActive={activeIndex === i}
                            onClick={() => onSelect(i)}
                            onDelete={() => onDelete(i)}
                        />
                    ))}
                </SortableContext>
            </DndContext>
        </div>
    );
};