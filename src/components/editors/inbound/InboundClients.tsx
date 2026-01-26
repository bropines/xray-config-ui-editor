import React from 'react';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';

// Хелперы
const generateUUID = () => crypto.randomUUID();
const generateShortId = () => Math.random().toString(16).substring(2, 10);

export const InboundClients = ({ inbound, onChange }) => {
    const proto = inbound.protocol;

    // 1. Shadowsocks (Single User config style for simplicity in UI)
    if (proto === 'shadowsocks') {
        return (
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mt-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                    <Icon name="Key"/> Shadowsocks Credentials
                </h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="label-xs">Method</label>
                        <select className="input-base"
                            value={inbound.settings?.method || "aes-256-gcm"}
                            onChange={e => onChange(['settings', 'method'], e.target.value)}
                        >
                            <option value="aes-256-gcm">aes-256-gcm</option>
                            <option value="chacha20-ietf-poly1305">chacha20-ietf-poly1305</option>
                            <option value="2022-blake3-aes-128-gcm">2022-blake3-aes-128-gcm</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-xs">Password</label>
                        <div className="flex gap-2">
                            <input className="input-base font-mono"
                                value={inbound.settings?.password || ""}
                                onChange={e => onChange(['settings', 'password'], e.target.value)}
                            />
                            <button onClick={() => onChange(['settings', 'password'], generateShortId() + generateShortId())} 
                                className="bg-slate-800 p-2 rounded text-slate-400 hover:text-white transition-colors">
                                <Icon name="DiceFive"/>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 2. Socks / HTTP (Auth Strategy)
    if (proto === 'socks' || proto === 'http') {
        return (
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mt-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                    <Icon name="UserCircle"/> Authentication
                </h4>
                <div>
                    <label className="label-xs">Auth Type</label>
                    <select className="input-base"
                        value={inbound.settings?.auth || "noauth"}
                        onChange={e => onChange(['settings', 'auth'], e.target.value)}
                    >
                        <option value="noauth">No Auth</option>
                        <option value="password">Password</option>
                    </select>
                </div>
                {inbound.settings?.auth === 'password' && (
                    <div className="mt-3 p-3 bg-indigo-900/20 border border-indigo-500/30 rounded text-indigo-300 text-xs flex gap-2">
                        <Icon name="Info" className="mt-0.5" />
                        To manage accounts for Socks/HTTP, please switch to JSON mode.
                    </div>
                )}
            </div>
        );
    }

    // 3. VLESS / VMess / Trojan (Multi-client)
    if (!['vless', 'vmess', 'trojan'].includes(proto)) return null;

    const clients = inbound.settings?.clients || [];
    const idKey = proto === 'trojan' ? 'password' : 'id';

    const addClient = () => {
        const newClient: any = { email: `user${clients.length}@xray` };
        newClient[idKey] = idKey === 'id' ? generateUUID() : generateShortId();
        if (proto === 'vless') newClient.flow = "xtls-rprx-vision";
        onChange(['settings', 'clients'], [...clients, newClient]);
    };

    const updateClient = (index, field, val) => {
        const newClients = [...clients];
        newClients[index] = { ...newClients[index], [field]: val };
        onChange(['settings', 'clients'], newClients);
    };

    const removeClient = (index) => {
        const newClients = [...clients];
        newClients.splice(index, 1);
        onChange(['settings', 'clients'], newClients);
    };

    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mt-4">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                    <Icon name="Users"/> Clients / Users
                </h4>
                <Button variant="ghost" className="px-2 py-1 text-xs" onClick={addClient} icon="Plus">Add</Button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scroll pr-1">
                {clients.map((c, i) => (
                    <div key={i} className="bg-slate-950 border border-slate-800 rounded-lg p-3 relative group hover:border-slate-600 transition-colors">
                        <button onClick={() => removeClient(i)} className="absolute top-2 right-2 text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Icon name="Trash"/>
                        </button>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-6">
                            <div>
                                <label className="label-xs">Email</label>
                                <input className="input-base py-1.5 text-xs"
                                    value={c.email || ""} 
                                    onChange={e => updateClient(i, 'email', e.target.value)} 
                                />
                            </div>
                            <div>
                                <label className="label-xs">{idKey === 'id' ? 'UUID' : 'Password'}</label>
                                <div className="flex gap-2">
                                    <input className="input-base py-1.5 text-xs font-mono"
                                        value={c[idKey] || ""} 
                                        onChange={e => updateClient(i, idKey, e.target.value)} 
                                    />
                                    <button onClick={() => updateClient(i, idKey, idKey === 'id' ? generateUUID() : generateShortId())} 
                                        className="text-slate-500 hover:text-white transition-colors">
                                        <Icon name="DiceFive"/>
                                    </button>
                                </div>
                            </div>
                            {proto === 'vless' && (
                                <div className="md:col-span-2">
                                    <label className="label-xs">Flow</label>
                                    <select className="input-base py-1.5 text-xs"
                                        value={c.flow || ""} 
                                        onChange={e => updateClient(i, 'flow', e.target.value)}>
                                        <option value="">None</option>
                                        <option value="xtls-rprx-vision">xtls-rprx-vision</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {clients.length === 0 && (
                    <div className="text-center text-slate-600 text-xs py-4 italic">No users defined. Click Add to create one.</div>
                )}
            </div>
        </div>
    );
};