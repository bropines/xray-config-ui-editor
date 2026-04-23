import React from 'react';
import { TagSelector } from '../../ui/TagSelector';
import { useConfigStore } from '../../../store/configStore';

export const SockoptEditor = ({ sockopt, onChange, isClient }: any) => {
    const local = sockopt || {};
    const config = useConfigStore(state => state.config);
    const outboundTags = (config?.outbounds || []).map((o: any) => o.tag).filter(Boolean);

    const update = (field: string, val: any) => {
        // Чистим пустые/NaN значения чтобы не мусорить в JSON
        if (val === "" || Number.isNaN(val)) {
            const newObj = { ...local };
            delete newObj[field];
            onChange(newObj);
        } else {
            onChange({ ...local, [field]: val });
        }
    };

    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4 mt-4 animate-in fade-in slide-in-from-top-2">
            <h4 className="label-xs border-b border-slate-700/50 pb-2 mb-2 text-indigo-400">Global Socket Options (Sockopt)</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* GENERAL / ROUTING */}
                <div>
                    <label className="label-xs">Mark (Routing)</label>
                    <input type="number" className="input-base font-mono" 
                        placeholder="255"
                        value={local.mark || ""} 
                        onChange={e => update('mark', parseInt(e.target.value))} 
                    />
                </div>

                <div>
                    <label className="label-xs">Interface (Bind)</label>
                    <input className="input-base font-mono" 
                        placeholder="eth0 or wg0"
                        value={local.interface || ""} 
                        onChange={e => update('interface', e.target.value)} 
                    />
                </div>

                {/* INBOUND ONLY */}
                {!isClient && (
                    <>
                        <div>
                            <label className="label-xs text-rose-300">TProxy (Linux)</label>
                            <select className="input-base"
                                value={local.tproxy || "off"}
                                onChange={e => update('tproxy', e.target.value)}
                            >
                                <option value="off">Off</option>
                                <option value="tproxy">TProxy</option>
                                <option value="redirect">Redirect</option>
                            </select>
                        </div>
                        <div>
                            <label className="label-xs text-indigo-300">Accept PROXY Protocol</label>
                            <select className="input-base border-indigo-500/30"
                                value={local.acceptProxyProtocol === true ? "true" : "false"}
                                onChange={e => update('acceptProxyProtocol', e.target.value === "true")}
                            >
                                <option value="false">Disabled</option>
                                <option value="true">Enabled</option>
                            </select>
                        </div>
                        <div>
                            <label className="label-xs">V6 Only (Bind ::)</label>
                            <select className="input-base"
                                value={local.v6only === true ? "true" : "false"}
                                onChange={e => update('v6only', e.target.value === "true")}
                            >
                                <option value="false">Disabled</option>
                                <option value="true">Enabled</option>
                            </select>
                        </div>
                    </>
                )}

                {/* OUTBOUND ONLY */}
                {isClient && (
                    <>
                        <div className="md:col-span-2">
                            <TagSelector 
                                label="Dialer Proxy (Outbound Tag)"
                                availableTags={outboundTags}
                                selected={local.dialerProxy || ""}
                                onChange={v => update('dialerProxy', v as string)}
                                multi={false}
                                placeholder="Select outbound..."
                            />
                        </div>
                        <div>
                            <label className="label-xs">Domain Strategy</label>
                            <select className="input-base"
                                value={local.domainStrategy || "AsIs"}
                                onChange={e => update('domainStrategy', e.target.value)}
                            >
                                <option value="AsIs">AsIs</option>
                                <option value="UseIP">UseIP</option>
                                <option value="UseIPv4">UseIPv4</option>
                                <option value="UseIPv6">UseIPv6</option>
                                <option value="UseIPv4v6">UseIPv4v6</option>
                                <option value="UseIPv6v4">UseIPv6v4</option>
                            </select>
                        </div>
                    </>
                )}

                {/* TCP ADVANCED / KERNEL */}
                <div>
                    <label className="label-xs text-emerald-300">TCP Fast Open</label>
                    <select className="input-base border-emerald-500/30"
                        value={local.tcpFastOpen === true ? "true" : "false"}
                        onChange={e => update('tcpFastOpen', e.target.value === "true")}
                    >
                        <option value="false">Disabled</option>
                        <option value="true">Enabled</option>
                    </select>
                </div>

                <div>
                    <label className="label-xs">TCP MPTCP (Linux 5.6+)</label>
                    <select className="input-base"
                        value={local.tcpMptcp === true ? "true" : "false"}
                        onChange={e => update('tcpMptcp', e.target.value === "true")}
                    >
                        <option value="false">Disabled</option>
                        <option value="true">Enabled</option>
                    </select>
                </div>
            </div>

            {/* EXTENDED TCP TIMEOUTS & WINDOWS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-800/50">
                <div className="col-span-full">
                    <label className="label-xs text-slate-500">Low-level TCP Tuning (Leave empty for OS defaults)</label>
                </div>
                <div>
                    <label className="label-xs text-[10px]">TCP Keep-Alive Idle (s)</label>
                    <input type="number" className="input-base font-mono text-xs" 
                        placeholder="300"
                        value={local.tcpKeepAliveIdle || ""} 
                        onChange={e => update('tcpKeepAliveIdle', parseInt(e.target.value))} 
                    />
                </div>
                <div>
                    <label className="label-xs text-[10px]">TCP Keep-Alive Interval</label>
                    <input type="number" className="input-base font-mono text-xs" 
                        placeholder="0"
                        value={local.tcpKeepAliveInterval || ""} 
                        onChange={e => update('tcpKeepAliveInterval', parseInt(e.target.value))} 
                    />
                </div>
                <div>
                    <label className="label-xs text-[10px]">TCP User Timeout (ms)</label>
                    <input type="number" className="input-base font-mono text-xs" 
                        placeholder="10000"
                        value={local.tcpUserTimeout || ""} 
                        onChange={e => update('tcpUserTimeout', parseInt(e.target.value))} 
                    />
                </div>
                <div>
                    <label className="label-xs text-[10px]">TCP Max Segment (MTU)</label>
                    <input type="number" className="input-base font-mono text-xs" 
                        placeholder="1440"
                        value={local.tcpMaxSeg || ""} 
                        onChange={e => update('tcpMaxSeg', parseInt(e.target.value))} 
                    />
                </div>
                <div>
                    <label className="label-xs text-[10px]">TCP Congestion</label>
                    <input type="text" className="input-base font-mono text-xs" 
                        placeholder="bbr, cubic..."
                        value={local.tcpCongestion || ""} 
                        onChange={e => update('tcpCongestion', e.target.value)} 
                    />
                </div>
                <div>
                    <label className="label-xs text-[10px]">TCP Window Clamp</label>
                    <input type="number" className="input-base font-mono text-xs" 
                        placeholder="600"
                        value={local.tcpWindowClamp || ""} 
                        onChange={e => update('tcpWindowClamp', parseInt(e.target.value))} 
                    />
                </div>
            </div>
        </div>
    );
};