import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Icon } from '../ui/Icon';

const colors = {
    inbound: "border-emerald-500/50 bg-emerald-900/20 text-emerald-100",
    outbound: "border-blue-500/50 bg-blue-900/20 text-blue-100",
    rule: "border-slate-500/50 bg-slate-800 text-slate-200",
    balancer: "border-purple-500/50 bg-purple-900/20 text-purple-100",
    default: "border-slate-700 bg-slate-900 text-slate-400"
};

const icons = {
    inbound: "ArrowCircleDown",
    outbound: "PaperPlaneRight",
    rule: "ArrowsSplit",
    balancer: "Scales",
    default: "Question"
};

export const GraphNode = memo(({ data }: any) => {
    const type = data.type || 'default';
    const style = colors[type] || colors.default;
    const iconName = icons[type] || icons.default;

    return (
        <div className={`px-4 py-2 rounded-xl border shadow-xl min-w-[150px] backdrop-blur-sm transition-all hover:scale-105 ${style}`}>
            {/* Входы (слева) */}
            {type !== 'inbound' && (
                <Handle type="target" position={Position.Left} className="!bg-slate-400 !w-2 !h-2" />
            )}
            
            <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-black/20">
                    <Icon name={iconName} className="text-lg" />
                </div>
                <div>
                    <div className="text-[10px] uppercase opacity-50 font-bold tracking-wider">{data.labelType}</div>
                    <div className="text-xs font-bold font-mono truncate max-w-[180px]" title={data.label}>{data.label}</div>
                    {data.details && <div className="text-[9px] opacity-70 mt-0.5 font-mono">{data.details}</div>}
                </div>
            </div>

            {/* Выходы (справа) */}
            {type !== 'outbound' && (
                <Handle type="source" position={Position.Right} className="!bg-slate-400 !w-2 !h-2" />
            )}
        </div>
    );
});