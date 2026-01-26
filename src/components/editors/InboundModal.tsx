import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { JsonField } from '../ui/JsonField';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

// --- HELPERS ---
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const generateShortId = () => {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 8; i++) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
};

// Генерация X25519 Private Key (32 bytes -> Base64Url)
const generatePrivateKey = () => {
    const arr = new Uint8Array(32);
    window.crypto.getRandomValues(arr);
    return btoa(String.fromCharCode(...arr))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};

// --- COMPONENT ---
export const InboundModal = ({ data, onSave, onClose }) => {
    const [fullObj, setFullObj] = useState(data || { 
        tag: `in-${Math.floor(Math.random()*1000)}`, 
        port: 10808, 
        protocol: "vless", 
        settings: { clients: [], decryption: "none", fallbacks: [] }, 
        streamSettings: { network: "tcp", security: "none", tcpSettings: {}, realitySettings: {}, tlsSettings: {} },
        sniffing: { enabled: true, destOverride: ["http", "tls"] }
    });

    // Toggle for Raw JSON view
    const [rawMode, setRawMode] = useState(false);
    // Toggle for Advanced Transport settings (hide by default for simple protocols)
    const [showTransport, setShowTransport] = useState(
        ['vless', 'vmess', 'trojan', 'shadowsocks'].includes(fullObj.protocol)
    );

    // Helper for deeply nested updates
    const update = (path: string[], value: any) => {
        const newObj = JSON.parse(JSON.stringify(fullObj));
        let curr = newObj;
        for (let i = 0; i < path.length - 1; i++) {
            if (!curr[path[i]]) curr[path[i]] = {};
            curr = curr[path[i]];
        }
        curr[path[path.length - 1]] = value;
        setFullObj(newObj);
    };

    const handleProtocolChange = (proto) => {
        // Reset specific settings on protocol change to avoid "meme" configs
        const newObj = { ...fullObj, protocol: proto };
        
        // Defaults for specific protocols
        if (proto === 'vless' || proto === 'vmess') {
            newObj.settings = { clients: [{ id: generateUUID(), level: 0 }] };
            if (proto === 'vless') {
                newObj.settings.decryption = "none";
                newObj.settings.clients[0].flow = "xtls-rprx-vision";
            }
            setShowTransport(true);
        } else if (proto === 'trojan') {
            newObj.settings = { clients: [{ password: "password", level: 0 }] };
            setShowTransport(true);
        } else if (proto === 'shadowsocks') {
            newObj.settings = { method: "aes-256-gcm", password: "password", network: "tcp,udp" };
            setShowTransport(true);
        } else if (proto === 'socks') {
            newObj.settings = { auth: "noauth", udp: true };
            setShowTransport(false); // Usually socks doesn't need complex transport
        } else if (proto === 'http') {
            newObj.settings = { allowTransparent: false };
            setShowTransport(false);
        }

        setFullObj(newObj);
    };

    // --- RENDERERS ---

    const renderGeneral = () => (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="col-span-1">
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Protocol</label>
                <select className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm font-bold focus:border-indigo-500 outline-none"
                    value={fullObj.protocol} onChange={e => handleProtocolChange(e.target.value)}>
                    <option value="vless">VLESS</option>
                    <option value="vmess">VMess</option>
                    <option value="trojan">Trojan</option>
                    <option value="shadowsocks">Shadowsocks</option>
                    <option value="socks">Socks</option>
                    <option value="http">HTTP</option>
                    <option value="dokodemo-door">Dokodemo</option>
                </select>
            </div>
            <div className="col-span-1">
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Port</label>
                <input type="number" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm font-mono focus:border-indigo-500 outline-none"
                    value={fullObj.port} onChange={e => setFullObj({...fullObj, port: parseInt(e.target.value)})} />
            </div>
            <div className="col-span-1">
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Listen IP</label>
                <input className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm font-mono focus:border-indigo-500 outline-none"
                    placeholder="0.0.0.0" value={fullObj.listen || ""} onChange={e => setFullObj({...fullObj, listen: e.target.value})} />
            </div>
            <div className="col-span-1">
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Tag</label>
                <input className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-indigo-500 outline-none"
                    value={fullObj.tag} onChange={e => setFullObj({...fullObj, tag: e.target.value})} />
            </div>
        </div>
    );

    const renderClients = () => {
        const proto = fullObj.protocol;
        // Определяем тип клиентов/юзеров
        let clientsPath = ['settings', 'clients'];
        let idKey = 'id';
        
        if (proto === 'shadowsocks') {
            // SS хранит настройки прямо в settings для одного юзера, или clients для мульти
            return (
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><Icon name="key"/> Shadowsocks Credentials</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Method</label>
                            <select className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm"
                                value={fullObj.settings?.method || "aes-256-gcm"}
                                onChange={e => update(['settings', 'method'], e.target.value)}
                            >
                                <option value="aes-256-gcm">aes-256-gcm</option>
                                <option value="chacha20-ietf-poly1305">chacha20-ietf-poly1305</option>
                                <option value="2022-blake3-aes-128-gcm">2022-blake3-aes-128-gcm</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Password</label>
                            <div className="flex gap-2">
                                <input className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm font-mono"
                                    value={fullObj.settings?.password || ""}
                                    onChange={e => update(['settings', 'password'], e.target.value)}
                                />
                                <button onClick={() => update(['settings', 'password'], generateShortId() + generateShortId())} className="bg-slate-800 p-2 rounded text-slate-400 hover:text-white"><Icon name="dice-five"/></button>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }

        if (proto === 'socks' || proto === 'http') {
            // Socks/HTTP auth
            return (
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><Icon name="user-circle"/> Authentication</h4>
                    <div className="mb-3">
                        <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Auth Type</label>
                        <select className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm"
                            value={fullObj.settings?.auth || "noauth"}
                            onChange={e => update(['settings', 'auth'], e.target.value)}
                        >
                            <option value="noauth">No Auth</option>
                            <option value="password">Password</option>
                        </select>
                    </div>
                    {fullObj.settings?.auth === 'password' && (
                        <div className="p-3 bg-rose-900/10 border border-rose-900/30 rounded text-rose-300 text-xs">
                            Accounts management for Socks/HTTP is available in JSON mode.
                        </div>
                    )}
                </div>
            )
        }

        if (proto === 'trojan') idKey = 'password';
        
        const clients = fullObj.settings?.clients || [];

        const addClient = () => {
            const newClient = { email: `user${clients.length}@xray` };
            newClient[idKey] = proto === 'trojan' ? "password" : generateUUID();
            if (proto === 'vless') newClient.flow = "xtls-rprx-vision";
            update(clientsPath, [...clients, newClient]);
        };

        const updateClient = (idx, field, val) => {
            const list = [...clients];
            list[idx][field] = val;
            update(clientsPath, list);
        };

        const removeClient = (idx) => {
            const list = [...clients];
            list.splice(idx, 1);
            update(clientsPath, list);
        };

        return (
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><Icon name="users"/> Clients / Users</h4>
                    <Button variant="ghost" className="px-2 py-1 text-xs" onClick={addClient} icon="plus">Add</Button>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scroll pr-1">
                    {clients.map((c, i) => (
                        <div key={i} className="bg-slate-950 border border-slate-800 rounded-lg p-3 relative group">
                            <button onClick={() => removeClient(i)} className="absolute top-2 right-2 text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Icon name="trash"/></button>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-6">
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Email</label>
                                    <input className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white text-xs"
                                        value={c.email || ""} onChange={e => updateClient(i, 'email', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">{idKey === 'id' ? 'UUID' : 'Password'}</label>
                                    <div className="flex gap-2">
                                        <input className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white text-xs font-mono"
                                            value={c[idKey] || ""} onChange={e => updateClient(i, idKey, e.target.value)} />
                                        <button onClick={() => updateClient(i, idKey, idKey === 'id' ? generateUUID() : generateShortId())} className="text-slate-500 hover:text-white"><Icon name="dice-five"/></button>
                                    </div>
                                </div>
                                {proto === 'vless' && (
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Flow</label>
                                        <select className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white text-xs"
                                            value={c.flow || ""} onChange={e => updateClient(i, 'flow', e.target.value)}>
                                            <option value="">None</option>
                                            <option value="xtls-rprx-vision">xtls-rprx-vision</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {clients.length === 0 && <div className="text-center text-slate-600 text-xs py-2">No users defined.</div>}
                </div>
            </div>
        );
    };

    const renderTransport = () => {
        if (!showTransport) {
            return (
                <div className="text-center py-4 border-t border-slate-800">
                    <button onClick={() => setShowTransport(true)} className="text-xs text-indigo-400 hover:text-indigo-300 underline">
                        Show Advanced Transport Settings
                    </button>
                </div>
            )
        }

        const net = fullObj.streamSettings?.network || "tcp";
        const sec = fullObj.streamSettings?.security || "none";

        return (
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-6 mt-4 animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><Icon name="network"/> Stream Settings</h4>
                    <button onClick={() => setShowTransport(false)} className="text-slate-600 hover:text-white"><Icon name="caret-up"/></button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Network</label>
                        <select className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm"
                            value={net} onChange={e => update(['streamSettings', 'network'], e.target.value)}>
                            {["tcp", "ws", "grpc", "http", "quic", "kcp"].map(n => <option key={n} value={n}>{n.toUpperCase()}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Security</label>
                        <select className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm"
                            value={sec} onChange={e => update(['streamSettings', 'security'], e.target.value)}>
                            {["none", "tls", "reality"].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                        </select>
                    </div>
                </div>

                {/* --- REALITY --- */}
                {sec === 'reality' && (
                    <div className="space-y-4 border-t border-slate-800 pt-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-purple-400">REALITY</span>
                            <Button variant="secondary" className="px-2 py-1 text-[10px]" 
                                onClick={() => {
                                    // Generate Private Key
                                    const priv = generatePrivateKey();
                                    update(['streamSettings', 'realitySettings', 'privateKey'], priv);
                                    // Set some defaults
                                    if(!fullObj.streamSettings?.realitySettings?.shortIds) update(['streamSettings', 'realitySettings', 'shortIds'], [generateShortId()]);
                                    alert("New Private Key generated.\n\nDon't forget to get the Public Key using 'xray x25519 -i <privKey>' for clients!");
                                }}>
                                Gen Keys
                            </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Dest (Fallover Target)</label>
                                <input className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm font-mono placeholder:text-slate-700"
                                    placeholder="example.com:443"
                                    value={fullObj.streamSettings?.realitySettings?.dest || ""}
                                    onChange={e => update(['streamSettings', 'realitySettings', 'dest'], e.target.value)}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Server Names (SNI)</label>
                                <input className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm font-mono placeholder:text-slate-700"
                                    placeholder="example.com, www.example.com"
                                    value={(fullObj.streamSettings?.realitySettings?.serverNames || []).join(', ')}
                                    onChange={e => update(['streamSettings', 'realitySettings', 'serverNames'], e.target.value.split(',').map(s=>s.trim()))}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Private Key</label>
                                <input className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm font-mono text-emerald-400"
                                    value={fullObj.streamSettings?.realitySettings?.privateKey || ""}
                                    onChange={e => update(['streamSettings', 'realitySettings', 'privateKey'], e.target.value)}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Short IDs</label>
                                <div className="flex gap-2">
                                    <input className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm font-mono"
                                        value={(fullObj.streamSettings?.realitySettings?.shortIds || []).join(', ')}
                                        onChange={e => update(['streamSettings', 'realitySettings', 'shortIds'], e.target.value.split(',').map(s=>s.trim()))}
                                    />
                                    <button onClick={() => update(['streamSettings', 'realitySettings', 'shortIds'], [generateShortId()])} className="bg-slate-800 p-2 rounded text-slate-400 hover:text-white"><Icon name="dice-five"/></button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TCP/WS/GRPC Settings --- */}
                {net === 'ws' && (
                    <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                        <div>
                            <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">WS Path</label>
                            <input className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm font-mono"
                                value={fullObj.streamSettings?.wsSettings?.path || "/"}
                                onChange={e => update(['streamSettings', 'wsSettings', 'path'], e.target.value)}
                            />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (rawMode) return (
        <Modal title="Inbound JSON" onClose={onClose} onSave={() => onSave(fullObj)}>
            <div className="h-[500px]">
                <JsonField label="Full JSON" value={fullObj} onChange={setFullObj} className="h-full" />
            </div>
            <div className="absolute top-6 right-16">
                <Button variant="secondary" className="text-xs py-1" onClick={() => setRawMode(false)}>Switch to UI</Button>
            </div>
        </Modal>
    );

    return (
        <Modal 
            title="Inbound Editor" 
            onClose={onClose} 
            onSave={() => onSave(fullObj)}
            extraButtons={
                <Button variant="secondary" className="text-xs py-1" onClick={() => setRawMode(true)} icon="code">JSON</Button>
            }
        >
            <div className="flex flex-col h-[600px] overflow-y-auto custom-scroll p-1 space-y-6">
                {/* 1. General Info */}
                {renderGeneral()}

                {/* 2. Clients (If applicable) */}
                {['vless', 'vmess', 'trojan', 'shadowsocks', 'socks', 'http'].includes(fullObj.protocol) && renderClients()}

                {/* 3. Transport & Security (Context Aware) */}
                {renderTransport()}

                {/* 4. Sniffing */}
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4 rounded bg-slate-950 border-slate-700"
                            checked={fullObj.sniffing?.enabled || false}
                            onChange={e => update(['sniffing', 'enabled'], e.target.checked)}
                        />
                        <label className="text-sm font-bold text-slate-300">Sniffing</label>
                    </div>
                    {fullObj.sniffing?.enabled && (
                        <div className="flex gap-2 pl-6">
                            {['http', 'tls', 'quic', 'fakedns'].map(t => (
                                <label key={t} className="flex items-center gap-1 text-xs text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800 cursor-pointer">
                                    <input type="checkbox" 
                                        checked={fullObj.sniffing?.destOverride?.includes(t) || false}
                                        onChange={e => {
                                            const curr = fullObj.sniffing?.destOverride || [];
                                            update(['sniffing', 'destOverride'], e.target.checked ? [...curr, t] : curr.filter(x=>x!==t));
                                        }}
                                    />
                                    {t}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};