import React from 'react';

export const SockoptEditor = ({ sockopt, onChange, isClient }) => {
    const local = sockopt || {};

    const update = (field: string, val: any) => {
        onChange({ ...local, [field]: val });
    };

    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4 mt-4">
            <h4 className="label-xs border-b border-slate-700/50 pb-2 mb-2 text-slate-400">Socket Options (Advanced)</h4>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                    <label className="label-xs">Mark (Routing)</label>
                    <input type="number" className="input-base font-mono" 
                        placeholder="255"
                        value={local.mark || ""} 
                        onChange={e => update('mark', parseInt(e.target.value) || undefined)} 
                    />
                </div>

                {!isClient && (
                    <div>
                        <label className="label-xs">TProxy (Linux)</label>
                        <select className="input-base"
                            value={local.tproxy || "off"}
                            onChange={e => update('tproxy', e.target.value)}
                        >
                            <option value="off">Off</option>
                            <option value="tproxy">TProxy</option>
                            <option value="redirect">Redirect</option>
                        </select>
                    </div>
                )}

                <div>
                    <label className="label-xs">TCP Fast Open</label>
                    <select className="input-base"
                        value={local.tcpFastOpen === true ? "true" : "false"}
                        onChange={e => update('tcpFastOpen', e.target.value === "true")}
                    >
                        <option value="false">Disabled</option>
                        <option value="true">Enabled</option>
                    </select>
                </div>

                {isClient && (
                    <div>
                        <label className="label-xs">Dialer Proxy (Tag)</label>
                        <input className="input-base" 
                            placeholder="out-wireguard"
                            value={local.dialerProxy || ""} 
                            onChange={e => update('dialerProxy', e.target.value)} 
                        />
                    </div>
                )}

                <div className="col-span-1">
                    <label className="label-xs">Interface</label>
                    <input className="input-base font-mono" 
                        placeholder="eth0"
                        value={local.interface || ""} 
                        onChange={e => update('interface', e.target.value)} 
                    />
                </div>
                
                {isClient && (
                     <div className="col-span-1">
                        <label className="label-xs">Domain Strategy</label>
                        <select className="input-base"
                            value={local.domainStrategy || "AsIs"}
                            onChange={e => update('domainStrategy', e.target.value)}
                        >
                            <option value="AsIs">AsIs</option>
                            <option value="UseIP">UseIP</option>
                            <option value="UseIPv4">UseIPv4</option>
                            <option value="UseIPv6">UseIPv6</option>
                        </select>
                    </div>
                )}
            </div>
        </div>
    );
};