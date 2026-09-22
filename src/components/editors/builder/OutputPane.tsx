import React from "react";
import { Button, Input, Select, Switch, JsonEditor } from "../../ui";
import { Badge } from "../../ui/Badge";
import { NumberInput } from "../../ui/NumberInput";
import { DurationInput } from "../../ui/DurationInput";
import { Help } from "../../ui/Help";
import { TemplateJsonView } from "./TemplateJsonView";
import { LOCAL_BALANCER_PRESETS } from "../../../core/generators/local-balancer";
import { DNS_RESOLVERS, matchResolverPreset } from "../../../core/presets/dns";
import { Section } from "./builder-parts";
import { entryFieldLabel } from "./entry-field-label";
import { t, tn } from "../../../i18n";

/** The options, and the JSON they produce. */
export const OutputPane = ({
    b,
    tpl,
    options,
    isTemplate,
    multi,
    selectorType,
    mobilePane,
    templateView,
    switchTemplateView,
    editingSavedTemplate,
}: {
    b: any;
    tpl: any;
    options: any;
    isTemplate: boolean;
    multi: boolean;
    selectorType: string;
    mobilePane: 'nodes' | 'output';
    templateView: 'form' | 'json';
    switchTemplateView: (view: 'form' | 'json') => void;
    editingSavedTemplate: boolean;
}) => (
        <div className={`flex-1 min-w-0 flex-col min-h-0 gap-3 overflow-y-auto custom-scroll pr-1 ${mobilePane === 'output' ? 'flex' : 'hidden md:flex'}`}>
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1 shrink-0">
                {([['config', t("Client config")], ['template', t("Panel template")]] as const).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => b.setOutputMode(key)}
                        title={key === 'config'
                            ? 'A finished config for one person: nodes baked in'
                            : 'An Xray JSON template the panel renders per subscriber, injecting its own hosts as the balanced nodes'}
                        className={`flex-1 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                            b.outputMode === key ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {isTemplate && (
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1 shrink-0">
                    {([['form', t("Form")], ['json', t("JSON")]] as const).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => switchTemplateView(key)}
                            title={key === 'form'
                                ? 'Edit the template through the fields'
                                : 'Edit the template body directly — the same JSON the panel stores'}
                            className={`flex-1 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                                templateView === key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}

            <div className={`flex-wrap items-center gap-2 shrink-0 ${isTemplate && templateView === 'json' ? 'hidden' : 'flex'}`}>
                {(['simple', 'fleet'] as const).map(key => (
                    <button
                        key={key}
                        onClick={() => b.applyPreset(key)}
                        title={LOCAL_BALANCER_PRESETS[key]!.description}
                        className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all ${
                            b.presetKey === key
                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        {LOCAL_BALANCER_PRESETS[key]!.label}
                    </button>
                ))}
                {b.presetKey === 'custom' && <Badge variant="warning" size="sm">{t("Custom")}</Badge>}
                {b.preview && (
                    <div className="flex items-center gap-1.5 ml-auto">
                        <Badge variant="primary" size="sm" icon="Scales">
                            {b.preview.summary.balanced
                                ? `${b.preview.summary.nodeCount} nodes → ${b.preview.summary.balancerTag}`
                                : 'single node, no balancer'}
                        </Badge>
                        {b.preview.summary.balanced && (
                            <Badge variant="info" size="sm" icon="Broadcast">{b.preview.summary.probe}</Badge>
                        )}
                    </div>
                )}
            </div>

            <div className={`grid-cols-1 xl:grid-cols-2 gap-3 shrink-0 ${
                isTemplate && templateView === 'json' ? 'hidden' : 'grid'
            }`}>
                <Section title={t("Balancer")}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Input
                            label={t("Tag prefix")}
                            value={options.proxyTagPrefix}
                            onChange={(e: any) => b.setOption({ proxyTagPrefix: e.target.value })}
                            hint={t("Also the selector")}
                            help={t("Every proxy outbound is named with this prefix, and the balancer selects on it. Change it and the tags in the generated config change with it.")}
                        />
                        <Input
                            label={t("Balancer tag")}
                            value={options.balancerTag}
                            onChange={(e: any) => b.setOption({ balancerTag: e.target.value })}
                            help={t("The name of the balancer itself. Routing rules send traffic to this tag instead of to a single outbound.")}
                        />
                    </div>
                    <Select
                        label={t("Tag style")}
                        help={t("How the individual node tags are numbered. Cosmetic — pick whatever matches the configs you already run.")}
                        value={options.tagStyle}
                        onChange={v => b.setOption({ tagStyle: v as any })}
                        options={[
                            { value: 'numbered', label: t("proxy, proxy-2, proxy-3") },
                            { value: 'zeroIndexed', label: t("fb-0, fb-1, fb-2") },
                            { value: 'labelled', label: t("proxy-Amsterdam-1") },
                        ]}
                    />
                    <Select
                        label={t("Strategy")}
                        help={t("How the balancer picks a node for each connection. leastPing and leastLoad need a probe; roundRobin and random do not measure anything.")}
                        value={options.strategy}
                        onChange={v => b.setOption({ strategy: v as any })}
                        options={[
                            { value: 'leastLoad', label: t("leastLoad"), description: t("Fastest by measured load") },
                            { value: 'leastPing', label: t("leastPing"), description: t("Fastest by probe RTT") },
                            { value: 'roundRobin', label: t("roundRobin"), description: t("Rotate through nodes") },
                            { value: 'random', label: t("random"), description: t("Pick at random") },
                        ]}
                    />
                    <Select
                        label={t("Fallback")}
                        value={options.fallbackTag}
                        onChange={v => b.setOption({ fallbackTag: v as any })}
                        help={t("Where traffic goes when the balancer has nothing healthy to pick. \"None\" drops the connection, which surfaces the outage instead of hiding it behind a slow node.")}
                        options={[
                            { value: 'none', label: t("None"), description: t("Fail the connection") },
                            { value: 'first', label: t("First node"), description: t("Degrade to node #1 instead of failing") },
                            // A loaded config can name any outbound here; showing it as
                            // "First node" would misreport what the JSON actually says.
                            ...(options.fallbackTag !== 'none' && options.fallbackTag !== 'first'
                                ? [{ value: options.fallbackTag, label: `Custom: ${options.fallbackTag}` }]
                                : []),
                        ]}
                    />
                    {options.strategy === 'leastLoad' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                                <span className="label-xs flex items-center">
                                    {t("Max RTT")}
                                    <Help>{t("Nodes slower than this are treated as unusable. Too low and the pool empties; too high and a bad node keeps getting traffic.")}</Help>
                                </span>
                                <DurationInput
                                    value={options.strategySettings.maxRTT}
                                    onChange={v => b.setOption({ strategySettings: { ...options.strategySettings, maxRTT: v } })}
                                    defaultUnit="s"
                                />
                            </div>
                            <div>
                                <span className="label-xs flex items-center">
                                    {t("Expected")}
                                    <Help>{t("How many healthy nodes leastLoad aims to keep in play. Leave at 1 unless you are deliberately spreading load across several.")}</Help>
                                </span>
                                <NumberInput
                                    value={options.strategySettings.expected}
                                    onChange={v => b.setOption({ strategySettings: { ...options.strategySettings, expected: v } })}
                                    min={1}
                                />
                            </div>
                        </div>
                    )}
                </Section>

                <Section title={t("Probe")}>
                    <Select
                        label={t("Kind")}
                        help={t("How node health is measured. burstObservatory pings every node at once and reacts fastest; observatory walks them one at a time and is gentler on the nodes.")}
                        value={options.probe}
                        onChange={v => b.setOption({ probe: v as any })}
                        options={[
                            { value: 'burst', label: t("burstObservatory (concurrent pings)"), description: t("Measures latency to the probe URL from every node at once") },
                            { value: 'observatory', label: t("observatory (sequential)"), description: t("Classic probe, one node after another") },
                            { value: 'none', label: t("None"), description: t("Balancer picks without measuring") },
                        ]}
                    />
                    {options.probe !== 'none' && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                    <span className="label-xs flex items-center">
                                        {t("Interval")}
                                        <Help>{t("How often each node is probed. Shorter reacts to an outage sooner and costs more requests from every client running this config.")}</Help>
                                    </span>
                                    <DurationInput
                                        value={options.probeInterval}
                                        onChange={v => b.setOption({ probeInterval: v })}
                                        defaultUnit="s"
                                    />
                                </div>
                                <div>
                                    <span className="label-xs flex items-center">
                                        {t("Timeout")}
                                        <Help>{t("A probe that takes longer than this counts as a failure. Keep it below the interval.")}</Help>
                                    </span>
                                    <DurationInput
                                        value={options.probeTimeout}
                                        onChange={v => b.setOption({ probeTimeout: v })}
                                        defaultUnit="s"
                                    />
                                </div>
                            </div>
                            {options.probe === 'burst' && (
                                <div>
                                    <span className="label-xs flex items-center">
                                        {t("Samples kept")}
                                        <Help>{t("How many recent probe results are averaged. More samples smooth out a single bad ping; fewer switch away from a failing node sooner.")}</Help>
                                    </span>
                                    <NumberInput
                                        value={options.probeSampling}
                                        onChange={v => b.setOption({ probeSampling: v ?? 1 })}
                                        min={1}
                                    />
                                </div>
                            )}
                            <Input
                                label={t("Probe URL")}
                                value={options.probeURL}
                                onChange={(e: any) => b.setOption({ probeURL: e.target.value })}
                                help={t("The address each node is measured against. It should answer HTTP 204 with an empty body, so the timing reflects the route and not the page.")}
                            />
                        </>
                    )}
                </Section>

                <Section title={t("Local listeners")}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                            <span className="label-xs">{t("SOCKS port")}</span>
                            <NumberInput
                                value={options.socksPort ?? undefined}
                                onChange={v => b.setOption({ socksPort: v ?? null })}
                                min={1}
                                max={65535}
                                placeholder="off"
                            />
                        </div>
                        <div>
                            <span className="label-xs">{t("HTTP port")}</span>
                            <NumberInput
                                value={options.httpPort ?? undefined}
                                onChange={v => b.setOption({ httpPort: v ?? null })}
                                min={1}
                                max={65535}
                                placeholder="off"
                            />
                        </div>
                    </div>
                    <Input
                        label={t("Listen address")}
                        value={options.listen}
                        onChange={(e: any) => b.setOption({ listen: e.target.value })}
                        hint={t("127.0.0.1 keeps the proxy off your LAN")}
                    />
                    <Switch
                        checked={options.sniffing}
                        onChange={v => b.setOption({ sniffing: v })}
                        label={t("Sniffing (needed for domain rules)")}
                    />
                </Section>

                {isTemplate && (
                    <Section title={t("Which hosts the panel injects")}>
                        <p className="text-[10px] text-slate-500 -mt-1">
                            {t("The template carries no nodes. The panel injects the hosts this selector picks, tagging them {prefix}… so the balancer and probe find them.", {
                                prefix: b.options.proxyTagPrefix,
                            })}
                        </p>
                        <Select
                            label={t("Pick hosts by")}
                            value={selectorType}
                            onChange={v => b.setInjectSelector(v as any)}
                            options={[
                                { value: 'sameTagAsRecipient', label: t("Same tag as the entry host"), description: t("The usual choice: matches the shared tag set below") },
                                { value: 'tagRegex', label: t("Host tag matches a pattern") },
                                { value: 'remarkRegex', label: t("Host remark matches a pattern") },
                                { value: 'uuids', label: t("An explicit list of hosts") },
                            ]}
                        />
                        {(selectorType === 'tagRegex' || selectorType === 'remarkRegex') && (
                            <Input
                                label={t("Pattern")}
                                value={'pattern' in b.inject.selector ? b.inject.selector.pattern : ''}
                                onChange={(e: any) => b.setInjectPattern(e.target.value)}
                                placeholder={t("^NL")}
                            />
                        )}
                        {selectorType === 'uuids' && (
                            <div className="flex items-center gap-2">
                                <Badge variant={'values' in b.inject.selector && b.inject.selector.values.length > 0 ? 'success' : 'warning'} size="sm">
                                    {'values' in b.inject.selector ? b.inject.selector.values.length : 0} host(s)
                                </Badge>
                                <Button variant="secondary" size="sm" icon="Check" className="text-[10px]" onClick={b.useSelectedHostsAsSelector}>
                                    {t("Use panel selection")}
                                    </Button>
                            </div>
                        )}
                        <Select
                            label={t("Take hosts from")}
                            value={b.inject.selectFrom}
                            onChange={v => b.setInject({ ...b.inject, selectFrom: v as any })}
                            options={[
                                { value: 'HIDDEN', label: t("The hidden hosts (the pool)"), description: t("The nodes sitting behind a visible entry host") },
                                { value: 'NOT_HIDDEN', label: t("Visible hosts") },
                                { value: 'ALL', label: t("All hosts") },
                            ]}
                        />
                        <Switch
                            checked={b.inject.addVirtualHostAsOutbound}
                            onChange={v => b.setInject({ ...b.inject, addVirtualHostAsOutbound: v })}
                            label={t("Also send traffic through the entry host's own address")}
                        />
                    </Section>
                )}

                {isTemplate && (
                    <Section title={t("Step 1 · Save the template to the panel")}>
                        <Select
                            label={t("Target")}
                            value={b.templateTargetUuid}
                            onChange={v => b.setTemplateTargetUuid(v)}
                            options={[
                                { value: '', label: t("Create a new template") },
                                ...b.panelTemplateItems
                                    .filter((tpl: any) => tpl.templateType === 'XRAY_JSON')
                                    .map((tpl: any) => ({ value: tpl.uuid, label: `Update: ${tpl.name}` })),
                            ]}
                        />
                        {b.templateTargetUuid && (
                            <Button
                                variant="secondary"
                                size="sm"
                                icon="DownloadSimple"
                                className="text-[11px]"
                                onClick={() => b.loadTemplateIntoBuilder(b.templateTargetUuid)}
                                title={t("Read this template back into the controls above, so it can be edited and saved")}
                            >
                                {t("Load this template into the builder")}
                                </Button>
                        )}
                        {!b.templateTargetUuid && (
                            <Input
                                label={t("New template name")}
                                value={b.templateName}
                                onChange={(e: any) => b.setTemplateName(e.target.value)}
                                placeholder={t("NL-Fast-Balancer")}
                                hint={t("Letters, digits, spaces, _ and -")}
                            />
                        )}
                        <Button
                            variant="secondary"
                            size="sm"
                            icon="ArrowsClockwise"
                            className="text-[11px]"
                            loading={b.panelTemplatesLoading}
                            disabled={!b.panelConnected}
                            onClick={b.loadPanelTemplates}
                        >
                            {t("Refresh templates")}
                            </Button>
                        <p className="text-[10px] text-slate-500">
                            {b.templateTargetUuid
                                ? t("Saved. Step 2 below points hosts at it.")
                                : t("Not saved yet — step 2 needs a saved template to point hosts at.")}
                        </p>
                    </Section>
                )}

                {isTemplate && (
                    <Section title={t("Step 2 · Publish it to subscribers")}>
                        <p className="text-[10px] text-slate-500 -mt-1">
                            {t("The nodes become hidden hosts sharing one tag; a visible host with that same tag carries the template. Subscribers see the one entry and their client gets the balanced config.")}
                            </p>
                        <Input
                            label={t("Shared tag for this location")}
                            value={b.poolTag}
                            onChange={(e: any) => b.setPoolTag(e.target.value)}
                            placeholder={t("NLMAIN")}
                            hint={b.normalisedPoolTag && b.normalisedPoolTag !== b.poolTag.trim()
                                ? t("Will be sent as {tag}", { tag: b.normalisedPoolTag })
                                : t("The nodes and the entry host all carry it — that is how the panel knows which hosts to inject")}
                        />
                        <Button
                            variant={b.confirmPool ? 'warning' : 'secondary'}
                            size="sm"
                            icon={b.confirmPool ? 'Warning' : 'EyeSlash'}
                            className="text-[11px]"
                            onClick={b.tagSelectedHostsAsPool}
                            disabled={b.panelSelection.size === 0 || !b.normalisedPoolTag}
                        >
                            {b.confirmPool
                                ? tn(b.panelSelection.size, "Confirm: hide and re-tag {n} host", "Confirm: hide and re-tag {n} hosts")
                                : tn(b.panelSelection.size, "Mark {n} selected host as the pool", "Mark {n} selected hosts as the pool")}
                        </Button>
                        {b.confirmPool && (
                            <p className="text-[10px] text-amber-300/80">
                                {t("They disappear from every subscriber's list and their current tag is replaced by {tag}. Do this once the entry host exists, or this location vanishes for subscribers in between.", {
                                    tag: b.normalisedPoolTag,
                                })}
                            </p>
                        )}

                        <div className="border-t border-slate-800 pt-3 flex flex-col gap-3">
                            <span className="label-xs">{t("Entry host — the one subscribers see")}</span>
                            <Input
                                label={t("Remark")}
                                value={b.entryRemark}
                                onChange={(e: any) => b.setEntryRemark(e.target.value)}
                                placeholder="🇳🇱 ⚡ Нидерланды"
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div className="sm:col-span-2">
                                    <Input
                                        label={t("Address")}
                                        value={b.entryAddress}
                                        onChange={(e: any) => b.setEntryAddress(e.target.value)}
                                        placeholder={t("nl.example.com")}
                                    />
                                </div>
                                <div>
                                    <span className="label-xs">{t("Port")}</span>
                                    <NumberInput
                                        value={b.entryPort}
                                        onChange={v => b.setEntryPort(v)}
                                        min={1}
                                        max={65535}
                                    />
                                </div>
                            </div>
                            <Select
                                label={t("Bind to inbound")}
                                value={b.entryInboundUuid}
                                onChange={v => b.setEntryInboundUuid(v)}
                                options={[
                                    {
                                value: '',
                                label: b.panelInboundOptions.length
                                    ? t("Pick an inbound…")
                                    : t("Load panel hosts to choose one"),
                            },
                                    ...b.panelInboundOptions.map((i: any) => ({ value: i.uuid, label: i.label })),
                                ]}
                            />
                            {b.panelInboundOptions.length === 0 && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    icon="CloudArrowDown"
                                    className="text-[11px]"
                                    loading={b.panelLoading}
                                    disabled={!b.panelConnected}
                                    onClick={b.loadPanelHosts}
                                >
                                    {t("Load panel hosts")}
                                    </Button>
                            )}
                            {b.entryHostMissing.length > 0 && (
                                <p className="text-[10px] text-amber-300/80">
                                    {t("Still needed: {fields}", {
                                        fields: b.entryHostMissing.map(entryFieldLabel).join(', '),
                                    })}
                                </p>
                            )}
                            <Button
                                variant="primary"
                                size="sm"
                                icon="Plus"
                                className="text-[11px]"
                                onClick={b.createEntryHost}
                                disabled={b.entryHostMissing.length > 0}
                                title={t("Create the visible host and attach this template to it")}
                            >
                                {t("Create entry host with this template")}
                                </Button>
                        </div>
                    </Section>
                )}

                <Section title={t("What stays off the tunnel")}>
                    <p className="text-[10px] text-slate-500 -mt-1">
                        {t("These domains get a routing rule straight to the direct outbound, and the same list is repeated in the DNS block so their lookups are answered locally instead of through the proxy.")}
                    </p>

                    {b.bypassLists.map((list: any) => (
                        <div key={list.id}>
                            <Switch
                                checked={b.enabledBypassIds.includes(list.id)}
                                onChange={() => b.toggleBypassList(list.id)}
                                label={`${list.label} (${list.domains.length})`}
                            />
                            <p className="text-[10px] text-slate-500 mt-1 ml-[52px]">{list.description}</p>
                        </div>
                    ))}

                    <div>
                        <span className="label-xs">{t("Your own domains")}</span>
                        <textarea
                            className="input-base font-mono text-[11px] h-16 resize-none bg-slate-950/60 mt-1.5"
                            placeholder={t("domain:mybank.example, regexp:.+\\.local$, geosite:category-ads")}
                            value={b.bypassCustomText}
                            onChange={e => b.setBypassCustomText(e.target.value)}
                        />
                        <p className="text-[10px] text-slate-500 mt-1">
                            {t("Any Xray matcher works here — domain:, regexp: or a geosite: category, which stays current without this app shipping a list of its own.")}
                            {b.bypassCustom.length > 0 && " "}
                            {b.bypassCustom.length > 0 && tn(b.bypassCustom.length, "Currently {n} entry.", "Currently {n} entries.")}
                        </p>
                    </div>

                    <Switch
                        checked={options.bypassBittorrent}
                        onChange={v => b.setOption({ bypassBittorrent: v })}
                        label={t("BitTorrent direct")}
                    />
                    <p className="text-[10px] text-slate-500 -mt-2 ml-[52px]">
                        {t("Matched by sniffing the protocol, not by domain.")}
                        </p>
                </Section>

                <Section title="DNS">
                    <Switch
                        checked={options.dns}
                        onChange={v => b.setOption({ dns: v })}
                        label={t("Write a DNS block")}
                    />
                    <p className="text-[10px] text-slate-500 -mt-2 ml-[52px]">
                        {t("Off means the client uses whatever DNS the system gives it.")}
                        </p>
                    {options.dns && (
                        <>
                            <div className="flex flex-wrap gap-1.5">
                                {DNS_RESOLVERS.map(preset => {
                                    const active = matchResolverPreset(options.dnsUpstream)?.id === preset.id;
                                    return (
                                        <button
                                            key={preset.id}
                                            onClick={() => b.setOption({ dnsUpstream: [...preset.servers] })}
                                            title={preset.hint}
                                            className={`px-2 py-1.5 text-[10px] rounded-md border transition-all ${
                                                active
                                                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200'
                                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                            }`}
                                        >
                                            {preset.label}
                                        </button>
                                    );
                                })}
                            </div>
                            <Input
                                label={t("Upstream servers")}
                                value={options.dnsUpstream.join(', ')}
                                onChange={(e: any) => b.setOption({
                                    dnsUpstream: e.target.value.split(/[\s,]+/).filter(Boolean),
                                })}
                                hint={t("Used for everything that is not in the bypass list above")}
                            />
                            <Input
                                label={t("Resolved locally, but not routed direct")}
                                value={b.dnsExtraText}
                                onChange={(e: any) => b.setDnsExtraText(e.target.value)}
                                placeholder={t("domain:mypanel.io")}
                                hint={t("Added to the DNS bypass entry only — the traffic still goes through the proxy")}
                            />
                        </>
                    )}
                </Section>
            </div>

            {/* Preview, or the raw template when the JSON view is on */}
            {isTemplate && templateView === 'json' ? (
                <TemplateJsonView
                    tpl={tpl}
                    generatedJson={JSON.stringify(b.template, null, 2)}
                    isExisting={editingSavedTemplate}
                />
            ) : (
            <div className="flex flex-col shrink-0">
                <div className="flex items-center justify-between mb-1.5 gap-2">
                    <span className="label-xs">{isTemplate ? t("Generated template") : t("Generated config")}</span>
                    {!isTemplate && multi && (
                        <div className="flex gap-1 overflow-x-auto hide-scrollbar">
                            {b.results.map((r: any, i: number) => (
                                <button
                                    key={i}
                                    onClick={() => b.setPreviewIndex(i)}
                                    className={`px-2 py-1.5 md:py-1 text-[10px] rounded-md border whitespace-nowrap transition-all ${
                                        i === b.previewIndex
                                            ? 'bg-slate-700 border-slate-600 text-white'
                                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                                    }`}
                                >
                                    {r.config.remarks || `Config ${i + 1}`}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {b.error && (
                    <div className="text-[11px] text-rose-300 bg-rose-950/30 border border-rose-500/40 rounded-lg px-3 py-2 mb-2">
                        {b.error}
                    </div>
                )}

                <div className="shrink-0 h-[38dvh] md:h-[360px] relative rounded-lg overflow-hidden border border-slate-700 bg-[#282c34]">
                    {isTemplate ? (
                        <div className="absolute inset-0">
                            <JsonEditor
                                value={JSON.stringify(b.template, null, 2)}
                                onChange={() => {}}
                                schemaMode="full"
                                readOnly
                            />
                        </div>
                    ) : b.preview ? (
                        <div className="absolute inset-0">
                            <JsonEditor
                                value={JSON.stringify(b.preview.config, null, 2)}
                                onChange={() => {}}
                                schemaMode="full"
                                readOnly
                            />
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs italic px-4 text-center">
                            {t("Add at least one node to see the config")}
                            </div>
                    )}
                </div>
            </div>
            )}
        </div>
);
