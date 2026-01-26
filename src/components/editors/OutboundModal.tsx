import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { JsonField } from '../ui/JsonField';
import { Button } from '../ui/Button';
import { parseXrayLink } from '../../utils/link-parser';
import { Icon } from '../ui/Icon';

export const OutboundModal = ({ data, onSave, onClose }) => {
    const [fullObj, setFullObj] = useState(data || { tag: "out-new", protocol: "freedom", settings: {}, streamSettings: {} });
    const [linkInput, setLinkInput] = useState("");
    const [activeTab, setActiveTab] = useState<'form' | 'json'>('form');

    const handleImport = () => {
        if (!linkInput) return;
        const parsed = parseXrayLink(linkInput.trim());
        if (parsed) {
            setFullObj(parsed);
            setLinkInput("");
            setActiveTab('form'); // Switch to form to see result
        }
    };

    // Helper for nested updates
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

    // --- Renderers ---

    const renderForm = () => {
        const protocols = ["freedom", "blackhole", "vless", "vmess", "trojan", "socks", "http", "shadowsocks", "wireguard"];
        const networks = ["tcp", "ws", "grpc", "http", "quic", "kcp"];
        const securities = ["none", "tls", "reality"];

        const uiAddress = fullObj.settings?.vnext?.[0]?.address || fullObj.settings?.servers?.[0]?.address || "";
        const uiPort = fullObj.settings?.vnext?.[0]?.port || fullObj.settings?.servers?.[0]?.port || 0;
        
        return (
            <div className="space-y-6 overflow-y-auto custom-scroll p-1 h-[450px]">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Tag</label>
                        <input className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" value={fullObj.tag || ""} onChange={e => setFullObj({...fullObj, tag: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Protocol</label>
                        <select className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" value={fullObj.protocol} onChange={e => setFullObj({...fullObj, protocol: e.target.value})}>
                            {protocols.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                </div>

                {/* Server Settings (VLESS/VMess/Trojan/SS) */}
                {['vless', 'vmess', 'trojan', 'shadowsocks'].includes(fullObj.protocol) && (
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-800 pb-2">Remote Server</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Address</label>
                                <input className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-sm" 
                                    value={uiAddress}
                                    onChange={e => {
                                        const key = fullObj.protocol === 'shadowsocks' ? 'servers' : 'vnext';
                                        const arr = fullObj.settings?.[key] || [{}];
                                        arr[0].address = e.target.value;
                                        updateSetting(['settings', key], arr);
                                    }}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Port</label>
                                <input type="number" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-sm" 
                                    value={uiPort}
                                    onChange={e => {
                                        const key = fullObj.protocol === 'shadowsocks' ? 'servers' : 'vnext';
                                        const arr = fullObj.settings?.[key] || [{}];
                                        arr[0].port = parseInt(e.target.value);
                                        updateSetting(['settings', key], arr);
                                    }}
                                />
                            </div>
                        </div>

                        {/* User Credentials */}
                        <div>
                            <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">
                                {fullObj.protocol === 'trojan' ? 'Password' : 'UUID / Password'}
                            </label>
                            <input className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-sm" 
                                value={
                                    fullObj.protocol === 'shadowsocks' ? (fullObj.settings?.servers?.[0]?.password || "") :
                                    (fullObj.settings?.vnext?.[0]?.users?.[0]?.[fullObj.protocol === 'trojan' ? 'password' : 'id'] || "")
                                }
                                onChange={e => {
                                    if (fullObj.protocol === 'shadowsocks') {
                                        const s = fullObj.settings?.servers || [{}];
                                        s[0].password = e.target.value;
                                        updateSetting(['settings', 'servers'], s);
                                    } else {
                                        const v = fullObj.settings?.vnext || [{}];
                                        if (!v[0].users) v[0].users = [{}];
                                        v[0].users[0][fullObj.protocol === 'trojan' ? 'password' : 'id'] = e.target.value;
                                        updateSetting(['settings', 'vnext'], v);
                                    }
                                }}
                            />
                        </div>
                        
                        {fullObj.protocol === 'vless' && (
                            <div>
                                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Flow</label>
                                <select className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm"
                                    value={fullObj.settings?.vnext?.[0]?.users?.[0]?.flow || ""}
                                    onChange={e => {
                                        const v = fullObj.settings?.vnext || [{}];
                                        if (!v[0].users) v[0].users = [{}];
                                        v[0].users[0].flow = e.target.value;
                                        updateSetting(['settings', 'vnext'], v);
                                    }}
                                >
                                    <option value="">None</option>
                                    <option value="xtls-rprx-vision">xtls-rprx-vision</option>
                                </select>
                            </div>
                        )}
                    </div>
                )}

                {/* Stream Settings */}
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-800 pb-2">Stream & Security</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Network</label>
                            <select className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm"
                                value={fullObj.streamSettings?.network || "tcp"}
                                onChange={e => updateSetting(['streamSettings', 'network'], e.target.value)}
                            >
                                {networks.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Security</label>
                            <select className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm"
                                value={fullObj.streamSettings?.security || "none"}
                                onChange={e => updateSetting(['streamSettings', 'security'], e.target.value)}
                            >
                                {securities.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Reality Settings */}
                    {fullObj.streamSettings?.security === 'reality' && (
                        <div className="space-y-3 pt-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] uppercase text-purple-400 font-bold mb-1">SNI (Server Name)</label>
                                    <input className="w-full bg-slate-950 border border-purple-500/30 rounded p-2 text-white text-sm font-mono"
                                        value={fullObj.streamSettings?.realitySettings?.serverName || ""}
                                        onChange={e => updateSetting(['streamSettings', 'realitySettings', 'serverName'], e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-purple-400 font-bold mb-1">Fingerprint</label>
                                    <input className="w-full bg-slate-950 border border-purple-500/30 rounded p-2 text-white text-sm"
                                        value={fullObj.streamSettings?.realitySettings?.fingerprint || "chrome"}
                                        onChange={e => updateSetting(['streamSettings', 'realitySettings', 'fingerprint'], e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase text-purple-400 font-bold mb-1">Public Key</label>
                                <input className="w-full bg-slate-950 border border-purple-500/30 rounded p-2 text-white text-sm font-mono"
                                    value={fullObj.streamSettings?.realitySettings?.publicKey || ""}
                                    onChange={e => updateSetting(['streamSettings', 'realitySettings', 'publicKey'], e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase text-purple-400 font-bold mb-1">Short ID</label>
                                <input className="w-full bg-slate-950 border border-purple-500/30 rounded p-2 text-white text-sm font-mono"
                                    value={fullObj.streamSettings?.realitySettings?.shortId || ""}
                                    onChange={e => updateSetting(['streamSettings', 'realitySettings', 'shortId'], e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                    
                    {/* TLS Settings */}
                    {fullObj.streamSettings?.security === 'tls' && (
                        <div className="space-y-3 pt-2">
                            <div>
                                <label className="block text-[10px] uppercase text-blue-400 font-bold mb-1">SNI (Server Name)</label>
                                <input className="w-full bg-slate-950 border border-blue-500/30 rounded p-2 text-white text-sm font-mono"
                                    value={fullObj.streamSettings?.tlsSettings?.serverName || ""}
                                    onChange={e => updateSetting(['streamSettings', 'tlsSettings', 'serverName'], e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" className="w-4 h-4 rounded bg-slate-950 border-slate-700"
                                    checked={fullObj.streamSettings?.tlsSettings?.allowInsecure || false}
                                    onChange={e => updateSetting(['streamSettings', 'tlsSettings', 'allowInsecure'], e.target.checked)}
                                />
                                <label className="text-sm text-slate-300">Allow Insecure</label>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderJson = () => (
        <div className="h-[450px] flex flex-col gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <label className="text-xs uppercase font-bold text-slate-500 mb-2 block">Import from Link</label>
                <div className="flex gap-2">
                    <input className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white" 
                        placeholder="vless://..." value={linkInput} onChange={e => setLinkInput(e.target.value)} />
                    <Button variant="primary" className="text-xs" onClick={handleImport}>Parse</Button>
                </div>
            </div>
            <JsonField label="Full Configuration JSON" value={fullObj} onChange={setFullObj} className="flex-1" />
        </div>
    );

    return (
        <Modal 
            title="Outbound Editor" 
            onClose={onClose} 
            onSave={() => onSave(fullObj)}
            extraButtons={
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button onClick={() => setActiveTab('form')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'form' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Form</button>
                    <button onClick={() => setActiveTab('json')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'json' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>JSON / Import</button>
                </div>
            }
        >
            {activeTab === 'form' ? renderForm() : renderJson()}
        </Modal>
    );
};