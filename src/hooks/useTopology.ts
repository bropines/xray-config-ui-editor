import { useMemo, useState } from 'react';
import { useNodesState, useEdgesState } from '@xyflow/react';
import { useConfigStore } from '../store/configStore';
import { getLayoutedElements } from '../utils/graph-layout';

export const useTopology = () => {
    const { config } = useConfigStore();
    const [hideUnused, setHideUnused] = useState(true);
    const [direction, setDirection] = useState<'TB' | 'LR'>('LR');
    const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());

    const toggleCategory = (cat: 'inbound' | 'rule' | 'balancer' | 'outbound') => {
        setHiddenCategories(prev => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
        });
    };

    const { initialNodes, initialEdges } = useMemo(() => {
        if (!config) return { initialNodes: [], initialEdges: [] };

        const nodes: any[] = [];
        const edges: any[] = [];

        const showInbounds = !hiddenCategories.has('inbound');
        const showOutbounds = !hiddenCategories.has('outbound');
        const showBalancers = !hiddenCategories.has('balancer');
        const showRules = !hiddenCategories.has('rule');

        // 0. ПРЕДВАРИТЕЛЬНЫЙ АНАЛИЗ ИСПОЛЬЗОВАНИЯ
        const usedOutboundTags = new Set<string>();
        
        // Первый аутбаунд всегда используется
        if (config.outbounds?.[0]?.tag) usedOutboundTags.add(config.outbounds[0].tag);

        config.routing?.rules?.forEach(rule => {
            if (rule.outboundTag) usedOutboundTags.add(rule.outboundTag);
            if (rule.balancerTag) {
                config.routing?.balancers?.forEach(bal => {
                    if (bal.tag === rule.balancerTag) {
                        bal.selector?.forEach(sel => {
                            config.outbounds?.forEach(out => {
                                if (out.tag && out.tag.startsWith(sel)) usedOutboundTags.add(out.tag);
                            });
                        });
                    }
                });
            }
        });

        // 1. INBOUNDS
        if (showInbounds) {
            config.inbounds?.forEach((inbound, i) => {
                nodes.push({
                    id: `in-${inbound.tag || i}`,
                    type: 'custom',
                    data: { type: 'inbound', labelType: 'Inbound', label: inbound.tag || `in-${i}`, details: `${inbound.protocol}:${inbound.port}` },
                    position: { x: 0, y: 0 }
                });
            });
        }

        // 2. OUTBOUNDS
        const outboundMap = new Map();
        if (showOutbounds) {
            config.outbounds?.forEach((outbound, i) => {
                const isUsed = usedOutboundTags.has(outbound.tag || "");
                if (hideUnused && !isUsed) return;

                const id = `out-${outbound.tag || i}`;
                outboundMap.set(outbound.tag, id);
                nodes.push({
                    id: id,
                    type: 'custom',
                    data: { type: 'outbound', labelType: 'Outbound', label: outbound.tag || `out-${i}`, details: outbound.protocol },
                    position: { x: 0, y: 0 }
                });
            });
        }

        // 3. BALANCERS
        const balancerMap = new Map();
        if (showBalancers) {
            config.routing?.balancers?.forEach((bal) => {
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
                            const targetId = outboundMap.get(out.tag);
                            if (targetId) {
                                edges.push({ id: `e-${id}-${out.tag}`, source: id, target: targetId, animated: true, style: { stroke: '#a855f7' } });
                            }
                        }
                    });
                });
            });
        }

        // 4. RULES
        if (showRules) {
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
                    data: { 
                        type: 'rule', 
                        labelType: rule.ruleTag ? 'Named Rule' : 'Rule', 
                        label: rule.ruleTag || `#${i + 1}`, 
                        details: detail 
                    },
                    position: { x: 0, y: 0 }
                });

                // Logic: Inbound -> Rule
                if (showInbounds) {
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
                            if (nodes.find(n => n.id === inId)) {
                                edges.push({ id: `e-${inId}-${ruleId}`, source: inId, target: ruleId, style: { stroke: '#475569', opacity: 0.3 } });
                            }
                        });
                    }
                }

                // Logic: Rule -> Outbound/Balancer
                if (rule.balancerTag && showBalancers) {
                    const balId = balancerMap.get(rule.balancerTag);
                    if (balId) edges.push({ id: `e-${ruleId}-${balId}`, source: ruleId, target: balId, animated: true });
                } else if (rule.outboundTag && showOutbounds) {
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

                if (showInbounds) {
                    config.inbounds?.forEach(ib => {
                        const inId = `in-${ib.tag}`;
                        if (nodes.find(n => n.id === inId)) {
                            edges.push({ id: `e-def-${inId}`, source: inId, target: defaultId, type: 'smoothstep', style: { strokeDasharray: '5,5', opacity: 0.5 } });
                        }
                    });
                }

                if (showOutbounds) {
                    const targetId = outboundMap.get(config.outbounds[0].tag);
                    if (targetId) {
                        edges.push({ id: `e-def-out`, source: defaultId, target: targetId, animated: true });
                    }
                }
            }
        }

        // Filter valid edges whose source and target exist
        const nodeIds = new Set(nodes.map(n => n.id));
        const validEdges = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, validEdges, direction);
        return { initialNodes: layoutedNodes, initialEdges: layoutedEdges };
    }, [config, hideUnused, direction, hiddenCategories]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    useMemo(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [initialNodes, initialEdges, setNodes, setEdges]);

    return {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        hideUnused,
        setHideUnused,
        direction,
        setDirection,
        hiddenCategories,
        toggleCategory
    };
};
