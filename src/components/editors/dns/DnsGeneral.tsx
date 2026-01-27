import React from 'react';

export const DnsGeneral = ({ dns, onChange }) => {
    const update = (field: string, val: any) => {
        onChange({ ...dns, [field]: val });
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Main Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="label-xs">DNS Tag (Inbound)</label>
                    <input 
                        className="input-base font-bold text-emerald-400" 
                        value={dns.tag || ""} 
                        onChange={e => update('tag', e.target.value)} 
                        placeholder="dns_inbound"
                    />
                </div>
                <div>
                    <label className="label-xs">Client IP</label>
                    <input 
                        className="input-base font-mono" 
                        value={dns.clientIp || ""} 
                        onChange={e => update('clientIp', e.target.value)} 
                        placeholder="Your public IP (for ECS)"
                    />
                </div>
                <div>
                    <label className="label-xs">Query Strategy</label>
                    <select 
                        className="input-base" 
                        value={dns.queryStrategy || "UseIP"} 
                        onChange={e => update('queryStrategy', e.target.value)}
                    >
                        <option value="UseIP">UseIP (A + AAAA)</option>
                        <option value="UseIPv4">UseIPv4 (A only)</option>
                        <option value="UseIPv6">UseIPv6 (AAAA only)</option>
                    </select>
                </div>
            </div>

            {/* Toggles */}
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="label-xs border-b border-slate-700/50 pb-2 mb-2">Behavior Flags</h4>
                
                <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Disable Cache</span>
                    <input type="checkbox" className="w-4 h-4 rounded bg-slate-950 border-slate-700 accent-indigo-600"
                        checked={dns.disableCache || false}
                        onChange={e => update('disableCache', e.target.checked)} />
                </label>

                <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Disable Fallback</span>
                    <input type="checkbox" className="w-4 h-4 rounded bg-slate-950 border-slate-700 accent-indigo-600"
                        checked={dns.disableFallback || false}
                        onChange={e => update('disableFallback', e.target.checked)} />
                </label>

                <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Disable Fallback If Match</span>
                    <input type="checkbox" className="w-4 h-4 rounded bg-slate-950 border-slate-700 accent-indigo-600"
                        checked={dns.disableFallbackIfMatch || false}
                        onChange={e => update('disableFallbackIfMatch', e.target.checked)} />
                </label>
            </div>
        </div>
    );
};