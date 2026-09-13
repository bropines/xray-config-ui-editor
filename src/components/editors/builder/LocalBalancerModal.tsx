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
import { JsonEditor } from '../../ui/JsonEditor';
import { useLocalBalancerBuilder } from '../../../hooks/useLocalBalancerBuilder';
import { LOCAL_BALANCER_PRESETS } from '../../../core/generators/local-balancer';
import { DNS_RESOLVERS, matchResolverPreset } from '../../../core/presets/dns';

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
            title={node.include ? 'Exclude from the build' : 'Include in the build'}
        >
            <Icon name={node.include ? 'CheckSquare' : 'Square'} weight={node.include ? 'fill' : 'regular'} className="text-base" />
        </button>
        <div className="min-w-0 flex-1">
            <input
                value={node.label}
                onChange={e => onRename(e.target.value)}
                className="w-full bg-transparent text-slate-200 font-bold outline-none border-b border-transparent focus:border-slate-600 truncate"
                title="Label — also the grouping key when splitting by location"
            />
            <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                {node.protocol}{node.address ? ` · ${node.address}` : ''}
            </div>
        </div>
        <button onClick={onRemove} className="text-slate-600 hover:text-rose-400 p-2 shrink-0" title="Remove">
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
export const LocalBalancerModal = ({ onClose, initialTemplateUuid }: {
    onClose: () => void;
    /** Opened from the template editor: load this template straight away. */
    initialTemplateUuid?: string;
}) => {
    const b = useLocalBalancerBuilder(initialTemplateUuid);
    const { options } = b;

    const multi = b.results.length > 1;
    const isTemplate = b.outputMode === 'template';
    const selectorType = b.inject.selector.type;

    // On a phone the two columns cannot both have height: the right one would
    // collapse to nothing and take every option and the preview with it. Same
    // approach the Routing Manager uses — show one pane at a time.
    const [mobilePane, setMobilePane] = React.useState<'nodes' | 'output'>('nodes');

    return (
        <Modal
            title="Local Balancer Builder"
            onClose={onClose}
            onSave={isTemplate ? (b.savingTemplate ? () => {} : b.saveTemplate) : (b.preview ? b.loadIntoEditor : undefined)}
            saveText={isTemplate ? (b.savingTemplate ? 'Saving…' : 'Save to panel') : (multi ? 'Load shown config' : 'Load into editor')}
            saveIcon={isTemplate ? 'CloudArrowUp' : 'ArrowSquareIn'}
            className="h-[90vh] md:h-[88vh] max-h-[92vh] overflow-hidden"
            extraButtons={
                <>
                    <Button variant="secondary" icon="FileArrowDown" onClick={b.download} disabled={!b.outputJson}>
                        Download {isTemplate ? 'template' : (multi ? `${b.results.length} configs` : 'JSON')}
                    </Button>
                    <Button variant="secondary" icon="Copy" onClick={b.copy} disabled={!b.outputJson}>Copy</Button>
                    {!isTemplate && (
                        <Button variant="secondary" icon="CardsThree" onClick={b.saveAsProfiles} disabled={b.results.length === 0}>
                            Save as profile{multi ? 's' : ''}
                        </Button>
                    )}
                </>
            }
        >
            <div className="flex md:hidden bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1 mb-3 shrink-0">
                {([['nodes', 'Nodes'], ['output', isTemplate ? 'Template' : 'Config']] as const).map(([key, label]) => (
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
                    <Section title="Nodes from">
                        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1">
                            {([['paste', 'Links / JSON'], ['panel', 'Remnawave panel']] as const).map(([key, label]) => (
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
                                    placeholder="Paste vless:// / vmess:// / ss:// links, a base64 subscription, or a JSON config…"
                                    value={b.input}
                                    onChange={e => b.setInput(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <Button variant="primary" size="sm" icon="MagicWand" className="flex-1 text-[11px]" onClick={b.parseInput}>
                                        Parse
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        icon="ArrowsClockwise"
                                        className="flex-1 text-[11px]"
                                        onClick={b.takeFromCurrentConfig}
                                        disabled={!b.hasCurrentOutbounds}
                                        title="Take the proxy outbounds from the config open in the editor"
                                    >
                                        From config
                                    </Button>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        icon="DownloadSimple"
                                        className="flex-1 text-[11px]"
                                        onClick={b.loadFromCurrentConfig}
                                        title="Read the open config's balancer, probe and bypass settings back into the controls"
                                    >
                                        Read settings from the open config
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <Input
                                    label="Client UUID"
                                    value={b.panelUserId}
                                    onChange={(e: any) => b.setPanelUserId(e.target.value)}
                                    placeholder="9bed733f-b58f-4d23-9ca2-6397e8debedf"
                                    hint="The id from that user's vless:// link — the panel issues it per subscriber"
                                />
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
                                        {b.panelFetchedAt ? 'Refresh hosts' : 'Load hosts'}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        icon="Plus"
                                        className="flex-1 text-[11px]"
                                        onClick={b.addSelectedFromPanel}
                                        disabled={b.panelSelection.size === 0}
                                    >
                                        Add {b.panelSelection.size || ''}
                                    </Button>
                                </div>
                                {!b.panelConnected && (
                                    <p className="text-[10px] text-amber-300/80">
                                        Not connected to Remnawave — connect from the header first.
                                    </p>
                                )}
                                {b.panelRows.length > 0 && (
                                    <>
                                        <div className="relative">
                                            <Icon name="MagnifyingGlass" className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600 text-xs" />
                                            <input
                                                className="w-full bg-slate-950 border border-slate-700 rounded-md pl-8 pr-2 py-1.5 text-[11px] text-white outline-none focus:border-emerald-500"
                                                placeholder="Search hosts, profiles, addresses…"
                                                value={b.panelSearch}
                                                onChange={e => b.setPanelSearch(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                                            <span>{b.filteredPanelRows.length} host(s) · {b.panelSelection.size} selected</span>
                                            <span className="flex gap-3">
                                                <button onClick={b.selectAllPanel} className="px-2 py-1.5 -my-1 hover:text-emerald-400">select usable</button>
                                                <button onClick={b.clearPanelSelection} className="px-2 py-1.5 -my-1 hover:text-rose-400">clear</button>
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
                                            ? `${b.panelError} — press Load hosts to retry.`
                                            : 'Load the panel hosts to pick nodes from them.'}
                                </div>
                            ) : (
                                b.filteredPanelRows.map(row => {
                                    const selected = b.panelSelection.has(row.uuid);
                                    const usable = !row.blocker;
                                    return (
                                        <button
                                            key={row.uuid}
                                            onClick={() => usable && b.togglePanelHost(row.uuid)}
                                            disabled={!usable}
                                            className={`w-full text-left p-2 rounded-lg border text-xs flex items-start gap-2 mb-1 transition-all ${
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
                                                    {row.disabled && <Badge variant="warning" size="sm">off</Badge>}
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
                                    );
                                })
                            )}
                        </div>
                    )}

                    {isTemplate && (
                        <div className="text-[10px] text-slate-400 bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 shrink-0">
                            A template carries no nodes — the panel injects hosts when it renders it.
                            Your selection here is used for the pool and the entry host below, not for
                            the template body.
                        </div>
                    )}

                    <div className={`${b.source === 'panel' ? 'max-h-44 shrink-0' : 'flex-1'} flex flex-col min-h-0`}>
                        <div className="flex items-center justify-between px-1 shrink-0 mb-1">
                            <span className="text-[11px] text-slate-400">
                                <b className="text-slate-200">{b.includedNodes.length}</b> of {b.nodes.length} node(s)
                                {b.results.length > 0 && <> · <b className="text-slate-200">{b.results.length}</b> config(s)</>}
                            </span>
                            {b.nodes.length > 0 && (
                                <button onClick={b.clearNodes} className="text-[10px] text-slate-500 hover:text-rose-400 px-2 py-1.5 -my-1">clear</button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scroll min-h-0 pr-1">
                            {b.nodes.length === 0 ? (
                                <div className="text-center text-slate-600 italic text-[11px] py-6 px-3">
                                    No nodes yet — paste links above and press Parse, or pull them in
                                    with From config.
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
                            disabled={isTemplate}
                            label="One config per location"
                        />
                        <p className="text-[10px] text-slate-500 mt-1 ml-[52px]">
                            Groups nodes by label, ignoring trailing numbering — a subscription of
                            "… #1 / … #2" becomes one balanced config per place.
                        </p>
                    </div>
                </div>

                {/* ─── Options + preview ────────────────────────────── */}
                <div className={`flex-1 min-w-0 flex-col min-h-0 gap-3 overflow-y-auto custom-scroll md:overflow-visible ${mobilePane === 'output' ? 'flex' : 'hidden md:flex'}`}>
                    <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1 shrink-0">
                        {([['config', 'Client config'], ['template', 'Panel template']] as const).map(([key, label]) => (
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

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
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
                        {b.presetKey === 'custom' && <Badge variant="warning" size="sm">Custom</Badge>}
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

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 md:shrink-0 md:overflow-y-auto custom-scroll md:max-h-[38vh] pr-1">
                        <Section title="Balancer">
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    label="Tag prefix"
                                    value={options.proxyTagPrefix}
                                    onChange={(e: any) => b.setOption({ proxyTagPrefix: e.target.value })}
                                    hint="Also the selector"
                                />
                                <Input
                                    label="Balancer tag"
                                    value={options.balancerTag}
                                    onChange={(e: any) => b.setOption({ balancerTag: e.target.value })}
                                />
                            </div>
                            <Select
                                label="Tag style"
                                value={options.tagStyle}
                                onChange={v => b.setOption({ tagStyle: v as any })}
                                options={[
                                    { value: 'numbered', label: 'proxy, proxy-2, proxy-3' },
                                    { value: 'zeroIndexed', label: 'fb-0, fb-1, fb-2' },
                                    { value: 'labelled', label: 'proxy-Amsterdam-1' },
                                ]}
                            />
                            <Select
                                label="Strategy"
                                value={options.strategy}
                                onChange={v => b.setOption({ strategy: v as any })}
                                options={[
                                    { value: 'leastLoad', label: 'leastLoad', description: 'Fastest by measured load' },
                                    { value: 'leastPing', label: 'leastPing', description: 'Fastest by probe RTT' },
                                    { value: 'roundRobin', label: 'roundRobin', description: 'Rotate through nodes' },
                                    { value: 'random', label: 'random', description: 'Pick at random' },
                                ]}
                            />
                            <Select
                                label="Fallback"
                                value={options.fallbackTag}
                                onChange={v => b.setOption({ fallbackTag: v as any })}
                                hint="Where traffic goes when the balancer has nothing healthy to pick"
                                options={[
                                    { value: 'none', label: 'None', description: 'Fail the connection' },
                                    { value: 'first', label: 'First node', description: 'Degrade to node #1 instead of failing' },
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
                                        <span className="label-xs">Max RTT</span>
                                        <DurationInput
                                            value={options.strategySettings.maxRTT}
                                            onChange={v => b.setOption({ strategySettings: { ...options.strategySettings, maxRTT: v } })}
                                            defaultUnit="s"
                                        />
                                    </div>
                                    <div>
                                        <span className="label-xs">Expected</span>
                                        <NumberInput
                                            value={options.strategySettings.expected}
                                            onChange={v => b.setOption({ strategySettings: { ...options.strategySettings, expected: v } })}
                                            min={1}
                                        />
                                    </div>
                                </div>
                            )}
                        </Section>

                        <Section title="Probe">
                            <Select
                                label="Kind"
                                value={options.probe}
                                onChange={v => b.setOption({ probe: v as any })}
                                options={[
                                    { value: 'burst', label: 'burstObservatory (concurrent pings)', description: 'Measures latency to the probe URL from every node at once' },
                                    { value: 'observatory', label: 'observatory (sequential)', description: 'Classic probe, one node after another' },
                                    { value: 'none', label: 'None', description: 'Balancer picks without measuring' },
                                ]}
                            />
                            {options.probe !== 'none' && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div>
                                            <span className="label-xs">Interval</span>
                                            <DurationInput
                                                value={options.probeInterval}
                                                onChange={v => b.setOption({ probeInterval: v })}
                                                defaultUnit="s"
                                            />
                                        </div>
                                        <div>
                                            <span className="label-xs">Timeout</span>
                                            <DurationInput
                                                value={options.probeTimeout}
                                                onChange={v => b.setOption({ probeTimeout: v })}
                                                defaultUnit="s"
                                            />
                                        </div>
                                    </div>
                                    {options.probe === 'burst' && (
                                        <div>
                                            <span className="label-xs">Samples kept</span>
                                            <NumberInput
                                                value={options.probeSampling}
                                                onChange={v => b.setOption({ probeSampling: v ?? 1 })}
                                                min={1}
                                            />
                                        </div>
                                    )}
                                    <Input
                                        label="Probe URL"
                                        value={options.probeURL}
                                        onChange={(e: any) => b.setOption({ probeURL: e.target.value })}
                                    />
                                </>
                            )}
                        </Section>

                        <Section title="Local listeners">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                    <span className="label-xs">SOCKS port</span>
                                    <NumberInput
                                        value={options.socksPort ?? undefined}
                                        onChange={v => b.setOption({ socksPort: v ?? null })}
                                        min={1}
                                        max={65535}
                                        placeholder="off"
                                    />
                                </div>
                                <div>
                                    <span className="label-xs">HTTP port</span>
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
                                label="Listen address"
                                value={options.listen}
                                onChange={(e: any) => b.setOption({ listen: e.target.value })}
                                hint="127.0.0.1 keeps the proxy off your LAN"
                            />
                            <Switch
                                checked={options.sniffing}
                                onChange={v => b.setOption({ sniffing: v })}
                                label="Sniffing (needed for domain rules)"
                            />
                        </Section>

                        {isTemplate && (
                            <Section title="Which hosts the panel injects">
                                <p className="text-[10px] text-slate-500 -mt-1">
                                    The template carries no nodes. The panel injects the hosts this
                                    selector picks, tagging them <span className="font-mono text-slate-400">{b.options.proxyTagPrefix}…</span> so
                                    the balancer and probe find them.
                                </p>
                                <Select
                                    label="Pick hosts by"
                                    value={selectorType}
                                    onChange={v => b.setInjectSelector(v as any)}
                                    options={[
                                        { value: 'sameTagAsRecipient', label: 'Same tag as the entry host', description: 'The usual choice: matches the shared tag set below' },
                                        { value: 'tagRegex', label: 'Host tag matches a pattern' },
                                        { value: 'remarkRegex', label: 'Host remark matches a pattern' },
                                        { value: 'uuids', label: 'An explicit list of hosts' },
                                    ]}
                                />
                                {(selectorType === 'tagRegex' || selectorType === 'remarkRegex') && (
                                    <Input
                                        label="Pattern"
                                        value={'pattern' in b.inject.selector ? b.inject.selector.pattern : ''}
                                        onChange={(e: any) => b.setInjectPattern(e.target.value)}
                                        placeholder="^NL"
                                    />
                                )}
                                {selectorType === 'uuids' && (
                                    <div className="flex items-center gap-2">
                                        <Badge variant={'values' in b.inject.selector && b.inject.selector.values.length > 0 ? 'success' : 'warning'} size="sm">
                                            {'values' in b.inject.selector ? b.inject.selector.values.length : 0} host(s)
                                        </Badge>
                                        <Button variant="secondary" size="sm" icon="Check" className="text-[10px]" onClick={b.useSelectedHostsAsSelector}>
                                            Use panel selection
                                        </Button>
                                    </div>
                                )}
                                <Select
                                    label="Take hosts from"
                                    value={b.inject.selectFrom}
                                    onChange={v => b.setInject({ ...b.inject, selectFrom: v as any })}
                                    options={[
                                        { value: 'HIDDEN', label: 'The hidden hosts (the pool)', description: 'The nodes sitting behind a visible entry host' },
                                        { value: 'NOT_HIDDEN', label: 'Visible hosts' },
                                        { value: 'ALL', label: 'All hosts' },
                                    ]}
                                />
                                <Switch
                                    checked={b.inject.addVirtualHostAsOutbound}
                                    onChange={v => b.setInject({ ...b.inject, addVirtualHostAsOutbound: v })}
                                    label="Also send traffic through the entry host's own address"
                                />
                            </Section>
                        )}

                        {isTemplate && (
                            <Section title="Step 1 · Save the template to the panel">
                                <Select
                                    label="Target"
                                    value={b.templateTargetUuid}
                                    onChange={v => b.setTemplateTargetUuid(v)}
                                    options={[
                                        { value: '', label: 'Create a new template' },
                                        ...b.panelTemplateItems
                                            .filter((t: any) => t.templateType === 'XRAY_JSON')
                                            .map((t: any) => ({ value: t.uuid, label: `Update: ${t.name}` })),
                                    ]}
                                />
                                {b.templateTargetUuid && (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        icon="DownloadSimple"
                                        className="text-[11px]"
                                        onClick={() => b.loadTemplateIntoBuilder(b.templateTargetUuid)}
                                        title="Read this template back into the controls above, so it can be edited and saved"
                                    >
                                        Load this template into the builder
                                    </Button>
                                )}
                                {!b.templateTargetUuid && (
                                    <Input
                                        label="New template name"
                                        value={b.templateName}
                                        onChange={(e: any) => b.setTemplateName(e.target.value)}
                                        placeholder="NL-Fast-Balancer"
                                        hint="Letters, digits, spaces, _ and -"
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
                                    Refresh templates
                                </Button>
                                <p className="text-[10px] text-slate-500">
                                    {b.templateTargetUuid
                                        ? 'Saved. Step 2 below points hosts at it.'
                                        : 'Not saved yet — step 2 needs a saved template to point hosts at.'}
                                </p>
                            </Section>
                        )}

                        {isTemplate && (
                            <Section title="Step 2 · Publish it to subscribers">
                                <p className="text-[10px] text-slate-500 -mt-1">
                                    The nodes become hidden hosts sharing one tag; a visible host with
                                    that same tag carries the template. Subscribers see the one entry
                                    and their client gets the balanced config.
                                </p>
                                <Input
                                    label="Shared tag for this location"
                                    value={b.poolTag}
                                    onChange={(e: any) => b.setPoolTag(e.target.value)}
                                    placeholder="NLMAIN"
                                    hint={b.normalisedPoolTag && b.normalisedPoolTag !== b.poolTag.trim()
                                        ? `Will be sent as ${b.normalisedPoolTag}`
                                        : 'The nodes and the entry host all carry it — that is how the panel knows which hosts to inject'}
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
                                        ? `Confirm: hide and re-tag ${b.panelSelection.size} host(s)`
                                        : `Mark ${b.panelSelection.size || ''} selected host(s) as the pool`}
                                </Button>
                                {b.confirmPool && (
                                    <p className="text-[10px] text-amber-300/80">
                                        They disappear from every subscriber's list and their current tag is
                                        replaced by {b.normalisedPoolTag}. Do this once the entry host exists,
                                        or this location vanishes for subscribers in between.
                                    </p>
                                )}

                                <div className="border-t border-slate-800 pt-3 flex flex-col gap-3">
                                    <span className="label-xs">Entry host — the one subscribers see</span>
                                    <Input
                                        label="Remark"
                                        value={b.entryRemark}
                                        onChange={(e: any) => b.setEntryRemark(e.target.value)}
                                        placeholder="🇳🇱 ⚡ Нидерланды"
                                    />
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <div className="sm:col-span-2">
                                            <Input
                                                label="Address"
                                                value={b.entryAddress}
                                                onChange={(e: any) => b.setEntryAddress(e.target.value)}
                                                placeholder="nl.example.com"
                                            />
                                        </div>
                                        <div>
                                            <span className="label-xs">Port</span>
                                            <NumberInput
                                                value={b.entryPort}
                                                onChange={v => b.setEntryPort(v)}
                                                min={1}
                                                max={65535}
                                            />
                                        </div>
                                    </div>
                                    <Select
                                        label="Bind to inbound"
                                        value={b.entryInboundUuid}
                                        onChange={v => b.setEntryInboundUuid(v)}
                                        options={[
                                            { value: '', label: b.panelInboundOptions.length ? 'Pick an inbound…' : 'Load panel hosts to choose one' },
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
                                            Load panel hosts
                                        </Button>
                                    )}
                                    {b.entryHostMissing.length > 0 && (
                                        <p className="text-[10px] text-amber-300/80">
                                            Still needed: {b.entryHostMissing.join(', ')}
                                        </p>
                                    )}
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        icon="Plus"
                                        className="text-[11px]"
                                        onClick={b.createEntryHost}
                                        disabled={b.entryHostMissing.length > 0}
                                        title="Create the visible host and attach this template to it"
                                    >
                                        Create entry host with this template
                                    </Button>
                                </div>
                            </Section>
                        )}

                        <Section title="What stays off the tunnel">
                            <p className="text-[10px] text-slate-500 -mt-1">
                                These domains get a routing rule straight to <span className="font-mono">direct</span>,
                                and the same list is repeated in the DNS block so their lookups are answered
                                locally instead of through the proxy.
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
                                <span className="label-xs">Your own domains</span>
                                <textarea
                                    className="input-base font-mono text-[11px] h-16 resize-none bg-slate-950/60 mt-1.5"
                                    placeholder="domain:mybank.example, regexp:.+\.local$, geosite:category-ads"
                                    value={b.bypassCustomText}
                                    onChange={e => b.setBypassCustomText(e.target.value)}
                                />
                                <p className="text-[10px] text-slate-500 mt-1">
                                    Any Xray matcher works here — <span className="font-mono">domain:</span>,{' '}
                                    <span className="font-mono">regexp:</span> or a{' '}
                                    <span className="font-mono">geosite:</span> category, which stays current
                                    without this app shipping a list.
                                    {b.bypassCustom.length > 0 && ` Currently ${b.bypassCustom.length} entry(ies).`}
                                </p>
                            </div>

                            <Switch
                                checked={options.bypassBittorrent}
                                onChange={v => b.setOption({ bypassBittorrent: v })}
                                label="BitTorrent direct"
                            />
                            <p className="text-[10px] text-slate-500 -mt-2 ml-[52px]">
                                Matched by sniffing the protocol, not by domain.
                            </p>
                        </Section>

                        <Section title="DNS">
                            <Switch
                                checked={options.dns}
                                onChange={v => b.setOption({ dns: v })}
                                label="Write a DNS block"
                            />
                            <p className="text-[10px] text-slate-500 -mt-2 ml-[52px]">
                                Off means the client uses whatever DNS the system gives it.
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
                                        label="Upstream servers"
                                        value={options.dnsUpstream.join(', ')}
                                        onChange={(e: any) => b.setOption({
                                            dnsUpstream: e.target.value.split(/[\s,]+/).filter(Boolean),
                                        })}
                                        hint="Used for everything that is not in the bypass list above"
                                    />
                                    <Input
                                        label="Resolved locally, but not routed direct"
                                        value={b.dnsExtraText}
                                        onChange={(e: any) => b.setDnsExtraText(e.target.value)}
                                        placeholder="domain:mypanel.io"
                                        hint="Added to the DNS bypass entry only — the traffic still goes through the proxy"
                                    />
                                </>
                            )}
                        </Section>
                    </div>

                    {/* Preview */}
                    <div className="flex-1 min-h-0 flex flex-col">
                        <div className="flex items-center justify-between mb-1.5 gap-2">
                            <span className="label-xs">{isTemplate ? 'Generated template' : 'Generated config'}</span>
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

                        <div className="flex-1 min-h-[220px] md:min-h-[160px] relative rounded-lg overflow-hidden border border-slate-700 bg-[#282c34]">
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
                                    Add at least one node to see the config
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
