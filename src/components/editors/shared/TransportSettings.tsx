import React, { useState } from 'react';
import { Icon } from '../../ui/Icon';
import { Button } from '../../ui/Button';
import { Help } from '../../ui/Help';
import { generateX25519Keys } from '../../../utils/crypto';
import { SockoptEditor } from './SockoptEditor';
import { TagSelector } from '../../ui/TagSelector';

interface TransportProps {
    streamSettings: any;
    onChange: (newSettings: any) => void;
    isClient?: boolean;
}

export const TransportSettings = ({ streamSettings = {}, onChange, isClient = false }: TransportProps) => {
    const [tempPublicKey, setTempPublicKey] = useState<string | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const update = (path: string[], value: any) => {
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
            update(['realitySettings', 'privateKey'], keys.privateKey);
            update(['realitySettings', 'publicKey'], keys.publicKey);
        } else {
            update(['realitySettings', 'privateKey'], keys.privateKey);
            setTempPublicKey(keys.publicKey);
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="label-xs flex items-center">
                        Network 
                        <Help>Transport protocol used to deliver data.</Help>
                    </label>
                    <select className="input-base"
                        value={net} onChange={e => update(['network'], e.target.value)}>
                        {["tcp", "ws", "xhttp", "grpc", "http", "quic", "kcp"].map(n => 
                            <option key={n} value={n}>{n.toUpperCase()}</option>
                        )}
                    </select>
                </div>
                <div>
                    <label className="label-xs flex items-center">
                        Security
                        <Help>TLS/XTLS/Reality encryption layer.</Help>
                    </label>
                    <select className="input-base"
                        value={sec} onChange={e => update(['security'], e.target.value)}>
                        {["none", "tls", "reality"].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                    </select>
                </div>
            </div>

            {/* --- NETWORK SPECIFIC SETTINGS --- */}
            
            {/* TCP (RAW) - HTTP Obfuscation */}
            {net === 'tcp' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-4 animate-in fade-in">
                    <div className="col-span-full flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">TCP Settings</span>
                    </div>
                    <div>
                        <label className="label-xs">Header Type (Obfuscation)</label>
                        <select className="input-base"
                            value={streamSettings.tcpSettings?.header?.type || "none"}
                            onChange={e => update(['tcpSettings', 'header', 'type'], e.target.value)}
                        >
                            <option value="none">None</option>
                            <option value="http">HTTP</option>
                        </select>
                    </div>
                    {/* HTTP Request (Only shown if type is http) */}
                    {streamSettings.tcpSettings?.header?.type === 'http' && (
                        <div className="md:col-span-2 space-y-2 bg-slate-950 p-3 rounded border border-slate-800">
                            <label className="label-xs text-yellow-500">HTTP Request (Legacy Obfuscation)</label>
                            <div className="grid grid-cols-2 gap-2">
                                <input className="input-base text-xs font-mono" placeholder="Path (e.g. /)" 
                                    value={streamSettings.tcpSettings?.header?.request?.path?.[0] || "/"}
                                    onChange={e => update(['tcpSettings', 'header', 'request', 'path'], [e.target.value])} />
                                <input className="input-base text-xs font-mono" placeholder="Host (e.g. bing.com)" 
                                    value={streamSettings.tcpSettings?.header?.request?.headers?.Host?.[0] || ""}
                                    onChange={e => update(['tcpSettings', 'header', 'request', 'headers', 'Host'], [e.target.value])} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {net === 'xhttp' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-4 animate-in fade-in">
                    <div className="col-span-full flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-400">XHTTP Configuration</span>
                        <span className="text-[10px] text-slate-500 bg-slate-800 px-1 rounded">New!</span>
                    </div>
                    <div>
                        <label className="label-xs flex items-center">Mode <Help>Auto is recommended.</Help></label>
                        <select className="input-base" value={streamSettings.xhttpSettings?.mode || "auto"} onChange={e => update(['xhttpSettings', 'mode'], e.target.value)}>
                            <option value="auto">Auto</option><option value="stream">Stream</option><option value="packet">Packet</option>
                        </select>
                    </div>
                    <div><label className="label-xs">Path</label><input className="input-base font-mono" placeholder="/" value={streamSettings.xhttpSettings?.path || ""} onChange={e => update(['xhttpSettings', 'path'], e.target.value)} /></div>
                    <div className="md:col-span-2"><label className="label-xs">Host</label><input className="input-base font-mono" placeholder="example.com" value={streamSettings.xhttpSettings?.host || ""} onChange={e => update(['xhttpSettings', 'host'], e.target.value)} /></div>
                </div>
            )}

            {net === 'ws' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-4 animate-in fade-in">
                    <div className="col-span-full text-xs font-bold text-indigo-400">WebSocket</div>
                    <div><label className="label-xs">Path</label><input className="input-base font-mono" value={streamSettings.wsSettings?.path || "/"} onChange={e => update(['wsSettings', 'path'], e.target.value)} /></div>
                    <div><label className="label-xs">Host</label><input className="input-base font-mono" placeholder="host.com" value={streamSettings.wsSettings?.headers?.Host || ""} onChange={e => update(['wsSettings', 'headers', 'Host'], e.target.value)} /></div>
                </div>
            )}

            {net === 'grpc' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-4 animate-in fade-in">
                    <div className="col-span-full text-xs font-bold text-indigo-400">gRPC</div>
                    <div className="md:col-span-2"><label className="label-xs">Service Name</label><input className="input-base font-mono" placeholder="GunService" value={streamSettings.grpcSettings?.serviceName || ""} onChange={e => update(['grpcSettings', 'serviceName'], e.target.value)} /></div>
                </div>
            )}

            {net === 'kcp' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-4 animate-in fade-in">
                    <div className="col-span-full text-xs font-bold text-indigo-400">mKCP</div>
                    <div>
                        <label className="label-xs">Header Type</label>
                        <select className="input-base" 
                            value={streamSettings.kcpSettings?.header?.type || "none"}
                            onChange={e => update(['kcpSettings', 'header', 'type'], e.target.value)}
                        >
                            <option value="none">None</option>
                            <option value="srtp">SRTP (Video)</option>
                            <option value="utp">uTP (Torrent)</option>
                            <option value="wechat-video">WeChat</option>
                            <option value="dtls">DTLS</option>
                            <option value="wireguard">WireGuard</option>
                        </select>
                    </div>
                    <div><label className="label-xs">Seed</label><input className="input-base font-mono" placeholder="password" value={streamSettings.kcpSettings?.seed || ""} onChange={e => update(['kcpSettings', 'seed'], e.target.value)} /></div>
                </div>
            )}

            {net === 'quic' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-4 animate-in fade-in">
                    <div className="col-span-full text-xs font-bold text-indigo-400">QUIC</div>
                    <div>
                        <label className="label-xs">Security</label>
                        <select className="input-base" value={streamSettings.quicSettings?.security || "none"} onChange={e => update(['quicSettings', 'security'], e.target.value)}>
                            <option value="none">None</option><option value="aes-128-gcm">AES-128-GCM</option><option value="chacha20-poly1305">ChaCha20</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-xs">Header Type</label>
                        <select className="input-base"
                            value={streamSettings.quicSettings?.header?.type || "none"}
                            onChange={e => update(['quicSettings', 'header', 'type'], e.target.value)}
                        >
                            <option value="none">None</option>
                            <option value="srtp">SRTP</option>
                            <option value="utp">uTP</option>
                            <option value="wechat-video">WeChat</option>
                            <option value="dtls">DTLS</option>
                            <option value="wireguard">WireGuard</option>
                        </select>
                    </div>
                    <div className="md:col-span-2"><label className="label-xs">Key</label><input className="input-base font-mono" placeholder="key" value={streamSettings.quicSettings?.key || ""} onChange={e => update(['quicSettings', 'key'], e.target.value)} /></div>
                </div>
            )}


            {/* --- SECURITY SETTINGS --- */}

            {/* 1. REALITY SETTINGS */}
            {sec === 'reality' && (
                <div className="space-y-4 border-t border-slate-800 pt-4 animate-in fade-in">
                    <div className="flex justify-between items-center"><span className="text-xs font-bold text-purple-400">REALITY Keys</span><Button variant="secondary" className="px-2 py-1 text-[10px]" onClick={handleGenKeys}>Gen Keys Pair</Button></div>
                    
                    {!isClient && tempPublicKey && (
                        <div className="bg-emerald-900/20 border border-emerald-500/50 p-3 rounded-lg"><label className="label-xs text-emerald-400">Generated Public Key</label><div className="flex gap-2"><code className="flex-1 bg-black/30 p-2 rounded text-xs font-mono break-all text-emerald-200">{tempPublicKey}</code><Button variant="ghost" icon="Copy" onClick={() => navigator.clipboard.writeText(tempPublicKey)} /></div></div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isClient ? (
                            <>
                                <div><label className="label-xs text-purple-400">Public Key</label><input className="input-base font-mono" value={streamSettings.realitySettings?.publicKey || ""} onChange={e => update(['realitySettings', 'publicKey'], e.target.value)} /></div>
                                <div><label className="label-xs text-purple-400">Short ID</label><input className="input-base font-mono" value={streamSettings.realitySettings?.shortId || ""} onChange={e => update(['realitySettings', 'shortId'], e.target.value)} /></div>
                                <div className="md:col-span-2"><label className="label-xs text-purple-400">SpiderX</label><input className="input-base font-mono" value={streamSettings.realitySettings?.spiderX || ""} onChange={e => update(['realitySettings', 'spiderX'], e.target.value)} /></div>
                            </>
                        ) : (
                            <>
                                <div><label className="label-xs">Dest</label><input className="input-base font-mono" placeholder="google.com:443" value={streamSettings.realitySettings?.dest || ""} onChange={e => update(['realitySettings', 'dest'], e.target.value)} /></div>
                                <div><label className="label-xs">Private Key</label><input className="input-base font-mono text-emerald-400" value={streamSettings.realitySettings?.privateKey || ""} onChange={e => update(['realitySettings', 'privateKey'], e.target.value)} /></div>
                                <div><label className="label-xs">Short IDs (CSV)</label><input className="input-base font-mono" placeholder="a1b2, c3d4" value={(streamSettings.realitySettings?.shortIds || []).join(', ')} onChange={e => update(['realitySettings', 'shortIds'], e.target.value.split(',').map((s:string) => s.trim()))} /></div>
                            </>
                        )}
                        
                        <div className="md:col-span-2">
                            <label className="label-xs flex items-center">
                                Server Names (SNI) <Help>Allowed domains for Reality.</Help>
                            </label>
                            <input className="input-base font-mono" 
                                placeholder="example.com, www.example.com"
                                value={isClient ? (streamSettings.realitySettings?.serverName || "") : (streamSettings.realitySettings?.serverNames || []).join(', ')} 
                                onChange={e => { 
                                    const val = e.target.value; 
                                    update(['realitySettings', isClient ? 'serverName' : 'serverNames'], isClient ? val : val.split(',').map((s: string) => s.trim())); 
                                }} 
                            />
                        </div>

                        {isClient && (
                            <div>
                                <label className="label-xs">uTLS Fingerprint</label>
                                <select className="input-base" 
                                    value={streamSettings.realitySettings?.fingerprint || ""} 
                                    onChange={e => update(['realitySettings', 'fingerprint'], e.target.value)}>
                                    <option value="">None</option>
                                    <option value="chrome">Chrome</option>
                                    <option value="firefox">Firefox</option>
                                    <option value="safari">Safari</option>
                                    <option value="ios">iOS</option>
                                    <option value="android">Android</option>
                                    <option value="edge">Edge</option>
                                    <option value="360">360</option>
                                    <option value="qq">QQ</option>
                                    <option value="random">Random</option>
                                    <option value="randomized">Randomized</option>
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* 2. STANDARD TLS SETTINGS */}
            {sec === 'tls' && (
                <div className="space-y-4 border-t border-slate-800 pt-4 animate-in fade-in">
                    <div className="text-xs font-bold text-blue-400">Standard TLS Settings</div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="label-xs flex items-center">Server Name (SNI) <Help>Target domain.</Help></label>
                            <input className="input-base font-mono" value={streamSettings.tlsSettings?.serverName || ""} onChange={e => update(['tlsSettings', 'serverName'], e.target.value)} />
                        </div>

                        <div className="md:col-span-2">
                            <TagSelector 
                                label="ALPN" 
                                availableTags={['h2', 'http/1.1', 'h3']} 
                                selected={streamSettings.tlsSettings?.alpn || []} 
                                onChange={v => update(['tlsSettings', 'alpn'], v)} 
                                multi={true} 
                                placeholder="Custom ALPN..."
                            />
                        </div>

                        {!isClient && (
                            <div className="md:col-span-2">
                                <label className="label-xs">Certificates (Paths)</label>
                                <div className="flex gap-2 mb-2">
                                    <input className="input-base text-xs flex-1" placeholder="/path/to/fullchain.crt" 
                                        value={streamSettings.tlsSettings?.certificates?.[0]?.certificateFile || ""} 
                                        onChange={e => update(['tlsSettings', 'certificates'], [{ ...streamSettings.tlsSettings?.certificates?.[0], certificateFile: e.target.value }])} />
                                    <input className="input-base text-xs flex-1" placeholder="/path/to/private.key" 
                                        value={streamSettings.tlsSettings?.certificates?.[0]?.keyFile || ""} 
                                        onChange={e => update(['tlsSettings', 'certificates'], [{ ...streamSettings.tlsSettings?.certificates?.[0], keyFile: e.target.value }])} />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="label-xs">Min Version</label>
                            <select className="input-base" 
                                value={streamSettings.tlsSettings?.minVersion || "1.2"} 
                                onChange={e => update(['tlsSettings', 'minVersion'], e.target.value)}>
                                <option value="1.0">1.0</option><option value="1.1">1.1</option><option value="1.2">1.2</option><option value="1.3">1.3</option>
                            </select>
                        </div>
                        <div>
                            <label className="label-xs">Max Version</label>
                            <select className="input-base" 
                                value={streamSettings.tlsSettings?.maxVersion || "1.3"} 
                                onChange={e => update(['tlsSettings', 'maxVersion'], e.target.value)}>
                                <option value="1.0">1.0</option><option value="1.1">1.1</option><option value="1.2">1.2</option><option value="1.3">1.3</option>
                            </select>
                        </div>

                        {isClient && (
                            <div className="md:col-span-2">
                                <label className="label-xs">uTLS Fingerprint</label>
                                <select className="input-base" 
                                    value={streamSettings.tlsSettings?.fingerprint || ""} 
                                    onChange={e => update(['tlsSettings', 'fingerprint'], e.target.value)}>
                                    <option value="">None (Go TLS)</option>
                                    <option value="chrome">Chrome</option>
                                    <option value="firefox">Firefox</option>
                                    <option value="safari">Safari</option>
                                    <option value="ios">iOS</option>
                                    <option value="android">Android</option>
                                    <option value="edge">Edge</option>
                                    <option value="360">360</option>
                                    <option value="qq">QQ</option>
                                    <option value="random">Random</option>
                                    <option value="randomized">Randomized</option>
                                </select>
                            </div>
                        )}

                        <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-slate-950 p-3 rounded-lg border border-slate-800">
                            {isClient && (
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 rounded bg-slate-900 border-slate-700" 
                                        checked={streamSettings.tlsSettings?.allowInsecure || false} 
                                        onChange={e => update(['tlsSettings', 'allowInsecure'], e.target.checked)} />
                                    <span className="text-xs text-slate-300">Allow Insecure</span>
                                </label>
                            )}
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 rounded bg-slate-900 border-slate-700" 
                                    checked={streamSettings.tlsSettings?.rejectUnknownSni || false} 
                                    onChange={e => update(['tlsSettings', 'rejectUnknownSni'], e.target.checked)} />
                                <span className="text-xs text-slate-300">Reject Unknown SNI</span>
                            </label>
                        </div>
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