import React, { useState } from 'react';
import { Icon } from '../../ui/Icon';
import { Button } from '../../ui/Button';
import { generateX25519Keys } from '../../../utils/crypto';
import { SockoptEditor } from './SockoptEditor';

interface TransportProps {
    streamSettings: any;
    onChange: (newSettings: any) => void;
    isClient?: boolean; // Outbound = true, Inbound = false
}

export const TransportSettings = ({ streamSettings = {}, onChange, isClient = false }: TransportProps) => {
    // Локальный стейт для отображения публичного ключа при генерации на сервере
    const [tempPublicKey, setTempPublicKey] = useState<string | null>(null);
    
    // Стейт для скрытия/показа Advanced настроек (Sockopt)
    const [showAdvanced, setShowAdvanced] = useState(false);

    const update = (path: string[], value: any) => {
        // Эмуляция глубокого обновления
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

    const handleGenKeys = () => {
        const keys = generateX25519Keys();
        
        if (isClient) {
            // Клиенту обычно нужен Public Key
            update(['realitySettings', 'privateKey'], keys.privateKey);
            update(['realitySettings', 'publicKey'], keys.publicKey);
        } else {
            // Серверу нужен Private Key
            update(['realitySettings', 'privateKey'], keys.privateKey);
            // Сохраняем Public Key чтобы показать пользователю
            setTempPublicKey(keys.publicKey);
            
            // Если нет ShortId, генерируем один
            if (!streamSettings.realitySettings?.shortIds) {
                update(['realitySettings', 'shortIds'], [Math.random().toString(16).substring(2, 10)]);
            }
        }
    };

    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4 mt-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                    <Icon name="Network" /> Stream Settings
                </h4>
                <button 
                    onClick={() => setShowAdvanced(!showAdvanced)} 
                    className="text-[10px] text-indigo-400 hover:text-white transition-colors uppercase font-bold"
                >
                    {showAdvanced ? "Hide Advanced" : "Show Advanced"}
                </button>
            </div>

            {/* --- MAIN SELECTORS --- */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label-xs">Network</label>
                    <select className="input-base"
                        value={net} onChange={e => update(['network'], e.target.value)}>
                        {["tcp", "ws", "xhttp", "grpc", "http", "quic", "kcp"].map(n => 
                            <option key={n} value={n}>{n.toUpperCase()}</option>
                        )}
                    </select>
                </div>
                <div>
                    <label className="label-xs">Security</label>
                    <select className="input-base"
                        value={sec} onChange={e => update(['security'], e.target.value)}>
                        {["none", "tls", "reality"].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                    </select>
                </div>
            </div>

            {/* --- PROTOCOL SPECIFIC SETTINGS --- */}

            {/* XHTTP */}
            {net === 'xhttp' && (
                <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4 animate-in fade-in">
                    <div className="col-span-full flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-400">XHTTP Configuration</span>
                        <span className="text-[10px] text-slate-500 bg-slate-800 px-1 rounded">New!</span>
                    </div>

                    <div>
                        <label className="label-xs">Mode</label>
                        <select 
                            className="input-base"
                            value={streamSettings.xhttpSettings?.mode || "auto"}
                            onChange={e => update(['xhttpSettings', 'mode'], e.target.value)}
                        >
                            <option value="auto">Auto</option>
                            <option value="stream">Stream (Download)</option>
                            <option value="packet">Packet</option>
                        </select>
                    </div>

                    <div>
                        <label className="label-xs">Path</label>
                        <input 
                            className="input-base font-mono"
                            placeholder="/"
                            value={streamSettings.xhttpSettings?.path || ""}
                            onChange={e => update(['xhttpSettings', 'path'], e.target.value)}
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="label-xs">Host (Optional)</label>
                        <input 
                            className="input-base font-mono"
                            placeholder="example.com"
                            value={streamSettings.xhttpSettings?.host || ""}
                            onChange={e => update(['xhttpSettings', 'host'], e.target.value)}
                        />
                    </div>
                    
                    <div className="col-span-2">
                        <label className="label-xs">Extra Headers (JSON)</label>
                        <input 
                            className="input-base font-mono text-xs"
                            placeholder='{"no-sse": "true"}'
                            value={JSON.stringify(streamSettings.xhttpSettings?.extra || {})}
                            onChange={e => {
                                try {
                                    update(['xhttpSettings', 'extra'], JSON.parse(e.target.value));
                                } catch (err) {
                                    // Игнорируем ошибки ввода пока юзер печатает
                                }
                            }}
                        />
                    </div>
                </div>
            )}

            {/* WEBSOCKET */}
            {net === 'ws' && (
                <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4 animate-in fade-in">
                    <div className="col-span-2 text-xs font-bold text-indigo-400">WebSocket</div>
                    <div>
                        <label className="label-xs">Path</label>
                        <input className="input-base font-mono"
                            value={streamSettings.wsSettings?.path || "/"}
                            onChange={e => update(['wsSettings', 'path'], e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label-xs">Host</label>
                        <input className="input-base font-mono"
                            placeholder="host.com"
                            value={streamSettings.wsSettings?.headers?.Host || ""}
                            onChange={e => update(['wsSettings', 'headers', 'Host'], e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* GRPC */}
            {net === 'grpc' && (
                <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4 animate-in fade-in">
                    <div className="col-span-2 text-xs font-bold text-indigo-400">gRPC</div>
                    <div className="col-span-2">
                        <label className="label-xs">Service Name</label>
                        <input className="input-base font-mono"
                            placeholder="GunService"
                            value={streamSettings.grpcSettings?.serviceName || ""}
                            onChange={e => update(['grpcSettings', 'serviceName'], e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* mKCP */}
            {net === 'kcp' && (
                <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4 animate-in fade-in">
                    <div className="col-span-2 text-xs font-bold text-indigo-400">mKCP</div>
                    <div>
                        <label className="label-xs">Seed (Obfuscation)</label>
                        <input className="input-base font-mono"
                            placeholder="password"
                            value={streamSettings.kcpSettings?.seed || ""}
                            onChange={e => update(['kcpSettings', 'seed'], e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label-xs">MTU</label>
                        <input type="number" className="input-base font-mono"
                            placeholder="1350"
                            value={streamSettings.kcpSettings?.mtu || 1350}
                            onChange={e => update(['kcpSettings', 'mtu'], parseInt(e.target.value))}
                        />
                    </div>
                </div>
            )}

            {/* QUIC */}
            {net === 'quic' && (
                <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4 animate-in fade-in">
                    <div className="col-span-2 text-xs font-bold text-indigo-400">QUIC</div>
                    <div>
                        <label className="label-xs">Security</label>
                        <select className="input-base"
                            value={streamSettings.quicSettings?.security || "none"}
                            onChange={e => update(['quicSettings', 'security'], e.target.value)}
                        >
                            <option value="none">None</option>
                            <option value="aes-128-gcm">AES-128-GCM</option>
                            <option value="chacha20-poly1305">ChaCha20</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-xs">Key</label>
                        <input className="input-base font-mono"
                            placeholder="key"
                            value={streamSettings.quicSettings?.key || ""}
                            onChange={e => update(['quicSettings', 'key'], e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* --- SECURITY SETTINGS --- */}

            {/* REALITY */}
            {sec === 'reality' && (
                <div className="space-y-4 border-t border-slate-800 pt-4 animate-in fade-in">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-purple-400">REALITY</span>
                        
                        <Button variant="secondary" className="px-2 py-1 text-[10px]" onClick={handleGenKeys}>
                            Gen Keys Pair
                        </Button>
                    </div>
                    
                    {/* Показываем сгенерированный Public Key, если мы на сервере */}
                    {!isClient && tempPublicKey && (
                        <div className="bg-emerald-900/20 border border-emerald-500/50 p-3 rounded-lg animate-in zoom-in-95">
                            <label className="label-xs text-emerald-400">Generated Public Key (Copy to Client!)</label>
                            <div className="flex gap-2">
                                <code className="flex-1 bg-black/30 p-2 rounded text-xs font-mono break-all text-emerald-200 selection:bg-emerald-500/30">
                                    {tempPublicKey}
                                </code>
                                <Button variant="ghost" icon="Copy" onClick={() => navigator.clipboard.writeText(tempPublicKey)} />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isClient ? (
                            <>
                                <div>
                                    <label className="label-xs text-purple-400">Public Key (Required)</label>
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
                                    <label className="label-xs">Dest (Fallback)</label>
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
                                    update(['realitySettings', isClient ? 'serverName' : 'serverNames'], isClient ? val : val.split(',').map((s: string) => s.trim()));
                                }} 
                            />
                        </div>
                    </div>
                </div>
            )}
            
            {/* TLS */}
            {sec === 'tls' && (
                <div className="space-y-4 border-t border-slate-800 pt-4 animate-in fade-in">
                    <div className="text-xs font-bold text-blue-400">TLS Settings</div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="label-xs">Server Name (SNI)</label>
                            <input className="input-base font-mono"
                                value={streamSettings.tlsSettings?.serverName || ""}
                                onChange={e => update(['tlsSettings', 'serverName'], e.target.value)}
                            />
                        </div>
                        {isClient && (
                            <div className="flex items-center gap-2 mt-2">
                                <input type="checkbox" className="w-4 h-4 rounded bg-slate-950 border-slate-700"
                                    checked={streamSettings.tlsSettings?.allowInsecure || false}
                                    onChange={e => update(['tlsSettings', 'allowInsecure'], e.target.checked)}
                                />
                                <label className="text-sm text-slate-300">Allow Insecure</label>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- SOCKOPT (Advanced) --- */}
            {showAdvanced && (
                <SockoptEditor 
                    sockopt={streamSettings.sockopt} 
                    onChange={v => update(['sockopt'], v)} 
                    isClient={isClient} 
                />
            )}
        </div>
    );
};