import React from 'react';
import { TagSelector } from '../../ui/TagSelector';

export const BurstObservatoryEditor = ({ burstObservatory, onChange, onToggle, outboundTags }: any) => {
    const enabled = !!burstObservatory;
    const localObs = burstObservatory || { 
        subjectSelector: [], 
        pingConfig: { destination: "https://connectivitycheck.gstatic.com/generate_204", interval: "1m", sampling: 10 } 
    };

    const update = (field: string, val: any) => {
        onChange({ ...localObs, [field]: val });
    };

    const updatePing = (field: string, val: any) => {
        onChange({ ...localObs, pingConfig: { ...(localObs.pingConfig || {}), [field]: val } });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800">
                <div>
                    <h3 className="font-bold text-white">Burst Observatory</h3>
                    <p className="text-xs text-slate-500">Advanced stealth health checks for balancers</p>
                </div>
                <input type="checkbox" className="w-5 h-5 accent-indigo-600 cursor-pointer"
                    checked={enabled}
                    onChange={() => onToggle({ 
                        subjectSelector: [], 
                        pingConfig: { destination: "https://connectivitycheck.gstatic.com/generate_204", interval: "1m", sampling: 10 } 
                    })}
                />
            </div>

            {enabled && (
                <div className="animate-in fade-in slide-in-from-top-2 space-y-4 p-4 border border-slate-800 rounded-xl bg-slate-900/50">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="label-xs">Destination URL</label>
                            <input className="input-base font-mono text-xs" 
                                value={localObs.pingConfig?.destination || ""} 
                                onChange={e => updatePing('destination', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="label-xs">Interval</label>
                            <input className="input-base" 
                                placeholder="1m, 30s"
                                value={localObs.pingConfig?.interval || ""} 
                                onChange={e => updatePing('interval', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="label-xs">Sampling Count</label>
                            <input type="number" className="input-base" 
                                value={localObs.pingConfig?.sampling || 10} 
                                onChange={e => updatePing('sampling', parseInt(e.target.value))}
                            />
                        </div>
                    </div>

                    <div>
                        <TagSelector 
                            label="Subject Selector (Outbounds to Watch)"
                            availableTags={outboundTags}
                            selected={localObs.subjectSelector || []}
                            onChange={v => update('subjectSelector', v)}
                            multi={true}
                            placeholder="Prefix matching..."
                        />
                    </div>
                </div>
            )}
        </div>
    );
};