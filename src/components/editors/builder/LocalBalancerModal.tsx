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
            className={`mt-0.5 shrink-0 ${node.include ? 'text-emerald-400' : 'text-slate-600'}`}
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
        <button onClick={onRemove} className="text-slate-600 hover:text-rose-400 p-1 shrink-0" title="Remove">
            <Icon name="Trash" className="text-sm" />
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
export const LocalBalancerModal = ({ onClose }: { onClose: () => void }) => {
    const b = useLocalBalancerBuilder();
    const { options } = b;

    const multi = b.results.length > 1;

    return (
        <Modal
            title="Local Balancer Builder"
            onClose={onClose}
            onSave={b.preview ? b.loadIntoEditor : undefined}
            saveText={multi ? 'Load shown config' : 'Load into editor'}
            saveIcon="ArrowSquareIn"
            className="h-[90vh] md:h-[88vh] max-h-[92vh] overflow-hidden"
            extraButtons={
                <>
                    <Button variant="secondary" icon="FileArrowDown" onClick={b.download} disabled={!b.outputJson}>
                        Download {multi ? `${b.results.length} configs` : 'JSON'}
                    </Button>
                    <Button variant="secondary" icon="Copy" onClick={b.copy} disabled={!b.outputJson}>Copy</Button>
                    <Button variant="secondary" icon="CardsThree" onClick={b.saveAsProfiles} disabled={b.results.length === 0}>
                        Save as profile{multi ? 's' : ''}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col md:flex-row flex-1 min-h-0 gap-3">
                {/* ─── Nodes ────────────────────────────────────────── */}
                <div className="w-full md:w-80 shrink-0 flex flex-col min-h-0 gap-3">
                    <Section title="Nodes">
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
                    </Section>

                    <div className="flex items-center justify-between px-1 shrink-0">
                        <span className="text-[11px] text-slate-400">
                            <b className="text-slate-200">{b.includedNodes.length}</b> of {b.nodes.length} node(s)
                            {b.results.length > 0 && <> · <b className="text-slate-200">{b.results.length}</b> config(s)</>}
                        </span>
                        {b.nodes.length > 0 && (
                            <button onClick={b.clearNodes} className="text-[10px] text-slate-500 hover:text-rose-400">clear</button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scroll min-h-0 pr-1">
                        {b.nodes.length === 0 ? (
                            <div className="text-center text-slate-600 italic text-[11px] py-10 px-3">
                                No nodes yet. Paste links or pull them from the open config.
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

                    <div className="shrink-0">
                        <Switch
                            checked={b.splitByLocation}
                            onChange={b.setSplitByLocation}
                            label="One config per location"
                        />
                        <p className="text-[10px] text-slate-500 mt-1 ml-[52px]">
                            Groups nodes by label, ignoring trailing numbering — a subscription of
                            "… #1 / … #2" becomes one balanced config per place.
                        </p>
                    </div>
                </div>

                {/* ─── Options + preview ────────────────────────────── */}
                <div className="flex-1 min-w-0 flex flex-col min-h-0 gap-3">
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

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 shrink-0 overflow-y-auto custom-scroll max-h-[38vh] pr-1">
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
                                value={options.fallbackTag === 'none' || options.fallbackTag === 'first' ? options.fallbackTag : 'first'}
                                onChange={v => b.setOption({ fallbackTag: v as any })}
                                options={[
                                    { value: 'none', label: 'None', description: 'Fail when no node is healthy' },
                                    { value: 'first', label: 'First node', description: 'Degrade to node #1 instead of failing' },
                                ]}
                            />
                            {options.strategy === 'leastLoad' && (
                                <div className="grid grid-cols-2 gap-2">
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
                                    { value: 'burst', label: 'burstObservatory', description: 'Concurrent pings, sampled' },
                                    { value: 'observatory', label: 'observatory', description: 'Classic sequential probe' },
                                    { value: 'none', label: 'None', description: 'Balancer without measurements' },
                                ]}
                            />
                            {options.probe !== 'none' && (
                                <>
                                    <div className="grid grid-cols-2 gap-2">
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
                                            <span className="label-xs">Sampling</span>
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
                            <div className="grid grid-cols-2 gap-2">
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

                        <Section title="Bypass & DNS">
                            <Switch checked={b.bypassRussian} onChange={b.setBypassRussian} label="Russian sites direct" />
                            <Switch checked={b.bypassLeakChecks} onChange={b.setBypassLeakChecks} label="IP/DNS leak checkers direct" />
                            <Switch
                                checked={options.bypassBittorrent}
                                onChange={v => b.setOption({ bypassBittorrent: v })}
                                label="BitTorrent direct"
                            />
                            <Switch checked={options.dns} onChange={v => b.setOption({ dns: v })} label="DNS block" />
                            {options.dns && (
                                <>
                                    <Input
                                        label="Upstream DNS"
                                        value={options.dnsUpstream.join(', ')}
                                        onChange={(e: any) => b.setOption({
                                            dnsUpstream: e.target.value.split(/[\s,]+/).filter(Boolean),
                                        })}
                                    />
                                    <Input
                                        label="Extra bypass domains (DNS only)"
                                        value={b.dnsExtraText}
                                        onChange={(e: any) => b.setDnsExtraText(e.target.value)}
                                        placeholder="domain:mypanel.io"
                                    />
                                </>
                            )}
                        </Section>
                    </div>

                    {/* Preview */}
                    <div className="flex-1 min-h-0 flex flex-col">
                        <div className="flex items-center justify-between mb-1.5 gap-2">
                            <span className="label-xs">Generated config</span>
                            {multi && (
                                <div className="flex gap-1 overflow-x-auto hide-scrollbar">
                                    {b.results.map((r, i) => (
                                        <button
                                            key={i}
                                            onClick={() => b.setPreviewIndex(i)}
                                            className={`px-2 py-1 text-[10px] rounded-md border whitespace-nowrap transition-all ${
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

                        <div className="flex-1 min-h-[160px] relative rounded-lg overflow-hidden border border-slate-700 bg-[#282c34]">
                            {b.preview ? (
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
