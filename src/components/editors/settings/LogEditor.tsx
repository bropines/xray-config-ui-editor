import React from 'react';
import { Switch } from '../../ui/Switch';
import { Card } from '../../ui/Card';

export const LogEditor = ({ log, onChange, onToggle }) => {
    const enabled = !!log;
    const localLog = log || { loglevel: "warning" };

    const update = (field: string, val: any) => {
        onChange({ ...localLog, [field]: val });
    };

    return (
        <Card 
            title="Log Configuration" 
            icon="TerminalWindow"
            headerExtra={<Switch checked={enabled} onChange={() => onToggle({ loglevel: "warning" })} />}
        >
            <p className="text-xs text-slate-500 mb-2">System output logs</p>

            {enabled && (
                <div className="animate-in fade-in slide-in-from-top-2 pt-2 border-t border-slate-800/50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <label className="label-xs">Log Level</label>
                            <select className="select-base" 
                                value={localLog.loglevel || "warning"} 
                                onChange={e => update('loglevel', e.target.value)}
                            >
                                {["debug", "info", "warning", "error", "none"].map(l => (
                                    <option key={l} value={l}>{l.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end pb-3">
                            <Switch 
                                checked={localLog.dnsLog || false}
                                onChange={checked => update('dnsLog', checked)}
                                label="Enable DNS Log"
                            />
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
                </div>
            )}
        </Card>
    );
};