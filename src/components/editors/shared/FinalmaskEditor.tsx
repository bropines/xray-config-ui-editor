import React, { useState } from 'react';
import { Icon } from '../../ui/Icon';
import { Button } from '../../ui/Button';
import { Help } from '../../ui/Help';
import { Select } from '../../ui/Select';
import { Switch } from '../../ui/Switch';
// The JSON box and the text-for-a-value hook started here and moved out when
// SchemaForm needed the same box for object-typed keys: one, not two.
import { JsonInput } from '../../ui/JsonInput';
import { useSyncedText } from '../../../hooks/useSyncedText';
import {
    useFinalmaskEditor,
    type ChainView,
    type ExtraKey,
    type LayerView,
} from '../../../hooks/useFinalmaskEditor';
import type { FinalmaskIssue, MaskKey, MaskList, MaskSide } from '../../../core/xray/versions/finalmask-rules';
import { NoiseGeneratorModal } from '../noise/NoiseGeneratorModal';
import { t } from '../../../i18n';

type Editor = ReturnType<typeof useFinalmaskEditor>;

/**
 * The finalmask block of a transport: the UDP and TCP mask chains and the
 * QUIC parameters, drawn for the core line the config is written for.
 *
 * `side` says which end of the connection this is. The core reads some keys
 * on one side only (xdns domains on the server, resolvers on the client) and
 * runs udphop on clients only; without a side, both sides' keys are offered
 * and only the findings that hold for either side are shown.
 */
export const FinalmaskEditor = ({ finalmask, onChange, side }: {
    finalmask: any;
    onChange: (value: any) => void;
    side?: MaskSide;
}) => {
    const editor = useFinalmaskEditor(finalmask, onChange, side);

    return (
        <div className="border-t border-slate-800 pt-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <Icon name="Shield" size={14} />
                {t("Finalmask Configuration")}
                <Help>{t("Obfuscation layers wrapped around the transport, and the QUIC parameters for hysteria and XHTTP. What is offered here follows the Xray version set in Settings: {tag}.", { tag: editor.tag })}</Help>
            </div>

            {!editor.enabled ? (
                <div className="space-y-3">
                    <Button variant="secondary" size="sm" icon="Plus" onClick={editor.enable}>
                        {t("Add finalmask")}
                    </Button>
                    {/* Straight to a working noise layer, without building one by hand. */}
                    <NoisePresets editor={editor} />
                </div>
            ) : (
                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/60 space-y-8">
                    {editor.chains.map(chain => (
                        <ChainSection key={chain.list} chain={chain} editor={editor} />
                    ))}
                    <QuicSection editor={editor} />
                    <div className="pt-4 border-t border-slate-800/50">
                        <Button variant="ghost" size="sm" icon="Trash" className="text-rose-400 hover:text-rose-300" onClick={editor.remove}>
                            {t("Remove finalmask")}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Chains ───────────────────────────────────────────────────────────────

const ChainSection = ({ chain, editor }: { chain: ChainView; editor: Editor }) => {
    const net = chain.list.toUpperCase();
    return (
        <section className="space-y-3" data-testid={`finalmask-${chain.list}`}>
            <div className="text-xs text-emerald-500 uppercase font-bold border-b border-slate-800/50 pb-2">
                {t("{net} obfuscation chain", { net })}
            </div>
            <IssueList issues={chain.issues} />
            {chain.layers.length === 0 ? (
                <div className="text-xs text-slate-600 italic">{t("No {net} obfuscation layers.", { net })}</div>
            ) : (
                chain.layers.map(layer => (
                    <LayerCard key={layer.index} list={chain.list} layer={layer} count={chain.layers.length} editor={editor} />
                ))
            )}
            {/* Controls at the foot: on a phone the chain reads top-down first. */}
            <Button variant="secondary" size="sm" icon="Plus" onClick={() => editor.addLayer(chain.list)}>
                {t("Add Layer")}
            </Button>
            {chain.list === 'udp' && <NoisePresets editor={editor} />}
        </section>
    );
};

/**
 * The WARP profiles' noise, one press away on any transport: it fills the
 * chain's noise layer (keeping its reset) or adds one next to the socket.
 * The preset the layer already holds is marked.
 */
const NoisePresets = ({ editor }: { editor: Editor }) => {
    const { presets, active } = editor.noisePresets;
    if (presets.length === 0) return null;
    return (
        <div className="space-y-1.5" data-testid="noise-presets">
            <div className="label-xs flex items-center gap-1.5">
                {t("Noise presets")}
                <Help>{t("The noise the WARP profiles send ahead of WireGuard's handshake. Pressing one replaces the packets of this chain's noise layer, or adds a noise layer next to the socket if there is none. Made for WireGuard; any UDP transport takes it.")}</Help>
            </div>
            <div className="flex flex-wrap gap-1.5">
                {presets.map(preset => {
                    const on = preset.id === active;
                    return (
                        <button
                            key={preset.id}
                            type="button"
                            title={preset.hint}
                            aria-pressed={on}
                            onClick={() => editor.applyNoisePreset(preset.id)}
                            className={`px-2 py-1.5 text-[10px] rounded-md border transition-all flex items-center gap-1 ${on
                                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-600'}`}
                        >
                            {on && <Icon name="Check" size={10} weight="bold" />}
                            {preset.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

const LayerCard = ({ list, layer, count, editor }: { list: MaskList; layer: LayerView; count: number; editor: Editor }) => {
    const { index, type, typeStatus } = layer;
    const refused = type !== '' && !typeStatus.accepted;
    const options = layer.typeOptions.map(option => ({
        value: option,
        label: option === type && refused
            ? `${option} — ${t("refused by Xray {tag}", { tag: editor.tag })}`
            : option,
    }));

    return (
        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 space-y-3" data-testid={`finalmask-${list}-${index}`}>
            <Select
                label={t("Layer {n}", { n: index + 1 })}
                value={type}
                onChange={value => editor.changeType(list, index, value)}
                options={options}
                placeholder={t("Layer Type")}
            />

            {refused && (
                <Notice tone="critical">
                    {t("Xray {tag} does not know {type} as a {list} mask, so the config will not load.", { tag: editor.tag, type, list: list.toUpperCase() })}
                    {typeStatus.replacement && <> {t("Use {replacement} instead.", { replacement: typeStatus.replacement })}</>}
                </Notice>
            )}

            <IssueList issues={layer.issues} />

            {layer.fields.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {layer.fields.map(spec => (
                        <MaskField
                            key={spec.key}
                            spec={spec}
                            value={layer.settings[spec.key]}
                            onChange={value => editor.setSetting(list, index, spec.key, value)}
                            showSide={!editor.side}
                            noise={spec.shape === 'noise' ? { list, index, editor } : undefined}
                        />
                    ))}
                </div>
            )}

            {layer.extras.map(extra => (
                <ExtraKeyRow key={extra.key} extra={extra} tag={editor.tag} onRemove={() => editor.setSetting(list, index, extra.key, undefined)} />
            ))}

            <div className="flex flex-wrap items-center gap-2 pt-1">
                {layer.convertible && (
                    <Button variant="secondary" size="sm" icon="ArrowsClockwise" onClick={() => editor.convertLayer(list, index)}>
                        {t("Convert to mkcp-legacy")}
                    </Button>
                )}
                <div className="ml-auto flex items-center gap-1">
                    <Button variant="ghost" size="sm" icon="ArrowUp" aria-label={t("Move up")} disabled={index === 0} onClick={() => editor.moveLayer(list, index, -1)} />
                    <Button variant="ghost" size="sm" icon="ArrowDown" aria-label={t("Move down")} disabled={index === count - 1} onClick={() => editor.moveLayer(list, index, 1)} />
                    <Button variant="ghost" size="sm" icon="Trash" aria-label={t("Remove layer")} className="text-rose-400 hover:text-rose-300" onClick={() => editor.removeLayer(list, index)} />
                </div>
            </div>
        </div>
    );
};

// ── QUIC parameters ──────────────────────────────────────────────────────

const QuicSection = ({ editor }: { editor: Editor }) => (
    <section className="space-y-3 pt-4 border-t border-slate-800/50">
        <div className="text-[10px] text-blue-400 uppercase font-bold flex items-center gap-1.5">
            {t("QUIC Parameters")}
            <Help>{t("Read by the hysteria and XHTTP (HTTP/3) transports only. An empty field is left out of the config, so the core uses its default.")}</Help>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {editor.quic.fields.map(spec => (
                <MaskField
                    key={spec.key}
                    spec={spec}
                    value={editor.quic.value[spec.key]}
                    onChange={value => editor.setQuic(spec.key, value)}
                    showSide={false}
                />
            ))}
        </div>
        {editor.quic.extras.map(extra => (
            <ExtraKeyRow key={extra.key} extra={extra} tag={editor.tag} onRemove={() => editor.setQuic(extra.key, undefined)} />
        ))}
    </section>
);

// ── Fields ───────────────────────────────────────────────────────────────

/** Short notes for the keys whose format is not obvious from the name. */
const hintFor = (key: string): string | undefined => {
    switch (key) {
        case 'domains': return t("Domains this server answers for, one per line: example.com or example.com:txt.");
        case 'resolvers': return t("Resolvers the client queries through, one per line: example.com+udp://1.1.1.1:53.");
        case 'interval': return t("Seconds between hops, at least 5: 10 or 5-30.");
        case 'packetSize': return t("Switches salamander to gecko framing (1-2048), which plain salamander and 26.3 cannot talk to.");
        case 'lengths': return t("One range per line; overrides length when set.");
        case 'delays': return t("One range per line; overrides delay when set.");
        case 'maxIdleTimeout': return t("Seconds, 4-120.");
        case 'keepAlivePeriod': return t("Seconds, 2-60.");
        default: return undefined;
    }
};

const PLACEHOLDERS: Record<string, string> = {
    length: '100-200', delay: '10-20', maxSplit: '0', reset: '0', packetSize: '1200-1400',
    packets: 'tlshello', url: 'realm://TOKEN@host/ID', interval: '5-30', remotePorts: '20000-30000,443',
    brutalUp: '100 mbps', brutalDown: '100 mbps', maxIdleTimeout: '30', keepAlivePeriod: '10',
};

const Label = ({ spec, showSide }: { spec: MaskKey; showSide: boolean }) => {
    const hint = hintFor(spec.key);
    return (
        <span className="label-xs flex items-center gap-1.5">
            <span className="font-mono normal-case">{spec.key}</span>
            {showSide && spec.side && (
                <span className="text-slate-500 normal-case">
                    {spec.side === 'inbound' ? t("(server)") : t("(client)")}
                </span>
            )}
            {hint && <Help>{hint}</Help>}
        </span>
    );
};

interface NoiseTarget {
    list: MaskList;
    index: number;
    editor: Editor;
}

const MaskField = ({ spec, value, onChange, showSide, noise }: {
    spec: MaskKey;
    value: unknown;
    onChange: (value: unknown) => void;
    showSide: boolean;
    noise?: NoiseTarget;
}) => {
    const wide = ['json', 'noise', 'strings', 'ranges', 'udpHop', 'flags'].includes(spec.shape);
    return (
        <div className={`flex flex-col gap-1.5 ${wide ? 'md:col-span-2' : ''}`} data-field={spec.key}>
            {spec.shape !== 'bool' && <Label spec={spec} showSide={showSide} />}
            <FieldInput spec={spec} value={value} onChange={onChange} showSide={showSide} noise={noise} />
        </div>
    );
};

const FieldInput = ({ spec, value, onChange, showSide, noise }: {
    spec: MaskKey;
    value: unknown;
    onChange: (value: unknown) => void;
    showSide: boolean;
    noise?: NoiseTarget;
}) => {
    const placeholder = PLACEHOLDERS[spec.key];
    switch (spec.shape) {
        case 'bool':
            return <Switch checked={value === true} onChange={onChange} label={<Label spec={spec} showSide={showSide} />} />;
        case 'number':
            return (
                <input
                    type="number"
                    className="input-base text-xs font-mono"
                    placeholder={placeholder}
                    value={typeof value === 'number' || typeof value === 'string' ? String(value) : ''}
                    onChange={e => {
                        const text = e.target.value.trim();
                        onChange(text === '' || !Number.isFinite(Number(text)) ? undefined : Number(text));
                    }}
                />
            );
        case 'choice':
            return <ChoiceInput options={spec.options ?? []} value={value} onChange={onChange} />;
        case 'flags':
            return <FlagsInput options={spec.options ?? []} value={value} onChange={onChange} />;
        case 'strings':
        case 'ranges':
            return <LinesInput value={value} onChange={onChange} />;
        case 'json':
            return <JsonInput value={value} onChange={onChange} />;
        case 'noise':
            return noise ? <NoiseEditor target={noise} value={value} /> : null;
        case 'udpHop':
            return <UdpHopInput value={value} onChange={onChange} />;
        case 'string':
        case 'range':
        case 'ports':
        default:
            return (
                <input
                    className="input-base text-xs font-mono"
                    placeholder={placeholder}
                    value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
                    onChange={e => onChange(e.target.value === '' ? undefined : e.target.value)}
                />
            );
    }
};

/** "Default" writes nothing: the core's own default, never an empty string. */
const ChoiceInput = ({ options, value, onChange }: { options: string[]; value: unknown; onChange: (value: unknown) => void }) => {
    const current = typeof value === 'string' ? value : '';
    const known = current === '' || options.some(option => option.toLowerCase() === current.toLowerCase());
    return (
        <Select
            value={current}
            onChange={next => onChange(next === '' ? undefined : next)}
            options={[
                { value: '', label: t("Default") },
                ...options.map(option => ({ value: option, label: option })),
                ...(known ? [] : [{ value: current, label: `${current} — ${t("not a value this version takes")}` }]),
            ]}
        />
    );
};

/** A comma-separated combination, as udphop's mode is written. */
const FlagsInput = ({ options, value, onChange }: { options: string[]; value: unknown; onChange: (value: unknown) => void }) => {
    const current = typeof value === 'string' && value !== '' ? value.split(',') : [];
    const lower = current.map(entry => entry.toLowerCase());
    const unknown = current.filter(entry => !options.some(option => option.toLowerCase() === entry.toLowerCase()));
    const toggle = (option: string, on: boolean) => {
        const kept = options.filter(candidate =>
            candidate === option ? on : lower.includes(candidate.toLowerCase()));
        onChange([...kept, ...unknown].join(',') || undefined);
    };
    return (
        <div className="flex flex-wrap gap-4">
            {options.map(option => (
                <Switch
                    key={option}
                    checked={lower.includes(option.toLowerCase())}
                    onChange={on => toggle(option, on)}
                    label={<span className="font-mono normal-case">{option}</span>}
                />
            ))}
        </div>
    );
};

const linesOf = (text: string) => text.split('\n').map(line => line.trim()).filter(Boolean);

const LinesInput = ({ value, onChange }: { value: unknown; onChange: (value: unknown) => void }) => {
    const format = (v: unknown) => (Array.isArray(v) ? v.map(String).join('\n') : typeof v === 'string' ? v : '');
    const parse = (text: string) => {
        const lines = linesOf(text);
        return lines.length ? lines : undefined;
    };
    const [text, setText] = useSyncedText(value, format, parse);
    return (
        <textarea
            className="input-base text-xs font-mono min-h-[64px] resize-y"
            value={text}
            onChange={e => {
                setText(e.target.value);
                onChange(parse(e.target.value));
            }}
        />
    );
};

/** quicParams.udpHop: `{ports, interval}`, 26.3 and 26.7 only. */
const UdpHopInput = ({ value, onChange }: { value: unknown; onChange: (value: unknown) => void }) => {
    const hop = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
    const set = (key: 'ports' | 'interval', text: string) => {
        const next: Record<string, unknown> = { ...hop };
        if (text === '') delete next[key];
        else next[key] = text;
        onChange(Object.keys(next).length ? next : undefined);
    };
    const shown = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');
    return (
        <div className="grid grid-cols-2 gap-2">
            <input className="input-base text-xs font-mono" aria-label="ports" placeholder="20000-30000,443" value={shown(hop.ports)} onChange={e => set('ports', e.target.value)} />
            <input className="input-base text-xs font-mono" aria-label="interval" placeholder="5-30" value={shown(hop.interval)} onChange={e => set('interval', e.target.value)} />
        </div>
    );
};

// ── Noise ────────────────────────────────────────────────────────────────

const PACKET_TYPES = ['hex', 'str', 'base64'];

const NoiseEditor = ({ target, value }: { target: NoiseTarget; value: unknown }) => {
    const { list, index, editor } = target;
    const items = Array.isArray(value) ? value : [];
    const update = (item: number, patch: Record<string, unknown>) => editor.updateNoiseItem(list, index, item, patch);
    // Hand-editing hex is fine for one pasted packet and hopeless for a whole
    // chain, so the generator builds them from what they are meant to look
    // like. It is a separate sheet because it needs the room.
    const [generating, setGenerating] = useState(false);
    const layer = editor.chains.find(chain => chain.list === list)?.layers[index];
    return (
        <div className="space-y-2">
            {generating && (
                <NoiseGeneratorModal
                    noise={items}
                    reset={layer?.settings.reset}
                    onClose={() => setGenerating(false)}
                    onApply={(next, reset) => editor.patchSettings(list, index, { noise: next, reset })}
                />
            )}
            {items.map((raw, i) => {
                const item = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
                const isPacket = item.packet !== undefined;
                return (
                    <div key={i} className="flex flex-wrap gap-2 items-center bg-slate-950 p-2 rounded border border-slate-800/50">
                        <Select
                            value={isPacket ? (typeof item.type === 'string' && item.type ? item.type : 'hex') : 'rand'}
                            onChange={kind => kind === 'rand'
                                ? update(i, { packet: undefined, type: undefined, rand: '40-70' })
                                : update(i, { rand: undefined, packet: isPacket ? item.packet : '', type: kind })}
                            options={[
                                ...PACKET_TYPES.map(kind => ({ value: kind, label: kind.toUpperCase() })),
                                { value: 'rand', label: t("RAND") },
                            ]}
                            className="w-28 shrink-0"
                        />
                        {isPacket ? (
                            <input
                                className="input-base text-[10px] font-mono flex-1 min-w-[8rem] py-1 h-7"
                                placeholder={t("Packet")}
                                value={typeof item.packet === 'string' ? item.packet : JSON.stringify(item.packet)}
                                onChange={e => {
                                    let next = e.target.value;
                                    // Pasted "0x…" hex keeps only the digits the core decodes.
                                    const hex = (item.type ?? 'hex') === 'hex' ? /0x([0-9a-fA-F]+)/.exec(next) : null;
                                    if (hex?.[1]) next = hex[1];
                                    update(i, { packet: next });
                                }}
                            />
                        ) : (
                            <input
                                className="input-base text-[10px] font-mono flex-1 min-w-[5rem] py-1 h-7"
                                placeholder="40-70"
                                value={typeof item.rand === 'string' || typeof item.rand === 'number' ? String(item.rand) : ''}
                                onChange={e => update(i, { rand: e.target.value })}
                            />
                        )}
                        <input
                            className="input-base text-[10px] font-mono w-20 py-1 h-7 text-center"
                            placeholder={t("Delay")}
                            value={typeof item.delay === 'string' || typeof item.delay === 'number' ? String(item.delay) : ''}
                            onChange={e => update(i, { delay: e.target.value === '' ? undefined : e.target.value })}
                        />
                        <Button variant="ghost" size="sm" icon="Trash" aria-label={t("Remove noise packet")} className="text-rose-400 hover:text-rose-300" onClick={() => editor.removeNoiseItem(list, index, i)} />
                    </div>
                );
            })}
            <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" icon="Plus" onClick={() => editor.addNoiseItem(list, index)}>
                    {t("Add Noise Packet")}
                </Button>
                <Button variant="secondary" size="sm" icon="Sparkle" onClick={() => setGenerating(true)}>
                    {t("Generate…")}
                </Button>
            </div>
        </div>
    );
};

// ── Status ───────────────────────────────────────────────────────────────

const toneClasses = {
    critical: { box: 'border-rose-500/40 bg-rose-950/20 text-rose-200/90', icon: 'WarningOctagon', iconColor: 'text-rose-400' },
    warning: { box: 'border-amber-500/40 bg-amber-950/20 text-amber-200/90', icon: 'Warning', iconColor: 'text-amber-400' },
    info: { box: 'border-blue-500/30 bg-blue-950/20 text-blue-200/90', icon: 'Info', iconColor: 'text-blue-400' },
} as const;

const Notice = ({ tone, children }: { tone: keyof typeof toneClasses; children: React.ReactNode }) => (
    <div className={`flex gap-2 p-2.5 rounded-lg border text-[11px] ${toneClasses[tone].box}`} data-tone={tone}>
        <Icon name={toneClasses[tone].icon} weight="fill" className={`shrink-0 mt-0.5 ${toneClasses[tone].iconColor}`} />
        <div>{children}</div>
    </div>
);

const IssueList = ({ issues }: { issues: FinalmaskIssue[] }) =>
    issues.length === 0 ? null : (
        <div className="space-y-1.5">
            {issues.map((issue, i) => <Notice key={i} tone={issue.severity}>{issue.message}</Notice>)}
        </div>
    );

const preview = (value: unknown): string => {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    return text === undefined ? '' : text.length > 60 ? `${text.slice(0, 57)}…` : text;
};

/**
 * A key the config holds and the form does not draw: one this line refuses
 * or ignores, one only the other side reads, a fallback spelling, or a
 * setting of a type the line refuses. Shown so it can be seen and removed —
 * never dropped behind the user's back.
 */
const ExtraKeyRow = ({ extra, tag, onRemove }: { extra: ExtraKey; tag: string; onRemove: () => void }) => {
    const status = extra.status;
    let note: string | null = null;
    let tone: 'critical' | 'warning' | 'info' | null = null;
    if (status?.status === 'rejected') {
        note = t("refused by Xray {tag} — the config will not load", { tag });
        tone = 'critical';
    } else if (status?.status === 'absent') {
        note = t("ignored by Xray {tag}", { tag });
        tone = 'warning';
    } else if (status?.status === 'deprecated') {
        note = t("deprecated in Xray {tag}", { tag });
        tone = 'info';
    } else if (status?.readBy) {
        note = status.readBy === 'inbound' ? t("only the server side reads this") : t("only the client side reads this");
        tone = 'warning';
    } else if (status?.legacy) {
        note = t("older spelling, still read");
        tone = 'info';
    }
    const color = tone === 'critical' ? 'text-rose-300' : tone === 'warning' ? 'text-amber-300' : 'text-slate-400';
    return (
        <div className="flex items-start gap-2 p-2 rounded border border-slate-800 bg-slate-950/50 text-[11px]" data-extra={extra.key}>
            <div className="flex-1 min-w-0">
                <div className="font-mono text-slate-300 break-all">
                    {extra.key}: <span className="text-slate-500">{preview(extra.value)}</span>
                </div>
                {note && <div className={color}>{note}</div>}
                {status?.replacement && <div className="text-slate-400">{t("Use {replacement} instead.", { replacement: status.replacement })}</div>}
            </div>
            <Button variant="ghost" size="sm" className="text-rose-400 hover:text-rose-300 shrink-0" onClick={onRemove}>
                {t("Remove")}
            </Button>
        </div>
    );
};
