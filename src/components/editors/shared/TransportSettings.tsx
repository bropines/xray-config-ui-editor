import React, { useState } from 'react';
import { Icon } from '../../ui/Icon';
import { Button } from '../../ui/Button';
import { Help } from '../../ui/Help';
import { generateX25519Keys } from '../../../utils/crypto';
import { generateRealitySpiderX, generateRealityShortIds } from '../../../utils/generators';
import { SockoptEditor } from './SockoptEditor';
import { TagSelector } from '../../ui/TagSelector';
import { XhttpSettingsEditor } from './XhttpSettingsEditor';
import { FinalmaskEditor } from './FinalmaskEditor';
import { Switch } from '../../ui/Switch';

interface TransportProps {
    streamSettings: any;
    onChange: (newSettings: any) => void;
    isClient?: boolean;
    errors?: Record<string, string | undefined>;
}

export const TransportSettings = ({ streamSettings = {}, onChange, isClient = false, errors = {} }: TransportProps) => {
    const [tempPublicKey, setTempPublicKey] = useState<string | null>(null);

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
                        {["tcp", "ws", "xhttp", "splithttp", "grpc", "http", "quic", "kcp", "raw", "httpupgrade"].map(n =>
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

            <div className="border-t border-slate-800/50 my-2" />

            {/* --- NETWORK SPECIFIC SETTINGS --- */}

            {/* RAW (for Finalmask) */}
            {net === 'raw' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-4 animate-in fade-in">
                    <div className="col-span-full flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-400">RAW Socket Settings</span>
                        <Help>Used primarily with Finalmask for obfuscation.</Help>
                    </div>
                </div>
            )}

            {/* HTTP Upgrade */}
            {net === 'httpupgrade' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-4 animate-in fade-in">
                    <div className="col-span-full flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-400">HTTP Upgrade Configuration</span>
                    </div>
                    <div><label className="label-xs">Path</label><input className="input-base font-mono" placeholder="/" value={streamSettings.httpupgradeSettings?.path || ""} onChange={e => update(['httpupgradeSettings', 'path'], e.target.value)} /></div>
                    <div><label className="label-xs">Host</label><input className="input-base font-mono" placeholder="example.com" value={streamSettings.httpupgradeSettings?.host || ""} onChange={e => update(['httpupgradeSettings', 'host'], e.target.value)} /></div>
                </div>
            )}

            {/* TCP (RAW) */}
            {net === 'tcp' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-4 animate-in fade-in">
                    <div className="col-span-full flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-400">TCP (RAW) Settings</span>
                        {!isClient && (
                            <Switch
                                checked={streamSettings.tcpSettings?.acceptProxyProtocol || false}
                                onChange={checked => update(['tcpSettings', 'acceptProxyProtocol'], checked)}
                                label={<span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Accept PROXY Protocol</span>}
                            />
                        )}
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

            {(net === 'xhttp' || net === 'splithttp') && (
                <div className="border-t border-slate-800 pt-4">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">{net.toUpperCase()} Configuration</span>
                        <span className="text-[10px] text-white bg-blue-600 px-1.5 py-0.5 rounded font-bold animate-pulse">BEYOND REALITY</span>
                    </div>
                    <XhttpSettingsEditor
                        xhttpSettings={streamSettings.xhttpSettings || streamSettings.splithttpSettings}
                        onChange={v => update([net === 'splithttp' ? 'splithttpSettings' : 'xhttpSettings'], v)}
                        isClient={isClient}
                    />
                </div>
            )}

            {net === 'ws' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-4 animate-in fade-in">
                    <div className="col-span-full flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-indigo-400">WebSocket</span>
                        {!isClient && (
                            <Switch
                                checked={streamSettings.wsSettings?.acceptProxyProtocol || false}
                                onChange={checked => update(['wsSettings', 'acceptProxyProtocol'], checked)}
                                label={<span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Accept PROXY Protocol</span>}
                            />
                        )}
                    </div>
                    <div><label className="label-xs">Path</label><input className="input-base font-mono" value={streamSettings.wsSettings?.path || "/"} onChange={e => update(['wsSettings', 'path'], e.target.value)} /></div>
                    <div><label className="label-xs">Host</label><input className="input-base font-mono" placeholder="host.com" value={streamSettings.wsSettings?.headers?.Host || ""} onChange={e => update(['wsSettings', 'headers', 'Host'], e.target.value)} /></div>
                    <div><label className="label-xs">Heartbeat Period (s)</label><input className="input-base font-mono" type="number" placeholder="10" value={streamSettings.wsSettings?.heartbeatPeriod || ""} onChange={e => update(['wsSettings', 'heartbeatPeriod'], Number(e.target.value))} /></div>
                </div>
            )}

            {net === 'grpc' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-4 animate-in fade-in">
                    <div className="col-span-full text-xs font-bold text-indigo-400">gRPC</div>
                    <div className="md:col-span-2"><label className="label-xs">Service Name</label><input className="input-base font-mono" placeholder="GunService" value={streamSettings.grpcSettings?.serviceName || ""} onChange={e => update(['grpcSettings', 'serviceName'], e.target.value)} /></div>
                    <div><label className="label-xs">Authority</label><input className="input-base font-mono" placeholder="grpc.example.com" value={streamSettings.grpcSettings?.authority || ""} onChange={e => update(['grpcSettings', 'authority'], e.target.value)} /></div>
                    {isClient && (
                        <>
                            <div><label className="label-xs flex items-center">Multi Mode <Help>Experimental feature. Can improve performance by ~20%.</Help></label>
                                <Switch
                                    checked={streamSettings.grpcSettings?.multiMode || false}
                                    onChange={checked => update(['grpcSettings', 'multiMode'], checked)}
                                    label="Enable Multi Mode"
                                />
                            </div>
                            <div><label className="label-xs">User Agent</label><input className="input-base font-mono" placeholder="custom user agent" value={streamSettings.grpcSettings?.user_agent || ""} onChange={e => update(['grpcSettings', 'user_agent'], e.target.value)} /></div>
                            <div><label className="label-xs">Idle Timeout (s)</label><input className="input-base font-mono" type="number" placeholder="60" value={streamSettings.grpcSettings?.idle_timeout || ""} onChange={e => update(['grpcSettings', 'idle_timeout'], Number(e.target.value))} /></div>
                            <div><label className="label-xs">Health Check Timeout (s)</label><input className="input-base font-mono" type="number" placeholder="20" value={streamSettings.grpcSettings?.health_check_timeout || ""} onChange={e => update(['grpcSettings', 'health_check_timeout'], Number(e.target.value))} /></div>
                            <div><label className="label-xs">Initial Windows Size</label><input className="input-base font-mono" type="number" placeholder="0" value={streamSettings.grpcSettings?.initial_windows_size || ""} onChange={e => update(['grpcSettings', 'initial_windows_size'], Number(e.target.value))} /></div>
                            <div><label className="label-xs">Permit Without Stream</label>
                                <Switch
                                    checked={streamSettings.grpcSettings?.permit_without_stream || false}
                                    onChange={checked => update(['grpcSettings', 'permit_without_stream'], checked)}
                                    label="Enable"
                                />
                            </div>
                        </>
                    )}
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
                    <div><label className="label-xs">MTU</label><input className="input-base font-mono" type="number" placeholder="1350" value={streamSettings.kcpSettings?.mtu || ""} onChange={e => update(['kcpSettings', 'mtu'], Number(e.target.value))} /></div>
                    <div><label className="label-xs">TTI (ms)</label><input className="input-base font-mono" type="number" placeholder="50" value={streamSettings.kcpSettings?.tti || ""} onChange={e => update(['kcpSettings', 'tti'], Number(e.target.value))} /></div>
                    <div><label className="label-xs">Uplink Capacity (MB/s)</label><input className="input-base font-mono" type="number" placeholder="5" value={streamSettings.kcpSettings?.uplinkCapacity || ""} onChange={e => update(['kcpSettings', 'uplinkCapacity'], Number(e.target.value))} /></div>
                    <div><label className="label-xs">Downlink Capacity (MB/s)</label><input className="input-base font-mono" type="number" placeholder="20" value={streamSettings.kcpSettings?.downlinkCapacity || ""} onChange={e => update(['kcpSettings', 'downlinkCapacity'], Number(e.target.value))} /></div>
                    <div><label className="label-xs">Read Buffer Size (MB)</label><input className="input-base font-mono" type="number" placeholder="2" value={streamSettings.kcpSettings?.readBufferSize || ""} onChange={e => update(['kcpSettings', 'readBufferSize'], Number(e.target.value))} /></div>
                    <div><label className="label-xs">Write Buffer Size (MB)</label><input className="input-base font-mono" type="number" placeholder="2" value={streamSettings.kcpSettings?.writeBufferSize || ""} onChange={e => update(['kcpSettings', 'writeBufferSize'], Number(e.target.value))} /></div>
                    <div className="md:col-span-2">
                        <Switch
                            checked={streamSettings.kcpSettings?.congestion || false}
                            onChange={checked => update(['kcpSettings', 'congestion'], checked)}
                            label="Enable Congestion Control"
                        />
                    </div>
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
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-purple-400 flex items-center">
                            REALITY Keys
                            <Help>Reality: A TLS extension for mimicking popular websites to bypass firewalls.</Help>
                        </span>
                        <Button variant="secondary" className="px-2 py-1 text-[10px]" onClick={handleGenKeys}>Gen Keys Pair</Button>
                    </div>

                    {!isClient && tempPublicKey && (
                        <div className="bg-emerald-900/20 border border-emerald-500/50 p-3 rounded-lg">
                            <label className="label-xs text-emerald-400">Generated Public Key</label>
                            <div className="flex gap-2">
                                <code className="flex-1 bg-black/30 p-2 rounded text-xs font-mono break-all text-emerald-200">{tempPublicKey}</code>
                                <Button variant="ghost" icon="Copy" onClick={() => navigator.clipboard.writeText(tempPublicKey)} />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isClient ? (
                            <>
                                {/* Public Key — единственное обязательное поле для клиента */}
                                <div>
                                    <label className="label-xs text-purple-400">Public Key</label>
                                    <input
                                        className={`input-base font-mono ${errors.reality ? 'border-rose-500 bg-rose-500/10 focus:border-rose-500' : ''}`}
                                        value={streamSettings.realitySettings?.publicKey || ""}
                                        onChange={e => update(['realitySettings', 'publicKey'], e.target.value)}
                                    />
                                    {errors.reality && (
                                        <span className="text-[10px] text-rose-500 mt-1 block">{errors.reality}</span>
                                    )}
                                </div>
                                <div>
                                    <label className="label-xs text-purple-400 flex items-center justify-between">
                                        Short ID
                                        <button onClick={() => update(['realitySettings', 'shortId'], generateRealityShortIds(1)[0])} className="text-[10px] text-slate-500 hover:text-indigo-400">Gen</button>
                                    </label>
                                    <input className="input-base font-mono" value={streamSettings.realitySettings?.shortId || ""} onChange={e => update(['realitySettings', 'shortId'], e.target.value)} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="label-xs text-purple-400 flex items-center justify-between">
                                        SpiderX
                                        <button onClick={() => update(['realitySettings', 'spiderX'], generateRealitySpiderX())} className="text-[10px] text-slate-500 hover:text-indigo-400">Gen</button>
                                    </label>
                                    <input className="input-base font-mono" value={streamSettings.realitySettings?.spiderX || ""} onChange={e => update(['realitySettings', 'spiderX'], e.target.value)} />
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="label-xs">Dest</label>
                                    <input className="input-base font-mono" placeholder="google.com:443" value={streamSettings.realitySettings?.dest || ""} onChange={e => update(['realitySettings', 'dest'], e.target.value)} />
                                </div>
                                <div>
                                    <label className="label-xs">Private Key</label>
                                    <input className="input-base font-mono text-emerald-400" value={streamSettings.realitySettings?.privateKey || ""} onChange={e => update(['realitySettings', 'privateKey'], e.target.value)} />
                                </div>
                                <div>
                                    <label className="label-xs flex items-center justify-between">
                                        Short IDs (CSV)
                                        <button onClick={() => update(['realitySettings', 'shortIds'], generateRealityShortIds(3))} className="text-[10px] text-slate-500 hover:text-indigo-400">Gen List</button>
                                    </label>
                                    <input className="input-base font-mono" placeholder="a1b2, c3d4" value={(streamSettings.realitySettings?.shortIds || []).join(', ')} onChange={e => update(['realitySettings', 'shortIds'], e.target.value.split(',').map((s: string) => s.trim()))} />
                                </div>
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
                                <label className="label-xs flex items-center">
                                    uTLS Fingerprint
                                    <Help>TLS fingerprint to mimic specific browsers (Chrome, Firefox, etc.) to avoid detection.</Help>
                                </label>
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
                                label={<span className="flex items-center">ALPN <Help>Application-Layer Protocol Negotiation (e.g. h2, http/1.1).</Help></span>}
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
                                <label className="label-xs flex items-center">
                                    uTLS Fingerprint
                                    <Help>TLS client fingerprint to mimic a browser.</Help>
                                </label>
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
                                <Switch
                                    checked={streamSettings.tlsSettings?.allowInsecure || false}
                                    onChange={checked => update(['tlsSettings', 'allowInsecure'], checked)}
                                    label="Allow Insecure"
                                />
                            )}
                            <Switch
                                checked={streamSettings.tlsSettings?.rejectUnknownSni || false}
                                onChange={checked => update(['tlsSettings', 'rejectUnknownSni'], checked)}
                                label="Reject Unknown SNI"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* FINALMASK (UDP/TCP Noise & QUIC) */}
            <FinalmaskEditor
                finalmask={streamSettings.finalmask}
                onChange={v => {
                    if (v === null) {
                        const newSettings = { ...streamSettings };
                        delete newSettings.finalmask;
                        onChange(newSettings);
                    } else {
                        update(['finalmask'], v);
                    }
                }}
            />

            {/* --- SOCKOPT (Advanced) --- */}
            <SockoptEditor
                sockopt={streamSettings.sockopt}
                onChange={v => {
                    if (v === null) {
                        const newSettings = { ...streamSettings };
                        delete newSettings.sockopt;
                        onChange(newSettings);
                    } else {
                        update(['sockopt'], v);
                    }
                }}
                isClient={isClient}
            />
        </div>
    );
};