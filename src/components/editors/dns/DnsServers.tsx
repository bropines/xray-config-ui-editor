import React from 'react';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { DnsServerEditor } from './DnsServerEditor';
import { useConfigStore } from '../../../store/configStore'; // Если нужно обновлять глобально, но тут мы принимаем пропсы
import { useArrayField } from '../../../hooks/useField';

// DnD Imports
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DNS_RESOLVERS, DEFAULT_DNS_UPSTREAM } from '../../../core/presets/dns';
import { t, tn } from '../../../i18n';
import { dndAccessibility } from '../../ui/dndAccessibility';

// Компонент одного элемента (Sortable)
const SortableDnsItem = ({ server, id, isActive, onClick, onDelete }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition, zIndex: transform ? 999 : 'auto' };

    const isString = typeof server === 'string';
    const address = isString ? server : server.address;
    const domains = !isString && server.domains ? server.domains.length : 0;

    return (
        <div ref={setNodeRef} style={style} {...attributes}
            onClick={onClick}
            className={`bg-slate-900 border p-3 rounded-lg flex justify-between items-center group cursor-pointer transition-all select-none
                ${isActive ? 'border-indigo-500 bg-indigo-900/20' : 'border-slate-800 hover:border-slate-600'}
            `}
        >
            <div className="flex items-center gap-3 overflow-hidden">
                {/* Drag Handle */}
                <div {...listeners} className="cursor-grab text-slate-600 hover:text-slate-300 p-1 touch-none">
                    <Icon name="DotsSixVertical" />
                </div>

                <div className={`p-2 rounded shrink-0 ${isString ? 'bg-slate-800 text-slate-400' : 'bg-indigo-900/30 text-indigo-400'}`}>
                    <Icon name={isString ? "GlobeSimple" : "SlidersHorizontal"} />
                </div>
                
                <div className="min-w-0">
                    <div className="text-sm font-mono font-bold text-slate-200 truncate">{address}</div>
                    {!isString && (
                        <div className="text-[10px] text-slate-500 flex gap-2">
                            {domains > 0 && <span className="bg-slate-800 px-1 rounded text-slate-400 whitespace-nowrap">{tn(domains, "{n} domain", "{n} domains")}</span>}
                            {server.skipFallback && <span className="text-orange-400 whitespace-nowrap">{t("Skip Fallback")}</span>}
                        </div>
                    )}
                </div>
            </div>
            
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="md:opacity-0 md:group-hover:opacity-100 p-2 hover:text-rose-500 transition-opacity">
                <Icon name="Trash" />
            </button>
        </div>
    );
};

export const DnsServers = ({ servers = [], onSelect, onAdd, onDelete, onReorder }) => {
    // No path-based updateField here (onReorder replaces the whole servers
    // array), so we adapt useArrayField the same way DnsFakedns does:
    // wrap `servers` as a single-key local object and forward to onReorder.
    const list = useArrayField<any>({ servers }, (_path, value) => onReorder(value), 'servers');

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = parseInt(active.id.split('-')[1]);
        const newIndex = parseInt(over.id.split('-')[1]);

        list.move(oldIndex, newIndex);
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex justify-between items-center">
                <label className="label-xs">{t("DNS Servers Priority List")}</label>
                <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => onAdd(DEFAULT_DNS_UPSTREAM[0])} icon="Plus">{t("Simple")}</Button>
                    <Button variant="primary" size="sm" onClick={() => onAdd({ address: `https://${DEFAULT_DNS_UPSTREAM[0]}/dns-query`, domains: [] })} icon="Plus">{t("Advanced")}</Button>
                </div>
            </div>

            {/* Same resolver presets the Local Balancer builder offers, so the
                two screens do not disagree about what "the usual DNS" is. */}
            <div className="flex flex-wrap gap-1.5">
                {DNS_RESOLVERS.map(preset => (
                    <button
                        key={preset.id}
                        onClick={() => preset.servers.forEach(server => onAdd(server))}
                        title={`${preset.hint} Adds ${preset.servers.join(', ')}.`}
                        className="px-2 py-1.5 text-[10px] rounded-md border bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all"
                    >
                        + {preset.label}
                    </button>
                ))}
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scroll space-y-2 pr-1">
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} accessibility={dndAccessibility()}>
                    <SortableContext items={servers.map((_, i) => `srv-${i}`)} strategy={verticalListSortingStrategy}>
                        {servers.map((s, i) => (
                            <SortableDnsItem 
                                key={`srv-${i}`} 
                                id={`srv-${i}`} 
                                server={s} 
                                isActive={false} // Можно добавить состояние активного выбора
                                onClick={() => onSelect(i)}
                                onDelete={() => onDelete(i)}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
                
                {servers.length === 0 && <div className="text-center text-slate-600 text-xs py-8">{t("No DNS servers defined.")}</div>}
            </div>
        </div>
    );
};