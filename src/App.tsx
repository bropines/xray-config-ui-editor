import React, { useState } from "react";
import { useConfigStore } from "./store/configStore";
import { Button } from "./components/ui/Button";
import { Icon } from "./components/ui/Icon";
import { InboundModal } from "./components/editors/InboundModal";
import { OutboundModal } from "./components/editors/OutboundModal";
import { RoutingModal } from "./components/editors/RoutingModal";
import { DropZone } from "./components/ui/DropZone";

const Card = ({ title, icon, color, children, actions }) => (
  <div className="bg-slate-800 border border-slate-700/50 rounded-xl flex flex-col h-full hover:border-slate-600 transition-colors shadow-xl overflow-hidden">
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

  const downloadConfig = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = "config.json";
    a.click();
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

  if (!config) return <DropZone onFileLoaded={setConfig} />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      <nav className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-3 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-500/20"><Icon name="Planet" className="text-xl" /></div>
            <span className="font-bold text-lg tracking-tight text-white">Xray GUI</span>
        </div>
        <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setConfig(null)} icon="ArrowUUpLeft">Back</Button>
            <Button variant="secondary" onClick={() => setRawMode(!rawMode)} icon={rawMode ? "Layout" : "Code"}>{rawMode ? "UI" : "JSON"}</Button>
            <Button variant="success" onClick={downloadConfig} icon="DownloadSimple">Download</Button>
        </div>
      </nav>

      <main className="p-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        {rawMode ? (
            <textarea className="w-full h-[85vh] bg-slate-900 border border-slate-800 rounded-xl p-6 font-mono text-sm text-emerald-400 focus:outline-none resize-none custom-scroll shadow-inner"
                value={JSON.stringify(config, null, 2)}
                onChange={(e) => { try { setConfig(JSON.parse(e.target.value)); } catch(e) {} }}
                spellCheck="false"
            />
        ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[85vh]">
                {/* Inbounds */}
                <Card title={`Inbounds (${config.inbounds?.length || 0})`} icon="ArrowCircleDown" color="bg-emerald-600"
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

                {/* Routing (Исправлено отображение) */}
                <Card title="Routing" icon="ArrowsSplit" color="bg-purple-600"
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
                <Card title={`Outbounds (${config.outbounds?.length || 0})`} icon="ArrowCircleUp" color="bg-blue-600"
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
        )}

        {modal.type === 'inbound' && <InboundModal data={modal.data} onClose={() => setModal({ type: null })} onSave={handleSaveModal} />}
        {modal.type === 'outbound' && <OutboundModal data={modal.data} onClose={() => setModal({ type: null })} onSave={handleSaveModal} />}
        {modal.type === 'routing' && <RoutingModal onClose={() => setModal({ type: null })} />}
      </main>
    </div>
  );
};