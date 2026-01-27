import React, { useMemo } from 'react';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Modal } from '../ui/Modal';
import { useConfigStore } from '../../store/configStore';
import { GraphNode } from './GraphNode';
import { getLayoutedElements } from '../../utils/graph-layout';

const nodeTypes = { custom: GraphNode };

export const TopologyModal = ({ onClose }) => {
    const { config } = useConfigStore();

    const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
        if (!config) return { nodes: [], edges: [] };

        const nodes: any[] = [];
        const edges: any[] = [];
        
        // 1. INBOUNDS
        config.inbounds?.forEach((inbound, i) => {
            nodes.push({
                id: `in-${inbound.tag || i}`,
                type: 'custom',
                data: { type: 'inbound', labelType: 'Inbound', label: inbound.tag || `in-${i}`, details: `${inbound.protocol}:${inbound.port}` },
                position: { x: 0, y: 0 }
            });
        });

        // 2. OUTBOUNDS
        const outboundMap = new Map();
        config.outbounds?.forEach((outbound, i) => {
            const id = `out-${outbound.tag || i}`;
            outboundMap.set(outbound.tag, id);
            nodes.push({
                id: id,
                type: 'custom',
                data: { type: 'outbound', labelType: 'Outbound', label: outbound.tag || `out-${i}`, details: outbound.protocol },
                position: { x: 0, y: 0 }
            });
        });

        // 3. BALANCERS
        const balancerMap = new Map();
        config.routing?.balancers?.forEach((bal, i) => {
            const id = `bal-${bal.tag}`;
            balancerMap.set(bal.tag, id);
            nodes.push({
                id: id,
                type: 'custom',
                data: { type: 'balancer', labelType: 'Balancer', label: bal.tag, details: bal.strategy?.type || 'random' },
                position: { x: 0, y: 0 }
            });

            bal.selector?.forEach(sel => {
                config.outbounds?.forEach(out => {
                    if (out.tag && out.tag.startsWith(sel)) {
                        edges.push({ id: `e-${id}-${out.tag}`, source: id, target: outboundMap.get(out.tag), animated: true, style: { stroke: '#a855f7' } });
                    }
                });
            });
        });

        // 4. RULES
        config.routing?.rules?.forEach((rule, i) => {
            const ruleId = `rule-${i}`;
            let detail = "Match All";
            if (rule.domain) detail = `Domain (${rule.domain.length})`;
            else if (rule.ip) detail = `IP (${rule.ip.length})`;
            else if (rule.port) detail = `Port: ${rule.port}`;
            else if (rule.inboundTag) detail = `In: ${rule.inboundTag.join(', ')}`;

            nodes.push({
                id: ruleId,
                type: 'custom',
                data: { type: 'rule', labelType: 'Rule', label: `#${i + 1}`, details: detail },
                position: { x: 0, y: 0 }
            });

            if (rule.inboundTag && rule.inboundTag.length > 0) {
                rule.inboundTag.forEach(tag => {
                    const inId = `in-${tag}`;
                    if (nodes.find(n => n.id === inId)) {
                        edges.push({ id: `e-${inId}-${ruleId}`, source: inId, target: ruleId });
                    }
                });
            } else {
                config.inbounds?.forEach(ib => {
                    const inId = `in-${ib.tag}`;
                    edges.push({ id: `e-${inId}-${ruleId}`, source: inId, target: ruleId, style: { stroke: '#475569', opacity: 0.3 } });
                });
            }

            if (rule.balancerTag) {
                const balId = balancerMap.get(rule.balancerTag);
                if (balId) edges.push({ id: `e-${ruleId}-${balId}`, source: ruleId, target: balId, animated: true });
            } else if (rule.outboundTag) {
                const outId = outboundMap.get(rule.outboundTag);
                if (outId) edges.push({ id: `e-${ruleId}-${outId}`, source: ruleId, target: outId });
            }
        });

        // 5. DEFAULT ROUTE
        if (config.outbounds?.[0]) {
            const defaultId = 'rule-default';
            nodes.push({
                id: defaultId,
                type: 'custom',
                data: { type: 'rule', labelType: 'Fallback', label: 'Default Route', details: 'If no match' },
                position: { x: 0, y: 0 }
            });
            
            config.inbounds?.forEach(ib => {
                 const inId = `in-${ib.tag}`;
                 edges.push({ id: `e-def-${inId}`, source: inId, target: defaultId, type: 'smoothstep', style: { strokeDasharray: '5,5', opacity: 0.5 } });
            });

            const firstOutId = `out-${config.outbounds[0].tag}`;
            edges.push({ id: `e-def-out`, source: defaultId, target: firstOutId, animated: true });
        }

        return getLayoutedElements(nodes, edges);
    }, [config]);

    const [nodes, , onNodesChange] = useNodesState(initialNodes);
    const [edges, , onEdgesChange] = useEdgesState(initialEdges);

    return (
        <Modal 
            title="Traffic Topology" 
            onClose={onClose} 
            onSave={onClose} 
            // Расширяем модалку по максимуму, но не на 100vh, чтобы были отступы
            className="w-full max-w-[95vw] md:max-w-7xl"
            extraButtons={<div className="text-xs text-slate-500 font-mono pt-1">Visualizing {nodes.length} nodes</div>}
        >
            {/* 
                ВАЖНО: Задаем явную высоту (h-[75vh]). 
                Это решает ошибку "parent container needs width and height".
                React Flow теперь точно знает высоту канваса.
            */}
            <div className="h-[75vh] w-full bg-[#0B1120] rounded-xl border border-slate-800 overflow-hidden relative shadow-inner">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    minZoom={0.1}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background color="#334155" gap={25} size={2} variant="dots" />
                    <Controls className="!bg-slate-800 !border-slate-700 !fill-white !shadow-lg" />
                </ReactFlow>
                
                {/* Legend */}
                <div className="absolute bottom-6 right-6 bg-slate-900/90 p-4 rounded-xl border border-slate-700/50 backdrop-blur shadow-2xl text-xs space-y-2 pointer-events-none z-10">
                    <div className="font-bold text-slate-500 mb-2 uppercase text-[10px] tracking-wider">Legend</div>
                    <div className="flex items-center gap-3"><div className="w-3 h-3 rounded bg-emerald-900/50 border border-emerald-500"></div> <span className="text-emerald-200">Inbound</span></div>
                    <div className="flex items-center gap-3"><div className="w-3 h-3 rounded bg-slate-800 border border-slate-500"></div> <span className="text-slate-200">Rule</span></div>
                    <div className="flex items-center gap-3"><div className="w-3 h-3 rounded bg-purple-900/50 border border-purple-500"></div> <span className="text-purple-200">Balancer</span></div>
                    <div className="flex items-center gap-3"><div className="w-3 h-3 rounded bg-blue-900/50 border border-blue-500"></div> <span className="text-blue-200">Outbound</span></div>
                </div>
            </div>
        </Modal>
    );
};