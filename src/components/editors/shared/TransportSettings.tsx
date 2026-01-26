import React from 'react';
import { Icon } from '../../ui/Icon';
import { Button } from '../../ui/Button';

// Генераторы ключей можно тоже вынести в utils, но для примера оставим тут
const generatePrivateKey = () => {
    const arr = new Uint8Array(32);
    window.crypto.getRandomValues(arr);
    return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

interface TransportProps {
    streamSettings: any;
    onChange: (newSettings: any) => void;
    isClient?: boolean; // Outbound = true, Inbound = false
}

export const TransportSettings = ({ streamSettings = {}, onChange, isClient = false }: TransportProps) => {
    const update = (path: string[], value: any) => {
        // Простая эмуляция глубокого апдейта для локального стейта, 
        // в реальном коде можно использовать immer внутри компонента тоже
        const newObj = JSON.parse(JSON.stringify(streamSettings));
        let curr = newObj;
        for (let i = 0; i < path.length - 1; i++) {
            if (!curr[path[i]]) curr[path[i]] = {};
            curr = curr[path[i]];
        }
        curr[path[path.length - 1]] = value;
        onChange(newObj);
    };

    const net = streamSettings.network || "tcp";
    const sec = streamSettings.security || "none";

    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4 mt-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                    <Icon name="Network" /> Stream Settings
                </h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Network</label>
                    <select className="input-base"
                        value={net} onChange={e => update(['network'], e.target.value)}>
                        {["tcp", "ws", "grpc", "http", "quic", "kcp"].map(n => <option key={n} value={n}>{n.toUpperCase()}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Security</label>
                    <select className="input-base"
                        value={sec} onChange={e => update(['security'], e.target.value)}>
                        {["none", "tls", "reality"].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                    </select>
                </div>
            </div>

            {/* REALITY BLOCK */}
            {sec === 'reality' && (
                <div className="space-y-4 border-t border-slate-800 pt-4 animate-in fade-in">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-purple-400">REALITY</span>
                        {!isClient && (
                            <Button variant="secondary" className="px-2 py-1 text-[10px]"
                                onClick={() => {
                                    const priv = generatePrivateKey();
                                    update(['realitySettings', 'privateKey'], priv);
                                    if (!streamSettings.realitySettings?.shortIds) update(['realitySettings', 'shortIds'], [""]);
                                    alert("Key generated. Get Public Key via terminal: xray x25519 -i " + priv);
                                }}>
                                Gen Keys
                            </Button>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isClient ? (
                            <>
                                <div>
                                    <label className="label-xs text-purple-400">Public Key</label>
                                    <input className="input-base font-mono"
                                        value={streamSettings.realitySettings?.publicKey || ""}
                                        onChange={e => update(['realitySettings', 'publicKey'], e.target.value)} />
                                </div>
                                <div>
                                    <label className="label-xs text-purple-400">Short ID</label>
                                    <input className="input-base font-mono"
                                        value={streamSettings.realitySettings?.shortId || ""}
                                        onChange={e => update(['realitySettings', 'shortId'], e.target.value)} />
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="label-xs">Dest</label>
                                    <input className="input-base font-mono" placeholder="google.com:443"
                                        value={streamSettings.realitySettings?.dest || ""}
                                        onChange={e => update(['realitySettings', 'dest'], e.target.value)} />
                                </div>
                                <div>
                                    <label className="label-xs">Private Key</label>
                                    <input className="input-base font-mono text-emerald-400"
                                        value={streamSettings.realitySettings?.privateKey || ""}
                                        onChange={e => update(['realitySettings', 'privateKey'], e.target.value)} />
                                </div>
                            </>
                        )}
                        <div className="col-span-full">
                            <label className="label-xs">SNI / Server Names</label>
                            <input className="input-base font-mono"
                                placeholder={isClient ? "example.com" : "example.com, www.example.com"}
                                value={isClient 
                                    ? (streamSettings.realitySettings?.serverName || "")
                                    : (streamSettings.realitySettings?.serverNames || []).join(', ')}
                                onChange={e => {
                                    const val = e.target.value;
                                    update(['realitySettings', isClient ? 'serverName' : 'serverNames'], isClient ? val : val.split(',').map(s => s.trim()));
                                }} 
                            />
                        </div>
                    </div>
                </div>
            )}
            {/* WS Settings, TCP Settings, etc... можно добавить сюда же по принципу DRY */}
        </div>
    );
};