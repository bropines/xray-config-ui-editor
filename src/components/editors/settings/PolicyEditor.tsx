import React from 'react';
import { Switch, Card, SchemaForm } from '../../ui';
import { SystemPolicySchema, LevelPolicySchema } from '../../../core/xray/schemas/policy.schema';
import { t } from '../../../i18n';

export const PolicyEditor = ({ policy, onChange, onToggle }: any) => {
    const enabled = !!policy;
    const localPolicy = policy || { 
        system: { statsInboundUplink: true, statsInboundDownlink: true },
        levels: { "0": { handshake: 4, connIdle: 300, uplinkOnly: 2, downlinkOnly: 5, bufferSize: 4 } }
    };

    const l0 = localPolicy.levels?.["0"] || {};

    return (
        <Card 
            title={t("Local Policy")} 
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
            <p className="text-xs text-slate-500 mb-2">{t("Timeouts & System Stats")}</p>

            {enabled && (
                <div className="animate-in fade-in slide-in-from-top-2 space-y-4 pt-2 border-t border-slate-800/50">
                    {/* System Stats */}
                    <div className="p-4 border border-slate-800 rounded-xl bg-slate-950/50">
                        <label className="label-xs mb-3 block text-slate-400 font-bold uppercase tracking-wider">{t("System Traffic Counters")}</label>
                        <SchemaForm
                            schema={SystemPolicySchema}
                            value={localPolicy.system || {}}
                            onChange={sys => onChange({ ...localPolicy, system: sys })}
                            fieldConfigs={{
                                statsInboundUplink: { label: t("Inbound Uplink Stats"), help: t("Collect uplink stats for all inbounds.") },
                                statsInboundDownlink: { label: t("Inbound Downlink Stats"), help: t("Collect downlink stats for all inbounds.") },
                                statsOutboundUplink: { label: t("Outbound Uplink Stats"), help: t("Collect uplink stats for all outbounds.") },
                                statsOutboundDownlink: { label: t("Outbound Downlink Stats"), help: t("Collect downlink stats for all outbounds.") }
                            }}
                        />
                    </div>

                    {/* Level 0 Timeouts */}
                    <div className="p-4 border border-slate-800 rounded-xl bg-slate-950/50">
                        <label className="label-xs mb-3 block text-slate-400 font-bold uppercase tracking-wider">{t("Level 0 (Default User) Settings")}</label>
                        <SchemaForm
                            schema={LevelPolicySchema}
                            value={l0}
                            onChange={lvl => {
                                const lvls = { ...localPolicy.levels };
                                lvls["0"] = lvl;
                                onChange({ ...localPolicy, levels: lvls });
                            }}
                            fieldConfigs={{
                                handshake: { label: t("Handshake Timeout"), help: t("Handshake timeout. Default: 4s."), placeholder: '4' },
                                connIdle: { label: t("Connection Idle Timeout"), help: t("Connection idle timeout. Default: 300s."), placeholder: '300' },
                                uplinkOnly: { label: t("Uplink Only Timeout"), help: t("Time to wait after downlink closes. Default: 2s."), placeholder: '2' },
                                downlinkOnly: { label: t("Downlink Only Timeout"), help: t("Time to wait after uplink closes. Default: 5s."), placeholder: '5' },
                                statsUserUplink: { label: t("User Uplink Stats"), help: t("Enable per-user uplink traffic statistics.") },
                                statsUserDownlink: { label: t("User Downlink Stats"), help: t("Enable per-user downlink traffic statistics.") },
                                statsUserOnline: { label: t("User Online Count Stats"), help: t("Enable per-user online count statistics.") },
                                bufferSize: { label: t("Buffer Size (KB)"), help: t("Internal buffer size per request. Default depends on platform."), placeholder: 'e.g. 4' }
                            }}
                        />
                    </div>
                </div>
            )}
        </Card>
    );
};