import React from 'react';
import { Card } from '../../ui/Card';
import { FormField } from '../../ui/FormField';
import { Switch } from '../../ui/Switch';
import { Input } from '../../ui/Input';
import { Icon } from '../../ui/Icon';

export const PolicyEditor = ({ policy, onChange, onToggle }: any) => {
    const enabled = !!policy;
    const localPolicy = policy || { 
        system: { statsInboundUplink: true, statsInboundDownlink: true },
        levels: { "0": { handshake: 4, connIdle: 300, uplinkOnly: 2, downlinkOnly: 5, bufferSize: 4 } }
    };

    const updateSystem = (field: string, val: boolean) => {
        const sys = { ...localPolicy.system, [field]: val };
        onChange({ ...localPolicy, system: sys });
    };

    const updateLevel0 = (field: string, val: number) => {
        const lvls = JSON.parse(JSON.stringify(localPolicy.levels || { "0": {} }));
        if (!lvls["0"]) lvls["0"] = {};
        lvls["0"][field] = val;
        onChange({ ...localPolicy, levels: lvls });
    };

    const l0 = localPolicy.levels?.["0"] || {};

    return (
        <Card 
            title="Local Policy" 
            icon="ShieldCheck" 
            iconColor="bg-slate-700"
            actions={
                <Switch 
                    checked={enabled} 
                    onChange={() => onToggle({
                        system: { statsInboundUplink: true, statsInboundDownlink: true },
                        levels: { "0": { handshake: 4, connIdle: 300 } }
                    })} 
                />
            }
        >
            {enabled ? (
                <div className="space-y-10 animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* System Stats Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Counters</h5>
                            <div className="h-px flex-1 bg-slate-800/50" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                                { key: 'statsInboundUplink', label: 'Inbound Uplink' },
                                { key: 'statsInboundDownlink', label: 'Inbound Downlink' },
                                { key: 'statsOutboundUplink', label: 'Outbound Uplink' },
                                { key: 'statsOutboundDownlink', label: 'Outbound Downlink' }
                            ].map(({ key, label }) => (
                                <div key={key} className="flex items-center justify-between p-3.5 bg-slate-950/30 rounded-2xl border border-slate-800/60 shadow-inner group/policy">
                                    <span className="text-[11px] font-bold text-slate-400 group-hover/policy:text-slate-200 transition-colors uppercase tracking-tight">{label}</span>
                                    <Switch 
                                        checked={localPolicy.system?.[key] || false} 
                                        onChange={val => updateSystem(key, val)} 
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Level 0 Timeouts Section */}
                    <div className="space-y-5">
                        <div className="flex items-center gap-2 px-1">
                            <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Level 0 Timeouts (seconds)</h5>
                            <div className="h-px flex-1 bg-slate-800/50" />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 bg-slate-900/20 p-5 rounded-[2rem] border border-slate-800/50 shadow-inner">
                            <FormField label="Handshake">
                                <Input type="number" value={l0.handshake || 4} onChange={e => updateLevel0('handshake', parseInt(e.target.value))} />
                            </FormField>
                            <FormField label="Conn Idle">
                                <Input type="number" value={l0.connIdle || 300} onChange={e => updateLevel0('connIdle', parseInt(e.target.value))} />
                            </FormField>
                            <FormField label="Buffer (kB)">
                                <Input type="number" value={l0.bufferSize || 4} onChange={e => updateLevel0('bufferSize', parseInt(e.target.value))} />
                            </FormField>
                            <FormField label="Uplink Only">
                                <Input type="number" value={l0.uplinkOnly || 2} onChange={e => updateLevel0('uplinkOnly', parseInt(e.target.value))} />
                            </FormField>
                            <FormField label="Downlink Only">
                                <Input type="number" value={l0.downlinkOnly || 5} onChange={e => updateLevel0('downlinkOnly', parseInt(e.target.value))} />
                            </FormField>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-2 opacity-40 text-[10px] uppercase font-black tracking-widest italic">
                    Policy is using core defaults
                </div>
            )}
        </Card>
    );
};
