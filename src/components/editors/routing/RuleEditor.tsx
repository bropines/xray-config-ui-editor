import React from 'react';
import { Icon } from '../../ui/Icon';
import { SmartTagInput } from '../../ui/SmartTagInput';
import { TagSelector } from '../../ui/TagSelector';
import { JsonField } from '../../ui/JsonField';
import { validateRule } from '../../../utils/validator';

export const RuleEditor = ({
    rule,
    onChange,
    outboundTags,
    balancerTags,
    inboundTags,
    geoData,
    rawMode
}) => {
    if (!rule) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 h-full">
                <Icon name="ArrowsSplit" className="text-6xl mb-4 opacity-10" />
                <p>Select a rule to configure routing logic</p>
            </div>
        );
    }

    if (rawMode) {
        return (
            <div className="flex-1 w-full h-full p-4 bg-slate-950">
                <JsonField
                    label="Raw Rule JSON"
                    value={rule}
                    onChange={onChange}
                    className="h-full"
                    schemaMode="rule"
                />
            </div>
        );
    }

    const update = (field: string, val: any) => {
        const newRule = { ...rule };

        if (val === undefined || val === "" || (Array.isArray(val) && val.length === 0)) {
            delete newRule[field];
        } else {
            newRule[field] = val;
        }

        if (field === 'outboundTag') delete newRule.balancerTag;
        if (field === 'balancerTag') delete newRule.outboundTag;

        onChange(newRule);
    };

    // --- Валидация ---
    const ruleErrors = validateRule(rule);

    // Невалидные записи в domain[] (пустые строки, "geosite:" без имени)
    const invalidDomains = ruleErrors
        .filter(e => e.field.startsWith('domain_'))
        .map(e => {
            const idx = parseInt(e.field.replace('domain_', ''), 10);
            return (rule.domain || [])[idx] as string | undefined;
        })
        .filter((v): v is string => v !== undefined);

    // Невалидные записи в ip[]
    const invalidIPs = ruleErrors
        .filter(e => e.field.startsWith('ip_'))
        .map(e => {
            const idx = parseInt(e.field.replace('ip_', ''), 10);
            return (rule.ip || [])[idx] as string | undefined;
        })
        .filter((v): v is string => v !== undefined);

    const missingTarget = ruleErrors.some(e => e.field === 'target');
    const currentTarget = rule.balancerTag ? `bal:${rule.balancerTag}` : (rule.outboundTag || "");

    return (
        <div className="flex-1 w-full overflow-y-auto custom-scroll p-6 space-y-6 bg-slate-950/30 h-full">

            {/* ОБЩИЙ БАННЕР ОШИБОК */}
            {ruleErrors.length > 0 && (
                <div className="p-3 bg-rose-900/20 border border-rose-500/50 rounded-xl text-rose-300 text-[11px] flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                    <Icon name="Warning" className="text-rose-400 mt-0.5 shrink-0 text-base" />
                    <ul className="space-y-0.5">
                        {ruleErrors.map((e, i) => <li key={i}>{e.message}</li>)}
                    </ul>
                </div>
            )}

            {/* RULE NAME */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg border-l-4 border-l-indigo-500">
                <label className="label-xs text-indigo-400">Rule Alias / Name (ruleTag)</label>
                <input
                    className="input-base mt-1 font-bold"
                    placeholder="e.g. Block Ads, Global Proxy, My Work Laptop..."
                    value={rule.ruleTag || ""}
                    onChange={e => update('ruleTag', e.target.value)}
                />
                <p className="text-[10px] text-slate-500 mt-1 italic">
                    This name will be shown in UI and Xray logs when matched.
                </p>
            </div>

            {/* DESTINATION */}
            <div className={`bg-slate-900 border p-4 rounded-xl shadow-lg ${missingTarget ? 'border-rose-500/60' : 'border-slate-800'}`}>
                <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Traffic Destination</label>
                    <div className="text-[10px] text-slate-500 font-mono">Where to send traffic</div>
                </div>
                <div className="flex gap-2">
                    <select
                        className={`flex-1 input-base font-bold ${missingTarget ? 'border-rose-500 bg-rose-500/10' : ''}`}
                        value={currentTarget}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val.startsWith('bal:')) update('balancerTag', val.replace('bal:', ''));
                            else update('outboundTag', val);
                        }}
                    >
                        <option value="" disabled>Select Target...</option>
                        <optgroup label="Outbounds (Direct)">
                            {outboundTags.map(t => <option key={t} value={t}>{t}</option>)}
                        </optgroup>
                        {balancerTags.length > 0 && (
                            <optgroup label="Balancers (Load Balance)">
                                {balancerTags.map(t => <option key={t} value={`bal:${t}`}>⚡ {t}</option>)}
                            </optgroup>
                        )}
                    </select>
                    <input
                        className={`w-1/3 input-base text-slate-300 ${missingTarget ? 'border-rose-500 bg-rose-500/10' : ''}`}
                        placeholder="Custom tag..."
                        value={rule.outboundTag || rule.balancerTag || ""}
                        onChange={e => update('outboundTag', e.target.value)}
                    />
                </div>
                {missingTarget && (
                    <p className="text-[10px] text-rose-400 mt-1.5">
                        Required — select or type a destination tag, otherwise Xray will crash.
                    </p>
                )}
            </div>

            {/* SMART MATCHERS */}
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-2">
                        <SmartTagInput
                            label="Domains (GeoSite)"
                            prefix="geosite:"
                            placeholder="google, geosite:netflix..."
                            value={rule.domain || []}
                            onChange={v => update('domain', v)}
                            suggestions={geoData.sites}
                            isLoading={geoData.loading}
                            invalidTags={invalidDomains}
                        />
                    </div>
                    <div className="col-span-2">
                        <SmartTagInput
                            label="IPs (GeoIP & CIDR)"
                            prefix="geoip:"
                            placeholder="8.8.8.8, geoip:cn..."
                            value={rule.ip || []}
                            onChange={v => update('ip', v)}
                            suggestions={geoData.ips}
                            isLoading={geoData.loading}
                            invalidTags={invalidIPs}
                        />
                    </div>
                </div>

                {/* ADVANCED MATCHERS */}
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50 space-y-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block border-b border-slate-800 pb-2">Advanced Matchers</label>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <TagSelector label="Inbound Source" availableTags={inboundTags} selected={rule.inboundTag || []}
                                onChange={v => update('inboundTag', v)} multi={true} />
                        </div>
                        <div>
                            <TagSelector label="Network" availableTags={['tcp', 'udp']} selected={rule.network ? rule.network.split(',') : []}
                                onChange={v => update('network', Array.isArray(v) ? v.join(',') : v)} multi={true} />
                        </div>
                        <div>
                            <TagSelector label="Protocol" availableTags={['http', 'tls', 'bittorrent']} selected={rule.protocol || []}
                                onChange={v => update('protocol', v)} multi={true} />
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="label-xs">Target Port</label>
                                <input className="input-base text-xs font-mono" placeholder="e.g. 443, 1000-2000"
                                    value={rule.port || ""} onChange={e => update('port', e.target.value)} />
                            </div>
                            <div>
                                <label className="label-xs">Source IP (CIDR)</label>
                                <input className="input-base text-xs font-mono" placeholder="e.g. 10.0.0.1/32"
                                    value={(rule.source || []).join(',')} onChange={e => update('source', e.target.value ? e.target.value.split(',') : undefined)} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};