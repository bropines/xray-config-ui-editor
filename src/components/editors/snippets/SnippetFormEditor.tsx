import React, { useMemo, useState } from 'react';
import { Button } from '../../ui/Button';
import { ModalBottomBar } from '../../ui/Modal';
import { Icon } from '../../ui/Icon';
import { RuleList } from '../routing/RuleList';
import { RuleEditor } from '../routing/RuleEditor';
import { BalancerList } from '../routing/BalancerList';
import { BalancerEditor } from '../routing/BalancerEditor';
import { OutboundModal } from '../OutboundModal';
import { useConfigStore } from '../../../store/configStore';
import { useGeoData } from '../../../hooks/useGeoData';
import { createDefaultRoutingRule, createDefaultBalancer, createDefaultOutbound } from '../../../core/generators';
import type { SnippetKind } from '../../../core/snippets';
import { t } from '../../../i18n';

interface Props {
    kind: SnippetKind;
    body: any[];
    onChange: (body: any[]) => void;
}

/**
 * Form editing for a snippet body.
 *
 * A snippet is an array of the same objects the routing editor already edits,
 * so it gets the same editors rather than a second set: rules go to RuleList /
 * RuleEditor, balancers to their pair, and an outbound opens the outbound
 * editor as a secondary modal. Editing a rule here and editing it in Routing
 * should not be two different experiences.
 *
 * Tag suggestions come from the config currently open. A snippet has no config
 * of its own — the panel splices it into whichever profile references it — so
 * the open one is the closest thing to the context it will land in.
 */
export const SnippetFormEditor = ({ kind, body, onChange }: Props) => {
    const config = useConfigStore(state => state.config);
    const snippetLibrary = useConfigStore(state => state.snippetLibrary);
    const { geoSites, geoIps, loadingGeo } = useGeoData();

    const [activeIndex, setActiveIndex] = useState<number | null>(body.length ? 0 : null);
    const [mobileEdit, setMobileEdit] = useState(false);
    const [outboundIndex, setOutboundIndex] = useState<number | null>(null);

    const snippets = useMemo(
        () => [...snippetLibrary.local, ...snippetLibrary.panel],
        [snippetLibrary.local, snippetLibrary.panel],
    );

    const outboundTags = useMemo(
        () => (config?.outbounds || []).map((o: any) => o.tag).filter(Boolean),
        [config?.outbounds],
    );
    const inboundTags = useMemo(
        () => (config?.inbounds || []).map((i: any) => i.tag).filter(Boolean),
        [config?.inbounds],
    );
    const balancerTags = useMemo(
        () => (config?.routing?.balancers || []).map((b: any) => b.tag).filter(Boolean),
        [config?.routing?.balancers],
    );

    const replaceAt = (index: number, value: any) => {
        const next = [...body];
        next[index] = value;
        onChange(next);
    };

    const removeAt = (index: number) => {
        onChange(body.filter((_, i) => i !== index));
        setActiveIndex(prev => {
            if (prev === null) return null;
            if (prev === index) return null;
            return prev > index ? prev - 1 : prev;
        });
    };

    const append = (item: any) => {
        onChange([...body, item]);
        setActiveIndex(body.length);
        setMobileEdit(true);
    };

    const select = (index: number) => {
        setActiveIndex(index);
        setMobileEdit(true);
    };

    const addLabel = kind === 'rules' ? t("Add rule")
        : kind === 'balancers' ? t("Add balancer")
        : t("Add outbound");

    const addItem = () => append(
        kind === 'rules' ? createDefaultRoutingRule()
            : kind === 'balancers' ? createDefaultBalancer()
            : createDefaultOutbound('freedom'),
    );

    if (kind === 'empty') {
        const choices: { kind: Exclude<SnippetKind, 'mixed' | 'empty' | 'unknown'>; icon: string; label: string; hint: string }[] = [
            { kind: 'rules', icon: 'ListDashes', label: t("Routing rules"), hint: t("What the panel splices into routing.rules") },
            { kind: 'outbounds', icon: 'ArrowSquareOut', label: t("Outbounds"), hint: t("Whole outbounds, spliced into the outbounds array") },
            { kind: 'balancers', icon: 'Scales', label: t("Balancers"), hint: t("Balancer definitions for routing.balancers") },
        ];
        return (
            <div className="flex-1 min-h-0 border border-slate-800 rounded-xl bg-slate-950/40 flex flex-col items-center justify-center gap-3 p-6">
                <p className="text-[11px] text-slate-400">{t("What does this snippet hold?")}</p>
                <div className="flex flex-wrap justify-center gap-2">
                    {choices.map(choice => (
                        <button
                            key={choice.kind}
                            onClick={() => onChange([
                                choice.kind === 'rules' ? createDefaultRoutingRule()
                                    : choice.kind === 'balancers' ? createDefaultBalancer()
                                    : createDefaultOutbound('freedom'),
                            ])}
                            className="w-40 p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-indigo-500/60 hover:bg-slate-900 transition-all text-left"
                        >
                            <Icon name={choice.icon} className="text-indigo-400 mb-1.5" />
                            <div className="text-xs font-bold text-slate-200">{choice.label}</div>
                            <div className="text-[10px] text-slate-500 leading-snug mt-0.5">{choice.hint}</div>
                        </button>
                    ))}
                </div>
                <p className="text-[10px] text-slate-600 text-center max-w-sm">
                    {t("Or switch to JSON and paste a body you already have.")}
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row flex-1 min-h-0 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
            {/* ─── List ──────────────────────────────────────────────── */}
            <div className={`w-full md:w-56 md:shrink-0 border-b md:border-b-0 md:border-r border-slate-800 flex-col min-h-0 bg-slate-950/60
                ${mobileEdit ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-2 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
                    <span className="label-xs pl-1">{t("Entries")}</span>
                    <Button variant="ghost" icon="Plus" className="py-1 px-2 text-[10px]" onClick={addItem}>
                        {addLabel}
                    </Button>
                </div>

                {body.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-[11px] text-slate-600 italic px-3 py-6 text-center">
                        {t("Empty — press Add to create the first entry.")}
                    </div>
                ) : kind === 'rules' ? (
                    <RuleList
                        rules={body}
                        snippets={snippets}
                        activeIndex={activeIndex}
                        onSelect={select}
                        onDelete={removeAt}
                        onReorder={(next: any[]) => onChange(next)}
                    />
                ) : kind === 'balancers' ? (
                    <BalancerList
                        balancers={body}
                        activeIndex={activeIndex}
                        onSelect={select}
                        onDelete={removeAt}
                        snippets={snippets}
                    />
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1">
                        {body.map((item: any, i: number) => (
                            <div
                                key={i}
                                onClick={() => setOutboundIndex(i)}
                                className="p-2 rounded-lg cursor-pointer text-xs flex items-center gap-2 group border border-transparent hover:bg-slate-900 hover:border-slate-700 transition-all"
                            >
                                <Icon name="ArrowSquareOut" className="text-slate-600 shrink-0 text-sm" />
                                <div className="min-w-0 flex-1">
                                    <div className="font-bold text-slate-200 truncate">
                                        {item?.tag || t("(no tag)")}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono truncate">
                                        {item?.protocol || '—'}
                                    </div>
                                </div>
                                <button
                                    onClick={e => {
                                        e.stopPropagation();
                                        removeAt(i);
                                    }}
                                    className="md:opacity-0 md:group-hover:opacity-100 text-slate-600 hover:text-rose-400 p-2 md:p-1 transition-all"
                                    title={t("Delete")}
                                >
                                    <Icon name="Trash" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Editor ────────────────────────────────────────────── */}
            <div className={`flex-1 min-w-0 flex-col min-h-0 ${mobileEdit ? 'flex' : 'hidden md:flex'}`}>
                {mobileEdit && (
                    <ModalBottomBar>
                        <Button
                            variant="secondary"
                            icon="ArrowLeft"
                            className="md:hidden w-full"
                            onClick={() => setMobileEdit(false)}
                        >
                            {t("Back to the list")}
                        </Button>
                    </ModalBottomBar>
                )}

                {kind === 'outbounds' ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-6 text-center gap-2">
                        <Icon name="ArrowSquareOut" className="text-4xl opacity-20" />
                        <p className="text-[11px] max-w-xs">
                            {t("Pick an outbound to open it in the outbound editor — the same one the config uses.")}
                        </p>
                    </div>
                ) : activeIndex === null || !body[activeIndex] ? (
                    <div className="flex-1 flex items-center justify-center text-slate-600 text-xs italic px-4 text-center">
                        {kind === 'rules'
                            ? t("Select a rule to configure routing logic")
                            : t("Select a balancer to configure")}
                    </div>
                ) : kind === 'rules' ? (
                    <RuleEditor
                        rule={body[activeIndex]}
                        onChange={(rule: any) => replaceAt(activeIndex, rule)}
                        outboundTags={outboundTags}
                        balancerTags={balancerTags}
                        inboundTags={inboundTags}
                        geoData={{ sites: geoSites, ips: geoIps, loading: loadingGeo }}
                        rawMode={false}
                        allRules={body}
                        onSelectRule={select}
                        snippets={snippets}
                    />
                ) : (
                    <BalancerEditor
                        balancer={body[activeIndex]}
                        onChange={(balancer: any) => replaceAt(activeIndex, balancer)}
                        outboundTags={outboundTags}
                        rawMode={false}
                        snippets={snippets}
                    />
                )}
            </div>

            {outboundIndex !== null && body[outboundIndex] && (
                <OutboundModal
                    data={body[outboundIndex]}
                    index={outboundIndex}
                    onSave={(value: any) => {
                        replaceAt(outboundIndex, value);
                        setOutboundIndex(null);
                    }}
                    onClose={() => setOutboundIndex(null)}
                />
            )}
        </div>
    );
};
