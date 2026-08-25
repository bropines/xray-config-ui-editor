import React, { useState, useEffect } from 'react';
import { Icon, Help, SmartTagInput, TagSelector, JsonField, Select, SchemaForm, ExtendedSection } from '../../ui';
import { validateRule, lintRule } from '../../../core/validators';
import { TagDetailsModal } from '../TagDetailsModal';
import { RoutingRuleSchema, WebhookObjectSchema } from '../../../core/xray/schemas/routing.schema';
import { parseJsonc } from '../../../utils/jsonc';
import { useConfigStore } from '../../../store/configStore';

const AttrsEditor = ({ value, onChange }: any) => {
    const [text, setText] = useState(value ? JSON.stringify(value, null, 2) : "");
    const [error, setError] = useState(false);

    useEffect(() => {
        const currentText = value ? JSON.stringify(value, null, 2) : "";
        try {
            if (JSON.stringify(parseJsonc(text)) === JSON.stringify(value)) return;
        } catch (e) { }
        setText(currentText);
    }, [value]);

    const handleChange = (v: string) => {
        setText(v);
        if (!v.trim()) {
            onChange(undefined);
            setError(false);
            return;
        }
        try {
            const parsed = parseJsonc(v);
            onChange(parsed);
            setError(false);
        } catch (e) {
            setError(true);
        }
    };

    return (
        <div className="flex-1 flex flex-col relative">
            <textarea
                className={`input-base font-mono text-xs flex-1 min-h-[140px] resize-none bg-slate-950/50 border-slate-800/80 focus:border-indigo-500/50 transition-all p-3 ${error ? 'ring-1 ring-rose-500/30 border-rose-500/50' : ''}`}
                placeholder='{":method": "GET"}'
                value={text}
                onChange={e => handleChange(e.target.value)}
            />
            {error && (
                <div className="absolute bottom-2 right-2 text-[9px] font-bold text-rose-500 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/30 animate-pulse">
                    INVALID JSON
                </div>
            )}
        </div>
    );
};

export const RuleEditor = ({
    rule,
    onChange,
    outboundTags,
    balancerTags,
    inboundTags,
    geoData,
    rawMode,
    allRules = [],
    onSelectRule
}: any) => {
    // Стейт для просмотра деталей тега по клику
    const [viewTag, setViewTag] = useState<string | null>(null);
    const [localRawText, setLocalRawText] = useState<string | null>(null);
    const rawConfigText = useConfigStore(state => state.rawConfigText);

    // Calculate duplicate matchers across all rules (flagging all conflicting rules)
    const duplicateWarnings = React.useMemo(() => {
        if (!allRules || !rule) return [];
        const currentIdx = rule.originalIndex !== undefined ? rule.originalIndex : allRules.findIndex((r: any) => r === rule);
        if (currentIdx < 0) return [];

        const itemWarnings: Array<{ matcher: string; otherRuleName: string; otherIndex: number }> = [];
        const domainToRules = new Map<string, Array<{ index: number; name: string }>>();
        const ipToRules = new Map<string, Array<{ index: number; name: string }>>();

        allRules.forEach((r: any, i: number) => {
            const rName = r.ruleTag || r.outboundTag || r.balancerTag || `Rule #${i + 1}`;
            if (Array.isArray(r.domain)) {
                r.domain.forEach((d: string) => d && typeof d === 'string' && (domainToRules.has(d.trim().toLowerCase()) ? domainToRules.get(d.trim().toLowerCase())!.push({ index: i, name: rName }) : domainToRules.set(d.trim().toLowerCase(), [{ index: i, name: rName }])));
            }
            if (Array.isArray(r.ip)) {
                r.ip.forEach((ip: string) => ip && typeof ip === 'string' && (ipToRules.has(ip.trim().toLowerCase()) ? ipToRules.get(ip.trim().toLowerCase())!.push({ index: i, name: rName }) : ipToRules.set(ip.trim().toLowerCase(), [{ index: i, name: rName }])));
            }
        });

        if (Array.isArray(rule.domain)) {
            rule.domain.forEach((d: string) => {
                if (!d || typeof d !== 'string') return;
                const matches = domainToRules.get(d.trim().toLowerCase()) || [];
                matches.filter(m => m.index !== currentIdx).forEach(m => {
                    itemWarnings.push({ matcher: d, otherRuleName: m.name, otherIndex: m.index });
                });
            });
        }

        if (Array.isArray(rule.ip)) {
            rule.ip.forEach((ip: string) => {
                if (!ip || typeof ip !== 'string') return;
                const matches = ipToRules.get(ip.trim().toLowerCase()) || [];
                matches.filter(m => m.index !== currentIdx).forEach(m => {
                    itemWarnings.push({ matcher: ip, otherRuleName: m.name, otherIndex: m.index });
                });
            });
        }

        return itemWarnings;
    }, [rule, allRules]);

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
            <div className="flex-1 w-full h-full bg-slate-950 overflow-hidden">
                <JsonField
                    label="Raw Rule JSON"
                    value={rule}
                    onChange={(val: any, raw?: string) => {
                        onChange(val);
                        if (raw !== undefined) setLocalRawText(raw);
                    }}
                    className="h-full"
                    schemaMode="rule"
                    rawText={localRawText}
                    rawConfigText={rawConfigText}
                    onSaveShortcut={() => useConfigStore.getState().saveActiveProfile()}
                    onCommitShortcut={() => useConfigStore.getState().recordSnapshot("Manual Commit (Ctrl+Shift+S)")}
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

    const handleAutofixMatchers = () => onChange({ ...rule, network: "tcp,udp" });
    const handleAutofixCase = () => onChange({
        ...rule,
        ...(rule.domain ? { domain: rule.domain.map((d: string) => d.toLowerCase()) } : {}),
        ...(rule.ip ? { ip: rule.ip.map((ip: string) => ip.toLowerCase()) } : {}),
    });

    const errors = validateRule(rule);
    const warnings = lintRule(rule);

    const hasMissingMatchers = errors.some((e: any) => e.field === 'matchers');
    const missingTarget = errors.some((e: any) => e.field === 'target');

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

    const errorRecord: Record<string, string> = {};
    errors.forEach((e: any) => {
        errorRecord[e.field] = e.message;
    });

    return (
        <div className="flex-1 min-h-0 w-full overflow-y-auto custom-scroll p-6 space-y-6 bg-slate-950/30 h-full relative">

            {duplicateWarnings.length > 0 && (
                <div className="p-3.5 bg-amber-950/40 border border-amber-500/50 rounded-xl flex items-start gap-2.5 animate-in fade-in">
                    <Icon name="Warning" weight="fill" className="text-amber-400 text-lg shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="text-[11px] font-bold text-amber-300 uppercase tracking-wide">
                            Conflicting Duplicate Matchers ({duplicateWarnings.length})
                        </p>
                        <ul className="space-y-1.5 text-[11px] text-amber-200/80">
                            {duplicateWarnings.map((warn, i) => (
                                <li key={i} className="flex flex-wrap items-center justify-between gap-1 bg-amber-900/20 p-1.5 px-2 rounded-lg border border-amber-500/20">
                                    <span>
                                        <b>"{warn.matcher}"</b> is also used in <b>{warn.otherRuleName}</b> (Rule #{warn.otherIndex + 1})
                                    </span>
                                    {onSelectRule && (
                                        <button
                                            type="button"
                                            onClick={() => onSelectRule(warn.otherIndex)}
                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-200 hover:text-white bg-amber-800/60 hover:bg-amber-700/80 border border-amber-500/40 rounded px-2 py-0.5 transition-all shadow-sm"
                                            title={`Jump to Rule #${warn.otherIndex + 1}`}
                                        >
                                            View Rule #{warn.otherIndex + 1} <Icon name="ArrowRight" className="text-[9px]" />
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

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
                    <Select
                        className="flex-1"
                        value={currentTarget}
                        placeholder="Select Target..."
                        onChange={val => {
                            if (val.startsWith('bal:')) update('balancerTag', val.replace('bal:', ''));
                            else update('outboundTag', val);
                        }}
                        options={[
                            ...outboundTags.map((t: string) => ({ value: t, label: t, description: 'Outbound' })),
                            ...balancerTags.map((t: string) => ({ value: `bal:${t}`, label: `⚡ ${t}`, description: 'Load Balancer' }))
                        ]}
                    />
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
                            label={<span className="flex items-center">Domains (GeoSite) <Help>List of domains to match. Use geosite:google for predefined groups.</Help></span>}
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
                            label={<span className="flex items-center">IPs (GeoIP & CIDR) <Help>List of IP addresses or CIDR ranges. Use geoip:cn for country-based matching.</Help></span>}
                            prefix="geoip:"
                            placeholder="8.8.8.8, geoip:cn..."
                            value={rule.ip || []}
                            onChange={v => update('ip', v)}
                            suggestions={geoData.ips}
                            isLoading={geoData.loading}
                            invalidTags={invalidIPs}
                            warnTags={warnIPs}
                            onTagClick={setViewTag}
                            allowedPattern={/[^0-9a-zA-Z./:, ]/g}
                        />
                    </div>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50 space-y-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block border-b border-slate-800 pb-2">
                        Advanced Matchers
                    </label>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <TagSelector
                                label={<span className="flex items-center">Inbound Source <Help>Filter traffic by the tag of the inbound connection.</Help></span>}
                                availableTags={inboundTags} selected={rule.inboundTag || []}
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
                        <div className="flex flex-col gap-1.5">
                            <label className="label-xs flex items-center gap-1.5 text-slate-400">
                                Domain Strategy (Force IP) <Help>UseIP will force Xray to resolve the domain before matching.</Help>
                            </label>
                            <Select
                                value={rule.domainStrategy || ""}
                                onChange={val => update('domainStrategy', val || undefined)}
                                options={[
                                    { value: "", label: "Default (Inherit)" },
                                    { value: "AsIs", label: "AsIs" },
                                    { value: "UseIP", label: "UseIP" },
                                    { value: "UseIPv4", label: "UseIPv4" },
                                    { value: "UseIPv6", label: "UseIPv6" },
                                ]}
                                className="w-full"
                            />
                        </div>

                        <div className="col-span-2 pt-6 mt-2 border-t border-slate-800/50">
                            <SchemaForm
                                schema={RoutingRuleSchema}
                                value={rule}
                                onChange={onChange}
                                errors={errorRecord}
                                excludeKeys={[
                                    'domain', 'ip', 'inboundTag', 'network', 'protocol',
                                    'domainStrategy', 'attrs', 'webhook', 'outboundTag', 'balancerTag',
                                    'ruleTag', 'type'
                                ]}
                                fieldConfigs={{
                                    port: {
                                        label: 'Target Port',
                                        help: 'Destination port or port range, e.g. "80", "1-65535", "53,443".',
                                        placeholder: 'e.g. 443'
                                    },
                                    sourcePort: {
                                        label: 'Source Port',
                                        help: 'Source port or port range.',
                                        placeholder: 'e.g. 1000-2000'
                                    },
                                    localPort: {
                                        label: 'Local Port',
                                        help: 'Local port (for transparent proxy).',
                                        placeholder: 'e.g. 53'
                                    },
                                    vlessRoute: {
                                        label: 'vlessRoute',
                                        help: 'Match VLESS route header.',
                                        placeholder: 'e.g. 1'
                                    },
                                    source: {
                                        label: 'Source IP (CIDR)',
                                        help: 'Source IP/CIDR match list.',
                                        placeholder: 'e.g. 10.0.0.1'
                                    },
                                    localIP: {
                                        label: 'Local IP',
                                        help: 'Local IP match list (for transparent proxy).',
                                        placeholder: 'e.g. 192.168.0.1'
                                    },
                                    user: {
                                        label: 'User (Email)',
                                        help: 'User email match list.',
                                        placeholder: 'e.g. user@xray.com'
                                    },
                                    process: {
                                        label: 'Process Name',
                                        help: 'Process name match list.',
                                        placeholder: 'e.g. curl, self/'
                                    },
                                    localOS: {
                                        label: 'Local OS (Experimental)',
                                        help: 'Matches the OS the Xray process runs on (e.g. windows, linux, darwin). Landed on xray-core main 2026-08-12 (commit a12801c1) — not in a tagged release yet.',
                                        placeholder: 'e.g. windows, linux'
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Extended / Advanced Features */}
                <ExtendedSection
                    title="Extended Rule Settings & Webhooks"
                    description="Custom HTTP attributes, rule tagging for metrics, and webhook dispatch."
                    hasActiveValues={!!rule.attrs || !!rule.webhook || !!rule.ruleTag}
                    activeCount={[rule.attrs, rule.webhook, rule.ruleTag].filter(Boolean).length}
                >
                    <div className="space-y-4">
                        <div>
                            <label className="label-xs text-slate-400 mb-1.5 block">
                                Rule Tag / Alias <Help>Custom identifier for this rule in stats and metrics.</Help>
                            </label>
                            <input
                                type="text"
                                className="input-base font-mono text-xs"
                                placeholder="e.g. bypass-telegram"
                                value={rule.ruleTag || ""}
                                onChange={e => update('ruleTag', e.target.value || undefined)}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-800/60">
                            <div className="flex flex-col gap-2 h-full">
                                <label className="label-xs flex items-center gap-1.5 text-slate-400">
                                    HTTP Attributes (JSON) <Help>{`e.g. {":method": "GET", ":path": "/test"}`}</Help>
                                </label>
                                <AttrsEditor value={rule.attrs} onChange={(v: any) => update('attrs', v)} />
                            </div>
                            <div className="flex flex-col gap-2 h-full">
                                <label className="label-xs flex items-center gap-1.5 text-slate-400">
                                    Webhook Notification <Help>Send HTTP POST notification on match.</Help>
                                </label>
                                <div className="flex flex-col gap-4 flex-1">
                                    <SchemaForm
                                        schema={WebhookObjectSchema}
                                        value={typeof rule.webhook === 'object' ? rule.webhook : {}}
                                        onChange={val => update('webhook', val)}
                                        errors={errorRecord}
                                        fieldConfigs={{
                                            url: {
                                                label: 'Callback URL',
                                                placeholder: 'https://api.site.com/hook',
                                                help: 'URL to POST webhook notifications.'
                                            },
                                            deduplication: {
                                                label: 'Deduplication (seconds)',
                                                placeholder: '10',
                                                help: 'Deduplication interval in seconds.'
                                            },
                                            headers: {
                                                label: 'Headers',
                                                placeholder: 'e.g. Authorization: Bearer token',
                                                help: 'Custom HTTP headers for the webhook request.'
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </ExtendedSection>

            </div>

            {/* Рендерим модалку деталей тега поверх формы */}
            {viewTag && <TagDetailsModal tag={viewTag} onClose={() => setViewTag(null)} />}
        </div>
    );
};