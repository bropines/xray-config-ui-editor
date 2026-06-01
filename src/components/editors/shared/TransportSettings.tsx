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
import { Select } from '../../ui/Select';
import { RealitySchema, TlsSchema } from '../../../core/xray/schemas';
import { SchemaForm } from '../../ui/SchemaForm';

interface TransportProps {
    streamSettings: any;
    onChange: (newSettings: any) => void;
    isClient?: boolean;
    errors?: Record<string, string | undefined>;
    protocol?: string;
}

export const TransportSettings = ({ streamSettings = {}, onChange, isClient = false, errors = {}, protocol }: TransportProps) => {
    const [tempPublicKey, setTempPublicKey] = useState<string | null>(null);

    // Map array/object errors to fields
    const parsedErrors: Record<string, string | undefined> = {};
    if (Array.isArray(errors)) {
        errors.forEach((err: any) => {
            if (err.field) {
                parsedErrors[err.field] = err.message;
            }
        });
    } else if (errors && typeof errors === 'object') {
        Object.assign(parsedErrors, errors);
    }

    const realityErrors: Record<string, string | undefined> = {};
    const tlsErrors: Record<string, string | undefined> = {};

    Object.entries(parsedErrors).forEach(([key, val]) => {
        if (key.startsWith('streamSettings.realitySettings.')) {
            const field = key.replace('streamSettings.realitySettings.', '');
            realityErrors[field] = val;
        } else if (key.startsWith('streamSettings.tlsSettings.')) {
            const field = key.replace('streamSettings.tlsSettings.', '');
            tlsErrors[field] = val;
        }
    });

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
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2.5">
                    <Icon name="GlobeHemisphereWest" size={18} /> Stream Settings
                </h4>
            </div>

            {/* --- MAIN SELECTORS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select 
                        label="Network"
                        hint="Transport protocol used to deliver data."
                        value={net} 
                        onChange={val => update(['network'], val)}
                        options={[
                            { value: "tcp", label: "TCP", description: "Standard reliable stream" },
                            { value: "ws", label: "WebSocket", description: "Standard web transport" },
                            { value: "xhttp", label: "XHTTP", description: "Next-gen HTTP transport" },
                            { value: "splithttp", label: "SplitHTTP", description: "High-performance split stream" },
                            { value: "grpc", label: "gRPC", description: "Modern RPC framework" },
                            { value: "http", label: "HTTP", description: "Standard HTTP proxying" },
                            { value: "quic", label: "QUIC", description: "UDP-based transport (HTTP/3)" },
                            { value: "kcp", label: "mKCP", description: "Aggressive UDP transport" },
                            { value: "raw", label: "RAW", description: "Raw socket access" },
                            { value: "httpupgrade", label: "HTTP Upgrade", description: "Modern WebSocket alternative" },
                        ]}
                    />
                    <Select 
                        label="Security"
                        hint="Encryption layer (TLS/Reality)."
                        value={sec} 
                        onChange={val => update(['security'], val)}
                        options={[
                            { value: "none", label: "NONE", description: "Plaintext (unsafe)" },
                            { value: "tls", label: "TLS", description: "Standard SSL/TLS encryption" },
                            ...(['vless', 'vmess', 'trojan', 'shadowsocks'].includes(protocol || '') ? [
                                { value: "reality", label: "REALITY", description: "Next-gen stealth encryption" }
                            ] : []),
                        ]}
                    />
            </div>

            <div className="border-t border-slate-800/50 my-2" />

            {/* --- NETWORK SPECIFIC SETTINGS --- */}

            {/* RAW (for Finalmask) */}
            {net === 'raw' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/50 pt-4">
                    <div className="col-span-full flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-400">RAW Socket Settings</span>
                        <Help>Used primarily with Finalmask for obfuscation.</Help>
                    </div>
                </div>
            )}

            {/* HTTP Upgrade */}
            {net === 'httpupgrade' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/50 pt-4">
                    <div className="col-span-full flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-400">HTTP Upgrade Configuration</span>
                    </div>
                    <div><label className="label-xs">Path</label><input className="input-base font-mono" placeholder="/" value={streamSettings.httpupgradeSettings?.path || ""} onChange={e => update(['httpupgradeSettings', 'path'], e.target.value)} /></div>
                    <div><label className="label-xs">Host</label><input className="input-base font-mono" placeholder="example.com" value={streamSettings.httpupgradeSettings?.host || ""} onChange={e => update(['httpupgradeSettings', 'host'], e.target.value)} /></div>
                </div>
            )}

            {/* TCP (RAW) */}
            {net === 'tcp' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/50 pt-4">
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
                        <Select 
                            label="Header Type (Obfuscation)"
                            value={streamSettings.tcpSettings?.header?.type || "none"}
                            onChange={val => update(['tcpSettings', 'header', 'type'], val)}
                            options={[
                                { value: "none", label: "None", description: "No obfuscation" },
                                { value: "http", label: "HTTP", description: "Simulate HTTP request" },
                            ]}
                        />

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/50 pt-4">
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
                        <Select 
                            label="Header Type"
                            value={streamSettings.kcpSettings?.header?.type || "none"}
                            onChange={val => update(['kcpSettings', 'header', 'type'], val)}
                            options={[
                                { value: "none", label: "None" },
                                { value: "srtp", label: "SRTP", description: "Video call simulation" },
                                { value: "utp", label: "uTP", description: "BitTorrent simulation" },
                                { value: "wechat-video", label: "WeChat", description: "WeChat video call" },
                                { value: "dtls", label: "DTLS", description: "DTLS 1.2 simulation" },
                                { value: "wireguard", label: "WireGuard", description: "WireGuard simulation" },
                            ]}
                        />
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
                        <Select 
                            label="Security"
                            value={streamSettings.quicSettings?.security || "none"}
                            onChange={val => update(['quicSettings', 'security'], val)}
                            options={[
                                { value: "none", label: "None" },
                                { value: "aes-128-gcm", label: "AES-128-GCM" },
                                { value: "chacha20-poly1305", label: "ChaCha20" },
                            ]}
                        />
                        <Select 
                            label="Header Type"
                            value={streamSettings.quicSettings?.header?.type || "none"}
                            onChange={val => update(['quicSettings', 'header', 'type'], val)}
                            options={[
                                { value: "none", label: "None" },
                                { value: "srtp", label: "SRTP" },
                                { value: "utp", label: "uTP" },
                                { value: "wechat-video", label: "WeChat" },
                                { value: "dtls", label: "DTLS" },
                                { value: "wireguard", label: "WireGuard" },
                            ]}
                        />
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
                        <Button variant="secondary" size="sm" className="!py-0.5 !px-2 !text-[10px]" onClick={handleGenKeys}>Gen Keys Pair</Button>
                    </div>

                    {!isClient && tempPublicKey && (
                        <div className="bg-emerald-900/20 border border-emerald-500/50 p-3 rounded-lg">
                            <label className="label-xs text-emerald-400">Generated Public Key</label>
                            <div className="flex gap-2">
                                <code className="flex-1 bg-black/30 p-2 rounded text-xs font-mono break-all text-emerald-200">{tempPublicKey}</code>
                                <Button variant="ghost" size="sm" icon="Copy" onClick={() => navigator.clipboard.writeText(tempPublicKey)} />
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2 mb-2">
                        {isClient ? (
                            <>
                                <Button variant="secondary" size="sm" className="!py-0.5 !px-2 !text-[10px]" onClick={() => update(['realitySettings', 'shortId'], generateRealityShortIds(1)[0])}>Gen Short ID</Button>
                                <Button variant="secondary" size="sm" className="!py-0.5 !px-2 !text-[10px]" onClick={() => update(['realitySettings', 'spiderX'], generateRealitySpiderX())}>Gen SpiderX Path</Button>
                            </>
                        ) : (
                            <Button variant="secondary" size="sm" className="!py-0.5 !px-2 !text-[10px]" onClick={() => update(['realitySettings', 'shortIds'], generateRealityShortIds(3))}>Gen Short IDs List</Button>
                        )}
                    </div>

                    <SchemaForm
                        schema={RealitySchema}
                        value={streamSettings.realitySettings || {}}
                        onChange={val => update(['realitySettings'], val)}
                        errors={realityErrors}
                        excludeKeys={
                            isClient
                                ? [
                                      'show',
                                      'target',
                                      'dest',
                                      'xver',
                                      'serverNames',
                                      'privateKey',
                                      'minClientVer',
                                      'maxClientVer',
                                      'maxTimeDiff',
                                      'shortIds',
                                      'mldsa65Seed',
                                      'limitFallbackUpload',
                                      'limitFallbackDownload',
                                      'mldsa65Verify',
                                      'password'
                                  ]
                                : [
                                      'serverName',
                                      'fingerprint',
                                      'password',
                                      'publicKey',
                                      'shortId',
                                      'mldsa65Verify',
                                      'minClientVer',
                                      'maxClientVer',
                                      'maxTimeDiff',
                                      'mldsa65Seed',
                                      'limitFallbackUpload',
                                      'limitFallbackDownload'
                                  ]
                        }
                    />
                </div>
            )}

            {/* 2. STANDARD TLS SETTINGS */}
            {sec === 'tls' && (
                <div className="space-y-4 border-t border-slate-800 pt-4 animate-in fade-in">
                    <div className="text-xs font-bold text-blue-400">Standard TLS Settings</div>

                    {!isClient && (
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 mb-4">
                            <label className="label-xs font-bold text-slate-400">Certificates (Paths)</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <input className="input-base text-xs font-mono" placeholder="Certificate file path (e.g. /path/to/fullchain.crt)"
                                    value={streamSettings.tlsSettings?.certificates?.[0]?.certificateFile || ""}
                                    onChange={e => update(['tlsSettings', 'certificates'], [{ ...streamSettings.tlsSettings?.certificates?.[0], certificateFile: e.target.value }])} />
                                <input className="input-base text-xs font-mono" placeholder="Private key file path (e.g. /path/to/private.key)"
                                    value={streamSettings.tlsSettings?.certificates?.[0]?.keyFile || ""}
                                    onChange={e => update(['tlsSettings', 'certificates'], [{ ...streamSettings.tlsSettings?.certificates?.[0], keyFile: e.target.value }])} />
                            </div>
                        </div>
                    )}

                    <SchemaForm
                        schema={TlsSchema}
                        value={streamSettings.tlsSettings || {}}
                        onChange={val => update(['tlsSettings'], val)}
                        errors={tlsErrors}
                        excludeKeys={[
                            'certificates',
                            'echSockopt',
                            ...(isClient ? ['rejectUnknownSni'] : ['allowInsecure', 'fingerprint'])
                        ]}
                    />
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