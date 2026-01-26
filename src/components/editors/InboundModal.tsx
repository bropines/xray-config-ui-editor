import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { JsonField } from '../ui/JsonField';

export const InboundModal = ({ data, onSave, onClose }) => {
    const [fullObj, setFullObj] = useState(data || { tag: "in-new", port: 10808, protocol: "vless", settings: {}, streamSettings: {} });

    const updateSetting = (path: string[], value: any) => {
        const newObj = JSON.parse(JSON.stringify(fullObj));
        let curr = newObj;
        for (let i = 0; i < path.length - 1; i++) {
            if (!curr[path[i]]) curr[path[i]] = {};
            curr = curr[path[i]];
        }
        curr[path[path.length - 1]] = value;
        setFullObj(newObj);
    };

    return (
        <Modal title="Inbound Editor" onClose={onClose} onSave={() => onSave(fullObj)}>
            <div className="flex gap-6 h-[500px]">
                {/* Left: UI */}
                <div className="w-1/2 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500">Tag</label>
                            <input className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm"
                                value={fullObj.tag} onChange={e => setFullObj({...fullObj, tag: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500">Port</label>
                            <input type="number" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm"
                                value={fullObj.port} onChange={e => setFullObj({...fullObj, port: parseInt(e.target.value)})} />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500">Protocol</label>
                            <select className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm"
                                value={fullObj.protocol} onChange={e => setFullObj({...fullObj, protocol: e.target.value})}>
                                {["vless", "vmess", "trojan", "socks", "http", "dokodemo-door", "shadowsocks"].map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 space-y-3">
                        <div className="text-xs font-bold text-slate-400 uppercase border-b border-slate-800 pb-2 mb-2">Listen & Sniffing</div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500">Listen IP</label>
                            <input className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm font-mono"
                                placeholder="0.0.0.0" value={fullObj.listen || ""} onChange={e => setFullObj({...fullObj, listen: e.target.value})} />
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                            <input type="checkbox" id="sniff" className="w-4 h-4 rounded bg-slate-800 border-slate-600" 
                                checked={fullObj.sniffing?.enabled || false}
                                onChange={e => updateSetting(['sniffing', 'enabled'], e.target.checked)}
                            />
                            <label htmlFor="sniff" className="text-sm text-slate-300">Enable Sniffing</label>
                        </div>
                    </div>
                </div>

                {/* Right: JSON */}
                <div className="w-1/2 border-l border-slate-800 pl-4 h-full">
                    <JsonField label="Full JSON Object" value={fullObj} onChange={setFullObj} className="h-full" />
                </div>
            </div>
        </Modal>
    );
};