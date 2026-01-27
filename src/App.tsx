import React, { useState, useEffect } from "react";
import { Toaster } from 'sonner'; 
import { useConfigStore } from "./store/configStore";
import { Button } from "./components/ui/Button";
import { Icon } from "./components/ui/Icon";
import { InboundModal } from "./components/editors/InboundModal";
import { OutboundModal } from "./components/editors/OutboundModal";
import { RoutingModal } from "./components/editors/RoutingModal";
import { DnsModal } from "./components/editors/DnsModal";
import { SettingsModal } from "./components/editors/SettingsModal";
import { ReverseModal } from "./components/editors/ReverseModal";
import { JsonField } from "./components/ui/JsonField";
import { TopologyModal } from "./components/topology/TopologyModal";

// Компонент карточки
const Card = ({ title, icon, color, children, actions, className = "h-full" }) => (
  <div className={`bg-slate-800 border border-slate-700/50 rounded-xl flex flex-col hover:border-slate-600 transition-colors shadow-xl overflow-hidden ${className}`}>
    <div className="flex justify-between items-center p-4 border-b border-slate-700/50 bg-slate-800/50">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color} text-white shadow-lg`}><Icon name={icon} className="text-xl" /></div>
        <h2 className="text-lg font-bold text-slate-100">{title}</h2>
      </div>
      <div className="flex gap-2">{actions}</div>
    </div>
    <div className="flex-1 p-4 space-y-3 overflow-y-auto custom-scroll bg-slate-900/30">{children}</div>
  </div>
);

export const App = () => {
  const { config, setConfig, deleteItem } = useConfigStore();
  const [modal, setModal] = useState({ type: null, data: null, index: null });
  const [rawMode, setRawMode] = useState(false);
  
  // Состояние для глобального Drag & Drop
  const [isDragging, setIsDragging] = useState(false);

  // --- ЛОГИКА ФАЙЛОВ ---
  const loadFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        setConfig(JSON.parse(e.target?.result as string));
        setRawMode(false); // Выходим из JSON режима, если были в нем
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

  const createEmpty = () => {
    setConfig({
      log: { loglevel: "warning" },
      inbounds: [],
      outbounds: [],
      routing: { rules: [], balancers: [] }
    });
  };

  // --- DND HANDLERS ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Проверка, чтобы оверлей не моргал при наведении на внутренние элементы
    if (e.relatedTarget === null || !e.currentTarget.contains(e.relatedTarget as Node)) {
        setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
  };

  // --- СОХРАНЕНИЕ В МОДАЛКАХ ---
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

  return (
    <div 
        className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
    <Toaster 
        theme="dark" 
        position="bottom-right" 
        toastOptions={{
            style: { background: '#1e293b', border: '1px solid #334155', color: 'white' },
            className: 'my-toast-class',
        }}
      />
      {/* Глобальный оверлей при перетаскивании файла */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-indigo-900/80 backdrop-blur-sm border-4 border-indigo-500 border-dashed flex flex-col items-center justify-center pointer-events-none transition-all">
          <Icon name="FileArrowDown" className="text-8xl text-indigo-400 mb-4 animate-bounce" weight="fill" />
          <h2 className="text-3xl font-bold text-white shadow-sm">Drop config.json here to replace current</h2>
        </div>
      )}

      {/* --- HEADER (Только управление файлами) --- */}
      <nav className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-3 shadow-md grid grid-cols-3 items-center">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-500/20"><Icon name="Planet" className="text-xl" /></div>
            <span className="font-bold text-lg tracking-tight text-white">Xray GUI</span>
        </div>

        {/* Center: Open File */}
        <div className="flex justify-center">
            <label className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-6 py-2 rounded-lg font-bold cursor-pointer transition-all border border-slate-700 hover:border-slate-600 shadow-lg">
                <Icon name="FolderOpen" /> Open File
                <input type="file" className="hidden" accept=".json" onChange={handleFileUpload} />
            </label>
        </div>

        {/* Right: Download */}
        <div className="flex justify-end">
            <Button variant="success" onClick={downloadConfig} icon="DownloadSimple" className="font-bold shadow-emerald-500/20" disabled={!config}>Download</Button>
        </div>
      </nav>

      <main className="p-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* --- WELCOME SCREEN (Если конфига нет) --- */}
        {!config ? (
            <div className="h-[75vh] flex flex-col items-center justify-center text-slate-400">
                <Icon name="FileJson" className="text-8xl mb-6 text-slate-800" />
                <h1 className="text-3xl text-white font-bold mb-2">No Configuration Loaded</h1>
                <p className="mb-8">Drag & Drop your <code>config.json</code> anywhere on the screen</p>
                <div className="flex gap-4">
                    <label className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-lg cursor-pointer font-bold transition-colors shadow-lg shadow-indigo-500/30 flex items-center gap-2">
                        <Icon name="FolderOpen" weight="bold" /> Browse Files
                        <input type="file" className="hidden" accept=".json" onChange={handleFileUpload} />
                    </label>
                    <Button variant="secondary" onClick={createEmpty} icon="PlusCircle" className="px-6">Create Empty</Button>
                </div>
            </div>
        ) : (
            // --- MAIN DASHBOARD ---
            <div className="flex flex-col gap-6 h-[85vh]">
                
                {/* TOOLBAR (Управление текущим конфигом) */}
                <div className="flex justify-between items-center bg-slate-900 border border-slate-800 px-6 py-3 rounded-xl shadow-lg">
                    <h2 className="font-bold text-slate-300 flex items-center gap-2">
                        <Icon name="SlidersHorizontal" /> Core Modules
                    </h2>
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={() => setModal({ type: 'topology', data: null, index: null })} icon="GitMerge" title="Topology View" />
                        <Button variant="secondary" onClick={() => setModal({ type: 'reverse', data: null, index: null })} icon="ArrowsLeftRight">Reverse Proxy</Button>
                        <Button variant="secondary" onClick={() => setModal({ type: 'settings', data: null, index: null })} icon="Gear">General Settings</Button>
                        <div className="w-px bg-slate-800 mx-2"></div>
                        <Button variant="secondary" onClick={() => setRawMode(!rawMode)} icon={rawMode ? "Layout" : "Code"} className={rawMode ? "bg-indigo-600 border-indigo-500 text-white" : ""}>
                            {rawMode ? "Switch to UI" : "Raw JSON"}
                        </Button>
                    </div>
                </div>

                {/* CONTENT AREA */}
                {rawMode ? (
                    // РЕЖИМ JSON
                    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-1 shadow-2xl">
                        <JsonField 
                            label="Full Configuration" 
                            value={config} 
                            onChange={(newConfig) => { if (newConfig) setConfig(newConfig); }} 
                            className="h-full"
                        />
                    </div>
                ) : (
                    // РЕЖИМ UI
                    <>
                        {/* Верхняя часть: Grid 3 колонки (растягивается flex-1) */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0">
                            {/* Inbounds */}
                            <Card title={`Inbounds (${config.inbounds?.length || 0})`} icon="ArrowCircleDown" color="bg-emerald-600" className="h-full"
                                actions={<Button variant="ghost" onClick={() => setModal({ type: 'inbound', data: null, index: null })} icon="Plus"/>}>
                                {(config.inbounds || []).map((ib, i) => (
                                    <div key={i} className="card-item group flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-emerald-400 text-sm flex items-center gap-2"><Icon name="Hash"/> {ib.tag || "no-tag"}</div>
                                            <div className="text-xs text-slate-400 mt-1 font-mono pl-6">{ib.protocol} : {ib.port}</div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setModal({ type: 'inbound', data: ib, index: i })} className="btn-icon"><Icon name="PencilSimple" /></button>
                                            <button onClick={() => deleteItem('inbounds', i)} className="btn-icon-danger"><Icon name="Trash" /></button>
                                        </div>
                                    </div>
                                ))}
                            </Card>

                            {/* Routing */}
                            <Card title="Routing" icon="ArrowsSplit" color="bg-purple-600" className="h-full"
                                actions={<Button variant="ghost" onClick={() => setModal({ type: 'routing', data: null, index: null })} icon="PencilSimple">Edit</Button>}>
                                <div className="text-xs text-center text-purple-300 bg-purple-900/20 p-2 rounded mb-2 border border-purple-500/20">
                                    Strategy: <span className="font-bold">{config.routing?.domainStrategy || "AsIs"}</span>
                                </div>
                                <div className="space-y-1">
                                    {(config.routing?.rules || []).slice(0, 20).map((rule, i) => (
                                        <div key={i} className="text-xs bg-slate-950 p-2 rounded flex gap-2 border-l-2 border-slate-700 items-center">
                                            <span className={`font-bold w-24 truncate text-right ${rule.balancerTag ? 'text-purple-400' : 'text-blue-400'}`}>
                                                {rule.outboundTag || rule.balancerTag}
                                            </span>
                                            <span className="text-slate-600"><Icon name="ArrowLeft" /></span>
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
                            <Card title={`Outbounds (${config.outbounds?.length || 0})`} icon="ArrowCircleUp" color="bg-blue-600" className="h-full"
                                actions={<Button variant="ghost" onClick={() => setModal({ type: 'outbound', data: null, index: null })} icon="Plus"/>}>
                                {(config.outbounds || []).map((ob, i) => (
                                    <div key={i} className="card-item group flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-blue-400 text-sm flex items-center gap-2"><Icon name="PaperPlaneRight"/> {ob.tag || "no-tag"}</div>
                                            <div className="text-xs text-slate-400 mt-1 font-mono pl-6">{ob.protocol}</div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setModal({ type: 'outbound', data: ob, index: i })} className="btn-icon"><Icon name="PencilSimple" /></button>
                                            <button onClick={() => deleteItem('outbounds', i)} className="btn-icon-danger"><Icon name="Trash" /></button>
                                        </div>
                                    </div>
                                ))}
                            </Card>
                        </div>

                        {/* DNS Configuration (Нижняя панель) */}
                        <Card title="DNS" icon="Globe" color="bg-indigo-600" className="h-fit shrink-0"
                            actions={<Button variant="ghost" onClick={() => { useConfigStore.getState().initDns(); setModal({ type: 'dns', data: null, index: null }) }} icon="PencilSimple">Edit</Button>}>
                            
                            {config.dns ? (
                                <div className="flex gap-4 items-center">
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
                                    <div className="text-xs text-slate-400 border-l border-slate-800 pl-4 flex flex-col gap-1 min-w-[200px]">
                                        <div className="flex justify-between">
                                            <span>Strategy:</span> <span className="text-indigo-300 font-bold">{config.dns.queryStrategy || "UseIP"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Client IP:</span> <span className="font-mono text-slate-500">{config.dns.clientIp || "N/A"}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4 text-slate-500 text-xs">
                                    DNS not configured. Click Edit to initialize defaults.
                                </div>
                            )}
                        </Card>
                    </>
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