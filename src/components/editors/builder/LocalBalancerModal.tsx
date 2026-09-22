import React from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Icon } from '../../ui/Icon';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Switch } from '../../ui/Switch';
import { NumberInput } from '../../ui/NumberInput';
import { DurationInput } from '../../ui/DurationInput';
import { Help } from '../../ui/Help';
import { JsonEditor } from '../../ui/JsonEditor';
import { useLocalBalancerBuilder } from '../../../hooks/useLocalBalancerBuilder';
import { useTemplatesLibrary } from '../../../hooks/useTemplatesLibrary';
import { TemplatePickerPanel } from './TemplatePickerPanel';
import { TemplateJsonView } from './TemplateJsonView';
import { RemnawaveGuide } from '../remnawave/RemnawaveGuide';
import { LOCAL_BALANCER_PRESETS } from '../../../core/generators/local-balancer';
import { DNS_RESOLVERS, matchResolverPreset } from '../../../core/presets/dns';
import { t, tn } from '../../../i18n';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 flex flex-col gap-3">
        <span className="label-xs">{title}</span>
        {children}
    </div>
);

const NodeRow = ({ node, onToggle, onRename, onRemove }: any) => (
    <div className={`p-2 rounded-lg border text-xs flex items-start gap-2 mb-1 transition-all ${
        node.include ? 'bg-slate-900 border-slate-700' : 'bg-slate-950 border-transparent opacity-50'
    }`}>
        <button
            onClick={onToggle}
            className={`mt-0.5 shrink-0 p-2 -m-1 ${node.include ? 'text-emerald-400' : 'text-slate-600'}`}
            title={node.include ? t("Exclude from the build") : t("Include in the build")}
        >
            <Icon name={node.include ? 'CheckSquare' : 'Square'} weight={node.include ? 'fill' : 'regular'} className="text-base" />
        </button>
        <div className="min-w-0 flex-1">
            <input
                value={node.label}
                onChange={e => onRename(e.target.value)}
                className="w-full bg-transparent text-slate-200 font-bold outline-none border-b border-transparent focus:border-slate-600 truncate"
                title={t("Label — also the grouping key when splitting by location")}
            />
            <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                {node.protocol}{node.address ? ` · ${node.address}` : ''}
            </div>
        </div>
        <button onClick={onRemove} className="text-slate-600 hover:text-rose-400 p-2 shrink-0" title={t("Remove")}>
            <Icon name="Trash" className="text-base" />
        </button>
    </div>
);

/**
 * Local Balancer builder.
 *
 * Turns a pile of nodes into the client config people otherwise hand-write:
 * local SOCKS/HTTP in, several proxies out, a balancer picking the fastest,
 * a probe measuring them, and a bypass list that keeps local traffic local.
 * The parts that must agree (tag prefix, selector, probe selector, catch-all
 * rule, bypass list in both routing and DNS) are derived, not typed.
 */
/** Names `entryHostMissing` can report, worded as the fields above word them. */
const entryFieldLabel = (field: string): string =>
    ({
        "shared tag": t("Shared tag for this location"),
        remark: t("Remark"),
        address: t("Address"),
        port: t("Port"),
        inbound: t("Inbound"),
        "saved template": t("Saved template"),
    })[field] ?? field;

export const LocalBalancerModal = ({ onClose, initialTemplateUuid, initialMode, onEditHost }: {
    onClose: () => void;
    /** Open on a specific panel template. */
    initialTemplateUuid?: string;
    /** Open directly in panel-template mode rather than client-config mode. */
    initialMode?: 'config' | 'template';
    /** Opens one of the listed panel hosts in the host editor. */
    onEditHost?: (uuid: string) => void;
}) => {
    const b = useLocalBalancerBuilder(initialTemplateUuid, initialMode);
    const { options } = b;

    const multi = b.results.length > 1;
    const isTemplate = b.outputMode === 'template';
    const selectorType = b.inject.selector.type;

    // On a phone the two columns cannot both have height: the right one would
    // collapse to nothing and take every option and the preview with it. Same
    // approach the Routing Manager uses — show one pane at a time.
    const [mobilePane, setMobilePane] = React.useState<'nodes' | 'output'>('nodes');

    // Templates are edited here rather than in a module of their own: a panel
    // template *is* what this builder writes, so the form and the raw JSON are
    // two views of one object — the same JSON/UI pair the routing and protocol
    // editors already offer.
    const tpl = useTemplatesLibrary();
    const [templateView, setTemplateView] = React.useState<'form' | 'json'>('form');
    const editingSavedTemplate = isTemplate && !!b.templateTargetUuid && !!tpl.draft;

    const selectTemplate = async (uuid: string) => {
        await b.loadTemplateIntoBuilder(uuid);
        await tpl.open(uuid);
    };

    const newTemplate = () => {
        tpl.closeDraft();
        b.setTemplateTargetUuid('');
        b.setTemplateName('');
        setTemplateView('form');
    };

    const switchTemplateView = (view: 'form' | 'json') => {
        // Leaving the JSON view means the form has to catch up with whatever
        // was typed, or the next save would quietly write the old fields back.
        if (view === 'form' && templateView === 'json' && tpl.draft && !tpl.parseError) {
            try {
                b.applyTemplateObject(JSON.parse(tpl.draft.text || '{}'));
            } catch {
                /* reported by applyTemplateObject */
            }
        }
        setTemplateView(view);
    };

    return (
        <Modal
            title={isTemplate ? t("Local Balancer — panel template") : t("Local Balancer Builder")}
            onClose={onClose}
            onSave={isTemplate
                ? (templateView === 'json' && editingSavedTemplate
                    ? tpl.save
                    : (b.savingTemplate ? () => {} : b.saveTemplate))
                : (b.preview ? b.loadIntoEditor : undefined)}
            saveText={isTemplate
                ? (b.savingTemplate || tpl.saving
                    ? t("Saving…")
                    : (templateView === 'json' && editingSavedTemplate ? t("Save JSON to panel") : t("Save to panel")))
                : (multi ? t("Load shown config") : t("Load into editor"))}
            saveIcon={isTemplate ? 'CloudArrowUp' : 'ArrowSquareIn'}
            className="md:h-[88vh] md:max-h-[92dvh] overflow-hidden"
            extraButtons={
                <>
                    <Button variant="secondary" icon="FileArrowDown" onClick={b.download} disabled={!b.outputJson}>
                        {isTemplate
                            ? t("Download template")
                            : (multi
                                ? tn(b.results.length, "Download {n} config", "Download {n} configs")
                                : t("Download JSON"))}
                    </Button>
                    <Button variant="secondary" icon="Copy" onClick={b.copy} disabled={!b.outputJson}>{t("Copy")}</Button>
                    {!isTemplate && (
                        <Button variant="secondary" icon="CardsThree" onClick={b.saveAsProfiles} disabled={b.results.length === 0}>
                            {tn(b.results.length, "Save as profile", "Save as profiles")}
                        </Button>
                    )}
                </>
            }
        >
            {isTemplate && <RemnawaveGuide module="templates" />}

            <div className="flex md:hidden bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1 mb-3 shrink-0">
                {([['nodes', isTemplate ? t("Templates") : t("Nodes")],
                  ['output', isTemplate ? t("Template") : t("Config")]] as const).map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setMobilePane(key)}
                        className={`flex-1 px-3 py-2 text-[11px] font-bold rounded-md transition-all ${
                            mobilePane === key ? 'bg-slate-700 text-white' : 'text-slate-400'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="flex flex-col md:flex-row flex-1 min-h-0 gap-3">
                {/* ─── Sources & nodes ─────────────────────────────── */}
                <div className={`w-full md:w-96 md:shrink-0 flex-col min-h-0 gap-3 ${mobilePane === 'nodes' ? 'flex' : 'hidden md:flex'}`}>
                    {isTemplate ? (
                        <TemplatePickerPanel
                            tpl={tpl}
                            selectedUuid={b.templateTargetUuid}
                            onSelect={selectTemplate}
                            onNew={newTemplate}
                        />
                    ) : (
                    <>
                    <Section title={t("Nodes from")}>
                        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1">
                            {([['paste', t("Links / JSON")], ['panel', t("Remnawave panel")]] as const).map(([key, label]) => (
                                <button
                                    key={key}
                                    onClick={() => b.setSource(key)}
                                    className={`flex-1 px-2 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                                        b.source === key ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {b.source === 'paste' ? (
                            <>
                                <textarea
                                    className="input-base font-mono text-[11px] h-24 resize-none bg-slate-950/60"
                                    placeholder={t("Paste vless:// / vmess:// / ss:// links, a base64 subscription, or a JSON config…")}
                                    value={b.input}
                                    onChange={e => b.setInput(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <Button variant="primary" size="sm" icon="MagicWand" className="flex-1 text-[11px]" onClick={b.parseInput}>
                                        {t("Parse")}
                                        </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        icon="ArrowsClockwise"
                                        className="flex-1 text-[11px]"
                                        onClick={b.takeFromCurrentConfig}
                                        disabled={!b.hasCurrentOutbounds}
                                        title={t("Take the proxy outbounds from the config open in the editor")}
                                    >
                                        {t("From config")}
                                        </Button>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        icon="DownloadSimple"
                                        className="flex-1 text-[11px]"
                                        onClick={b.loadFromCurrentConfig}
                                        title={t("Read the open config's balancer, probe and bypass settings back into the controls")}
                                    >
                                        {t("Read settings from the open config")}
                                        </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* A template carries no identity: the panel substitutes each
                                    subscriber's own credentials when it renders the subscription,
                                    so asking for one UUID here would be asking for whose. It is
                                    only a client config — one file for one person — that has to
                                    name an id. */}
                                {isTemplate ? (
                                    <p className="text-[10px] text-slate-500 bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2">
                                        {t("No client UUID here: the panel fills in each subscriber's own credentials when it renders this template. Select hosts to say which ones make up the pool.")}
                                    </p>
                                ) : (
                                    <Input
                                        label={t("Client UUID")}
                                        value={b.panelUserId}
                                        onChange={(e: any) => b.setPanelUserId(e.target.value)}
                                        placeholder={t("9bed733f-b58f-4d23-9ca2-6397e8debedf")}
                                        help={t("The id from one user's vless:// link in the panel. It is baked into the config this builds, so that config belongs to that one person — which is why the panel-template mode does not ask for it.")}
                                        hint={t("Needed only by Add, which mirrors hosts into client outbounds.")}
                                    />
                                )}
                                <div className="flex gap-2">
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        icon="CloudArrowDown"
                                        className="flex-1 text-[11px]"
                                        loading={b.panelLoading}
                                        disabled={!b.panelConnected}
                                        onClick={b.loadPanelHosts}
                                    >
                                        {b.panelFetchedAt ? t("Refresh hosts") : t("Load hosts")}
                                    </Button>
                                    {!isTemplate && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            icon="Plus"
                                            className="flex-1 text-[11px]"
                                            onClick={b.addSelectedFromPanel}
                                            disabled={b.panelSelection.size === 0}
                                        >
                                            {tn(b.panelSelection.size, "Add {n}", "Add {n}")}
                                        </Button>
                                    )}
                                </div>
                                {!b.panelConnected && (
                                    <p className="text-[10px] text-amber-300/80">
                                        {t("Not connected to Remnawave — connect from the header first.")}
                                        </p>
                                )}
                                {b.panelRows.length > 0 && (
                                    <>
                                        <div className="relative">
                                            <Icon name="MagnifyingGlass" className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600 text-xs" />
                                            <input
                                                className="w-full bg-slate-950 border border-slate-700 rounded-md pl-8 pr-2 py-1.5 text-[11px] text-white outline-none focus:border-emerald-500"
                                                placeholder={t("Search hosts, profiles, addresses…")}
                                                value={b.panelSearch}
                                                onChange={e => b.setPanelSearch(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                                            <span>
                                                {tn(b.filteredPanelRows.length, "{n} host", "{n} hosts")}
                                                {" · "}
                                                {t("{n} selected", { n: b.panelSelection.size })}
                                            </span>
                                            <span className="flex gap-3">
                                                <button onClick={b.selectAllPanel} className="px-2 py-1.5 -my-1 hover:text-emerald-400">{t("select usable")}</button>
                                                <button onClick={b.clearPanelSelection} className="px-2 py-1.5 -my-1 hover:text-rose-400">{t("clear")}</button>
                                            </span>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </Section>

                    {b.source === 'panel' && (
                        <div className="flex-1 overflow-y-auto custom-scroll min-h-0 pr-1">
                            {b.panelRows.length === 0 ? (
                                <div className="text-center text-slate-600 italic text-[11px] py-8 px-3">
                                    {!b.panelConnected
                                        ? 'Connect to Remnawave in the header, then press Load hosts.'
                                        : b.panelError
                                            ? t("{error} — press Load hosts to retry.", { error: b.panelError })
                                            : 'Load the panel hosts to pick nodes from them.'}
                                </div>
                            ) : (
                                b.filteredPanelRows.map(row => {
                                    const selected = b.panelSelection.has(row.uuid);
                                    const usable = !row.blocker;
                                    return (
                                        <div key={row.uuid} className="relative group">
                                        <button
                                            onClick={() => usable && b.togglePanelHost(row.uuid)}
                                            disabled={!usable}
                                            className={`w-full text-left p-2 pr-9 rounded-lg border text-xs flex items-start gap-2 mb-1 transition-all ${
                                                !usable
                                                    ? 'bg-slate-950 border-slate-900 opacity-60 cursor-not-allowed'
                                                    : selected
                                                        ? 'bg-emerald-600/15 border-emerald-500/50'
                                                        : 'bg-slate-900 border-slate-800 hover:border-slate-600'
                                            }`}
                                        >
                                            <Icon
                                                name={!usable ? 'Prohibit' : selected ? 'CheckSquare' : 'Square'}
                                                weight={selected ? 'fill' : 'regular'}
                                                className={`mt-0.5 shrink-0 text-base ${
                                                    !usable ? 'text-slate-700' : selected ? 'text-emerald-400' : 'text-slate-600'
                                                }`}
                                            />
                                            <span className="min-w-0 flex-1">
                                                <span className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-bold text-slate-200 truncate">{row.remark}</span>
                                                    {row.disabled && <Badge variant="warning" size="sm">{t("off")}</Badge>}
                                                    {row.isHidden && (
                                                        <Badge variant="info" size="sm">
                                                            hidden{row.hostTag ? ` · ${row.hostTag}` : ''}
                                                        </Badge>
                                                    )}
                                                </span>
                                                <span className="block text-[10px] text-slate-500 font-mono truncate">
                                                    {row.address}:{row.port} · {row.protocol}/{row.network || '?'}/{row.security}
                                                </span>
                                                {row.blocker
                                                    ? <span className="block text-[10px] text-amber-400/80 truncate">{row.blocker}</span>
                                                    : row.profileName && <span className="block text-[10px] text-slate-600 truncate">{row.profileName} · {row.inboundTag}</span>}
                                            </span>
                                        </button>
                                        {onEditHost && (
                                            <button
                                                onClick={() => onEditHost(row.uuid)}
                                                title={t("Edit this host: address, transport, inbound, template")}
                                                className="absolute top-1.5 right-1.5 p-2 rounded-md text-slate-500 hover:text-white hover:bg-slate-700/60 md:opacity-0 md:group-hover:opacity-100 transition-all"
                                            >
                                                <Icon name="PencilSimple" className="text-sm" />
                                            </button>
                                        )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    <div className={`${b.source === 'panel' ? 'max-h-44 shrink-0' : 'flex-1'} flex flex-col min-h-0`}>
                        <div className="flex items-center justify-between px-1 shrink-0 mb-1">
                            <span className="text-[11px] text-slate-400">
                                <b className="text-slate-200">{b.includedNodes.length}</b>{" "}
                                {tn(b.nodes.length, "of {n} node", "of {n} nodes")}
                                {b.results.length > 0 && <> · {tn(b.results.length, "{n} config", "{n} configs")}</>}
                            </span>
                            {b.nodes.length > 0 && (
                                <button onClick={b.clearNodes} className="text-[10px] text-slate-500 hover:text-rose-400 px-2 py-1.5 -my-1">{t("clear")}</button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scroll min-h-0 pr-1">
                            {b.nodes.length === 0 ? (
                                <div className="text-center text-slate-600 italic text-[11px] py-6 px-3">
                                    {t("No nodes yet — paste links above and press Parse, or pull them in with From config.")}
                                    </div>
                            ) : (
                                b.nodes.map(node => (
                                    <NodeRow
                                        key={node.id}
                                        node={node}
                                        onToggle={() => b.toggleNode(node.id)}
                                        onRename={(label: string) => b.renameNode(node.id, label)}
                                        onRemove={() => b.removeNode(node.id)}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    <div className="shrink-0">
                        <Switch
                            checked={b.splitByLocation}
                            onChange={b.setSplitByLocation}
                            label={t("One config per location")}
                        />
                        <p className="text-[10px] text-slate-500 mt-1 ml-[52px]">
                            {t("Groups nodes by label, ignoring trailing numbering — a subscription of \"… #1 / … #2\" becomes one balanced config per place.")}
                            </p>
                    </div>
                    </>
                    )}
                </div>

                {/* ─── Options + preview ────────────────────────────── */}
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
                            <div className="grid grid-cols-2 gap-2">
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
                                    {b.results.map((r, i) => (
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

                        <div className="shrink-0 h-[360px] relative rounded-lg overflow-hidden border border-slate-700 bg-[#282c34]">
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
            </div>
        </Modal>
    );
};
