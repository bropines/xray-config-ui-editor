import React from "react";
import { Button, Icon, Input } from "../../ui";
import { Badge } from "../../ui/Badge";
import { Switch } from "../../ui/Switch";
import { TemplatePickerPanel } from "./TemplatePickerPanel";
import { Section, NodeRow } from "./builder-parts";
import { t, tn } from "../../../i18n";

/** Where the nodes come from, and which of them are in. */
export const NodesPane = ({
    b,
    tpl,
    isTemplate,
    mobilePane,
    selectTemplate,
    newTemplate,
    onEditHost,
}: {
    b: any;
    tpl: any;
    isTemplate: boolean;
    mobilePane: 'nodes' | 'output';
    selectTemplate: (uuid: string) => void;
    newTemplate: () => void;
    onEditHost?: (uuid: string) => void;
}) => (
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
                        b.filteredPanelRows.map((row: any) => {
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
                        b.nodes.map((node: any) => (
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
);
