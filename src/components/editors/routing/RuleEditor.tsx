import React, { useState, useEffect } from 'react';
import { Icon, Help, SmartTagInput, TagSelector, JsonField, Select, SchemaForm, ExtendedSection } from '../../ui';
import { TagDetailsModal } from '../TagDetailsModal';
import { RoutingRuleSchema, WebhookObjectSchema } from '../../../core/xray/schemas/routing.schema';
import { parseJsonc } from '../../../utils/jsonc';
import { useConfigStore } from '../../../store/configStore';
import { useRuleEditor } from '../../../hooks/useRuleEditor';
import { isSnippetRef } from '../../../core/snippets';
import { SnippetRefEditor } from './SnippetRefEditor';
import { t } from '../../../i18n';

const AttrsEditor = ({ value, onChange }: any) => {
    const [text, setText] = useState(value ? JSON.stringify(value, null, 2) : "");
    const [error, setError] = useState(false);

    useEffect(() => {
        const currentText = value ? JSON.stringify(value, null, 2) : "";
        try {
            if (JSON.stringify(parseJsonc(text)) === JSON.stringify(value)) return;
        } catch { }
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
        } catch {
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
                    {t("INVALID JSON")}
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
    onSelectRule,
    snippets = [],
    onOpenSnippets,
    onInlineSnippet
}: any) => {
    // Стейт для просмотра деталей тега по клику
    const [viewTag, setViewTag] = useState<string | null>(null);
    const [localRawText, setLocalRawText] = useState<string | null>(null);
    const rawConfigText = useConfigStore(state => state.rawConfigText);

    const {
        duplicateWarnings,
        update,
        handleAutofixMatchers,
        handleAutofixCase,
        errors,
        warnings,
        hasMissingMatchers,
        missingTarget,
        invalidDomains,
        invalidIPs,
        warnDomains,
        warnIPs,
        currentTarget,
        errorRecord,
    } = useRuleEditor(rule, onChange, allRules);

    if (!rule) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 h-full">
                <Icon name="ArrowsSplit" className="text-6xl mb-4 opacity-10" />
                <p>{t("Select a rule to configure routing logic")}</p>
            </div>
        );
    }

    // A Remnawave snippet reference has no rule fields to edit — show what it
    // resolves to instead of an empty rule form. See core/snippets.
    if (isSnippetRef(rule) && !rawMode) {
        return (
            <SnippetRefEditor
                key={rule.snippet}
                rule={rule}
                onChange={onChange}
                snippets={snippets}
                onOpenSnippets={onOpenSnippets}
                onInlineCopy={onInlineSnippet}
            />
        );
    }

    if (rawMode) {
        return (
            <div className="flex-1 w-full h-full bg-slate-950 overflow-hidden">
                <JsonField
                    label={t("Raw Rule JSON")}
                    value={rule}
                    onChange={(val: any, raw?: string) => {
                        // Pass raw through so the store can splice this rule's
                        // literal text (comments included) into routing.rules
                        // instead of a freshly-serialized, comment-free object.
                        onChange(val, raw);
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
                                        {t("“{matcher}” is also used in {rule} (rule #{number})", {
                                            matcher: warn.matcher,
                                            rule: warn.otherRuleName,
                                            number: warn.otherIndex + 1,
                                        })}
                                    </span>
                                    {onSelectRule && (
                                        <button
                                            type="button"
                                            onClick={() => onSelectRule(warn.otherIndex)}
                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-200 hover:text-white bg-amber-800/60 hover:bg-amber-700/80 border border-amber-500/40 rounded px-2 py-0.5 transition-all shadow-sm"
                                            title={t("Jump to rule #{n}", { n: warn.otherIndex + 1 })}
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
                                {t("Auto-fix: add network: tcp,udp (proper catch-all)")}
                                </button>
                        )}
                    </div>
                </div>
            )}

            {warnings.length > 0 && (
                <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-xl flex items-start gap-2.5 animate-in fade-in">
                    <Icon name="Warning" weight="fill" className="text-amber-400 text-base shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="text-[10px] text-amber-400/70 font-bold uppercase tracking-wide">{t("Style lint")}</p>
                        <ul className="space-y-0.5 text-[11px] text-amber-200/80">
                            {warnings.map((w: any, i: number) => <li key={i}>{w.message}</li>)}
                        </ul>
                        <button
                            onClick={handleAutofixCase}
                            className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300 hover:text-amber-200 bg-amber-900/20 hover:bg-amber-800/30 border border-amber-700/30 rounded-lg px-3 py-1.5 transition-colors"
                        >
                            <Icon name="MagicWand" />
                            {t("Auto-fix: convert to lowercase")}
                            </button>
                    </div>
                </div>
            )}

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg border-l-4 border-l-indigo-500">
                <label className="label-xs text-indigo-400">{t("Rule Alias / Name (ruleTag)")}</label>
                <input
                    className="input-base mt-1 font-bold"
                    placeholder={t("e.g. Block Ads, Global Proxy...")}
                    value={rule.ruleTag || ""}
                    onChange={e => update('ruleTag', e.target.value)}
                />
                <p className="text-[10px] text-slate-500 mt-1 italic">
                    {t("This name will be shown in UI and Xray logs when matched.")}
                    </p>
            </div>

            <div className={`bg-slate-900 border p-4 rounded-xl shadow-lg ${missingTarget ? 'border-rose-500/60' : 'border-slate-800'}`}>
                <div className="flex flex-wrap justify-between items-center gap-x-3 gap-y-1 mb-2">
                    <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{t("Traffic Destination")}</label>
                    <div className="text-[10px] text-slate-500 font-mono">{t("Where to send traffic")}</div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Select
                        className="flex-1"
                        value={currentTarget}
                        placeholder={t("Select Target...")}
                        onChange={val => {
                            if (val.startsWith('bal:')) update('balancerTag', val.replace('bal:', ''));
                            else update('outboundTag', val);
                        }}
                        options={[
                            ...outboundTags.map((tag: string) => ({ value: tag, label: tag, description: t("Outbound") })),
                            ...balancerTags.map((tag: string) => ({ value: `bal:${tag}`, label: `⚡ ${tag}`, description: t("Load Balancer") }))
                        ]}
                    />
                    <input
                        className={`w-full sm:w-1/3 input-base text-slate-300 ${missingTarget ? 'border-rose-500 bg-rose-500/10' : ''}`}
                        placeholder={t("Custom tag...")}
                        value={rule.outboundTag || rule.balancerTag || ""}
                        onChange={e => update('outboundTag', e.target.value)}
                    />
                </div>
                {missingTarget && (
                    <p className="text-[10px] text-rose-400 mt-1.5">
                        {t("Required — select or type a destination tag, otherwise Xray will crash.")}
                        </p>
                )}
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <SmartTagInput
                            label={<span className="flex items-center">{t("Domains (GeoSite)")} <Help>{t("List of domains to match. Use geosite:google for predefined groups.")}</Help></span>}
                            prefix="geosite:"
                            placeholder={t("google, geosite:netflix...")}
                            value={rule.domain || []}
                            onChange={v => update('domain', v)}
                            suggestions={geoData.sites}
                            isLoading={geoData.loading}
                            invalidTags={invalidDomains}
                            warnTags={warnDomains}
                            onTagClick={setViewTag}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <SmartTagInput
                            label={<span className="flex items-center">{t("IPs (GeoIP & CIDR)")} <Help>{t("List of IP addresses or CIDR ranges. Use geoip:cn for country-based matching.")}</Help></span>}
                            prefix="geoip:"
                            placeholder={t("8.8.8.8, geoip:cn...")}
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
                        {t("Advanced Matchers")}
                        </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <TagSelector
                                label={<span className="flex items-center">{t("Inbound Source")} <Help>{t("Filter traffic by the tag of the inbound connection.")}</Help></span>}
                                availableTags={inboundTags} selected={rule.inboundTag || []}
                                onChange={v => update('inboundTag', v)} multi={true} />
                        </div>
                        <div>
                            <TagSelector
                                label={t("Network")}
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
                            <TagSelector label={t("Protocol")} availableTags={['http', 'tls', 'bittorrent']} selected={rule.protocol || []}
                                onChange={v => update('protocol', v)} multi={true} />
                        </div>

                        {/* Domain Strategy (Force IP) */}
                        <div className="flex flex-col gap-1.5">
                            <label className="label-xs flex items-center gap-1.5 text-slate-400">
                                Domain Strategy (Force IP) <Help>{t("UseIP will force Xray to resolve the domain before matching.")}</Help>
                            </label>
                            <Select
                                value={rule.domainStrategy || ""}
                                onChange={val => update('domainStrategy', val || undefined)}
                                options={[
                                    { value: "", label: t("Default (Inherit)") },
                                    { value: "AsIs", label: t("AsIs") },
                                    { value: "UseIP", label: t("UseIP") },
                                    { value: "UseIPv4", label: t("UseIPv4") },
                                    { value: "UseIPv6", label: t("UseIPv6") },
                                ]}
                                className="w-full"
                            />
                        </div>

                        <div className="md:col-span-2 pt-6 mt-2 border-t border-slate-800/50">
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
                                        label: t("Target Port"),
                                        help: 'Destination port or port range, e.g. "80", "1-65535", "53,443".',
                                        placeholder: 'e.g. 443'
                                    },
                                    sourcePort: {
                                        label: t("Source Port"),
                                        help: t("Source port or port range."),
                                        placeholder: 'e.g. 1000-2000'
                                    },
                                    localPort: {
                                        label: t("Local Port"),
                                        help: t("Local port (for transparent proxy)."),
                                        placeholder: 'e.g. 53'
                                    },
                                    vlessRoute: {
                                        label: t("vlessRoute"),
                                        help: t("Match VLESS route header."),
                                        placeholder: 'e.g. 1'
                                    },
                                    source: {
                                        label: t("Source IP (CIDR)"),
                                        help: t("Source IP/CIDR match list."),
                                        placeholder: 'e.g. 10.0.0.1'
                                    },
                                    localIP: {
                                        label: t("Local IP"),
                                        help: t("Local IP match list (for transparent proxy)."),
                                        placeholder: 'e.g. 192.168.0.1'
                                    },
                                    user: {
                                        label: t("User (Email)"),
                                        help: t("User email match list."),
                                        placeholder: t("e.g. user@xray.com")
                                    },
                                    process: {
                                        label: t("Process Name"),
                                        help: t("Process name match list."),
                                        placeholder: t("e.g. curl, self/")
                                    },
                                    localOS: {
                                        label: t("Local OS (Experimental)"),
                                        help: t("Matches the OS the Xray process runs on (e.g. windows, linux, darwin). Landed on xray-core main 2026-08-12 (commit a12801c1) — not in a tagged release yet."),
                                        placeholder: t("e.g. windows, linux")
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Extended / Advanced Features */}
                <ExtendedSection
                    title={t("Extended Rule Settings & Webhooks")}
                    description={t("Custom HTTP attributes, rule tagging for metrics, and webhook dispatch.")}
                    hasActiveValues={!!rule.attrs || !!rule.webhook || !!rule.ruleTag}
                    activeCount={[rule.attrs, rule.webhook, rule.ruleTag].filter(Boolean).length}
                >
                    <div className="space-y-4">
                        <div>
                            <label className="label-xs text-slate-400 mb-1.5 block">
                                Rule Tag / Alias <Help>{t("Custom identifier for this rule in stats and metrics.")}</Help>
                            </label>
                            <input
                                type="text"
                                className="input-base font-mono text-xs"
                                placeholder={t("e.g. bypass-telegram")}
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
                                    Webhook Notification <Help>{t("Send HTTP POST notification on match.")}</Help>
                                </label>
                                <div className="flex flex-col gap-4 flex-1">
                                    <SchemaForm
                                        schema={WebhookObjectSchema}
                                        value={typeof rule.webhook === 'object' ? rule.webhook : {}}
                                        onChange={val => update('webhook', val)}
                                        errors={errorRecord}
                                        fieldConfigs={{
                                            url: {
                                                label: t("Callback URL"),
                                                placeholder: 'https://api.site.com/hook',
                                                help: t("URL to POST webhook notifications.")
                                            },
                                            deduplication: {
                                                label: t("Deduplication (seconds)"),
                                                placeholder: '10',
                                                help: t("Deduplication interval in seconds.")
                                            },
                                            headers: {
                                                label: t("Headers"),
                                                placeholder: t("e.g. Authorization: Bearer token"),
                                                help: t("Custom HTTP headers for the webhook request.")
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