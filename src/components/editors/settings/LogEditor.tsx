import React from 'react';

export const LogEditor = ({ log, onChange, onToggle }) => {
    const enabled = !!log;
    const localLog = log || { loglevel: "warning" };

    const update = (field: string, val: any) => {
        onChange({ ...localLog, [field]: val });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800">
                <div>
                    <h3 className="font-bold text-white">Log Configuration</h3>
                    <p className="text-xs text-slate-500">System output logs</p>
                </div>
                <input type="checkbox" className="w-5 h-5 accent-indigo-600 cursor-pointer"
                    checked={enabled}
                    onChange={() => onToggle({ loglevel: "warning" })}
                />
            </div>

            {enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div>
                        <label className="label-xs">Log Level</label>
                        <select className="input-base" 
                            value={localLog.loglevel || "warning"} 
                            onChange={e => update('loglevel', e.target.value)}
                        >
                            {["debug", "info", "warning", "error", "none"].map(l => (
                                <option key={l} value={l}>{l.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end pb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 accent-indigo-600"
                                checked={localLog.dnsLog || false}
                                onChange={e => update('dnsLog', e.target.checked)}
                            />
                            <span className="text-sm text-slate-300">Enable DNS Log</span>
                        </label>
                    </div>
                    <div className="col-span-full">
                        <label className="label-xs">Access Log Path</label>
                        <input className="input-base font-mono" 
                            placeholder="/var/log/xray/access.log"
                            value={localLog.access || ""}
                            onChange={e => update('access', e.target.value)}
                        />
                    </div>
                    <div className="col-span-full">
                        <label className="label-xs">Error Log Path</label>
                        <input className="input-base font-mono" 
                            placeholder="/var/log/xray/error.log"
                            value={localLog.error || ""}
                            onChange={e => update('error', e.target.value)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};