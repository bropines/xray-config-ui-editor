import React from 'react';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Внутренний компонент элемента списка
const SortableRuleItem = ({ rule, id, isActive, onClick, onDelete }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    
    const style = { 
        transform: CSS.Transform.toString(transform), 
        transition,
        zIndex: transform ? 999 : 'auto'
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}
            onClick={onClick}
            className={`p-2 rounded cursor-pointer text-xs flex items-center gap-2 group transition-all border select-none
                ${isActive ? 'bg-indigo-600/20 border-indigo-500/50' : 'bg-slate-900 border-transparent hover:border-slate-700'}`}
        >
            <div {...listeners} className="cursor-grab text-slate-600 hover:text-slate-300 p-1 touch-none">
                <Icon name="DotsSixVertical" />
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${rule.balancerTag ? 'bg-purple-400' : 'bg-blue-400'}`}></span>
                    <span className="font-bold truncate text-slate-200">{rule.outboundTag || rule.balancerTag || "Empty"}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate">
                    {rule.domain ? `dom:${rule.domain.length}` : rule.ip ? `ip:${rule.ip.length}` : 'match:all'}
                </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-slate-600 hover:text-rose-500 p-1">
                <Icon name="Trash" />
            </button>
        </div>
    );
};

export const RuleList = ({ rules, activeIndex, onSelect, onAdd, onDelete, onReorder }) => {
    const handleDragEnd = (event) => {
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
        <div className="w-80 bg-slate-950 border-r border-slate-800 flex flex-col h-full shrink-0">
            <div className="p-3 border-b border-slate-800 flex justify-between bg-slate-900/50">
                <span className="text-xs font-bold text-slate-400">RULES</span>
                <Button variant="ghost" icon="Plus" className="py-0 px-2 text-xs" onClick={onAdd} />
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1">
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={rules.map((_, i) => `rule-${i}`)} strategy={verticalListSortingStrategy}>
                        {rules.map((rule, i) => (
                            <SortableRuleItem 
                                key={`rule-${i}`} 
                                id={`rule-${i}`} 
                                rule={rule} 
                                isActive={activeIndex === i}
                                onClick={() => onSelect(i)}
                                onDelete={() => onDelete(i)}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    );
};