import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useConfigStore } from '../store/configStore';
import { t } from '../i18n';

/** Template kinds the panel stores. XRAY_JSON holds JSON; the rest hold YAML. */
export const TEMPLATE_TYPES = ['XRAY_JSON', 'XRAY_BASE64', 'MIHOMO', 'STASH', 'CLASH', 'SINGBOX'] as const;
export type TemplateType = (typeof TEMPLATE_TYPES)[number];

export const isJsonTemplate = (type: string): boolean => type === 'XRAY_JSON';

/**
 * Base64 helpers that survive non-ASCII. The panel stores YAML templates
 * base64-encoded, and these templates routinely contain emoji in remarks, so
 * the naive btoa/atob pair would throw on exactly the real-world content.
 */
const encodeBase64Utf8 = (text: string): string => {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    bytes.forEach(b => { binary += String.fromCharCode(b); });
    return btoa(binary);
};

const decodeBase64Utf8 = (value: string): string => {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
};

export interface TemplateDraft {
    uuid: string;
    name: string;
    templateType: string;
    /** The body as text: pretty JSON, or the decoded YAML. */
    text: string;
    /** The text as it was loaded, to tell edited from untouched. */
    original: string;
}

/**
 * State behind the Subscription Templates editor.
 *
 * This is the free-form counterpart to the Local Balancer builder: the builder
 * writes one specific shape of template, this opens any of them as text. It
 * exists because a template written by hand (or by an older tool) has to stay
 * editable without being forced through the builder's model.
 */
export const useTemplatesLibrary = () => {
    const panelTemplates = useConfigStore(state => state.panelTemplates);
    const fetchTemplates = useConfigStore(state => state.fetchSubscriptionTemplates);
    const loadTemplate = useConfigStore(state => state.loadSubscriptionTemplate);
    const createTemplate = useConfigStore(state => state.createPanelTemplate);
    const patchTemplate = useConfigStore(state => state.patchPanelTemplate);
    const deleteTemplate = useConfigStore(state => state.deletePanelTemplate);
    const connected = useConfigStore(state => state.remnawave.connected);

    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | TemplateType>('all');
    const [draft, setDraft] = useState<TemplateDraft | null>(null);
    const [loadingBody, setLoadingBody] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState<TemplateType>('XRAY_JSON');

    // Refresh on open so a template added in the panel shows up without a click.
    useEffect(() => {
        if (connected) fetchTemplates().catch(() => {});
    }, [connected, fetchTemplates]);

    const items = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (panelTemplates.items || [])
            .filter((t: any) => typeFilter === 'all' || t.templateType === typeFilter)
            .filter((t: any) => !q || String(t.name || '').toLowerCase().includes(q))
            .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));
    }, [panelTemplates.items, search, typeFilter]);

    const open = useCallback(async (uuid: string) => {
        setLoadingBody(true);
        setConfirmDelete(false);
        try {
            const full = await loadTemplate(uuid);
            if (!full) return;
            const type = full.templateType || 'XRAY_JSON';
            let text = '';
            if (isJsonTemplate(type)) {
                text = full.templateJson ? JSON.stringify(full.templateJson, null, 2) : '';
            } else if (full.encodedTemplateYaml) {
                try {
                    text = decodeBase64Utf8(full.encodedTemplateYaml);
                } catch {
                    text = '';
                    toast.warning(t("Could not decode that YAML body"), {
                        description: t("It is stored base64-encoded and did not decode cleanly."),
                    });
                }
            }
            setDraft({ uuid, name: full.name || '', templateType: type, text, original: text });
        } finally {
            setLoadingBody(false);
        }
    }, [loadTemplate]);

    /** Close the open template — also what the mobile Back button uses. */
    const closeDraft = useCallback(() => {
        setDraft(null);
        setConfirmDelete(false);
    }, []);

    const setText = useCallback((text: string) => {
        setDraft(prev => (prev ? { ...prev, text } : prev));
        setConfirmDelete(false);
    }, []);

    const setName = useCallback((name: string) => {
        setDraft(prev => (prev ? { ...prev, name } : prev));
    }, []);

    const isDirty = !!draft && draft.text !== draft.original;

    /** Parse error for a JSON body, or null when it is valid (or not JSON). */
    const parseError = useMemo(() => {
        if (!draft || !isJsonTemplate(draft.templateType)) return null;
        if (draft.text.trim() === '') return null;
        try {
            JSON.parse(draft.text);
            return null;
        } catch (e: any) {
            return e?.message || 'Invalid JSON';
        }
    }, [draft]);

    const [saving, setSaving] = useState(false);

    const save = useCallback(async () => {
        if (!draft || saving) return;
        if (parseError) {
            toast.error(t("Fix the JSON before saving"), { description: parseError });
            return;
        }
        const patch: { templateJson?: unknown; encodedTemplateYaml?: string; name?: string } = {};
        if (isJsonTemplate(draft.templateType)) {
            patch.templateJson = draft.text.trim() === '' ? {} : JSON.parse(draft.text);
        } else {
            patch.encodedTemplateYaml = encodeBase64Utf8(draft.text);
        }
        if (draft.name.trim()) patch.name = draft.name.trim();

        setSaving(true);
        try {
            const ok = await patchTemplate(draft.uuid, patch);
            if (ok) setDraft(prev => (prev ? { ...prev, original: prev.text } : prev));
        } finally {
            setSaving(false);
        }
    }, [draft, saving, parseError, patchTemplate]);

    const create = useCallback(async () => {
        const name = newName.trim();
        if (!name) {
            toast.error(t("Name the template first"));
            return;
        }
        const uuid = await createTemplate(name, newType);
        if (uuid) {
            setNewName('');
            await open(uuid);
        }
    }, [newName, newType, createTemplate, open]);

    /** Copy the open template into a new one, body and all. */
    const duplicate = useCallback(async () => {
        if (!draft) return;
        const uuid = await createTemplate(`${draft.name} copy`.slice(0, 250), draft.templateType);
        if (!uuid) return;
        const patch = isJsonTemplate(draft.templateType)
            ? { templateJson: draft.text.trim() === '' ? {} : JSON.parse(draft.text) }
            : { encodedTemplateYaml: encodeBase64Utf8(draft.text) };
        await patchTemplate(uuid, patch);
        await open(uuid);
    }, [draft, createTemplate, patchTemplate, open]);

    const remove = useCallback(async () => {
        if (!draft) return;
        const ok = await deleteTemplate(draft.uuid);
        if (ok) {
            setDraft(null);
            setConfirmDelete(false);
        }
    }, [draft, deleteTemplate]);

    const copyBody = useCallback(async () => {
        if (!draft) return;
        try {
            await navigator.clipboard.writeText(draft.text);
            toast.success(t("Template body copied"));
        } catch {
            toast.error(t("Clipboard is not available here"));
        }
    }, [draft]);

    const download = useCallback(() => {
        if (!draft) return;
        const a = document.createElement('a');
        a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(draft.text);
        a.download = `${draft.name || 'template'}.${isJsonTemplate(draft.templateType) ? 'json' : 'yaml'}`;
        a.click();
    }, [draft]);

    /** True when the open template is one the Local Balancer builder can read. */
    const looksLikeBalancer = useMemo(() => {
        if (!draft || !isJsonTemplate(draft.templateType) || parseError) return false;
        try {
            const body = JSON.parse(draft.text || '{}');
            return !!body?.remnawave || Array.isArray(body?.routing?.balancers);
        } catch {
            return false;
        }
    }, [draft, parseError]);

    return {
        connected,
        loading: panelTemplates.loading,
        error: panelTemplates.error,
        items,
        refresh: fetchTemplates,
        search, setSearch,
        typeFilter, setTypeFilter,
        draft, open, closeDraft, loadingBody, setText, setName, isDirty, parseError,
        save, saving, create, duplicate, remove, copyBody, download,
        confirmDelete, setConfirmDelete,
        newName, setNewName, newType, setNewType,
        looksLikeBalancer,
    };
};
