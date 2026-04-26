import React from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Modal } from '../ui/Modal';
import { GraphNode } from './GraphNode';
import { useTopology } from '../../hooks/useTopology';

const nodeTypes = { custom: GraphNode };

export const TopologyModal = ({ onClose }: { onClose: () => void }) => {
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange
    } = useTopology();

    return (
        <Modal
            title="Traffic Topology"
            onClose={onClose}
            onSave={onClose}
            className="w-full max-w-[95vw] md:max-w-7xl"
            extraButtons={<div className="text-xs text-slate-500 font-mono pt-1">Visualizing {nodes.length} nodes</div>}
        >
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