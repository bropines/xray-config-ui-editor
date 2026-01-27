import React, { useState } from "react";
import { useConfigStore } from "./store/configStore";
import { Button } from "./components/ui/Button";
import { Icon } from "./components/ui/Icon";
import { InboundModal } from "./components/editors/InboundModal";
import { OutboundModal } from "./components/editors/OutboundModal";
import { RoutingModal } from "./components/editors/RoutingModal";
import { DnsModal } from "./components/editors/DnsModal";
import { SettingsModal } from "./components/editors/SettingsModal";
import { ReverseModal } from "./components/editors/ReverseModal";
import { TopologyModal } from "./components/topology/TopologyModal";
import { JsonField } from "./components/ui/JsonField";
import { Toaster } from 'sonner';
import { getPresets } from "./utils/presets"; // Импорт пресетов

// Компонент карточки
const Card = ({ title, icon, color, children, actions, className = "" }) => (
  <div className={`bg-slate-800 border border-slate-700/50 rounded-xl flex flex-col hover:border-slate-600 transition-colors shadow-xl overflow-hidden ${className}`}>
    <div className="flex justify-between items-center p-4 border-b border-slate-700/50 bg-slate-800/50 shrink-0">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color} text-white shadow-lg`}><Icon name={icon} className="text-xl" /></div>
        <h2 className="text-lg font-bold text-slate-100">{title}</h2>
      </div>
      <div className="flex gap-2">{actions}</div>
    </div>
    <div className="flex-1 p-4 space-y-3 overflow-y-auto custom-scroll bg-slate-900/30 min-h-0">{children}</div>
  </div>
);

export const App = () => {
  const { config, setConfig, deleteItem } = useConfigStore();
  const [modal, setModal] = useState({ type: null, data: null, index: null });
  const [rawMode, setRawMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const loadFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        setConfig(JSON.parse(e.target?.result as string));
        setRawMode(false);
      } catch (err) {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) loadFile(e.target.files[0]);
  };

  const downloadConfig = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = "config.json";
    a.click();
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.relatedTarget === null || !e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
  };

  const handleSaveModal = (data) => {
      const { type, index } = modal;
      if (type === 'inbound') {
          if (index !== null) useConfigStore.getState().updateItem('inbounds', index, data);
          else useConfigStore.getState().addItem('inbounds', data);
      }
      if (type === 'outbound') {
          if (index !== null) useConfigStore.getState().updateItem('outbounds', index, data);
          else useConfigStore.getState().addItem('outbounds', data);
      }
      setModal({ type: null, data: null, index: null });
  };

  const presets = getPresets();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 relative flex flex-col xl:h-screen xl:overflow-hidden h-auto"
        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
    >
      <Toaster theme="dark" position="bottom-right" toastOptions={{ style: { background: '#1e293b', border: '1px solid #334155', color: 'white' } }} />

      {isDragging && (
        <div className="absolute inset-0 z-50 bg-indigo-900/80 backdrop-blur-sm border-4 border-indigo-500 border-dashed flex flex-col items-center justify-center pointer-events-none transition-all fixed">
          <Icon name="FileArrowDown" className="text-8xl text-indigo-400 mb-4 animate-bounce" weight="fill" />
          <h2 className="text-2xl md:text-3xl font-bold text-white shadow-sm text-center px-4">Drop config.json here</h2>
        </div>
      )}

      {/* --- HEADER --- */}
      <nav className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 md:px-6 py-3 shadow-md flex flex-wrap gap-4 justify-between items-center shrink-0 h-16 box-border">
        <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-indigo-600 p-1.5 md:p-2 rounded-lg text-white shadow-lg"><Icon name="Planet" className="text-lg md:text-xl" /></div>
            <span className="font-bold text-base md:text-lg tracking-tight text-white">Xray GUI</span>
        </div>

        <div className="flex gap-2">
            <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 md:px-4 md:py-2 rounded-lg font-bold cursor-pointer transition-all border border-slate-700 flex items-center gap-2 text-xs md:text-sm">
                <Icon name="FolderOpen" /> <span className="hidden md:inline">Open File</span>
                <input type="file" className="hidden" accept=".json" onChange={handleFileUpload} />
            </label>
            <Button variant="success" onClick={downloadConfig} icon="DownloadSimple" className="font-bold p-2 md:px-4 md:py-2 text-xs md:text-sm" disabled={!config}>
                <span className="hidden md:inline">Download</span>
            </Button>
        </div>
      </nav>

      {/* --- MAIN CONTENT --- */}
      <main className="p-4 md:p-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col min-h-0 h-auto xl:h-[calc(100vh-4rem)]">
        {!config ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
                <div className="text-center mb-10">
                    <h1 className="text-3xl md:text-4xl text-white font-bold mb-3 tracking-tight">Welcome to Xray GUI</h1>
                    <p className="text-slate-400 max-w-md mx-auto">
                        Drag & Drop your <code>config.json</code> anywhere or choose a template to start.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl px-4">
                    {presets.map((preset, i) => (
                        <div key={i} 
                            onClick={() => setConfig(preset.config)}
                            className="bg-slate-900/50 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-6 cursor-pointer transition-all group shadow-lg hover:shadow-indigo-500/10 flex flex-col gap-3"
                        >
                            <div className="bg-slate-950 w-12 h-12 rounded-lg flex items-center justify-center border border-slate-800 group-hover:border-indigo-500/50 group-hover:text-indigo-400 transition-colors">
                                <Icon name={preset.icon} className="text-2xl" weight="duotone" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-200 group-hover:text-white mb-1">{preset.name}</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">{preset.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="mt-12 opacity-50 hover:opacity-100 transition-opacity">
                    <label className="text-sm text-slate-500 cursor-pointer flex items-center gap-2 hover:text-indigo-400 transition-colors">
                        <Icon name="FolderOpen" /> Or open existing config file
                        <input type="file" className="hidden" accept=".json" onChange={handleFileUpload} />
                    </label>
                </div>
            </div>
        ) : (
            <div className="flex flex-col gap-4 md:gap-6 h-full min-h-0 pb-2">
                {/* TOOLBAR */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-3 md:px-6 md:py-3 rounded-xl shadow-lg gap-3 shrink-0">
                    <h2 className="font-bold text-slate-300 flex items-center gap-2 text-sm md:text-base">
                        <Icon name="SlidersHorizontal" /> Core Modules
                    </h2>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <Button className="flex-1 md:flex-none text-xs" variant="secondary" onClick={() => setModal({ type: 'topology', data: null, index: null })} icon="GitMerge" title="Topology" />
                        <Button className="flex-1 md:flex-none text-xs" variant="secondary" onClick={() => setModal({ type: 'reverse', data: null, index: null })} icon="ArrowsLeftRight" title="Reverse" />
                        <Button className="flex-1 md:flex-none text-xs" variant="secondary" onClick={() => setModal({ type: 'settings', data: null, index: null })} icon="Gear">Settings</Button>
                        <div className="hidden md:block w-px bg-slate-800 mx-2"></div>
                        <Button 
                            variant="secondary" 
                            onClick={() => setRawMode(!rawMode)} 
                            icon={rawMode ? "Layout" : "Code"} 
                            className={`flex-1 md:flex-none text-xs ${rawMode ? "bg-indigo-600 border-indigo-500 text-white" : ""}`}
                        >
                            {rawMode ? "UI" : "JSON"}
                        </Button>
                        <Button variant="danger" className="text-xs px-3 ml-2" onClick={() => { if(confirm('Clear config?')) setConfig(null); }} icon="XCircle" title="Close Config" />
                    </div>
                </div>

                {/* CONTENT AREA */}
                {rawMode ? (
                    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-1 shadow-2xl min-h-[600px] xl:min-h-0">
                        <JsonField label="Full Configuration" value={config} onChange={(newConfig) => { if (newConfig) setConfig(newConfig); }} className="h-full" />
                    </div>
                ) : (
                    <div className="flex flex-col gap-6 flex-1 min-h-0 xl:overflow-hidden">
                        
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:flex-1 xl:min-h-0">
                            {/* Inbounds */}
                            <Card 
                                title={`Inbounds (${config.inbounds?.length || 0})`} 
                                icon="ArrowCircleDown" 
                                color="bg-emerald-600" 
                                className="h-[500px] xl:h-full"
                                actions={<Button variant="ghost" onClick={() => setModal({ type: 'inbound', data: null, index: null })} icon="Plus"/>}
                            >
                                {(config.inbounds || []).map((ib, i) => (
                                    <div key={i} className="card-item group flex justify-between items-start">
                                        <div className="min-w-0 pr-2">
                                            <div className="font-bold text-emerald-400 text-sm flex items-center gap-2 truncate"><Icon name="Hash"/> {ib.tag || "no-tag"}</div>
                                            <div className="text-xs text-slate-400 mt-1 font-mono pl-6 truncate">{ib.protocol} : {ib.port}</div>
                                        </div>
                                        <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setModal({ type: 'inbound', data: ib, index: i })} className="btn-icon"><Icon name="PencilSimple" /></button>
                                            <button onClick={() => deleteItem('inbounds', i)} className="btn-icon-danger"><Icon name="Trash" /></button>
                                        </div>
                                    </div>
                                ))}
                            </Card>

                            {/* Routing */}
                            <Card 
                                title="Routing" 
                                icon="ArrowsSplit" 
                                color="bg-purple-600" 
                                className="h-[500px] xl:h-full"
                                actions={<Button variant="ghost" onClick={() => setModal({ type: 'routing', data: null, index: null })} icon="PencilSimple">Edit</Button>}
                            >
                                <div className="text-xs text-center text-purple-300 bg-purple-900/20 p-2 rounded mb-2 border border-purple-500/20">
                                    Strategy: <span className="font-bold">{config.routing?.domainStrategy || "AsIs"}</span>
                                </div>
                                <div className="space-y-1">
                                    {(config.routing?.rules || []).slice(0, 20).map((rule, i) => (
                                        <div key={i} className="text-xs bg-slate-950 p-2 rounded flex gap-2 border-l-2 border-slate-700 items-center overflow-hidden">
                                            <span className={`font-bold w-16 md:w-24 truncate text-right shrink-0 ${rule.balancerTag ? 'text-purple-400' : 'text-blue-400'}`}>
                                                {rule.outboundTag || rule.balancerTag}
                                            </span>
                                            <span className="text-slate-600 shrink-0"><Icon name="ArrowLeft" /></span>
                                            <span className="text-slate-400 truncate flex-1 font-mono">
                                                {rule.domain ? `dom:${rule.domain.length}` : rule.ip ? `ip:${rule.ip.length}` : 'match'}
                                            </span>
                                        </div>
                                    ))}
                                    {(config.routing?.rules || []).length > 20 && (
                                        <div className="text-center text-xs text-slate-500 italic">... +{(config.routing?.rules || []).length - 20} rules</div>
                                    )}
                                </div>
                            </Card>

                            {/* Outbounds */}
                            <Card 
                                title={`Outbounds (${config.outbounds?.length || 0})`} 
                                icon="ArrowCircleUp" 
                                color="bg-blue-600" 
                                className="h-[500px] xl:h-full"
                                actions={<Button variant="ghost" onClick={() => setModal({ type: 'outbound', data: null, index: null })} icon="Plus"/>}
                            >
                                {(config.outbounds || []).map((ob, i) => (
                                    <div key={i} className="card-item group flex justify-between items-start">
                                        <div className="min-w-0 pr-2">
                                            <div className="font-bold text-blue-400 text-sm flex items-center gap-2 truncate"><Icon name="PaperPlaneRight"/> {ob.tag || "no-tag"}</div>
                                            <div className="text-xs text-slate-400 mt-1 font-mono pl-6 truncate">{ob.protocol}</div>
                                        </div>
                                        <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setModal({ type: 'outbound', data: ob, index: i })} className="btn-icon"><Icon name="PencilSimple" /></button>
                                            <button onClick={() => deleteItem('outbounds', i)} className="btn-icon-danger"><Icon name="Trash" /></button>
                                        </div>
                                    </div>
                                ))}
                            </Card>
                        </div>

                        {/* DNS Configuration */}
                        <Card title="DNS" icon="Globe" color="bg-indigo-600" className="h-fit shrink-0 mb-6 xl:mb-0"
                            actions={<Button variant="ghost" onClick={() => { useConfigStore.getState().initDns(); setModal({ type: 'dns', data: null, index: null }) }} icon="PencilSimple">Edit</Button>}>
                            {config.dns ? (
                                <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                                    <div className="grid grid-cols-2 gap-2 text-xs flex-1">
                                        <div className="bg-slate-900 p-2 rounded border border-slate-700/50 flex items-center justify-between px-4">
                                            <span className="text-slate-500 block text-[10px] uppercase">Servers</span>
                                            <span className="text-white font-bold font-mono text-lg">{config.dns.servers?.length || 0}</span>
                                        </div>
                                        <div className="bg-slate-900 p-2 rounded border border-slate-700/50 flex items-center justify-between px-4">
                                            <span className="text-slate-500 block text-[10px] uppercase">Hosts</span>
                                            <span className="text-white font-bold font-mono text-lg">{Object.keys(config.dns.hosts || {}).length}</span>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-400 md:border-l border-slate-800 md:pl-4 flex flex-col gap-1 min-w-[200px]">
                                        <div className="flex justify-between">
                                            <span>Strategy:</span> <span className="text-indigo-300 font-bold">{config.dns.queryStrategy || "UseIP"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Client IP:</span> <span className="font-mono text-slate-500">{config.dns.clientIp || "N/A"}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4 text-slate-500 text-xs">DNS not configured. Click Edit to initialize defaults.</div>
                            )}
                        </Card>
                    </div>
                )}
            </div>
        )}

        {/* MODALS */}
        {modal.type === 'inbound' && <InboundModal data={modal.data} onClose={() => setModal({ type: null })} onSave={handleSaveModal} />}
        {modal.type === 'outbound' && <OutboundModal data={modal.data} onClose={() => setModal({ type: null })} onSave={handleSaveModal} />}
        {modal.type === 'routing' && <RoutingModal onClose={() => setModal({ type: null })} />}
        {modal.type === 'dns' && <DnsModal onClose={() => setModal({ type: null })} />}
        {modal.type === 'settings' && <SettingsModal onClose={() => setModal({ type: null })} />}
        {modal.type === 'reverse' && <ReverseModal onClose={() => setModal({ type: null })} />}
        {modal.type === 'topology' && <TopologyModal onClose={() => setModal({ type: null })} />}
      </main>
    </div>
  );
};