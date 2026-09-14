import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useConfigStore } from '../store/configStore';
import { t } from '../i18n';
import {
    buildHostCreate,
    buildHostPatch,
    emptyHostDraft,
    hostDraftMissing,
    hostToDraft,
    type HostDraft,
} from '../core/generators/host-payload';

/**
 * State behind the Hosts editor.
 *
 * A host is the panel's client-facing row: address, port, SNI, which inbound
 * it serves and which template it renders. Editing one used to mean leaving
 * this app for the panel; picking one here used to mean only "mirror it into
 * a client outbound", which needed a subscriber's UUID for something that has
 * nothing to do with editing the host itself.
 */
export const useHostsManager = (initialHostUuid?: string) => {
    const panelCatalog = useConfigStore(state => state.panelCatalog);
    const fetchPanelCatalog = useConfigStore(state => state.fetchPanelCatalog);
    const panelTemplates = useConfigStore(state => state.panelTemplates);
    const fetchTemplates = useConfigStore(state => state.fetchSubscriptionTemplates);
    const createPanelHost = useConfigStore(state => state.createPanelHost);
    const updatePanelHost = useConfigStore(state => state.updatePanelHost);
    const deletePanelHost = useConfigStore(state => state.deletePanelHost);
    const connected = useConfigStore(state => state.remnawave.connected);

    const [search, setSearch] = useState('');
    const [showHidden, setShowHidden] = useState(true);
    const [draft, setDraft] = useState<HostDraft | null>(null);
    /** The draft as loaded, so a save can send only what changed. */
    const [original, setOriginal] = useState<HostDraft | null>(null);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Hosts and templates are both needed here: a host points at a template.
    useEffect(() => {
        if (!connected) return;
        if (!panelCatalog.fetchedAt) fetchPanelCatalog().catch(() => {});
        if (panelTemplates.items.length === 0) fetchTemplates().catch(() => {});
    }, [connected, panelCatalog.fetchedAt, panelTemplates.items.length, fetchPanelCatalog, fetchTemplates]);

    const hosts = panelCatalog.hosts || [];

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return hosts
            .filter((h: any) => (showHidden ? true : !h.isHidden))
            .filter((h: any) => !q
                || String(h.remark || '').toLowerCase().includes(q)
                || String(h.address || '').toLowerCase().includes(q)
                || String(h.tag || '').toLowerCase().includes(q))
            .map((h: any) => {
                const inbound = panelCatalog.inbounds[h?.inbound?.configProfileInboundUuid];
                return {
                    uuid: h.uuid,
                    remark: h.remark || h.address || 'host',
                    address: h.address,
                    port: h.port,
                    tag: h.tag || (Array.isArray(h.tags) ? h.tags[0] : '') || '',
                    isHidden: !!h.isHidden,
                    isDisabled: !!h.isDisabled,
                    hasTemplate: !!h.xrayJsonTemplateUuid,
                    inboundLabel: inbound ? `${inbound.profileName} · ${inbound.tag}` : '',
                };
            });
    }, [hosts, panelCatalog.inbounds, search, showHidden]);

    /** Inbounds a host can bind to, from the profiles the catalog carries. */
    const inboundOptions = useMemo(() => Object.values(panelCatalog.inbounds).map((entry: any) => ({
        uuid: entry.uuid,
        profileUuid: entry.profileUuid,
        label: `${entry.profileName} · ${entry.tag}`,
    })), [panelCatalog.inbounds]);

    const templateOptions = useMemo(
        () => (panelTemplates.items || []).filter((tpl: any) => tpl.templateType === 'XRAY_JSON'),
        [panelTemplates.items]
    );

    const open = useCallback((uuid: string) => {
        const host = hosts.find((h: any) => h.uuid === uuid);
        if (!host) return;
        const next = hostToDraft(host);
        setDraft(next);
        setOriginal(next);
        setConfirmDelete(false);
    }, [hosts]);

    const startNew = useCallback(() => {
        setDraft(emptyHostDraft());
        setOriginal(null);
        setConfirmDelete(false);
    }, []);

    const closeDraft = useCallback(() => {
        setDraft(null);
        setOriginal(null);
        setConfirmDelete(false);
    }, []);

    /** Opened from elsewhere (the builder's host list) — select that host once. */
    useEffect(() => {
        if (!initialHostUuid || draft || hosts.length === 0) return;
        open(initialHostUuid);
    }, [initialHostUuid, draft, hosts.length, open]);

    const update = useCallback((patch: Partial<HostDraft>) => {
        setDraft(prev => (prev ? { ...prev, ...patch } : prev));
        setConfirmDelete(false);
    }, []);

    /** Picking an inbound carries its profile along — the API needs both. */
    const selectInbound = useCallback((inboundUuid: string) => {
        const option = inboundOptions.find(i => i.uuid === inboundUuid);
        update({ inboundUuid, profileUuid: option?.profileUuid || '' });
    }, [inboundOptions, update]);

    const missing = useMemo(() => (draft ? hostDraftMissing(draft) : []), [draft]);
    const isNew = !!draft && !draft.uuid;
    const pendingPatch = useMemo(
        () => (draft && original ? buildHostPatch(draft, original) : null),
        [draft, original]
    );
    const isDirty = isNew ? true : !!pendingPatch;

    const save = useCallback(async () => {
        if (!draft || saving) return;
        if (missing.length > 0) {
            toast.error(`Still needed: ${missing.join(', ')}`);
            return;
        }
        setSaving(true);
        try {
            if (isNew) {
                const created = await createPanelHost(buildHostCreate(draft));
                if (created?.uuid) open(created.uuid);
            } else {
                if (!pendingPatch) {
                    toast.info(t("Nothing changed"));
                    return;
                }
                const ok = await updatePanelHost(pendingPatch as any);
                if (ok) setOriginal(draft);
            }
        } finally {
            setSaving(false);
        }
    }, [draft, saving, missing, isNew, pendingPatch, createPanelHost, updatePanelHost, open]);

    const remove = useCallback(async () => {
        if (!draft?.uuid) return;
        const ok = await deletePanelHost(draft.uuid);
        if (ok) closeDraft();
    }, [draft, deletePanelHost, closeDraft]);

    return {
        connected,
        loading: panelCatalog.loading,
        error: panelCatalog.error,
        rows,
        hostCount: hosts.length,
        refresh: fetchPanelCatalog,
        search, setSearch,
        showHidden, setShowHidden,

        draft, original, isNew, isDirty, missing, pendingPatch,
        open, startNew, closeDraft, update, selectInbound,
        inboundOptions, templateOptions,
        save, saving, remove,
        confirmDelete, setConfirmDelete,
    };
};
