import dagre from 'dagre';
import { Position } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';

const nodeWidth = 220;
const nodeHeight = 80;

export const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    // НАСТРОЙКИ "ПИРАМИДКИ"
    dagreGraph.setGraph({ 
        rankdir: 'TB',   // Top to Bottom (Сверху вниз)
        ranksep: 150,    // Вертикальное расстояние между слоями (было дефолтное ~50)
        nodesep: 80      // Горизонтальное расстояние между узлами
    });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            // Меняем точки подключения:
            // Вход (Target) - Сверху
            // Выход (Source) - Снизу
            targetPosition: Position.Top,
            sourcePosition: Position.Bottom,
            position: {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
};