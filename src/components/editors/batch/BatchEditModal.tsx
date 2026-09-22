import React, { useMemo, useState } from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Switch } from '../../ui/Switch';
import { NumberInput } from '../../ui/NumberInput';
import { Badge } from '../../ui/Badge';
import { applyBatch, isEmptyPatch, type BatchPatch } from '../../../core/batch/endpoint-batch';
import type { EndpointDirection } from '../../../core/generators/endpoint-factory';
import { t, tn } from '../../../i18n';

const UNCHANGED = '';

interface Props {
    direction: EndpointDirection;
    items: any[];
    /** Pre-selected indexes, e.g. from the card's own multi-select. */
    initialSelection?: Iterable<number>;
    onApply: (items: any[]) => void;
    onClose: () => void;
}

/**
 * One change across many endpoints.
 *
 * The preview is the point. A mass edit is the one operation where being
 * wrong is expensive and invisible — thirty nodes silently moved to a
 * transport their server does not speak — so this shows exactly which items
 * change, field by field, and which are refused and why, before anything is
 * written.
 */
export const BatchEditModal = ({ direction, items, initialSelection, onApply, onClose }: Props) => {
    const [selection, setSelection] = useState<Set<number>>(() => new Set(initialSelection ?? []));
    const [patch, setPatch] = useState<BatchPatch>({});

    const set = (update: Partial<BatchPatch>) => setPatch(prev => ({ ...prev, ...update }));

    const preview = useMemo(
        () => applyBatch(items, selection, direction, patch),
        [items, selection, direction, patch],
    );

    const empty = isEmptyPatch(patch);
    const canApply = selection.size > 0 && !empty && preview.changes.length > 0;

    const toggle = (index: number) =>
        setSelection(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });

    const allSelected = selection.size === items.length && items.length > 0;

    return (
        <Modal
            title={direction === 'inbound' ? t("Batch edit inbounds") : t("Batch edit outbounds")}
            onClose={onClose}
            onSave={canApply ? () => onApply(preview.items) : undefined}
            saveText={canApply
                ? tn(preview.changes.length, "Apply to {n} item", "Apply to {n} items")
                : t("Nothing to apply")}
            saveIcon="Check"
            className="md:h-[88vh] md:max-h-[92dvh] overflow-hidden"
        >
            <div className="flex flex-col md:flex-row flex-1 min-h-0 gap-3">
                {/* ─── Pick the targets ──────────────────────────────── */}
                <div className="w-full md:w-64 md:shrink-0 flex flex-col min-h-0 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                    <div className="p-2 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
                        <span className="label-xs pl-1">
                            {t("{n} selected", { n: selection.size })}
                        </span>
                        <Button
                            variant="ghost"
                            className="py-1 px-2 text-[10px]"
                            onClick={() => setSelection(allSelected
                                ? new Set()
                                : new Set(items.map((_, i) => i)))}
                        >
                            {allSelected ? t("Clear") : t("Select all")}
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1">
                        {items.map((item, index) => {
                            const changed = preview.changes.find(c => c.index === index);
                            const refused = preview.skipped.filter(s => s.index === index);
                            return (
                                <button
                                    key={index}
                                    onClick={() => toggle(index)}
                                    className={`w-full text-left p-2 rounded-lg border text-xs transition-all ${
                                        selection.has(index)
                                            ? 'bg-indigo-600/15 border-indigo-500/50'
                                            : 'bg-slate-900/40 border-transparent hover:border-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon
                                            name={selection.has(index) ? 'CheckSquare' : 'Square'}
                                            className={selection.has(index) ? 'text-indigo-400' : 'text-slate-600'}
                                        />
                                        <span className="font-bold text-slate-200 truncate flex-1">
                                            {item?.tag || t("(no tag)")}
                                        </span>
                                        {changed && <Badge variant="success" size="sm">{changed.fields.length}</Badge>}
                                        {!changed && refused.length > 0 && (
                                            <Badge variant="warning" size="sm">{t("skip")}</Badge>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono truncate ml-6">
                                        {item?.protocol}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ─── The change, and what it would do ──────────────── */}
                <div className="flex-1 min-w-0 flex flex-col min-h-0 gap-3 overflow-y-auto custom-scroll pr-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
                        <Select
                            label={t("Transport")}
                            value={patch.network ?? UNCHANGED}
                            onChange={v => set({ network: v || undefined })}
                            help={t("Applied to streamSettings.network. Protocols that carry no transport — WireGuard, TUN, freedom, blackhole — are skipped rather than broken.")}
                            options={[
                                { value: UNCHANGED, label: t("Leave unchanged") },
                                ...['tcp', 'raw', 'ws', 'grpc', 'httpupgrade', 'xhttp', 'kcp', 'quic']
                                    .map(v => ({ value: v, label: v })),
                            ]}
                        />
                        <Select
                            label={t("Security layer")}
                            value={patch.security ?? UNCHANGED}
                            onChange={v => set({ security: v || undefined })}
                            options={[
                                { value: UNCHANGED, label: t("Leave unchanged") },
                                ...['none', 'tls', 'reality'].map(v => ({ value: v, label: v })),
                            ]}
                        />
                        <Input
                            label={t("Tag prefix")}
                            value={patch.tagPrefix ?? ''}
                            onChange={(e: any) => set({ tagPrefix: e.target.value || undefined })}
                            placeholder="nl-"
                        />
                        <Input
                            label={t("Tag suffix")}
                            value={patch.tagSuffix ?? ''}
                            onChange={(e: any) => set({ tagSuffix: e.target.value || undefined })}
                            placeholder="-v2"
                        />
                    </div>

                    {direction === 'inbound' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
                            <div>
                                <span className="label-xs">{t("First port")}</span>
                                <NumberInput
                                    value={patch.port}
                                    onChange={v => set({ port: v })}
                                    min={1}
                                    max={65535}
                                />
                            </div>
                            <div>
                                <span className="label-xs">{t("Port step")}</span>
                                <NumberInput
                                    value={patch.portStep}
                                    onChange={v => set({ portStep: v })}
                                    min={0}
                                    max={1000}
                                />
                                <p className="text-[10px] text-slate-500 mt-1">
                                    {t("Each further inbound gets the previous port plus this, so a renumbered block does not collide.")}
                                </p>
                            </div>
                            <div className="sm:col-span-2">
                                <Switch
                                    checked={patch.sniffing === true}
                                    onChange={v => set({ sniffing: v ? true : undefined })}
                                    label={t("Turn sniffing on")}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
                            <div>
                                <Switch
                                    checked={patch.mux === true}
                                    onChange={v => set({ mux: v ? true : undefined })}
                                    label={t("Enable Mux")}
                                />
                                {patch.mux && (
                                    <div className="mt-2">
                                        <span className="label-xs">{t("Concurrency")}</span>
                                        <NumberInput
                                            value={patch.muxConcurrency}
                                            onChange={v => set({ muxConcurrency: v })}
                                            min={1}
                                            max={1024}
                                        />
                                    </div>
                                )}
                            </div>
                            <Input
                                label={t("Chain through outbound")}
                                value={patch.dialerProxy ?? ''}
                                onChange={(e: any) => set({ dialerProxy: e.target.value || undefined })}
                                placeholder="warp"
                                help={t("Written to streamSettings.sockopt.dialerProxy. An outbound naming itself is refused: the core will not run a dialer loop.")}
                            />
                        </div>
                    )}

                    {/* ─── Preview ───────────────────────────────────── */}
                    <div className="flex-1 min-h-[200px] border border-slate-800 rounded-xl bg-slate-950/40 flex flex-col overflow-hidden shrink-0">
                        <div className="px-3 py-2 border-b border-slate-800 flex items-center gap-2 shrink-0">
                            <Icon name="ListMagnifyingGlass" className="text-indigo-400 text-xs" />
                            <span className="label-xs">{t("What this will change")}</span>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scroll p-3 space-y-2">
                            {selection.size === 0 ? (
                                <p className="text-[11px] text-slate-600 italic">
                                    {t("Pick the items to change on the left.")}
                                </p>
                            ) : empty ? (
                                <p className="text-[11px] text-slate-600 italic">
                                    {t("Set a field above and the exact changes appear here before anything is written.")}
                                </p>
                            ) : (
                                <>
                                    {preview.changes.map(change => (
                                        <div key={change.index} className="text-[11px]">
                                            <span className="font-bold text-slate-200 font-mono">{change.tag}</span>
                                            <ul className="ml-3 mt-0.5 space-y-0.5">
                                                {change.fields.map(field => (
                                                    <li key={field} className="text-emerald-300/80 font-mono">{field}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}

                                    {preview.skipped.length > 0 && (
                                        <div className="pt-2 mt-2 border-t border-slate-800 space-y-1">
                                            {preview.skipped.map((skip, i) => (
                                                <div key={i} className="text-[11px] text-amber-300/80">
                                                    <span className="font-mono font-bold">{skip.tag}</span>
                                                    {' · '}
                                                    <span className="font-mono">{skip.field}</span>
                                                    {' — '}
                                                    {skip.reason}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {preview.changes.length === 0 && preview.skipped.length === 0 && (
                                        <p className="text-[11px] text-slate-600 italic">
                                            {t("Every selected item already has these values.")}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
