import React, { useMemo } from 'react';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, ConnectionLineType } from '@xyflow/react';
import '@xyflow/react/dist/style.css'; // Обязательные стили
import { Modal } from '../ui/Modal';
import { useConfigStore } from '../../store/configStore';
import { GraphNode } from './GraphNode';
import { getLayoutedElements } from '../../utils/graph-layout';

// Регистрация кастомных узлов
const nodeTypes = {
    custom: GraphNode,
};

export const TopologyModal = ({ onClose }) => {
    const { config } = useConfigStore();

    // --- ЛОГИКА ГЕНЕРАЦИИ ГРАФА ---
    const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
        if (!config) return { nodes: [], edges: [] };

        const nodes: any[] = [];
        const edges: any[] = [];
        let yCounter = 0;

        // 1. INBOUNDS (Source)
        config.inbounds?.forEach((inbound, i) => {
            nodes.push({
                id: `in-${inbound.tag || i}`,
                type: 'custom',
                data: { 
                    type: 'inbound', 
                    labelType: 'Inbound', 
                    label: inbound.tag || `in-${i}`, 
                    details: `${inbound.protocol}:${inbound.port}` 
                },
                position: { x: 0, y: yCounter++ * 100 }
            });
        });

        // 2. OUTBOUNDS (Target)
        // Нам нужен map для быстрого поиска ID по тегу
        const outboundMap = new Map();
        config.outbounds?.forEach((outbound, i) => {
            const id = `out-${outbound.tag || i}`;
            outboundMap.set(outbound.tag, id);
            
            nodes.push({
                id: id,
                type: 'custom',
                data: { 
                    type: 'outbound', 
                    labelType: 'Outbound', 
                    label: outbound.tag || `out-${i}`, 
                    details: outbound.protocol 
                },
                position: { x: 600, y: i * 100 }
            });
        });

        // 3. BALANCERS (Middle)
        const balancerMap = new Map();
        config.routing?.balancers?.forEach((bal, i) => {
            const id = `bal-${bal.tag}`;
            balancerMap.set(bal.tag, id);

            nodes.push({
                id: id,
                type: 'custom',
                data: { 
                    type: 'balancer', 
                    labelType: 'Balancer', 
                    label: bal.tag, 
                    details: bal.strategy?.type || 'random' 
                },
                position: { x: 300, y: 0 } // Position will be fixed by dagre
            });

            // Balancer -> Outbounds Edges (Prefix matching!)
            bal.selector?.forEach(sel => {
                config.outbounds?.forEach(out => {
                    if (out.tag && out.tag.startsWith(sel)) {
                        edges.push({
                            id: `e-${id}-${out.tag}`,
                            source: id,
                            target: outboundMap.get(out.tag),
                            animated: true,
                            style: { stroke: '#a855f7' } // Purple
                        });
                    }
                });
            });
        });

        // 4. ROUTING RULES (Middle)
        // Virtual node for "Router Logic" to connect Inbounds to
        // Но лучше для каждого правила делать ноду, чтобы видеть логику
        
        config.routing?.rules?.forEach((rule, i) => {
            const ruleId = `rule-${i}`;
            
            // Описание правила для лейбла
            let detail = "Match All";
            if (rule.domain) detail = `Domain (${rule.domain.length})`;
            else if (rule.ip) detail = `IP (${rule.ip.length})`;
            else if (rule.port) detail = `Port: ${rule.port}`;
            else if (rule.inboundTag) detail = `In: ${rule.inboundTag.join(', ')}`;

            nodes.push({
                id: ruleId,
                type: 'custom',
                data: { 
                    type: 'rule', 
                    labelType: 'Rule', 
                    label: `#${i + 1}`, 
                    details: detail 
                },
                position: { x: 300, y: 0 }
            });

            // Connections:
            
            // Inbound -> Rule
            if (rule.inboundTag && rule.inboundTag.length > 0) {
                // Если правило привязано к конкретным инбаундам
                rule.inboundTag.forEach(tag => {
                    const inId = `in-${tag}`;
                    // Проверяем, существует ли такой инбаунд (чтобы не крашнулось)
                    if (nodes.find(n => n.id === inId)) {
                        edges.push({ id: `e-${inId}-${ruleId}`, source: inId, target: ruleId });
                    }
                });
            } else {
                // Если правило для всех (нет inboundTag) -> соединяем со всеми инбаундами
                // Это может создать паутину, но это правда
                config.inbounds?.forEach(ib => {
                    const inId = `in-${ib.tag}`;
                    edges.push({ id: `e-${inId}-${ruleId}`, source: inId, target: ruleId, style: { stroke: '#475569', opacity: 0.3 } });
                });
            }

            // Rule -> Outbound / Balancer
            if (rule.balancerTag) {
                const balId = balancerMap.get(rule.balancerTag);
                if (balId) edges.push({ id: `e-${ruleId}-${balId}`, source: ruleId, target: balId, animated: true });
            } else if (rule.outboundTag) {
                const outId = outboundMap.get(rule.outboundTag);
                if (outId) edges.push({ id: `e-${ruleId}-${outId}`, source: ruleId, target: outId });
            }
        });

        // 5. DEFAULT ROUTE (Implicit)
        // Если ничего не совпало, идет в первый outbound.
        // Создадим виртуальный узел "Default"
        if (config.outbounds?.[0]) {
            const defaultId = 'rule-default';
            nodes.push({
                id: defaultId,
                type: 'custom',
                data: { type: 'rule', labelType: 'Fallback', label: 'Default Route', details: 'If no match' },
                position: { x: 300, y: 9999 }
            });
            
            // Connect all inbounds to Default (implicit)
            // Визуально лучше показать это пунктиром
            config.inbounds?.forEach(ib => {
                 const inId = `in-${ib.tag}`;
                 edges.push({ 
                     id: `e-def-${inId}`, 
                     source: inId, 
                     target: defaultId, 
                     type: 'smoothstep',
                     style: { strokeDasharray: '5,5', opacity: 0.5 } 
                });
            });

            // Connect Default -> First Outbound
            const firstOutId = `out-${config.outbounds[0].tag}`;
            edges.push({ id: `e-def-out`, source: defaultId, target: firstOutId, animated: true });
        }

        // Apply Auto Layout
        return getLayoutedElements(nodes, edges);

    }, [config]);

    const [nodes, , onNodesChange] = useNodesState(initialNodes);
    const [edges, , onEdgesChange] = useEdgesState(initialEdges);

    return (
        <Modal 
            title="Traffic Topology" 
            onClose={onClose} 
            onSave={onClose} // Read only
            extraButtons={<div className="text-xs text-slate-500 font-mono pt-1">Visualizing {nodes.length} nodes</div>}
        >
            <div className="h-[600px] bg-[#0B1120] rounded-xl border border-slate-800 overflow-hidden relative">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    fitView
                    minZoom={0.1}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background color="#334155" gap={20} size={1} />
                    <Controls className="!bg-slate-800 !border-slate-700 !fill-white" />
                </ReactFlow>
                
                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-slate-900/90 p-3 rounded-lg border border-slate-700 backdrop-blur text-[10px] space-y-1">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded bg-emerald-500"></div> <span className="text-emerald-200">Inbound</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded bg-slate-500"></div> <span className="text-slate-200">Routing Rule</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded bg-purple-500"></div> <span className="text-purple-200">Balancer</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded bg-blue-500"></div> <span className="text-blue-200">Outbound</span></div>
                </div>
            </div>
        </Modal>
    );
};