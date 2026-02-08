import React from 'react';
import { Icon } from '../../ui/Icon';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
            className={`p-2 rounded-lg cursor-pointer text-xs flex items-center gap-2 group transition-all border select-none mb-1
                ${isActive ? 'bg-indigo-600/20 border-indigo-500/50' : 'bg-slate-900 border-transparent hover:border-slate-700'}`}
        >
            {/* Drag Handle */}
            <div {...listeners} className="cursor-grab text-slate-600 hover:text-slate-300 p-2 touch-none">
                <Icon name="DotsSixVertical" className="text-base"/>
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    {/* Точка цвета в зависимости от типа (Balancer/Outbound) */}
                    <span className={`w-1.5 h-1.5 rounded-full ${rule.balancerTag ? 'bg-purple-400' : 'bg-blue-400'}`}></span>
                    
                    {/* Главный заголовок: Имя (ruleTag) или Тег назначения */}
                    <span className="font-bold truncate text-slate-200 text-sm">
                        {rule.ruleTag || rule.outboundTag || rule.balancerTag || "Unnamed Rule"}
                    </span>
                </div>

                {/* Если задано имя, показываем куда оно ведет маленьким шрифтом */}
                {rule.ruleTag && (
                    <div className="text-[9px] text-slate-500 uppercase flex items-center gap-1 ml-3 mt-0.5">
                        <Icon name="ArrowElbowDownRight" className="text-[8px]" />
                        Target: {rule.outboundTag || rule.balancerTag}
                    </div>
                )}

                {/* Инфо о доменах/IP */}
                <div className={`text-[10px] text-slate-500 font-mono truncate ml-3 ${rule.ruleTag ? 'mt-0.5' : 'mt-1'}`}>
                    {rule.domain ? `dom:${rule.domain.length}` : rule.ip ? `ip:${rule.ip.length}` : 'match:all'}
                </div>
            </div>
            
            <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                className="text-slate-600 hover:text-rose-500 p-2 rounded-md hover:bg-rose-500/10 transition-colors"
                title="Delete Rule"
            >
                <Icon name="Trash" className="text-lg" />
            </button>
        </div>
    );
};

export const RuleList = ({ rules, activeIndex, onSelect, onDelete, onReorder }) => {
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
        <div className="flex-1 overflow-y-auto custom-scroll p-2">
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
    );
};