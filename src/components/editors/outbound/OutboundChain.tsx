import React from 'react';
import { TagSelector } from '../../ui/TagSelector';
import { Help } from '../../ui/Help';
import { Icon } from '../../ui/Icon';
import {
    chainOf,
    ignoredByL7,
    withChain,
    withoutChain,
    type ChainLayer,
} from '../../../core/xray/outbound-chain';
import { useCoreVersion } from '../../../hooks/useCoreVersion';
import { t } from '../../../i18n';

/**
 * Sending an outbound through another one: which, and at which layer.
 *
 * The choice is made here, in the card, rather than three steps down in
 * Sockopt. This card once held it, lost it to a line of text pointing at
 * Sockopt, and the pointer was no substitute — the field it pointed at only
 * appears after Sockopt is added, and the application-layer form could not be
 * created at all on the lines that still run it.
 *
 * The two layers are different things in the core, not two spellings (see
 * core/xray/outbound-chain.ts), so they are offered as a choice with what
 * each one does said beside it. What a line refuses is not offered, and what
 * a config already holds is always shown.
 */

const TONE = {
    critical: { box: 'border-rose-500/40 bg-rose-950/20 text-rose-200/90', icon: 'WarningOctagon', color: 'text-rose-400' },
    warning: { box: 'border-amber-500/40 bg-amber-950/20 text-amber-200/90', icon: 'Warning', color: 'text-amber-400' },
    info: { box: 'border-blue-500/30 bg-blue-950/20 text-blue-200/90', icon: 'Info', color: 'text-blue-400' },
} as const;

const Notice = ({ tone, children, action }: {
    tone: keyof typeof TONE;
    children: React.ReactNode;
    action?: { label: string; onClick: () => void };
}) => (
    <div className={`flex gap-2 p-2.5 rounded-lg border text-[11px] leading-relaxed ${TONE[tone].box}`} data-tone={tone}>
        <Icon name={TONE[tone].icon} weight="fill" className={`shrink-0 mt-0.5 ${TONE[tone].color}`} />
        <div className="space-y-2 min-w-0">
            <div>{children}</div>
            {action && (
                <button
                    type="button"
                    onClick={action.onClick}
                    className="h-7 px-2.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-[11px] font-bold text-emerald-200 hover:border-emerald-400 transition-colors"
                >
                    {action.label}
                </button>
            )}
        </div>
    </div>
);

export const OutboundChain = ({ outbound, onChange, outboundTags }: {
    outbound: any;
    /** The editor's `updateField(path, value)`. */
    onChange: (path: string, value: any) => void;
    /** Every other outbound's tag — never this one's own. */
    outboundTags: string[];
}) => {
    const { status, tag: coreTag } = useCoreVersion();
    const chain = chainOf(outbound);
    // `proxySettings` is the only way to ask for the application layer, and a
    // line that refuses the key refuses the layer with it.
    const l7Refused = status('outbound.proxySettings') === 'rejected';
    const oldSpelling = chain?.field === 'proxySettings' && chain.layer === 'L4';
    const unused = chain?.layer === 'L7' ? ignoredByL7(outbound) : [];

    // A chain lives in two keys of the outbound, so both are written every
    // time: one set, the other cleared.
    const apply = (next: any) => {
        onChange('streamSettings', next.streamSettings);
        onChange('proxySettings', next.proxySettings);
    };

    const pick = (value: string | string[]) => {
        const tag = (Array.isArray(value) ? value[0] ?? '' : value).trim();
        if (!tag) return apply(withoutChain(outbound));
        // Changing only the target leaves the spelling the config came with.
        if (oldSpelling) return onChange('proxySettings', { ...outbound.proxySettings, tag });
        apply(withChain(outbound, tag, chain?.layer ?? 'L4'));
    };

    const setLayer = (layer: ChainLayer) => {
        if (chain) apply(withChain(outbound, chain.via, layer));
    };

    const layers: { id: ChainLayer; label: string; hint: string }[] = [
        {
            id: 'L4',
            label: t("L4 · Transport"),
            hint: t("This outbound dials as usual, and the socket underneath is opened through the other one. Its own transport, security and sockopt all apply."),
        },
        {
            id: 'L7',
            label: t("L7 · Application"),
            hint: t("The other outbound carries the stream to the destination. Of this outbound's own stream settings only TLS is used."),
        },
    ];
    // What the line refuses is not offered — unless the config already has it.
    const offered = layers.filter(layer => layer.id === 'L4' || !l7Refused || chain?.layer === 'L7');

    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3" data-testid="outbound-chain">
            <h4 className="label-xs text-slate-400 flex items-center gap-1">
                {t("Proxy Chaining (Optional)")}
                <Help>{t("Sends this outbound's connections through another outbound first — for example WireGuard through a freedom outbound that carries the obfuscation. Pick the outbound to go through, then the layer.")}</Help>
            </h4>

            <TagSelector
                availableTags={outboundTags}
                selected={chain?.via ?? ''}
                onChange={pick}
                placeholder={t("Direct (None)")}
            />

            {!chain ? (
                <p className="text-[11px] text-slate-500 leading-relaxed">
                    {t("Not chained: this outbound opens its own connections.")}
                </p>
            ) : (
                <div className="space-y-3 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800" role="radiogroup" aria-label={t("Chaining layer")}>
                            {offered.map(layer => (
                                <button
                                    key={layer.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={chain.layer === layer.id}
                                    title={layer.hint}
                                    onClick={() => setLayer(layer.id)}
                                    className={`px-2.5 py-1.5 text-xs font-bold rounded transition-all ${chain.layer === layer.id
                                        ? (layer.id === 'L4' ? 'bg-sky-600 text-white shadow' : 'bg-amber-600 text-white shadow')
                                        : 'text-slate-400 hover:text-white'}`}
                                >
                                    {layer.label}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => apply(withoutChain(outbound))}
                            className="h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-900 text-[11px] font-bold text-slate-300 hover:border-slate-500 transition-colors"
                        >
                            {t("Unchain")}
                        </button>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                        {layers.find(layer => layer.id === chain.layer)?.hint}{' '}
                        <span className="text-slate-500 font-mono">
                            {chain.field === 'sockopt.dialerProxy'
                                ? 'streamSettings.sockopt.dialerProxy'
                                : oldSpelling ? 'proxySettings + transportLayer' : 'proxySettings'}
                        </span>
                    </p>

                    {chain.conflict && (
                        <Notice tone="critical">
                            {t("Both proxySettings and sockopt.dialerProxy name an outbound here. Xray refuses the config for that. Pick a layer above to keep one of them.")}
                        </Notice>
                    )}

                    {chain.field === 'proxySettings' && l7Refused && (
                        <Notice
                            tone="critical"
                            action={{ label: t("Switch to the transport layer"), onClick: () => setLayer('L4') }}
                        >
                            {t("Xray {tag} refuses any proxySettings, and the config does not load. The transport layer is the only chaining it has.", { tag: coreTag })}
                        </Notice>
                    )}

                    {chain.layer === 'L7' && !l7Refused && (
                        <Notice tone="info">
                            {t("Runs on Xray 26.3 and 26.7. From 26.9 the core refuses the config instead — the transport layer is what survives an upgrade.")}
                        </Notice>
                    )}

                    {unused.length > 0 && (
                        <Notice tone="warning">
                            {t("Not used while chained at this layer: {list}. Only TLS from this outbound's stream settings is applied; the transport layer is the one that runs them.", { list: unused.join(', ') })}
                        </Notice>
                    )}

                    {oldSpelling && !l7Refused && !chain.conflict && (
                        <Notice
                            tone="info"
                            action={{ label: t("Rewrite as sockopt.dialerProxy"), onClick: () => setLayer('L4') }}
                        >
                            {t("Written the old way, as proxySettings with transportLayer. The core turns that into sockopt.dialerProxy when it loads, so it runs the same — and 26.9 refuses it instead.")}
                        </Notice>
                    )}
                </div>
            )}
        </div>
    );
};
