import React, { useState } from 'react';
import { Icon } from '../../ui/Icon';
import { SmartTagInput } from '../../ui/SmartTagInput';
import { TagSelector } from '../../ui/TagSelector';
import { JsonField } from '../../ui/JsonField';
import { validateRule, lintRule } from '../../../utils/validator';
import { TagDetailsModal } from '../TagDetailsModal';

export const RuleEditor = ({
    rule,
    onChange,
    outboundTags,
    balancerTags,
    inboundTags,
    geoData,
    rawMode
}: any) => {
    // Стейт для просмотра деталей тега по клику
    const [viewTag, setViewTag] = useState<string | null>(null);

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
                <JsonField label="Raw Rule JSON" value={rule} onChange={onChange} className="h-full" schemaMode="rule" />
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

    const handleAutofixMatchers = () => onChange({ ...rule, network: "tcp,udp" });
    const handleAutofixCase = () => onChange({
        ...rule,
        ...(rule.domain ? { domain: rule.domain.map((d: string) => d.toLowerCase()) } : {}),
        ...(rule.ip     ? { ip:     rule.ip.map((ip: string)   => ip.toLowerCase())  } : {}),
    });

    const errors   = validateRule(rule);
    const warnings = lintRule(rule);

    const hasMissingMatchers = errors.some((e: any) => e.field === 'matchers');
    const missingTarget      = errors.some((e: any) => e.field === 'target');

    const invalidDomains = errors
        .filter((e: any) => e.field.startsWith('domain_'))
        .map((e: any) => (rule.domain || [])[parseInt(e.field.replace('domain_', ''), 10)] as string | undefined)
        .filter((v): v is string => v !== undefined);

    const invalidIPs = errors
        .filter((e: any) => e.field.startsWith('ip_'))
        .map((e: any) => (rule.ip || [])[parseInt(e.field.replace('ip_', ''), 10)] as string | undefined)
        .filter((v): v is string => v !== undefined);

    const warnDomains = warnings
        .filter((e: any) => e.field.startsWith('domain_'))
        .map((e: any) => (rule.domain || [])[parseInt(e.field.replace('domain_', ''), 10)] as string | undefined)
        .filter((v): v is string => v !== undefined);

    const warnIPs = warnings
        .filter((e: any) => e.field.startsWith('ip_'))
        .map((e: any) => (rule.ip || [])[parseInt(e.field.replace('ip_', ''), 10)] as string | undefined)
        .filter((v): v is string => v !== undefined);

    const currentTarget = rule.balancerTag ? `bal:${rule.balancerTag}` : (rule.outboundTag || "");

    return (
        <div className="flex-1 w-full overflow-y-auto custom-scroll p-6 space-y-6 bg-slate-950/30 h-full relative">

            {errors.length > 0 && (
                <div className="p-3.5 bg-rose-950/50 border border-rose-500/60 rounded-xl flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2">
                    <Icon name="WarningOctagon" weight="fill" className="text-rose-400 text-xl shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                        <ul className="space-y-1 text-[11px] text-rose-200">
                            {errors.map((e: any, i: number) => <li key={i}>{e.message}</li>)}
                        </ul>
                        {hasMissingMatchers && (
                            <button
                                onClick={handleAutofixMatchers}
                                className="flex items-center gap-1.5 text-[11px] font-bold text-blue-300 hover:text-blue-200 bg-blue-900/30 hover:bg-blue-800/40 border border-blue-700/40 rounded-lg px-3 py-1.5 transition-colors"
                            >
                                <Icon name="MagicWand" />
                                Auto-fix: add network: tcp,udp (proper catch-all)
                            </button>
                        )}
                    </div>
                </div>
            )}

            {warnings.length > 0 && (
                <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-xl flex items-start gap-2.5 animate-in fade-in">
                    <Icon name="Warning" weight="fill" className="text-amber-400 text-base shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="text-[10px] text-amber-400/70 font-bold uppercase tracking-wide">Style lint</p>
                        <ul className="space-y-0.5 text-[11px] text-amber-200/80">
                            {warnings.map((w: any, i: number) => <li key={i}>{w.message}</li>)}
                        </ul>
                        <button
                            onClick={handleAutofixCase}
                            className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300 hover:text-amber-200 bg-amber-900/20 hover:bg-amber-800/30 border border-amber-700/30 rounded-lg px-3 py-1.5 transition-colors"
                        >
                            <Icon name="MagicWand" />
                            Auto-fix: convert to lowercase
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg border-l-4 border-l-indigo-500">
                <label className="label-xs text-indigo-400">Rule Alias / Name (ruleTag)</label>
                <input
                    className="input-base mt-1 font-bold"
                    placeholder="e.g. Block Ads, Global Proxy..."
                    value={rule.ruleTag || ""}
                    onChange={e => update('ruleTag', e.target.value)}
                />
                <p className="text-[10px] text-slate-500 mt-1 italic">
                    This name will be shown in UI and Xray logs when matched.
                </p>
            </div>

            <div className={`bg-slate-900 border p-4 rounded-xl shadow-lg ${missingTarget ? 'border-rose-500/60' : 'border-slate-800'}`}>
                <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Traffic Destination</label>
                    <div className="text-[10px] text-slate-500 font-mono">Where to send traffic</div>
                </div>
                <div className="flex gap-2">
                    <select
                        className={`flex-1 input-base font-bold ${missingTarget ? 'border-rose-500 bg-rose-500/10' : ''}`}
                        value={currentTarget}
                        onChange={e => {
                            const val = e.target.value;
                            if (val.startsWith('bal:')) update('balancerTag', val.replace('bal:', ''));
                            else update('outboundTag', val);
                        }}
                    >
                        <option value="" disabled>Select Target...</option>
                        <optgroup label="Outbounds (Direct)">
                            {outboundTags.map((t: string) => <option key={t} value={t}>{t}</option>)}
                        </optgroup>
                        {balancerTags.length > 0 && (
                            <optgroup label="Balancers (Load Balance)">
                                {balancerTags.map((t: string) => <option key={t} value={`bal:${t}`}>⚡ {t}</option>)}
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
                            warnTags={warnDomains}
                            onTagClick={setViewTag}
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
                            warnTags={warnIPs}
                            onTagClick={setViewTag}
                        />
                    </div>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50 space-y-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block border-b border-slate-800 pb-2">
                        Advanced Matchers
                    </label>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <TagSelector label="Inbound Source" availableTags={inboundTags} selected={rule.inboundTag || []}
                                onChange={v => update('inboundTag', v)} multi={true} />
                        </div>
                        <div>
                            <TagSelector
                                label="Network"
                                availableTags={['tcp', 'udp']}
                                selected={rule.network ? rule.network.split(',') : []}
                                onChange={v => update('network', Array.isArray(v) ? v.join(',') : v)}
                                multi={true}
                            />
                            {hasMissingMatchers && (
                                <p className="text-[10px] text-blue-400 mt-1">
                                    ↑ Select tcp + udp for a proper catch-all
                                </p>
                            )}
                        </div>
                        <div>
                            <TagSelector label="Protocol" availableTags={['http', 'tls', 'bittorrent']} selected={rule.protocol || []}
                                onChange={v => update('protocol', v)} multi={true} />
                        </div>
                        
                        {/* Domain Strategy (Force IP) */}
                        <div>
                            <label className="label-xs text-indigo-400">Domain Strategy (Force IP)</label>
                            <select 
                                className="input-base text-xs font-mono"
                                value={rule.domainStrategy || ""}
                                onChange={e => update('domainStrategy', e.target.value || undefined)}
                            >
                                <option value="">Default (Inherit)</option>
                                <option value="AsIs">AsIs</option>
                                <option value="UseIP">UseIP</option>
                                <option value="UseIPv4">UseIPv4</option>
                                <option value="UseIPv6">UseIPv6</option>
                            </select>
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
                                    value={(rule.source || []).join(',')}
                                    onChange={e => update('source', e.target.value ? e.target.value.split(',') : undefined)} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Рендерим модалку деталей тега поверх формы */}
            {viewTag && <TagDetailsModal tag={viewTag} onClose={() => setViewTag(null)} />}
        </div>
    );
};