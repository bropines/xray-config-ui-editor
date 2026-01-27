import React from 'react';

export const ApiStatsEditor = ({ api, stats, onUpdateApi, onToggleApi, onToggleStats }) => {
    const apiEnabled = !!api;
    const statsEnabled = !!stats;
    const localApi = api || { tag: "api", services: ["HandlerService", "LoggerService", "StatsService"] };

    const updateApi = (field: string, val: any) => {
        onUpdateApi({ ...localApi, [field]: val });
    };

    const toggleService = (srv: string) => {
        const current = localApi.services || [];
        const next = current.includes(srv) 
            ? current.filter(s => s !== srv) 
            : [...current, srv];
        updateApi('services', next);
    };

    return (
        <div className="space-y-6">
            {/* STATS TOGGLE */}
            <div className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800">
                <div>
                    <h3 className="font-bold text-white">Statistics</h3>
                    <p className="text-xs text-slate-500">Enable internal traffic counters (Required for panels)</p>
                </div>
                <input type="checkbox" className="w-5 h-5 accent-indigo-600 cursor-pointer"
                    checked={statsEnabled}
                    onChange={() => onToggleStats({})}
                />
            </div>

            {/* API TOGGLE */}
            <div className="space-y-4">
                <div className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <div>
                        <h3 className="font-bold text-white">gRPC API</h3>
                        <p className="text-xs text-slate-500">Control Xray via gRPC (Required for panels)</p>
                    </div>
                    <input type="checkbox" className="w-5 h-5 accent-indigo-600 cursor-pointer"
                        checked={apiEnabled}
                        onChange={() => onToggleApi({ tag: "api", services: ["HandlerService", "LoggerService", "StatsService"] })}
                    />
                </div>

                {apiEnabled && (
                    <div className="p-4 border border-slate-800 rounded-xl bg-slate-900/50 animate-in fade-in slide-in-from-top-2">
                        <div className="mb-4">
                            <label className="label-xs">API Outbound Tag</label>
                            <input className="input-base w-1/2" 
                                value={localApi.tag || "api"}
                                onChange={e => updateApi('tag', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="label-xs">Enabled Services</label>
                            <div className="flex flex-wrap gap-2">
                                {["HandlerService", "LoggerService", "StatsService", "ReflectionService"].map(srv => (
                                    <label key={srv} className={`
                                        flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer select-none text-xs font-mono
                                        ${(localApi.services || []).includes(srv) ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200' : 'bg-slate-950 border-slate-700 text-slate-400'}
                                    `}>
                                        <input type="checkbox" className="hidden"
                                            checked={(localApi.services || []).includes(srv)}
                                            onChange={() => toggleService(srv)}
                                        />
                                        {srv}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="mt-4 p-3 bg-yellow-900/10 border border-yellow-700/30 rounded text-yellow-500 text-xs">
                            Don't forget to add an <b>Inbound</b> with protocol <code>dokodemo-door</code> listening on <code>127.0.0.1:10085</code> routed to this API tag!
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};