import React from 'react';
import { Switch, Card, SchemaForm } from '../../ui';
import { SystemPolicySchema, LevelPolicySchema } from '../../../core/xray/schemas/policy.schema';

export const PolicyEditor = ({ policy, onChange, onToggle }: any) => {
    const enabled = !!policy;
    const localPolicy = policy || { 
        system: { statsInboundUplink: true, statsInboundDownlink: true },
        levels: { "0": { handshake: 4, connIdle: 300, uplinkOnly: 2, downlinkOnly: 5, bufferSize: 4 } }
    };

    const l0 = localPolicy.levels?.["0"] || {};

    return (
        <Card 
            title="Local Policy" 
            icon="ShieldCheck"
            headerExtra={
                <Switch 
                    checked={enabled}
                    onChange={() => onToggle({
                        system: { statsInboundUplink: true, statsInboundDownlink: true },
                        levels: { "0": { handshake: 4, connIdle: 300 } }
                    })}
                />
            }
        >
            <p className="text-xs text-slate-500 mb-2">Timeouts & System Stats</p>

            {enabled && (
                <div className="animate-in fade-in slide-in-from-top-2 space-y-4 pt-2 border-t border-slate-800/50">
                    {/* System Stats */}
                    <div className="p-4 border border-slate-800 rounded-xl bg-slate-950/50">
                        <label className="label-xs mb-3 block text-slate-400 font-bold uppercase tracking-wider">System Traffic Counters</label>
                        <SchemaForm
                            schema={SystemPolicySchema}
                            value={localPolicy.system || {}}
                            onChange={sys => onChange({ ...localPolicy, system: sys })}
                            fieldConfigs={{
                                statsInboundUplink: { label: 'Inbound Uplink Stats', help: 'Collect uplink stats for all inbounds.' },
                                statsInboundDownlink: { label: 'Inbound Downlink Stats', help: 'Collect downlink stats for all inbounds.' },
                                statsOutboundUplink: { label: 'Outbound Uplink Stats', help: 'Collect uplink stats for all outbounds.' },
                                statsOutboundDownlink: { label: 'Outbound Downlink Stats', help: 'Collect downlink stats for all outbounds.' }
                            }}
                        />
                    </div>

                    {/* Level 0 Timeouts */}
                    <div className="p-4 border border-slate-800 rounded-xl bg-slate-950/50">
                        <label className="label-xs mb-3 block text-slate-400 font-bold uppercase tracking-wider">Level 0 (Default User) Settings</label>
                        <SchemaForm
                            schema={LevelPolicySchema}
                            value={l0}
                            onChange={lvl => {
                                const lvls = { ...localPolicy.levels };
                                lvls["0"] = lvl;
                                onChange({ ...localPolicy, levels: lvls });
                            }}
                            fieldConfigs={{
                                handshake: { label: 'Handshake Timeout (sec)', help: 'Handshake timeout. Default: 4.', placeholder: '4' },
                                connIdle: { label: 'Connection Idle (sec)', help: 'Connection idle timeout. Default: 300.', placeholder: '300' },
                                uplinkOnly: { label: 'Uplink Only (sec)', help: 'Time to wait after downlink closes.', placeholder: '2' },
                                downlinkOnly: { label: 'Downlink Only (sec)', help: 'Time to wait after uplink closes.', placeholder: '5' },
                                statsUserUplink: { label: 'User Uplink Stats', help: 'Enable per-user uplink traffic statistics.' },
                                statsUserDownlink: { label: 'User Downlink Stats', help: 'Enable per-user downlink traffic statistics.' },
                                statsUserOnline: { label: 'User Online Count Stats', help: 'Enable per-user online count statistics.' },
                                bufferSize: { label: 'Buffer Size (KB)', help: 'Internal buffer size per request. Default depends on platform.', placeholder: 'e.g. 4' }
                            }}
                        />
                    </div>
                </div>
            )}
        </Card>
    );
};