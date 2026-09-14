import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useConfigStore } from '../store/configStore';
import { t } from '../i18n';
import {
    classifySnippet,
    collectSnippetRefs,
    isSnippetRef,
    validateSnippetBody,
    validateSnippetName,
    type SnippetDefinition,
    type SnippetSection,
    type SnippetSource,
} from '../core/snippets';

export interface SnippetEntry extends SnippetDefinition {
    /** How many times this config references the snippet by name. */
    usage: number;
}

export interface SnippetDraft {
    name: string;
    body: any[];
    description: string;
    source: SnippetSource;
    /** Name the draft was opened under — null for a brand-new template. */
    originalName: string | null;
}

/**
 * State behind the Snippets & Templates modal.
 *
 * Two libraries share one editor: panel snippets (owned by Remnawave, read
 * through its API) and local templates (owned by this browser). The draft is
 * kept separate from both so a half-finished edit never lands in the panel by
 * accident — every write is an explicit button.
 */
export const useSnippetsLibrary = (open: boolean) => {
    const config = useConfigStore(state => state.config);
    const snippetLibrary = useConfigStore(state => state.snippetLibrary);
    const remnawave = useConfigStore(state => state.remnawave);
    const fetchSnippets = useConfigStore(state => state.fetchSnippets);
    const saveLocalTemplate = useConfigStore(state => state.saveLocalTemplate);
    const deleteLocalTemplate = useConfigStore(state => state.deleteLocalTemplate);
    const pushSnippetToPanel = useConfigStore(state => state.pushSnippetToPanel);
    const deletePanelSnippet = useConfigStore(state => state.deletePanelSnippet);
    const syncPanelSnippet = useConfigStore(state => state.syncPanelSnippet);
    const insertSnippetRef = useConfigStore(state => state.insertSnippetRef);
    const insertSnippetBody = useConfigStore(state => state.insertSnippetBody);

    const [tab, setTab] = useState<SnippetSource>('panel');
    const [search, setSearch] = useState('');
    const [draft, setDraft] = useState<SnippetDraft | null>(null);
    const [target, setTarget] = useState<SnippetSection>('rules');
    const [confirmDelete, setConfirmDelete] = useState(false);
    /** True while the body editor holds text that does not parse. */
    const [bodySyntaxError, setBodySyntaxError] = useState(false);
    const [confirmEmpty, setConfirmEmpty] = useState(false);
    const [confirmSync, setConfirmSync] = useState(false);

    // How often each name is referenced by the config currently open.
    const usageByName = useMemo(() => {
        const counts = new Map<string, number>();
        collectSnippetRefs(config).forEach(ref => {
            counts.set(ref.name, (counts.get(ref.name) || 0) + 1);
        });
        return counts;
    }, [config]);

    const decorate = useCallback(
        (defs: SnippetDefinition[]): SnippetEntry[] =>
            defs.map(def => ({ ...def, usage: usageByName.get(def.name) || 0 })),
        [usageByName]
    );

    const panelEntries = useMemo(
        () => decorate(snippetLibrary.panel).sort((a, b) => a.name.localeCompare(b.name)),
        [snippetLibrary.panel, decorate]
    );
    const localEntries = useMemo(
        () => decorate(snippetLibrary.local).sort((a, b) => a.name.localeCompare(b.name)),
        [snippetLibrary.local, decorate]
    );

    /**
     * Names the config references but neither library can resolve — the case
     * that makes an imported profile unreadable, so it gets its own list
     * rather than silently showing nothing.
     */
    const missingNames = useMemo(() => {
        const known = new Set([
            ...snippetLibrary.panel.map(s => s.name),
            ...snippetLibrary.local.map(s => s.name),
        ]);
        return Array.from(usageByName.keys()).filter(name => !known.has(name));
    }, [usageByName, snippetLibrary.panel, snippetLibrary.local]);

    const entries = tab === 'panel' ? panelEntries : localEntries;
    const filteredEntries = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return entries;
        return entries.filter(e =>
            e.name.toLowerCase().includes(q) ||
            (e.description || '').toLowerCase().includes(q)
        );
    }, [entries, search]);

    // Refresh the panel list when the modal opens, so a snippet added in the
    // panel since the last visit shows up without a manual click.
    useEffect(() => {
        if (!open) return;
        if (remnawave.connected) fetchSnippets({ silent: true }).catch(() => {});
    }, [open, remnawave.connected, fetchSnippets]);

    const openEntry = useCallback((entry: SnippetDefinition) => {
        setDraft({
            name: entry.name,
            body: Array.isArray(entry.snippet) ? entry.snippet : [],
            description: entry.description || '',
            source: entry.source,
            originalName: entry.name,
        });
        const kind = classifySnippet(entry.snippet);
        setTarget(kind === 'outbounds' || kind === 'balancers' ? kind : 'rules');
        setConfirmDelete(false);
    }, []);

    const startNew = useCallback((source: SnippetSource) => {
        setTab(source);
        setDraft({ name: '', body: [], description: '', source, originalName: null });
        setTarget('rules');
        setConfirmDelete(false);
    }, []);

    /** Seed a draft from the rules already in the open config. */
    const useCurrentRules = useCallback(() => {
        const rules = (config?.routing?.rules || []).filter(r => !isSnippetRef(r));
        if (rules.length === 0) {
            toast.error(t("This config has no plain rules to capture"));
            return;
        }
        setDraft(prev => prev
            ? { ...prev, body: JSON.parse(JSON.stringify(rules)) }
            : { name: '', body: JSON.parse(JSON.stringify(rules)), description: '', source: 'local', originalName: null });
        setTarget('rules');
        toast.success(`Captured ${rules.length} rule(s) into the draft`);
    }, [config]);

    const updateDraft = useCallback((patch: Partial<SnippetDraft>) => {
        setDraft(prev => (prev ? { ...prev, ...patch } : prev));
        setConfirmDelete(false);
        setConfirmEmpty(false);
        setConfirmSync(false);
    }, []);

    const draftKind = useMemo(() => (draft ? classifySnippet(draft.body) : null), [draft]);
    const draftNameError = useMemo(
        () => (draft && draft.name.trim() ? validateSnippetName(draft.name) : null),
        [draft]
    );
    const draftBodyError = useMemo(() => (draft ? validateSnippetBody(draft.body) : null), [draft]);
    // A syntax error means the body in state is stale, so saving would store
    // something other than what the user is looking at.
    const canSave = !!draft && !!draft.name.trim() && !draftNameError && !draftBodyError && !bodySyntaxError;

    /** Why the save button is disabled, for its tooltip. */
    const saveBlockedReason = useMemo(() => {
        if (!draft) return null;
        if (bodySyntaxError) return 'Fix the JSON syntax first';
        if (draftNameError) return draftNameError;
        if (draftBodyError) return draftBodyError;
        if (!draft.name.trim()) return 'Name the snippet first';
        return null;
    }, [draft, bodySyntaxError, draftNameError, draftBodyError]);

    const saveDraft = useCallback(async () => {
        if (!draft || !canSave) return;
        // Emptying a panel snippet changes every profile that references it,
        // so that specific case asks once.
        if (draft.originalName && draft.body.length === 0 && !confirmEmpty) {
            setConfirmEmpty(true);
            return;
        }
        setConfirmEmpty(false);
        if (draft.source === 'local') {
            const ok = saveLocalTemplate({
                name: draft.name,
                snippet: draft.body,
                description: draft.description || undefined,
                previousName: draft.originalName || undefined,
            });
            if (ok) setDraft({ ...draft, name: draft.name.trim(), originalName: draft.name.trim() });
        } else {
            const ok = await pushSnippetToPanel(draft.name, draft.body);
            if (ok) setDraft({ ...draft, name: draft.name.trim(), originalName: draft.name.trim() });
        }
    }, [draft, canSave, confirmEmpty, saveLocalTemplate, pushSnippetToPanel]);

    /** Copy the draft into the other library without touching the original. */
    const copyToLocal = useCallback(() => {
        if (!draft || !draft.name.trim()) return;
        const ok = saveLocalTemplate({ name: draft.name, snippet: draft.body, description: draft.description || undefined });
        if (ok) setTab('local');
    }, [draft, saveLocalTemplate]);

    const pushToPanel = useCallback(async () => {
        if (!draft || !canSave) return;
        const ok = await pushSnippetToPanel(draft.name, draft.body);
        if (ok) setTab('panel');
    }, [draft, canSave, pushSnippetToPanel]);

    const removeDraftEntry = useCallback(async () => {
        if (!draft || !draft.originalName) return;
        if (draft.source === 'local') deleteLocalTemplate(draft.originalName);
        else await deletePanelSnippet(draft.originalName);
        setDraft(null);
        setConfirmDelete(false);
    }, [draft, deleteLocalTemplate, deletePanelSnippet]);

    /**
     * Two-step: syncing re-applies the snippet to every profile referencing it
     * and the panel restarts the nodes those profiles run on.
     */
    const syncDraft = useCallback(async () => {
        if (!draft?.originalName || draft.source !== 'panel') return;
        if (!confirmSync) {
            setConfirmSync(true);
            return;
        }
        setConfirmSync(false);
        await syncPanelSnippet(draft.originalName);
    }, [draft, confirmSync, syncPanelSnippet]);

    const insertRef = useCallback(() => {
        if (!draft?.name.trim()) return;
        insertSnippetRef(draft.name, target);
    }, [draft, target, insertSnippetRef]);

    const insertCopy = useCallback(() => {
        if (!draft) return;
        if (draft.originalName) {
            insertSnippetBody(draft.originalName, target);
            return;
        }
        toast.error(t("Save the draft first, then insert a copy of it"));
    }, [draft, target, insertSnippetBody]);

    return {
        // library
        tab, setTab,
        search, setSearch,
        panelEntries, localEntries, filteredEntries, missingNames,
        loading: snippetLibrary.loading,
        supported: snippetLibrary.supported,
        fetchedAt: snippetLibrary.fetchedAt,
        error: snippetLibrary.error,
        connected: remnawave.connected,
        refresh: () => fetchSnippets(),

        // draft
        draft, openEntry, startNew, updateDraft, useCurrentRules,
        draftKind, draftNameError, draftBodyError, canSave, saveBlockedReason,
        saveDraft, copyToLocal, pushToPanel, removeDraftEntry, syncDraft,
        confirmDelete, setConfirmDelete,
        bodySyntaxError, setBodySyntaxError,
        confirmEmpty, confirmSync,

        // insertion
        target, setTarget, insertRef, insertCopy,
    };
};
