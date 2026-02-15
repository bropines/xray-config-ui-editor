import React from 'react';

export const InboundTun = ({ inbound, onChange }: any) => {
    const settings = inbound.settings || {};

    const update = (field: string, val: any) => {
        onChange(['settings', field], val);
    };

    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mt-4 animate-in fade-in">
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 border-b border-slate-700/50 pb-2">
                TUN Interface Settings
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* MTU */}
                <div>
                    <label className="label-xs">MTU</label>
                    <input 
                        type="number" 
                        className="input-base font-mono"
                        value={settings.mtu || 1500} 
                        onChange={e => update('mtu', parseInt(e.target.value) || 1500)}
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Default: 1500</p>
                </div>

                {/* Network Stack */}
                <div>
                    <label className="label-xs">Network Stack</label>
                    <select 
                        className="input-base"
                        value={settings.stack || "system"} 
                        onChange={e => update('stack', e.target.value)}
                    >
                        <option value="system">System (Recommended)</option>
                        <option value="gvisor">gVisor</option>
                        <option value="mixed">Mixed</option>
                        <option value="lwip">LwIP</option>
                    </select>
                </div>

                {/* Endpoint (Optional for gVisor/System) */}
                <div className="md:col-span-2">
                    <label className="label-xs">Endpoint Address (Optional)</label>
                    <div className="flex gap-2">
                         <input 
                            className="input-base flex-1 font-mono"
                            placeholder="127.0.0.1" 
                            value={settings.endpointAddress || ""} 
                            onChange={e => update('endpointAddress', e.target.value)}
                        />
                         <input 
                            type="number"
                            className="input-base w-24 font-mono"
                            placeholder="Port" 
                            value={settings.endpointPort || ""} 
                            onChange={e => update('endpointPort', parseInt(e.target.value) || undefined)}
                        />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Leave empty usually. Used for specific stack configurations.</p>
                </div>
            </div>
        </div>
    );
};