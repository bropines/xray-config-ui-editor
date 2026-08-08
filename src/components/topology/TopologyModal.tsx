import React from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Modal } from '../ui/Modal';
import { GraphNode } from './GraphNode';
import { useTopology } from '../../hooks/useTopology';
import { Icon } from '../ui/Icon';
import { Switch } from '../ui/Switch';

const nodeTypes = { custom: GraphNode };

export const TopologyModal = ({ onClose }: { onClose: () => void }) => {
    const {
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
    } = useTopology();

    return (
        <Modal
            title="Traffic Topology"
            onClose={onClose}
            onSave={onClose}
            className="h-full overflow-hidden"
            extraButtons={
                <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-1 px-2 rounded-lg border border-slate-800">
                    <Switch 
                        checked={hideUnused}
                        onChange={setHideUnused}
                        label={<span className="text-[10px] font-bold text-slate-400 uppercase group-hover:text-slate-200 transition-colors">Hide Unused</span>}
                    />
                    
                    <div className="w-px h-4 bg-slate-800 mx-1 hidden sm:block"></div>
                    
                    <button 
                        onClick={() => setDirection(direction === 'TB' ? 'LR' : 'TB')}
                        className="flex items-center gap-2 px-2 py-0.5 hover:bg-slate-800 rounded transition-colors"
                    >
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{direction === 'TB' ? 'Vertical' : 'Horizontal'}</span>
                        <div className="text-indigo-400"><Icon name={direction === 'TB' ? "ArrowDown" : "ArrowRight"} weight="bold" /></div>
                    </button>

                    <div className="w-px h-4 bg-slate-800 mx-1 hidden sm:block"></div>
                    <div className="text-[10px] text-slate-500 font-mono">Nodes: {nodes.length}</div>
                </div>
            }
        >
            <div className="h-[60vh] adaptive-height w-full bg-[#0B1120] rounded-xl border border-slate-800 overflow-hidden relative shadow-inner group/flow">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    fitView
                    fitViewOptions={{ padding: 0.1 }}
                    minZoom={0.01}
                    maxZoom={2}
                    proOptions={{ hideAttribution: true }}
                    defaultEdgeOptions={{
                        type: 'smoothstep',
                        animated: true,
                        style: { strokeWidth: 1.5, stroke: '#334155' }
                    }}
                >
                    <Background color="#334155" gap={30} size={1} variant="lines" className="opacity-20" />
                    <Controls 
                        showInteractive={false}
                        className="!bg-slate-900 !border-slate-700 !shadow-2xl !rounded-lg !overflow-hidden !m-4" 
                    />
                </ReactFlow>

                <style>{`
                    .react-flow__controls-button {
                        background: #1e293b !important;
                        border-bottom: 1px solid #334155 !important;
                        fill: #94a3b8 !important;
                        transition: all 0.2s !important;
                    }
                    .react-flow__controls-button:hover {
                        background: #312e81 !important;
                        fill: #fff !important;
                    }
                    .react-flow__controls-button svg {
                        fill: inherit !important;
                    }
                    .react-flow__edge-path {
                        transition: stroke-width 0.2s, stroke 0.2s;
                    }
                    .react-flow__edge:hover .react-flow__edge-path {
                        stroke-width: 3;
                        stroke: #6366f1 !important;
                    }
                `}</style>

                {/* Map Legend & Category Toggles */}
                <div className="absolute bottom-4 right-4 bg-slate-900/95 p-3 sm:p-4 rounded-xl border border-slate-700/50 backdrop-blur-md shadow-2xl text-[10px] space-y-2 pointer-events-auto z-10 border-t-indigo-500/30">
                    <div className="font-bold text-slate-400 uppercase tracking-[0.15em] text-[9px] mb-1">Toggle Map Layers</div>
                    
                    {/* Inbounds */}
                    <div 
                        onClick={() => toggleCategory('inbound')}
                        className={`flex items-center justify-between gap-3 p-1.5 rounded-lg cursor-pointer transition-all border select-none ${
                            !hiddenCategories.has('inbound')
                                ? 'bg-emerald-950/40 border-emerald-500/30 text-slate-200'
                                : 'bg-slate-950/60 border-slate-800 text-slate-600 line-through'
                        }`}
                        title="Click to toggle Inbound Portals"
                    >
                        <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${!hiddenCategories.has('inbound') ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-700'}`}></div>
                            <span className="font-medium">Inbound Portals</span>
                        </div>
                        <Icon name={!hiddenCategories.has('inbound') ? "Eye" : "EyeSlash"} className="text-xs text-slate-400" />
                    </div>

                    {/* Rules */}
                    <div 
                        onClick={() => toggleCategory('rule')}
                        className={`flex items-center justify-between gap-3 p-1.5 rounded-lg cursor-pointer transition-all border select-none ${
                            !hiddenCategories.has('rule')
                                ? 'bg-slate-800/60 border-slate-600 text-slate-200'
                                : 'bg-slate-950/60 border-slate-800 text-slate-600 line-through'
                        }`}
                        title="Click to toggle Routing Rules"
                    >
                        <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded ${!hiddenCategories.has('rule') ? 'bg-slate-500 border border-slate-400' : 'bg-slate-800'}`}></div>
                            <span className="font-medium">Routing Rules</span>
                        </div>
                        <Icon name={!hiddenCategories.has('rule') ? "Eye" : "EyeSlash"} className="text-xs text-slate-400" />
                    </div>

                    {/* Balancers */}
                    <div 
                        onClick={() => toggleCategory('balancer')}
                        className={`flex items-center justify-between gap-3 p-1.5 rounded-lg cursor-pointer transition-all border select-none ${
                            !hiddenCategories.has('balancer')
                                ? 'bg-purple-950/40 border-purple-500/30 text-slate-200'
                                : 'bg-slate-950/60 border-slate-800 text-slate-600 line-through'
                        }`}
                        title="Click to toggle Load Balancers"
                    >
                        <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${!hiddenCategories.has('balancer') ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]' : 'bg-slate-700'}`}></div>
                            <span className="font-medium">Load Balancers</span>
                        </div>
                        <Icon name={!hiddenCategories.has('balancer') ? "Eye" : "EyeSlash"} className="text-xs text-slate-400" />
                    </div>

                    {/* Outbounds */}
                    <div 
                        onClick={() => toggleCategory('outbound')}
                        className={`flex items-center justify-between gap-3 p-1.5 rounded-lg cursor-pointer transition-all border select-none ${
                            !hiddenCategories.has('outbound')
                                ? 'bg-blue-950/40 border-blue-500/30 text-slate-200'
                                : 'bg-slate-950/60 border-slate-800 text-slate-600 line-through'
                        }`}
                        title="Click to toggle Outbound Nodes"
                    >
                        <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${!hiddenCategories.has('outbound') ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]' : 'bg-slate-700'}`}></div>
                            <span className="font-medium">Outbound Nodes</span>
                        </div>
                        <Icon name={!hiddenCategories.has('outbound') ? "Eye" : "EyeSlash"} className="text-xs text-slate-400" />
                    </div>
                </div>
            </div>
        </Modal>
    );
};
