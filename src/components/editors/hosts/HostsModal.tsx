import React from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Icon } from '../../ui/Icon';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Switch } from '../../ui/Switch';
import { NumberInput } from '../../ui/NumberInput';
import { useHostsManager } from '../../../hooks/useHostsManager';
import { HOST_ALPN_OPTIONS, HOST_FINGERPRINTS, HOST_SECURITY_LAYERS } from '../../../core/presets/host-fields';
import { normaliseHostTag } from '../../../core/generators/host-payload';
import { t } from '../../../i18n';
import { RemnawaveGuide } from '../remnawave/RemnawaveGuide';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 flex flex-col gap-3">
        <span className="label-xs">{title}</span>
        {children}
    </div>
);

/**
 * Hosts editor.
 *
 * A host is what a subscriber connects to: an address and port, the transport
 * details clients need, the inbound it serves, and optionally the Xray JSON
 * template rendered for it. Saving sends only the fields that changed, so the
 * settings this form does not show — squads, mappers, per-node overrides —
 * are left exactly as the panel has them.
 */
/** The draft fields `hostDraftMissing` can report, named as the form names them. */
const missingLabel = (field: string): string =>
    ({
        remark: t("Remark"),
        address: t("Address"),
        port: t("Port"),
        inbound: t("Inbound"),
    })[field] ?? field;

export const HostsModal = ({ onClose, initialHostUuid, onOpenTemplates }: {
    onClose: () => void;
    initialHostUuid?: string;
    onOpenTemplates?: () => void;
}) => {
    const h = useHostsManager(initialHostUuid);
    const { draft } = h;

    const normalisedTag = draft ? normaliseHostTag(draft.tag) : '';

    return (
        <Modal
            title={t("Hosts")}
            onClose={onClose}
            onSave={draft ? h.save : undefined}
            saveText={h.saving ? t("Saving…") : (h.isNew ? t("Create host") : t("Save host"))}
            saveIcon="CloudArrowUp"
            className="h-[90vh] md:h-[88vh] max-h-[92vh] overflow-hidden"
            extraButtons={draft && !h.isNew ? (
                h.confirmDelete ? (
                    <Button variant="danger" icon="Warning" onClick={h.remove}>
                        {t("Confirm: delete “{remark}”", { remark: draft.remark })}
                    </Button>
                ) : (
                    <Button variant="ghost" icon="Trash" onClick={() => h.setConfirmDelete(true)}>{t("Delete host")}</Button>
                )
            ) : null}
        >
            <RemnawaveGuide module="hosts" />

            <div className="flex flex-col md:flex-row flex-1 min-h-0 border border-slate-800 rounded-2xl overflow-hidden bg-slate-900 shadow-2xl">
                {/* ─── List ─────────────────────────────────────────── */}
                <div className={`w-full md:w-72 bg-slate-950 border-r border-slate-800 flex-col min-h-0 md:shrink-0 ${draft ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-3 border-b border-slate-800 space-y-2.5 bg-slate-900/50 shrink-0">
                        <div className="relative">
                            <Icon name="MagnifyingGlass" className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600 text-xs" />
                            <input
                                className="w-full bg-slate-950 border border-slate-700 rounded-md pl-8 pr-2 py-1.5 text-[11px] text-white outline-none focus:border-indigo-500"
                                placeholder={t("Search remark, address, tag…")}
                                value={h.search}
                                onChange={e => h.setSearch(e.target.value)}
                            />
                        </div>
                        <Switch checked={h.showHidden} onChange={h.setShowHidden} label={t("Show hidden hosts")} />
                        <div className="flex gap-1.5">
                            <Button variant="secondary" size="sm" icon="Plus" className="flex-1 text-[10px]" onClick={h.startNew}>
                                {t("New host")}
                                </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                icon="ArrowsClockwise"
                                className="flex-1 text-[10px]"
                                loading={h.loading}
                                disabled={!h.connected}
                                onClick={h.refresh}
                            >
                                {t("Refresh")}
                                </Button>
                        </div>
                        <div className="text-[10px] text-slate-500">
                            {t("{shown} of {total} hosts", { shown: h.rows.length, total: h.hostCount })}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scroll p-2">
                        {!h.connected && (
                            <div className="text-[11px] text-amber-300 bg-amber-950/20 border border-amber-500/30 rounded-lg p-3 mb-2">
                                {t("Not connected to Remnawave — connect from the header to load hosts.")}
                                </div>
                        )}
                        {h.rows.map(row => (
                            <button
                                key={row.uuid}
                                onClick={() => h.open(row.uuid)}
                                className={`w-full text-left p-2 rounded-lg text-xs flex items-start gap-2 border transition-all mb-1 ${
                                    draft?.uuid === row.uuid
                                        ? 'bg-indigo-600/20 border-indigo-500/60'
                                        : 'bg-slate-900 border-transparent hover:border-slate-700'
                                }`}
                            >
                                <Icon name="Broadcast" weight="bold" className="mt-0.5 shrink-0 text-indigo-400" />
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-slate-200 truncate">{row.remark}</span>
                                        {row.isDisabled && <Badge variant="warning" size="sm">{t("off")}</Badge>}
                                        {row.isHidden && <Badge variant="info" size="sm">{t("hidden")}</Badge>}
                                        {row.hasTemplate && <Badge variant="primary" size="sm">{t("template")}</Badge>}
                                    </span>
                                    <span className="block text-[10px] text-slate-500 font-mono truncate">
                                        {row.address}:{row.port}{row.tag ? ` · ${row.tag}` : ''}
                                    </span>
                                    {row.inboundLabel && (
                                        <span className="block text-[10px] text-slate-600 truncate">{row.inboundLabel}</span>
                                    )}
                                </span>
                            </button>
                        ))}
                        {h.rows.length === 0 && h.connected && (
                            <div className="text-center text-slate-600 py-8 italic text-[11px] px-3">
                                {h.hostCount === 0
                                    ? t("No hosts loaded — press Refresh.")
                                    : t("No host matches that search.")}
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Editor ───────────────────────────────────────── */}
                <div className={`flex-1 flex-col min-h-0 min-w-0 bg-slate-900/50 ${draft ? 'flex' : 'hidden md:flex'}`}>
                    {!draft ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-6 text-center">
                            <Icon name="Broadcast" className="text-6xl mb-4 opacity-10" />
                            <p className="text-sm">{t("Pick a host to edit it")}</p>
                            <p className="text-[11px] text-slate-700 mt-2 max-w-sm">
                                {t("Everything a subscriber needs to connect lives here: address and port, the transport details, the inbound it serves, and the template it renders. No client UUID involved — that only matters when turning a host into a node in the balancer builder.")}
                                </p>
                        </div>
                    ) : (
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scroll p-4 md:p-5 flex flex-col gap-3">
                            <Button variant="secondary" icon="ArrowLeft" className="md:hidden w-full" onClick={h.closeDraft}>
                                {t("Back to the list")}
                                </Button>

                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={h.isNew ? 'warning' : 'primary'} size="sm" icon="Broadcast">
                                    {h.isNew ? t("New host") : t("Editing host")}
                                </Badge>
                                {!h.isNew && h.isDirty && <Badge variant="warning" size="sm" icon="PencilSimple">{t("Unsaved changes")}</Badge>}
                                {!h.isNew && !h.isDirty && <Badge variant="success" size="sm" icon="Check">{t("Saved")}</Badge>}
                            </div>

                            <Section title={t("Identity")}>
                                <Input
                                    label={t("Remark")}
                                    value={draft.remark}
                                    onChange={(e: any) => h.update({ remark: e.target.value })}
                                    placeholder="🇳🇱 ⚡ Нидерланды"
                                    hint={t("What the subscriber sees in their client")}
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <div className="sm:col-span-2">
                                        <Input
                                            label={t("Address")}
                                            value={draft.address}
                                            onChange={(e: any) => h.update({ address: e.target.value })}
                                            placeholder={t("nl.example.com")}
                                        />
                                    </div>
                                    <div>
                                        <span className="label-xs">{t("Port")}</span>
                                        <NumberInput value={draft.port} onChange={v => h.update({ port: v })} min={1} max={65535} />
                                    </div>
                                </div>
                                <Input
                                    label={t("Tag")}
                                    value={draft.tag}
                                    onChange={(e: any) => h.update({ tag: e.target.value })}
                                    placeholder={t("NLMAIN")}
                                    hint={normalisedTag && normalisedTag !== draft.tag.trim()
                                        ? `Will be saved as ${normalisedTag}`
                                        : 'Groups hosts: a template can inject every host sharing this tag'}
                                />
                            </Section>

                            <Section title={t("Where it points")}>
                                <Select
                                    label={t("Inbound")}
                                    value={draft.inboundUuid}
                                    onChange={v => h.selectInbound(v)}
                                    options={[
                                        {
                                            value: '',
                                            label: h.inboundOptions.length
                                                ? t("Pick an inbound…")
                                                : t("No inbounds loaded — press Refresh"),
                                        },
                                        ...h.inboundOptions.map(i => ({ value: i.uuid, label: i.label })),
                                    ]}
                                    hint={t("The config-profile inbound this host serves")}
                                />
                                <Select
                                    label={t("Xray JSON template")}
                                    value={draft.xrayJsonTemplateUuid}
                                    onChange={v => h.update({ xrayJsonTemplateUuid: v })}
                                    options={[
                                        { value: '', label: t("None — plain host") },
                                        ...h.templateOptions.map((tpl: any) => ({ value: tpl.uuid, label: tpl.name })),
                                    ]}
                                    hint={t("Attach one and subscribers of this host get that whole config, balancer included")}
                                />
                                {onOpenTemplates && (
                                    <Button variant="ghost" size="sm" icon="FileText" className="text-[10px]" onClick={onOpenTemplates}>
                                        {t("Open the template editor")}
                                        </Button>
                                )}
                            </Section>

                            <Section title={t("Transport")}>
                                <Select
                                    label={t("Security layer")}
                                    value={draft.securityLayer}
                                    onChange={v => h.update({ securityLayer: v })}
                                    options={HOST_SECURITY_LAYERS.map(layer => ({
                                        value: layer,
                                        label: layer === 'DEFAULT' ? 'DEFAULT — whatever the inbound runs' : layer,
                                    }))}
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <Input
                                        label="SNI"
                                        value={draft.sni}
                                        onChange={(e: any) => h.update({ sni: e.target.value })}
                                        placeholder={t("empty = use the inbound's")}
                                    />
                                    <Input
                                        label={t("Host header")}
                                        value={draft.host}
                                        onChange={(e: any) => h.update({ host: e.target.value })}
                                        placeholder={t("cdn.example.com")}
                                    />
                                </div>
                                <Input
                                    label={t("Path")}
                                    value={draft.path}
                                    onChange={(e: any) => h.update({ path: e.target.value })}
                                    placeholder="/static/segment.ts"
                                    hint={t("Used by xhttp, ws and httpupgrade; gRPC reads it as the service name")}
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <Select
                                        label={t("Fingerprint")}
                                        value={draft.fingerprint}
                                        onChange={v => h.update({ fingerprint: v })}
                                        options={[
                                            { value: '', label: t("Leave to the client") },
                                            ...HOST_FINGERPRINTS.map(f => ({ value: f, label: f })),
                                        ]}
                                    />
                                    <Select
                                        label="ALPN"
                                        value={draft.alpn}
                                        onChange={v => h.update({ alpn: v })}
                                        options={[
                                            { value: '', label: t("Not set") },
                                            ...HOST_ALPN_OPTIONS.map(a => ({ value: a, label: a })),
                                        ]}
                                    />
                                </div>
                                <Switch
                                    checked={draft.allowInsecure}
                                    onChange={v => h.update({ allowInsecure: v })}
                                    label={t("Allow insecure TLS")}
                                />
                            </Section>

                            <Section title={t("Visibility")}>
                                <Switch
                                    checked={draft.isHidden}
                                    onChange={v => h.update({ isHidden: v })}
                                    label={t("Hidden from subscribers")}
                                />
                                <p className="text-[10px] text-slate-500 -mt-2 ml-[52px]">
                                    {t("Hidden hosts are the pool a template injects — they never appear in a subscription on their own.")}
                                    </p>
                                <Switch
                                    checked={draft.isDisabled}
                                    onChange={v => h.update({ isDisabled: v })}
                                    label={t("Disabled")}
                                />
                                <p className="text-[10px] text-slate-500 -mt-2 ml-[52px]">
                                    {t("Kept in the panel but served to nobody.")}
                                    </p>
                            </Section>

                            {h.missing.length > 0 && (
                                <p className="text-[10px] text-amber-300/80">
                                    {t("Still needed: {fields}", { fields: h.missing.map(missingLabel).join(', ') })}
                                </p>
                            )}
                            {!h.isNew && h.pendingPatch && (
                                <p className="text-[10px] text-slate-500">
                                    Saving sends only: {Object.keys(h.pendingPatch).filter(k => k !== 'uuid').join(', ')}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
