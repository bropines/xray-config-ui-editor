import React from 'react';
import { Icon } from '../../ui/Icon';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getCriticalRuleErrors } from '../../../core/validators';
import { getSnippetRefName, classifySnippet, type SnippetDefinition } from '../../../core/snippets';
import { t, tn } from '../../../i18n';

/**
 * A `{ "snippet": "NAME" }` entry is a Remnawave placeholder, not a rule: the
 * panel replaces it with the referenced block on its way to a node. It keeps
 * its slot in the list because routing order is positional, but it gets its
 * own look and never shows rule errors. See core/snippets.
 */
const SnippetRuleItem = ({ id, name, definition, isActive, onClick, onDelete }: any) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: transform ? 999 : 'auto'
    };

    const body = Array.isArray(definition?.snippet) ? definition.snippet : null;
    const kind = body ? classifySnippet(body) : null;

    return (
        <div ref={setNodeRef} style={style} {...attributes}
            onClick={onClick}
            className={`p-2 rounded-lg cursor-pointer text-xs flex items-center gap-2 group transition-all border select-none mb-1
                ${isActive
                    ? 'bg-fuchsia-600/20 border-fuchsia-500/60'
                    : 'bg-fuchsia-950/20 border-fuchsia-500/25 hover:border-fuchsia-500/50'
                }`}
        >
            <div {...listeners} className="cursor-grab text-slate-600 hover:text-slate-300 p-2 touch-none">
                <Icon name="DotsSixVertical" className="text-base" />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <Icon name="BracketsCurly" weight="bold" className="text-fuchsia-400 shrink-0 text-sm" />
                    <span className="font-bold truncate text-fuchsia-100 text-sm">{name}</span>
                </div>
                <div className="text-[10px] font-mono truncate ml-[22px] mt-0.5">
                    {body
                        ? <span className="text-fuchsia-300/70">
                            {t("snippet")} &middot;{" "}
                            {kind === 'outbounds'
                                ? tn(body.length, "{n} outbound", "{n} outbounds")
                                : tn(body.length, "{n} entry", "{n} entries")}
                        </span>
                        : <span className="text-amber-400/80">{t("snippet · body not loaded")}</span>}
                </div>
            </div>

            <button
                onClick={e => { e.stopPropagation(); onDelete(); }}
                className="text-slate-600 hover:text-rose-500 p-2 rounded-md hover:bg-rose-500/10 transition-colors"
                title={t("Remove this snippet reference")}
            >
                <Icon name="Trash" className="text-lg" />
            </button>
        </div>
    );
};

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
                        Target: {rule.outboundTag || rule.balancerTag || <span className="text-rose-400">{t("none!")}</span>}
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
                title={t("Delete Rule")}
            >
                <Icon name="Trash" className="text-lg" />
            </button>
        </div>
    );
};

export const RuleList = ({ rules, activeIndex, onSelect, onDelete, onReorder, snippets = [], onOpenSnippets }: any) => {
    const brokenCount = rules.filter((r: any) => getCriticalRuleErrors(r).length > 0).length;

    const snippetDefs = React.useMemo(() => {
        const map = new Map<string, SnippetDefinition>();
        (snippets as SnippetDefinition[]).forEach(def => { if (def?.name) map.set(def.name, def); });
        return map;
    }, [snippets]);

    const snippetRefs = React.useMemo(
        () => rules.map((r: any) => getSnippetRefName(r)).filter(Boolean) as string[],
        [rules]
    );
    const unloadedSnippets = React.useMemo(
        () => Array.from(new Set(snippetRefs.filter(name => !snippetDefs.has(name)))),
        [snippetRefs, snippetDefs]
    );

    // Calculate duplicate matchers across all rules (flagging ALL rules involved in a conflict)
    const warningsMap = React.useMemo(() => {
        const map = new Map<number, string[]>();
        const domainToRules = new Map<string, Array<{ index: number; name: string }>>();
        const ipToRules = new Map<string, Array<{ index: number; name: string }>>();

        rules.forEach((rule: any, i: number) => {
            const name = rule.ruleTag || rule.outboundTag || rule.balancerTag || `Rule #${i + 1}`;

            if (Array.isArray(rule.domain)) {
                rule.domain.forEach((d: string) => {
                    if (!d || typeof d !== 'string') return;
                    const k = d.trim().toLowerCase();
                    if (!domainToRules.has(k)) domainToRules.set(k, []);
                    domainToRules.get(k)!.push({ index: i, name });
                });
            }

            if (Array.isArray(rule.ip)) {
                rule.ip.forEach((ip: string) => {
                    if (!ip || typeof ip !== 'string') return;
                    const k = ip.trim().toLowerCase();
                    if (!ipToRules.has(k)) ipToRules.set(k, []);
                    ipToRules.get(k)!.push({ index: i, name });
                });
            }
        });

        domainToRules.forEach((occurrences, matcher) => {
            if (occurrences.length > 1) {
                occurrences.forEach(occ => {
                    if (!map.has(occ.index)) map.set(occ.index, []);
                    const otherRules = occurrences
                        .filter(o => o.index !== occ.index)
                        .map(o => `${o.name} (Rule #${o.index + 1})`)
                        .join(', ');
                    map.get(occ.index)!.push(`Duplicate matcher "${matcher}" is also used in: ${otherRules}`);
                });
            }
        });

        ipToRules.forEach((occurrences, matcher) => {
            if (occurrences.length > 1) {
                occurrences.forEach(occ => {
                    if (!map.has(occ.index)) map.set(occ.index, []);
                    const otherRules = occurrences
                        .filter(o => o.index !== occ.index)
                        .map(o => `${o.name} (Rule #${o.index + 1})`)
                        .join(', ');
                    map.get(occ.index)!.push(`Duplicate IP matcher "${matcher}" is also used in: ${otherRules}`);
                });
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
                        {tn(brokenCount,
                            "{n} rule will crash Xray — fix it before closing",
                            "{n} rules will crash Xray — fix them before closing")}
                    </span>
                </div>
            )}

            {snippetRefs.length > 0 && (
                <button
                    onClick={onOpenSnippets}
                    className="mx-1 mb-2 px-3 py-2 bg-fuchsia-950/30 border border-fuchsia-500/30 rounded-lg text-fuchsia-200 text-[10px] flex items-center gap-2 text-left hover:border-fuchsia-400/60 transition-colors"
                >
                    <Icon name="BracketsCurly" weight="bold" className="shrink-0 text-fuchsia-400 text-xs" />
                    <span className="flex-1">
                        {tn(snippetRefs.length,
                            "{n} snippet reference expanded by the panel",
                            "{n} snippet references expanded by the panel")}
                        {unloadedSnippets.length > 0 && (
                            <span className="text-amber-400/90">
                                {" · "}{t("{n} not loaded", { n: unloadedSnippets.length })}
                            </span>
                        )}
                    </span>
                    <Icon name="ArrowSquareOut" className="shrink-0 opacity-60" />
                </button>
            )}

            {duplicateCount > 0 && (
                <div className="mx-1 mb-2 px-3 py-2 bg-amber-950/30 border border-amber-500/40 rounded-lg text-amber-300 text-[10px] flex items-center gap-2">
                    <Icon name="Warning" weight="fill" className="shrink-0 text-amber-400 text-xs" />
                    <span>
                        {tn(duplicateCount,
                            "{n} rule contains shadowed duplicate matchers",
                            "{n} rules contain shadowed duplicate matchers")}
                    </span>
                </div>
            )}

            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={rules.map((_: any, i: number) => `rule-${i}`)} strategy={verticalListSortingStrategy}>
                    {rules.map((rule: any, i: number) => {
                        const isActive = rule.originalIndex !== undefined ? rule.originalIndex === activeIndex : activeIndex === i;
                        const warnings = warningsMap.get(rule.originalIndex !== undefined ? rule.originalIndex : i) || [];
                        const snippetName = getSnippetRefName(rule);
                        if (snippetName) {
                            return (
                                <SnippetRuleItem
                                    key={`rule-${i}`} id={`rule-${i}`}
                                    name={snippetName}
                                    definition={snippetDefs.get(snippetName)}
                                    isActive={isActive}
                                    onClick={() => onSelect(i)}
                                    onDelete={() => onDelete(i)}
                                />
                            );
                        }
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