import React, { useState } from "react";
import { Button } from "./components/ui/Button";
import { Icon } from "./components/ui/Icon";
import { InboundModal } from "./components/editors/InboundModal";
import { OutboundModal } from "./components/editors/OutboundModal";
import { RoutingModal } from "./components/editors/RoutingModal";

// --- Simple Card Component ---
const Card = ({ title, icon, color, children, actions }) => (
  <div className="bg-slate-800 border border-slate-700/50 rounded-xl flex flex-col h-full hover:border-slate-600 transition-colors shadow-xl">
    <div className="flex justify-between items-center p-4 border-b border-slate-700/50">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color} text-white`}><Icon name={icon} className="text-xl" /></div>
        <h2 className="text-lg font-bold text-slate-100">{title}</h2>
      </div>
      <div className="flex gap-2">{actions}</div>
    </div>
    <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[400px] custom-scroll bg-slate-800/50">{children}</div>
  </div>
);

// --- Dropzone (упрощенная) ---
const DropZone = ({ onFileLoaded }) => {
  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try { onFileLoaded(JSON.parse(e.target.result as string)); } catch (err) { alert("Invalid JSON"); }
    };
    reader.readAsText(file);
  };
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-400 border-4 border-dashed border-slate-800"
         onDragOver={e => e.preventDefault()}
         onDrop={e => { e.preventDefault(); if(e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
    >
      <Icon name="file-json" className="text-8xl mb-4 text-slate-700"/>
      <h1 className="text-2xl text-white font-bold mb-2">Xray Config Editor</h1>
      <p className="mb-6">Drop config.json here</p>
      <div className="flex gap-4">
        <label className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg cursor-pointer font-bold">
            Open File <input type="file" className="hidden" accept=".json" onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
        </label>
        <Button variant="secondary" onClick={() => onFileLoaded({ inbounds:[], outbounds:[], routing:{rules:[]}, log:{} })}>Create Empty</Button>
      </div>
    </div>
  );
};

export const App = () => {
  const [config, setConfig] = useState(null);
  const [modal, setModal] = useState({ type: null, data: null, index: null });
  const [rawMode, setRawMode] = useState(false);

  const downloadConfig = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = "config.json";
    a.click();
  };

  const handleSaveItem = (newItem) => {
      const { type, index } = modal;
      if (type === 'routing') {
          setConfig({...config, routing: newItem});
      } else {
          const listKey = type + 's';
          const newList = [...(config[listKey] || [])];
          if (index !== null) newList[index] = newItem;
          else newList.push(newItem);
          setConfig({...config, [listKey]: newList});
      }
      setModal({ type: null, data: null, index: null });
  };

  const deleteItem = (key, idx) => {
      if(!confirm("Delete?")) return;
      const newList = [...config[key]];
      newList.splice(idx, 1);
      setConfig({...config, [key]: newList});
  };

  if (!config) return <DropZone onFileLoaded={setConfig} />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      <nav className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white"><Icon name="planet" className="text-xl" /></div>
            <span className="font-bold text-lg tracking-tight">Xray GUI</span>
        </div>
        <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setConfig(null)} icon="arrow-u-up-left">Back</Button>
            <Button variant="secondary" onClick={() => setRawMode(!rawMode)} icon={rawMode ? "layout" : "code"}>{rawMode ? "UI" : "JSON"}</Button>
            <Button variant="success" onClick={downloadConfig} icon="download-simple">Download</Button>
        </div>
      </nav>

      <main className="p-6 max-w-[1600px] mx-auto">
        {rawMode ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl h-[85vh]">
                <textarea className="w-full h-full bg-transparent p-6 font-mono text-sm text-emerald-400 focus:outline-none resize-none custom-scroll"
                    value={JSON.stringify(config, null, 2)}
                    onChange={(e) => { try { setConfig(JSON.parse(e.target.value)); } catch(e) {} }}
                    spellCheck="false"
                />
            </div>
        ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Inbounds */}
                <Card title={`Inbounds (${config.inbounds?.length || 0})`} icon="arrow-circle-down" color="bg-emerald-600"
                    actions={<Button variant="ghost" onClick={() => setModal({ type: 'inbound', data: null, index: null })} icon="plus"/>}>
                    {(config.inbounds || []).map((ib, i) => (
                        <div key={i} className="bg-slate-900 p-3 rounded-lg border border-slate-700/50 hover:border-indigo-500/50 transition-all group flex justify-between items-start">
                            <div>
                                <div className="font-bold text-emerald-400 text-sm flex items-center gap-2"><Icon name="hash"/> {ib.tag || "no-tag"}</div>
                                <div className="text-xs text-slate-400 mt-1 font-mono pl-6">{ib.protocol} : {ib.port}</div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setModal({ type: 'inbound', data: ib, index: i })} className="p-2 hover:bg-indigo-600 rounded text-slate-400 hover:text-white"><Icon name="pencil-simple" /></button>
                                <button onClick={() => deleteItem('inbounds', i)} className="p-2 hover:bg-rose-600 rounded text-slate-400 hover:text-white"><Icon name="trash" /></button>
                            </div>
                        </div>
                    ))}
                </Card>

                {/* Routing */}
                <Card title="Routing" icon="arrows-split" color="bg-purple-600"
                    actions={<Button variant="ghost" onClick={() => setModal({ type: 'routing', data: config.routing, index: null })} icon="pencil-simple">Edit</Button>}>
                    <div className="text-xs text-center text-purple-300 bg-purple-900/20 p-2 rounded mb-2">Strategy: {config.routing?.domainStrategy || "AsIs"}</div>
                    <div className="space-y-1">
                        {(config.routing?.rules || []).map((rule, i) => (
                            <div key={i} className="text-xs bg-slate-900/50 p-2 rounded flex gap-2 border-l-2 border-slate-700">
                                <span className="text-white font-bold w-24 truncate text-right">{rule.outboundTag || rule.balancerTag}</span>
                                <span className="text-slate-600">←</span>
                                <span className="text-slate-400 truncate flex-1">{rule.domain ? `domain(${rule.domain.length})` : rule.ip ? `ip(${rule.ip.length})` : 'match'}</span>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Outbounds */}
                <Card title={`Outbounds (${config.outbounds?.length || 0})`} icon="arrow-circle-up" color="bg-blue-600"
                    actions={<Button variant="ghost" onClick={() => setModal({ type: 'outbound', data: null, index: null })} icon="plus"/>}>
                    {(config.outbounds || []).map((ob, i) => (
                        <div key={i} className="bg-slate-900 p-3 rounded-lg border border-slate-700/50 hover:border-blue-500/50 transition-all group flex justify-between items-start">
                            <div>
                                <div className="font-bold text-blue-400 text-sm flex items-center gap-2"><Icon name="paper-plane-right"/> {ob.tag || "no-tag"}</div>
                                <div className="text-xs text-slate-400 mt-1 font-mono pl-6">{ob.protocol}</div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setModal({ type: 'outbound', data: ob, index: i })} className="p-2 hover:bg-indigo-600 rounded text-slate-400 hover:text-white"><Icon name="pencil-simple" /></button>
                                <button onClick={() => deleteItem('outbounds', i)} className="p-2 hover:bg-rose-600 rounded text-slate-400 hover:text-white"><Icon name="trash" /></button>
                            </div>
                        </div>
                    ))}
                </Card>
            </div>
        )}

        {/* Modals */}
        {modal.type === 'inbound' && <InboundModal data={modal.data} onClose={() => setModal({ type: null })} onSave={handleSaveItem} />}
        {modal.type === 'outbound' && <OutboundModal data={modal.data} onClose={() => setModal({ type: null })} onSave={handleSaveItem} />}
{modal.type === 'routing' && <RoutingModal 
    data={modal.data} 
    outbounds={config.outbounds} 
    inbounds={config.inbounds} // <--- ВАЖНО: Добавь это свойство
    onClose={() => setModal({ type: null })} 
    onSave={handleSaveItem} 
/>}
      </main>
    </div>
  );
};