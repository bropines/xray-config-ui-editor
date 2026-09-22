import { create } from 'zustand';
import { produce } from 'immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import { RemnawaveClient } from '../core/api/remnawave-client';
import { validateBalancer } from '../core/validators';
import { runFullDiagnostics } from '../core/diagnostics';
import { toast } from 'sonner';
import type { RemnawaveProfile } from '../core/types';
import {
    makeSnippetRef,
    validateSnippetBody,
    validateSnippetName,
    type SnippetDefinition,
    type SnippetSection,
} from '../core/snippets';
import { XrayConfigSchema } from '../core/xray/schemas';
import { createDefaultDns } from '../core/presets/dns';
import { diffCounts } from '../core/git/bounded-diff';
import { parseJsonc, stringifyJsonc } from '../utils/jsonc';
import { idbStorage } from '../utils/indexedDbStorage';

// Re-export types from core for backward compatibility
export type {
    XrayConfig,
    Inbound,
    Outbound,
    RoutingRule,
    Balancer,
    RoutingConfig,
    DnsConfig,
    DnsServerObject,
    LogConfig,
    ApiConfig,
    PolicyConfig,
    PolicyLevel,
    StatsConfig,
    ReverseConfig,
    FakednsPool,
    ObservatoryConfig,
    BurstObservatoryConfig,
} from '../core/types';

import type { XrayConfig, RoutingRule } from '../core/types';
import { t } from '../i18n';

export interface LocalProfile {
    id: string;
    name: string;
    updatedAt: number;
    config: XrayConfig;
    rawConfigText?: string;
}

export interface ConfigHistorySnapshot {
    id: string;
    timestamp: number;
    label: string;
    summary: string;
    config: XrayConfig;
    rawConfigText?: string;
    additions?: number;
    deletions?: number;
}

interface RemnawaveState {
    url: string;
    token: string | null;
    connected: boolean;
    activeProfileUuid: string | null;
    profiles: RemnawaveProfile[];
}

/**
 * Snippet / template library.
 *
 * `panel` mirrors Remnawave's own snippets (GET /api/snippets) — the bodies
 * behind the `{ "snippet": "NAME" }` references an imported config carries.
 * `local` holds this browser's own templates: same shape, no panel required,
 * so the feature also works on a plain local config.
 *
 * Both are persisted: the panel copy doubles as an offline cache so an
 * imported profile stays readable without a live connection.
 */
interface SnippetLibraryState {
    panel: SnippetDefinition[];
    local: SnippetDefinition[];
    /** Epoch ms of the last successful panel fetch. */
    fetchedAt: number | null;
    loading: boolean;
    /** null = never asked, false = panel predates the snippets API (404). */
    supported: boolean | null;
    error: string | null;
}

/**
 * The panel's hosts plus the inbounds they point at, kept only for the current
 * session: it is a read-through cache of someone else's live state, and a
 * stale copy of "which key does this node use" is worse than no copy. Not
 * persisted, deliberately.
 */
interface PanelCatalogState {
    hosts: any[];
    /** configProfileInboundUuid -> { rawInbound, tag, profileName }. */
    inbounds: Record<string, any>;
    loading: boolean;
    error: string | null;
    fetchedAt: number | null;
}

/**
 * Remnawave's subscription templates, session-only like the host catalog.
 * The list endpoint returns metadata without bodies; a body is fetched only
 * when one is opened.
 */
interface PanelTemplatesState {
    items: any[];
    loading: boolean;
    error: string | null;
}

interface ConfigState {
    config: XrayConfig | null;
    rawConfigText: string | null;
    setConfig: (config: XrayConfig | null, rawText?: string | null) => void;
    loadConfig: (json: unknown, label?: string, isCloud?: boolean, rawText?: string) => void;
    coreVersion: string;
    setCoreVersion: (version: string) => void;
    
    // Profiles & History State
    profiles: LocalProfile[];
    activeProfileId: string;
    baselineConfigJson: string | null;
    histories: Record<string, ConfigHistorySnapshot[]>;
    historyLimit: number;
    autoSave: boolean;

    // Profile Actions
    createProfile: (name: string, initialConfig?: XrayConfig) => void;
    switchProfile: (id: string) => void;
    renameProfile: (id: string, newName: string) => void;
    duplicateProfile: (id: string) => void;
    deleteProfile: (id: string) => void;
    saveActiveProfile: () => void;
    revertToBaseline: () => void;
    markBaseline: () => void;

    // Version Control Actions
    recordSnapshot: (label?: string) => ConfigHistorySnapshot | null;
    restoreSnapshot: (id: string) => void;
    deleteSnapshot: (id: string) => void;
    clearHistory: () => void;
    deduplicateHistory: () => void;
    setHistoryLimit: (limit: number) => void;
    setAutoSave: (enabled: boolean) => void;
    
    // UI & Generator Settings
    warpWorkerUrl: string;
    setWarpWorkerUrl: (url: string) => void;
    /**
     * Real paths on the REALITY target, pasted by the user. The spiderX dice
     * draws from these when there are any, because a path the target actually
     * serves beats anything the generator can invent.
     */
    spiderPaths: string[];
    setSpiderPaths: (paths: string[]) => void;

    // Remnawave Actions

    remnawave: RemnawaveState;
    connectRemnawaveToken: (url: string, token: string) => void; 
    fetchRemnawaveProfiles: () => Promise<RemnawaveProfile[]>;
    loadRemnawaveProfile: (uuid: string) => Promise<void>;
    saveToRemnawave: () => Promise<void>;
    disconnectRemnawave: () => void;
    
    // Standard CRUD Actions
    updateSection: (section: keyof XrayConfig, data: any, rawText?: string) => void;
    toggleSection: (section: keyof XrayConfig, defaultValue: any) => void;
    addItem: (section: 'inbounds' | 'outbounds', item: any) => void;
    updateItem: (section: 'inbounds' | 'outbounds', index: number, item: any, rawText?: string | null) => void;
    deleteItem: (section: 'inbounds' | 'outbounds', index: number) => void;
    deleteItems: (section: 'inbounds' | 'outbounds', indices: number[]) => void;
    moveItem: (section: 'inbounds' | 'outbounds', fromIndex: number, toIndex: number) => void;
    addOutbounds: (items: any[]) => void;
    
    reorderRules: (newRules: RoutingRule[]) => void;
    updateRoutingRule: (index: number, rule: RoutingRule, rawText?: string | null) => void;
    updateBalancer: (index: number, balancer: any, rawText?: string | null) => void;
    initDns: () => void;

    // --- Panel catalog (hosts + their inbounds), session-only ---
    panelCatalog: PanelCatalogState;
    fetchPanelCatalog: () => Promise<void>;

    // --- Panel hosts (write) ---
    createPanelHost: (payload: Record<string, unknown>) => Promise<any | null>;
    updatePanelHosts: (updates: Array<Record<string, unknown> & { uuid: string }>) => Promise<number>;
    updatePanelHost: (patch: Record<string, unknown> & { uuid: string }) => Promise<boolean>;
    deletePanelHost: (uuid: string) => Promise<boolean>;

    // --- Subscription templates, session-only ---
    panelTemplates: PanelTemplatesState;
    fetchSubscriptionTemplates: () => Promise<void>;
    loadSubscriptionTemplate: (uuid: string) => Promise<any | null>;
    createPanelTemplate: (name: string, templateType: string) => Promise<string | null>;
    patchPanelTemplate: (
        uuid: string,
        patch: { templateJson?: unknown; encodedTemplateYaml?: string; name?: string }
    ) => Promise<boolean>;
    deletePanelTemplate: (uuid: string) => Promise<boolean>;
    /** Resolves to the template's uuid — the caller needs it for the next step. */
    saveSubscriptionTemplate: (input: {
        mode: 'create' | 'update';
        uuid?: string;
        name?: string;
        templateJson: any;
    }) => Promise<string | null>;

    // --- Snippets & templates ---
    snippetLibrary: SnippetLibraryState;
    /** Every known definition, panel entries shadowing same-named local ones. */
    getSnippetDefs: () => SnippetDefinition[];
    fetchSnippets: (options?: { silent?: boolean }) => Promise<void>;
    saveLocalTemplate: (template: { name: string; snippet: any[]; description?: string; previousName?: string }) => boolean;
    deleteLocalTemplate: (name: string) => void;
    pushSnippetToPanel: (name: string, snippet: any[]) => Promise<boolean>;
    deletePanelSnippet: (name: string) => Promise<void>;
    syncPanelSnippet: (name: string) => Promise<void>;
    insertSnippetRef: (name: string, section: SnippetSection) => void;
    insertSnippetBody: (name: string, section: SnippetSection) => void;

    // Hydration status — the persist store's storage backend (IndexedDB) is
    // async, so `config`/`profiles`/`remnawave` hold their initial defaults
    // until this flips to true. Consumers that read/write on mount must wait
    // for it (see useStoreHydrated in ../hooks) to avoid racing the async
    // rehydration and having their write clobbered once it resolves.
    hasHydrated: boolean;
    setHasHydrated: (value: boolean) => void;
}

// --- Implementation ---

// The CRUD actions below all need a mutable plain-object view of the config to
// splice/push/reorder against, preferring the JSONC raw text (so comments
// survive) and falling back to the typed `config`. Previously each action
// duplicated this try/catch and, on a parse failure, silently discarded
// whatever raw-text edits (including comments) caused it — with no
// indication to the user why their change vanished. Centralized here so the
// warning fires consistently and the parse logic has one home.
function resolveMutableConfig(
    state: { rawConfigText: string | null; config: XrayConfig | null },
    fallbackDefault: any = {}
): any {
    if (state.rawConfigText) {
        try {
            return parseJsonc(state.rawConfigText);
        } catch (e) {
            console.warn('[configStore] Failed to parse rawConfigText, falling back to last known-good config:', e);
            toast.warning(t("Raw JSON edits were discarded"), {
                description: t("The raw config text had a syntax error, so this action fell back to the last valid config."),
            });
            return state.config ? parseJsonc(stringifyJsonc(state.config)) : fallbackDefault;
        }
    }
    return state.config ? parseJsonc(stringifyJsonc(state.config)) : fallbackDefault;
}

/**
 * The slice that survives a reload. Everything else — hydration flags, in-
 * flight loading state, geo caches — is per session and rebuilt on start.
 */
type PersistedConfig =
    Pick<ConfigState,
        'config' | 'rawConfigText' | 'coreVersion' | 'warpWorkerUrl' | 'spiderPaths'
        | 'profiles' | 'activeProfileId' | 'baselineConfigJson' | 'histories'
        | 'historyLimit' | 'autoSave'>
    & {
        remnawave: Pick<ConfigState['remnawave'], 'url' | 'token' | 'connected' | 'activeProfileUuid'>;
        snippetLibrary: ConfigState['snippetLibrary'];
    };

export const useConfigStore = create(
    persist<ConfigState, [], [], PersistedConfig>(
        (set, get) => ({
            config: null,
            rawConfigText: null,
            coreVersion: 'v1.8.10',
            setCoreVersion: (version: string) => set({ coreVersion: version }),
            
            warpWorkerUrl: '',
            setWarpWorkerUrl: (url: string) => set({ warpWorkerUrl: url }),
            spiderPaths: [],
            setSpiderPaths: (paths: string[]) => set({ spiderPaths: paths }),

            // --- Panel catalog ---
            panelCatalog: {
                hosts: [],
                inbounds: {},
                loading: false,
                error: null,
                fetchedAt: null,
            },

            fetchPanelCatalog: async () => {
                const { url, token, connected } = get().remnawave;
                if (!connected || !url || !token) {
                    toast.error(t("Connect to Remnawave first"));
                    return;
                }

                set(produce((state: any) => {
                    state.panelCatalog.loading = true;
                    state.panelCatalog.error = null;
                }));

                const client = new RemnawaveClient(url);
                client.setToken(token);

                try {
                    // Hosts say where clients connect; the profiles carry the
                    // inbounds those hosts point at. Both are needed to mirror
                    // a server inbound into a client outbound, so they are
                    // fetched together and indexed by the id hosts reference.
                    const [hosts, profiles] = await Promise.all([
                        client.getHosts(),
                        client.getConfigProfiles(),
                    ]);

                    const inbounds: Record<string, any> = {};
                    (profiles as any[]).forEach((profile: any) => {
                        (profile?.inbounds || []).forEach((inbound: any) => {
                            if (!inbound?.uuid) return;
                            inbounds[inbound.uuid] = {
                                uuid: inbound.uuid,
                                tag: inbound.tag,
                                type: inbound.type,
                                port: inbound.port,
                                rawInbound: inbound.rawInbound,
                                profileName: profile.name,
                                profileUuid: profile.uuid,
                            };
                        });
                    });

                    set(produce((state: any) => {
                        state.panelCatalog.hosts = hosts;
                        state.panelCatalog.inbounds = inbounds;
                        state.panelCatalog.loading = false;
                        state.panelCatalog.fetchedAt = Date.now();
                        state.panelCatalog.error = null;
                    }));
                    toast.success(`Loaded ${hosts.length} host(s) from the panel`);
                } catch (e: any) {
                    const message = e?.message || 'Unknown error';
                    set(produce((state: any) => {
                        state.panelCatalog.loading = false;
                        state.panelCatalog.error = message;
                    }));
                    toast.error(t("Failed to load hosts from the panel"), { description: message });
                }
            },

            createPanelHost: async (payload) => {
                const { url, token, connected } = get().remnawave;
                if (!connected || !url || !token) {
                    toast.error(t("Connect to Remnawave first"));
                    return null;
                }
                const client = new RemnawaveClient(url);
                client.setToken(token);
                try {
                    const host = await client.createHost(payload);
                    await get().fetchPanelCatalog();
                    toast.success(`Host "${payload.remark}" created`);
                    return host;
                } catch (e: any) {
                    toast.error(t("Failed to create the host"), { description: e?.message || 'Unknown error' });
                    return null;
                }
            },

            updatePanelHosts: async (updates) => {
                const { url, token, connected } = get().remnawave;
                if (!connected || !url || !token) {
                    toast.error(t("Connect to Remnawave first"));
                    return 0;
                }
                const client = new RemnawaveClient(url);
                client.setToken(token);

                let done = 0;
                const failures: string[] = [];
                // Sequential on purpose: these are writes to someone's live
                // panel, and a partial failure should stop with a clear count
                // rather than race a dozen requests.
                for (const update of updates) {
                    try {
                        await client.updateHost(update);
                        done++;
                    } catch (e: any) {
                        failures.push(e?.message || 'Unknown error');
                    }
                }
                await get().fetchPanelCatalog();
                if (failures.length > 0) {
                    toast.error(`${failures.length} host update(s) failed`, { description: failures[0] });
                } else {
                    toast.success(`Updated ${done} host(s)`);
                }
                return done;
            },

            updatePanelHost: async (patch) => {
                const { url, token, connected } = get().remnawave;
                if (!connected || !url || !token) {
                    toast.error(t("Connect to Remnawave first"));
                    return false;
                }
                const client = new RemnawaveClient(url);
                client.setToken(token);
                try {
                    await client.updateHost(patch);
                    await get().fetchPanelCatalog();
                    toast.success(t("Host saved"));
                    return true;
                } catch (e: any) {
                    toast.error(t("Failed to save the host"), { description: e?.message || 'Unknown error' });
                    return false;
                }
            },

            deletePanelHost: async (uuid) => {
                const { url, token, connected } = get().remnawave;
                if (!connected || !url || !token) {
                    toast.error(t("Connect to Remnawave first"));
                    return false;
                }
                const client = new RemnawaveClient(url);
                client.setToken(token);
                try {
                    await client.deleteHost(uuid);
                    await get().fetchPanelCatalog();
                    toast.info(t("Host deleted"));
                    return true;
                } catch (e: any) {
                    toast.error(t("Failed to delete the host"), { description: e?.message || 'Unknown error' });
                    return false;
                }
            },

            // --- Subscription templates ---
            panelTemplates: { items: [], loading: false, error: null },

            fetchSubscriptionTemplates: async () => {
                const { url, token, connected } = get().remnawave;
                if (!connected || !url || !token) {
                    toast.error(t("Connect to Remnawave first"));
                    return;
                }
                set(produce((state: any) => { state.panelTemplates.loading = true; state.panelTemplates.error = null; }));

                const client = new RemnawaveClient(url);
                client.setToken(token);
                try {
                    const items = await client.getSubscriptionTemplates();
                    set(produce((state: any) => {
                        state.panelTemplates.items = items;
                        state.panelTemplates.loading = false;
                    }));
                } catch (e: any) {
                    const message = e?.message || 'Unknown error';
                    set(produce((state: any) => {
                        state.panelTemplates.loading = false;
                        state.panelTemplates.error = message;
                    }));
                    toast.error(t("Failed to load subscription templates"), { description: message });
                }
            },

            loadSubscriptionTemplate: async (uuid) => {
                const { url, token, connected } = get().remnawave;
                if (!connected || !url || !token) {
                    toast.error(t("Connect to Remnawave first"));
                    return null;
                }
                const client = new RemnawaveClient(url);
                client.setToken(token);
                try {
                    return await client.getSubscriptionTemplate(uuid);
                } catch (e: any) {
                    toast.error(t("Failed to load the template"), { description: e?.message || 'Unknown error' });
                    return null;
                }
            },

            createPanelTemplate: async (name, templateType) => {
                const { url, token, connected } = get().remnawave;
                if (!connected || !url || !token) {
                    toast.error(t("Connect to Remnawave first"));
                    return null;
                }
                const client = new RemnawaveClient(url);
                client.setToken(token);
                try {
                    const created = await client.createSubscriptionTemplate(name.trim(), templateType);
                    await get().fetchSubscriptionTemplates();
                    toast.success(`Template "${name}" created`);
                    return created?.uuid || null;
                } catch (e: any) {
                    toast.error(t("Failed to create the template"), { description: e?.message || 'Unknown error' });
                    return null;
                }
            },

            patchPanelTemplate: async (uuid, patch) => {
                const { url, token, connected } = get().remnawave;
                if (!connected || !url || !token) {
                    toast.error(t("Connect to Remnawave first"));
                    return false;
                }
                const client = new RemnawaveClient(url);
                client.setToken(token);
                try {
                    await client.updateSubscriptionTemplate(uuid, patch);
                    await get().fetchSubscriptionTemplates();
                    toast.success(t("Template saved to the panel"), {
                        description: t("Every host pointing at it serves the new body."),
                    });
                    return true;
                } catch (e: any) {
                    toast.error(t("Failed to save the template"), { description: e?.message || 'Unknown error' });
                    return false;
                }
            },

            deletePanelTemplate: async (uuid) => {
                const { url, token, connected } = get().remnawave;
                if (!connected || !url || !token) {
                    toast.error(t("Connect to Remnawave first"));
                    return false;
                }
                const client = new RemnawaveClient(url);
                client.setToken(token);
                try {
                    await client.deleteSubscriptionTemplate(uuid);
                    await get().fetchSubscriptionTemplates();
                    toast.info(t("Template deleted"));
                    return true;
                } catch (e: any) {
                    toast.error(t("Failed to delete the template"), { description: e?.message || 'Unknown error' });
                    return false;
                }
            },

            saveSubscriptionTemplate: async ({ mode, uuid, name, templateJson }) => {
                const { url, token, connected } = get().remnawave;
                if (!connected || !url || !token) {
                    toast.error(t("Connect to Remnawave first"));
                    return null;
                }

                const client = new RemnawaveClient(url);
                client.setToken(token);

                try {
                    // Creating a template and filling it in are two calls: the
                    // panel's create endpoint takes only a name and a type, so
                    // the body follows in a PATCH.
                    let targetUuid: string | undefined = uuid;
                    if (mode === 'create') {
                        const created = await client.createSubscriptionTemplate((name || '').trim(), 'XRAY_JSON');
                        targetUuid = created?.uuid;
                        if (!targetUuid) throw new Error('Panel did not return a template uuid');
                    }
                    if (!targetUuid) throw new Error('No template selected');

                    await client.updateSubscriptionTemplate(targetUuid, { templateJson });
                    await get().fetchSubscriptionTemplates();

                    // Updating is the case where "who else sees this" matters:
                    // every host already pointing at the template serves the
                    // new body, which is easy to forget when the template is
                    // shared between locations.
                    const usedBy = get().panelCatalog.hosts.filter(
                        (h: any) => h?.xrayJsonTemplateUuid === targetUuid
                    ).length;

                    toast.success(mode === 'create'
                        ? `Template "${name}" created in the panel`
                        : 'Template updated in the panel', {
                        description: mode === 'create'
                            ? 'Next: create an entry host that points at it.'
                            : usedBy > 0
                                ? `${usedBy} host(s) already point at it — their subscribers get this on the next refresh.`
                                : 'No host points at it yet — create an entry host to hand it to subscribers.',
                    });
                    return targetUuid;
                } catch (e: any) {
                    toast.error(t("Failed to save the template"), { description: e?.message || 'Unknown error' });
                    return null;
                }
            },

            // --- Snippet / template library ---
            snippetLibrary: {
                panel: [],
                local: [],
                fetchedAt: null,
                loading: false,
                supported: null,
                error: null,
            },

            // --- Remnawave Connection ---
            remnawave: {
                url: '',
                token: null,
                connected: false,
                activeProfileUuid: null,
                profiles: []
            },

            disconnectRemnawave: () => set(produce((state) => {
                state.remnawave.token = null;
                state.remnawave.connected = false;
                state.remnawave.activeProfileUuid = null;
                state.remnawave.profiles = [];
                toast.info(t("Remnawave connection closed"));
            })),

            connectRemnawaveToken: (url, token) => {
                if (!url || !token) {
                    toast.error(t("URL and Token are required"));
                    return;
                }
                set(produce((state) => {
                    state.remnawave.url = url;
                    state.remnawave.token = token;
                    state.remnawave.connected = true;
                }));
                toast.success(t("Linked to Remnawave via Token"));
                get().fetchRemnawaveProfiles().catch(() => {});
                get().fetchSnippets({ silent: true }).catch(() => {});
            },

            fetchRemnawaveProfiles: async () => {
                const { url, token } = get().remnawave;
                if (!url || !token) throw new Error("Not authenticated");
                
                const client = new RemnawaveClient(url);
                client.setToken(token);
                try {
                    const list = await client.getConfigProfiles();
                    set(produce((state) => {
                        state.remnawave.profiles = list;
                    }));
                    return list;
                } catch (e: any) {
                    if (e.message.includes("401")) {
                        get().disconnectRemnawave();
                        toast.error(t("Session expired"));
                    }
                    throw e;
                }
            },

            loadRemnawaveProfile: async (uuid) => {
                const { url, token } = get().remnawave;
                if (!url || !token) return;

                const client = new RemnawaveClient(url);
                client.setToken(token);
                const prevUuid = get().remnawave.activeProfileUuid;
                try {
                    // Set activeProfileUuid FIRST so loadConfig and snapshots record under rw:uuid
                    set(produce((state) => {
                        state.remnawave.activeProfileUuid = uuid;
                    }));
                    const configData = await client.getConfigProfile(uuid);
                    const profile = get().remnawave.profiles.find(p => p.uuid === uuid);
                    const rawStr = typeof configData === 'string' ? configData : stringifyJsonc(configData, 2);
                    get().loadConfig(configData, `Loaded Profile (${profile?.name || 'Cloud'})`, true, rawStr);
                    toast.success(t("Profile config loaded"));

                    // A panel profile may reference snippets the config does
                    // not contain. Pull their bodies in the background so the
                    // Routing editor can show what each reference expands to
                    // instead of an opaque placeholder.
                    get().fetchSnippets({ silent: true }).catch(() => {});
                } catch (e: any) {
                    set(produce((state) => {
                        state.remnawave.activeProfileUuid = prevUuid;
                    }));
                    console.error("Failed to load Remnawave profile:", e);
                    toast.error(t("Failed to load profile from cloud"));
                }
            },

            saveToRemnawave: async () => {
                const { url, token, activeProfileUuid } = get().remnawave;
                const { config } = get();

                if (!url || !token || !activeProfileUuid || !config) {
                    toast.error(t("Cannot save: No active cloud profile"));
                    return;
                }

                // --- КРИТИЧЕСКАЯ ВАЛИДАЦИЯ БАЛАНСИРОВЩИКОВ ПЕРЕД ПУШЕМ ---
                const balancers = config.routing?.balancers || [];
                const invalidBalancer = balancers.find(b => validateBalancer(b).length > 0);

                if (invalidBalancer) {
                    toast.error(t("Push Blocked!"), {
                        description: `Balancer "${invalidBalancer.tag}" has no target outbounds. Node will crash if you push this.`,
                        duration: 6000
                    });
                    return;
                }

                // --- FULL CONFIG DIAGNOSTICS (dangling routing targets, missing REALITY
                // keys/certs, incompatible Mux+Vision, etc.) — same checks the Diagnostics
                // panel shows, but here they actually gate the push instead of being
                // display-only. A cloud push is the one action where "it saved fine" must
                // mean "the node will actually start", so critical findings block it. ---
                const criticalIssues = runFullDiagnostics(config, get().getSnippetDefs()).filter(d => d.severity === 'critical');
                const firstIssue = criticalIssues[0];
                if (firstIssue) {
                    toast.error(t("Push Blocked!"), {
                        description: `${criticalIssues.length} critical issue(s) found: ${firstIssue.message}${criticalIssues.length > 1 ? ` (+${criticalIssues.length - 1} more — see Diagnostics)` : ''}`,
                        duration: 6000
                    });
                    return;
                }

                const client = new RemnawaveClient(url);
                client.setToken(token);

                try {
                    await client.updateConfigProfile(activeProfileUuid, config);
                    toast.success(t("Cloud Profile Updated!"));
                } catch (e: any) {
                    toast.error(t("Failed to push config to cloud"), {
                        description: e?.message || 'Unknown error',
                    });
                }
            },

            // --- Profiles & Local Version Control ---
            profiles: [
                {
                    id: 'default',
                    name: 'Default',
                    updatedAt: Date.now(),
                    config: { inbounds: [], outbounds: [] },
                    rawConfigText: stringifyJsonc({ inbounds: [], outbounds: [] }, 2)
                }
            ],
            activeProfileId: 'default',
            baselineConfigJson: null,
            histories: {},
            historyLimit: 50,
            autoSave: true,

            hasHydrated: false,
            setHasHydrated: (value) => set({ hasHydrated: value }),

            recordSnapshot: (label = "Config Edit") => {
                const { config, rawConfigText, histories, historyLimit, activeProfileId, remnawave } = get();
                if (!config) return null;

                // Determine active history key
                const key = remnawave.activeProfileUuid
                    ? `rw:${remnawave.activeProfileUuid}`
                    : activeProfileId;

                const history = histories[key] || [];

                // Compare against previous snapshot — skip if nothing changed
                const prevConfig = history[0]?.config ?? null;
                const currentJson = JSON.stringify(config);
                const prevJson = prevConfig ? JSON.stringify(prevConfig) : '';
                if (currentJson === prevJson) return null;

                // Line counts for the commit badge, on a short budget: an
                // exact alignment of two 7,000-line configs can take sixteen
                // seconds, and this runs while the user waits for the commit.
                let additions = 0;
                let deletions = 0;
                try {
                    const prettyCurrent = rawConfigText || JSON.stringify(config, null, 2);
                    const prettyPrev = history[0]?.rawConfigText || (prevConfig ? JSON.stringify(prevConfig, null, 2) : '');
                    ({ additions, deletions } = diffCounts(prettyPrev, prettyCurrent));
                } catch { /* ignore */ }

                const inbounds = config.inbounds?.length || 0;
                const outbounds = config.outbounds?.length || 0;
                const rules = config.routing?.rules?.length || 0;
                const summary = `${inbounds} Inbounds, ${outbounds} Outbounds, ${rules} Rules`;

                const snapshot: ConfigHistorySnapshot = {
                    id: Math.random().toString(36).substring(2, 9),
                    timestamp: Date.now(),
                    label,
                    summary,
                    config: parseJsonc(stringifyJsonc(config)),
                    rawConfigText: rawConfigText || stringifyJsonc(config, 2),
                    additions,
                    deletions,
                };
                const limit = Math.max(10, Math.min(1000, historyLimit));
                const newHistory = [snapshot, ...history].slice(0, limit);
                set({ histories: { ...histories, [key]: newHistory } });
                return snapshot;
            },

            restoreSnapshot: (id) => {
                const { histories, activeProfileId, remnawave } = get();
                const key = remnawave.activeProfileUuid
                    ? `rw:${remnawave.activeProfileUuid}`
                    : activeProfileId;
                const history = histories[key] || [];
                const found = history.find(h => h.id === id);
                if (found) {
                    const restored = parseJsonc(stringifyJsonc(found.config));
                    const text = found.rawConfigText || stringifyJsonc(restored, 2);
                    set({ config: restored, rawConfigText: text });
                    toast.success(`✓ Restored to commit ${id.substring(0, 7)} (${new Date(found.timestamp).toLocaleTimeString()})`);
                }
            },

            deleteSnapshot: (id) => {
                const { histories, activeProfileId, remnawave } = get();
                const key = remnawave.activeProfileUuid
                    ? `rw:${remnawave.activeProfileUuid}`
                    : activeProfileId;
                const history = histories[key] || [];
                const filtered = history.filter(h => h.id !== id);
                set({ histories: { ...histories, [key]: filtered } });
                toast.success(`Deleted commit ${id.substring(0, 7)}`);
            },

            clearHistory: () => {
                const { histories, activeProfileId, remnawave } = get();
                const key = remnawave.activeProfileUuid
                    ? `rw:${remnawave.activeProfileUuid}`
                    : activeProfileId;
                set({ histories: { ...histories, [key]: [] } });
                toast.info(t("Version history cleared"));
            },

            deduplicateHistory: () => {
                const { histories, activeProfileId, remnawave } = get();
                const key = remnawave.activeProfileUuid
                    ? `rw:${remnawave.activeProfileUuid}`
                    : activeProfileId;
                const history = histories[key] || [];
                // Remove consecutive snapshots with identical configs
                const deduped = history.filter((snapshot, idx) => {
                    if (idx === history.length - 1) return true;
                    const next = history[idx + 1];
                    return JSON.stringify(snapshot.config) !== JSON.stringify(next?.config);
                });
                const removed = history.length - deduped.length;
                set({ histories: { ...histories, [key]: deduped } });
                if (removed > 0) {
                    toast.success(`Removed ${removed} duplicate snapshot${removed > 1 ? 's' : ''}`);
                } else {
                    toast.info(t("No duplicates found"));
                }
            },

            setHistoryLimit: (limit) => {
                const clamped = Math.max(10, Math.min(1000, limit));
                set(produce((state) => {
                    state.historyLimit = clamped;
                    Object.keys(state.histories).forEach((k) => {
                        if (Array.isArray(state.histories[k])) {
                            state.histories[k] = state.histories[k].slice(0, clamped);
                        }
                    });
                }));
            },

            setAutoSave: (enabled) => set({ autoSave: enabled }),

            createProfile: (name, initialConfig) => {
                const newId = `profile-${Math.random().toString(36).substring(2, 8)}`;
                const cfg = initialConfig || get().config || { inbounds: [], outbounds: [] };
                // When the caller supplies a config, its raw text has to come
                // from *that* config. Falling back to the store's current
                // rawConfigText attached the previously open config's literal
                // text to the new profile, and since switchProfile prefers
                // rawConfigText over config, opening the profile brought the
                // old config back.
                const text = initialConfig
                    ? stringifyJsonc(cfg, 2)
                    : (get().rawConfigText || stringifyJsonc(cfg, 2));
                const newProfile: LocalProfile = {
                    id: newId,
                    name: name.trim() || 'New Profile',
                    updatedAt: Date.now(),
                    config: parseJsonc(stringifyJsonc(cfg)),
                    rawConfigText: text
                };
                set(produce((state) => {
                    state.profiles.push(newProfile);
                    state.activeProfileId = newId;
                    state.config = newProfile.config;
                    state.rawConfigText = text;
                    state.baselineConfigJson = stringifyJsonc(newProfile.config);
                    state.remnawave.activeProfileUuid = null;
                }));
                get().recordSnapshot(`Created Profile (${newProfile.name})`);
                toast.success(`Created profile "${newProfile.name}"`);
            },

            switchProfile: (id) => {
                const { profiles } = get();
                const target = profiles.find(p => p.id === id);
                if (!target) return;
                const cfg = parseJsonc(stringifyJsonc(target.config));
                const text = target.rawConfigText || stringifyJsonc(cfg, 2);
                set(produce((state) => {
                    state.activeProfileId = id;
                    state.config = cfg;
                    state.rawConfigText = text;
                    state.baselineConfigJson = stringifyJsonc(target.config);
                    state.remnawave.activeProfileUuid = null;
                }));
                toast.info(`Switched to "${target.name}"`);
            },

            renameProfile: (id, newName) => {
                set(produce((state) => {
                    const target = state.profiles.find((p: any) => p.id === id);
                    if (target) target.name = newName.trim() || target.name;
                }));
            },

            duplicateProfile: (id) => {
                const { profiles } = get();
                const target = profiles.find(p => p.id === id);
                if (!target) return;
                get().createProfile(`${target.name} (Copy)`, target.config);
            },

            deleteProfile: (id) => {
                const { profiles, activeProfileId } = get();
                if (profiles.length <= 1) {
                    toast.error(t("Cannot delete the only profile"));
                    return;
                }
                const remaining = profiles.filter(p => p.id !== id);
                const nextActive = activeProfileId === id ? remaining[0]!.id : activeProfileId;
                const nextProfile = remaining.find(p => p.id === nextActive);
                const nextConfig = nextProfile?.config || null;
                const nextText = nextProfile?.rawConfigText || (nextConfig ? stringifyJsonc(nextConfig, 2) : null);
                // Remove history for deleted profile
                const { histories } = get();
                const newHistories = { ...histories };
                delete newHistories[id];
                set({
                    profiles: remaining,
                    activeProfileId: nextActive,
                    config: nextConfig ? parseJsonc(stringifyJsonc(nextConfig)) : null,
                    rawConfigText: nextText,
                    baselineConfigJson: nextConfig ? stringifyJsonc(nextConfig) : null,
                    histories: newHistories
                });
                toast.success(t("Profile deleted"));
            },

            saveActiveProfile: () => {
                const { config, rawConfigText, activeProfileId, remnawave } = get();
                if (!config) return;
                // If a cloud profile is active, do not overwrite the local profile
                if (remnawave.activeProfileUuid) {
                    get().recordSnapshot("Profile Saved");
                    return;
                }
                set(produce((state) => {
                    const target = state.profiles.find((p: any) => p.id === activeProfileId);
                    if (target) {
                        target.config = parseJsonc(stringifyJsonc(config));
                        target.rawConfigText = rawConfigText || stringifyJsonc(config, 2);
                        target.updatedAt = Date.now();
                    }
                    state.baselineConfigJson = stringifyJsonc(config);
                }));
                get().recordSnapshot("Profile Saved");

                // Local save is never blocked (the user might be mid-edit), but a
                // config with critical issues (dangling routing targets, missing
                // REALITY keys, etc.) saving silently as "success" is how those go
                // unnoticed until someone tries to push/deploy it. Surface it here too.
                const criticalCount = runFullDiagnostics(config).filter(d => d.severity === 'critical').length;
                if (criticalCount > 0) {
                    toast.warning(t("Local Profile Saved (with issues)"), {
                        description: `${criticalCount} critical diagnostic issue(s) remain — open Diagnostics before pushing this config.`,
                    });
                } else {
                    toast.success(t("Local Profile Saved!"));
                }
            },

            revertToBaseline: () => {
                const { baselineConfigJson } = get();
                if (!baselineConfigJson) return;
                try {
                    const reverted = parseJsonc(baselineConfigJson);
                    set({ config: reverted, rawConfigText: baselineConfigJson });
                    toast.info(t("Reverted changes to baseline"));
                } catch {}
            },

            markBaseline: () => {
                const { config, rawConfigText } = get();
                if (config) {
                    set({ baselineConfigJson: rawConfigText || stringifyJsonc(config, 2) });
                }
            },

            // --- Standard CRUD Actions ---
            
            setConfig: (config, rawText) => set((state) => {
                let newRawText = rawText;
                if (newRawText === undefined) {
                    if (state.rawConfigText && config) {
                        try {
                            const parsed = parseJsonc(state.rawConfigText);
                            if (JSON.stringify(parsed) === JSON.stringify(config)) {
                                newRawText = state.rawConfigText;
                            } else {
                                newRawText = stringifyJsonc(config, 2);
                            }
                        } catch {
                            newRawText = stringifyJsonc(config, 2);
                        }
                    } else if (config) {
                        newRawText = stringifyJsonc(config, 2);
                    } else {
                        newRawText = null;
                    }
                }
                return { config, rawConfigText: newRawText };
            }),

            loadConfig: (json, label, isCloud = false, rawText) => {
                let parsedConfig: XrayConfig;
                let textToSave = rawText;
                let validationWarningIssues: any = null;

                if (typeof json === 'string') {
                    textToSave = json;
                    try {
                        parsedConfig = parseJsonc(json);
                    } catch {
                        parsedConfig = json as any;
                    }
                } else {
                    const result = XrayConfigSchema.safeParse(json);
                    if (!result.success) {
                        validationWarningIssues = result.error.issues;
                    }
                    parsedConfig = result.success ? result.data : (json as XrayConfig);
                    if (!textToSave) {
                        textToSave = stringifyJsonc(parsedConfig, 2);
                    }
                }

                if (validationWarningIssues) {
                    console.warn('Validation warnings:', validationWarningIssues);
                    toast.warning(t("Configuration loaded with validation warnings. Check console."));
                }
                set(produce((state) => {
                    state.config = parsedConfig;
                    state.rawConfigText = textToSave || stringifyJsonc(parsedConfig, 2);
                    state.baselineConfigJson = state.rawConfigText;
                    if (!isCloud) {
                        state.remnawave.activeProfileUuid = null;
                    }
                    const active = state.profiles.find((p: any) => p.id === state.activeProfileId);
                    if (active) {
                        active.config = parseJsonc(stringifyJsonc(parsedConfig));
                        active.rawConfigText = state.rawConfigText;
                        active.updatedAt = Date.now();
                    }
                }));
                get().recordSnapshot(label || "Loaded Config");
            },

            updateSection: (section, data, rawText) => set((state) => {
                const fullObj = resolveMutableConfig(state, { inbounds: [], outbounds: [] });

                if (rawText) {
                    try {
                        const parsedSec = parseJsonc(rawText);
                        fullObj[section] = parsedSec;
                        const newText = stringifyJsonc(fullObj, 2);
                        return { config: fullObj, rawConfigText: newText };
                    } catch (e) {
                        console.warn('[updateSection] Error parsing section rawText:', e);
                    }
                }

                if (data !== undefined) {
                    fullObj[section] = data;
                }
                const newText = stringifyJsonc(fullObj, 2);
                return { config: fullObj, rawConfigText: newText };
            }),

            toggleSection: (section, defaultValue) => set((state) => {
                const fullObj = resolveMutableConfig(state);
                if (fullObj[section]) {
                    delete fullObj[section];
                } else {
                    fullObj[section] = defaultValue;
                }
                const newText = stringifyJsonc(fullObj, 2);
                return { config: fullObj, rawConfigText: newText };
            }),

            addItem: (section, item) => set((state) => {
                const fullObj = resolveMutableConfig(state, { inbounds: [], outbounds: [] });
                fullObj[section] = fullObj[section] || [];
                fullObj[section].push(item);
                const newText = stringifyJsonc(fullObj, 2);
                return { config: fullObj, rawConfigText: newText };
            }),

            addOutbounds: (items) => set((state) => {
                const fullObj = resolveMutableConfig(state, { inbounds: [], outbounds: [] });
                if (!fullObj.outbounds) fullObj.outbounds = [];
                const existingTags = new Set(fullObj.outbounds.map((o: any) => o.tag));
                
                const cleanItems = items.map((item) => {
                    let tag = item.tag || `${item.protocol}-${Math.floor(Math.random() * 1000)}`;
                    
                    if (existingTags.has(tag)) {
                        const suffix = Math.random().toString(36).substring(2, 5);
                        tag = `${tag}-${suffix}`;
                    }
                    
                    existingTags.add(tag);
                    return { ...item, tag };
                });
                
                fullObj.outbounds.push(...cleanItems);
                const newText = stringifyJsonc(fullObj, 2);
                return { config: fullObj, rawConfigText: newText };
            }),

            updateItem: (section, index, item, rawText) => set((state) => {
                const fullObj = resolveMutableConfig(state);
                if (fullObj[section]) {
                    // Prefer the item's own literal raw JSONC text (comments
                    // and all) when the caller has one still in sync with
                    // `item` — see useXrayEditor's handleSave. Falls back to
                    // the plain object on parse failure, same as updateSection.
                    if (rawText) {
                        try {
                            fullObj[section][index] = parseJsonc(rawText);
                        } catch (e) {
                            console.warn('[updateItem] Error parsing item rawText, falling back to plain object:', e);
                            fullObj[section][index] = item;
                        }
                    } else {
                        fullObj[section][index] = item;
                    }
                }
                const newText = stringifyJsonc(fullObj, 2);
                return { config: fullObj, rawConfigText: newText };
            }),

            deleteItem: (section, index) => set((state) => {
                const fullObj = resolveMutableConfig(state);
                if (fullObj[section]) {
                    fullObj[section].splice(index, 1);
                }
                const newText = stringifyJsonc(fullObj, 2);
                return { config: fullObj, rawConfigText: newText };
            }),

            deleteItems: (section, indices) => set((state) => {
                const fullObj = resolveMutableConfig(state);
                if (fullObj[section]) {
                    const sorted = Array.from(new Set(indices)).sort((a: any, b: any) => b - a);
                    for (const idx of sorted) {
                        if (idx >= 0 && idx < fullObj[section].length) {
                            fullObj[section].splice(idx, 1);
                        }
                    }
                }
                const newText = stringifyJsonc(fullObj, 2);
                return { config: fullObj, rawConfigText: newText };
            }),
            
            moveItem: (section, fromIndex, toIndex) => set((state) => {
                const fullObj = resolveMutableConfig(state);
                if (!fullObj[section]) return state;
                const list = fullObj[section];
                if (toIndex < 0 || toIndex >= list.length) return state;
                
                const [movedItem] = list.splice(fromIndex, 1);
                list.splice(toIndex, 0, movedItem);
                const newText = stringifyJsonc(fullObj, 2);
                return { config: fullObj, rawConfigText: newText };
            }),

            reorderRules: (newRules) => set((state) => {
                const fullObj = resolveMutableConfig(state);
                if (!fullObj.routing) fullObj.routing = { rules: [], balancers: [] };
                fullObj.routing.rules = newRules;
                const newText = stringifyJsonc(fullObj, 2);
                return { config: fullObj, rawConfigText: newText };
            }),

            // Single-rule/balancer update that, unlike reorderRules/updateSection,
            // preserves that one item's own raw JSONC text (comments included)
            // when the caller has one still in sync — see RuleEditor/BalancerEditor's
            // raw mode and updateItem's identical rationale. reorderRules always
            // rebuilds the whole rules array as a plain JS array (via [...rules]
            // in useRoutingEditor), which silently drops any comments the parsed
            // rules array carried; this action mutates just the one index instead.
            updateRoutingRule: (index, rule, rawText) => set((state) => {
                const fullObj = resolveMutableConfig(state);
                if (!fullObj.routing) fullObj.routing = { rules: [], balancers: [] };
                if (!fullObj.routing.rules) fullObj.routing.rules = [];
                if (rawText) {
                    try {
                        fullObj.routing.rules[index] = parseJsonc(rawText);
                    } catch (e) {
                        console.warn('[updateRoutingRule] Error parsing rule rawText, falling back to plain object:', e);
                        fullObj.routing.rules[index] = rule;
                    }
                } else {
                    fullObj.routing.rules[index] = rule;
                }
                const newText = stringifyJsonc(fullObj, 2);
                return { config: fullObj, rawConfigText: newText };
            }),

            updateBalancer: (index, balancer, rawText) => set((state) => {
                const fullObj = resolveMutableConfig(state);
                if (!fullObj.routing) fullObj.routing = { rules: [], balancers: [] };
                if (!fullObj.routing.balancers) fullObj.routing.balancers = [];
                if (rawText) {
                    try {
                        fullObj.routing.balancers[index] = parseJsonc(rawText);
                    } catch (e) {
                        console.warn('[updateBalancer] Error parsing balancer rawText, falling back to plain object:', e);
                        fullObj.routing.balancers[index] = balancer;
                    }
                } else {
                    fullObj.routing.balancers[index] = balancer;
                }
                const newText = stringifyJsonc(fullObj, 2);
                return { config: fullObj, rawConfigText: newText };
            }),

            // --- Snippets & templates -------------------------------
            // Panel snippets are owned by Remnawave: this editor reads them,
            // and only ever writes one back on an explicit user action.
            // Local templates are owned here and never leave the browser
            // unless the user pushes one to the panel.

            getSnippetDefs: () => {
                const { panel, local } = get().snippetLibrary;
                // Panel entries come last so that, on a name collision, the
                // panel's body wins - it is the one Remnawave will actually
                // splice into the config (see indexSnippets: later wins).
                return [...local, ...panel];
            },

            fetchSnippets: async (options) => {
                const silent = options?.silent === true;
                const { url, token, connected } = get().remnawave;
                const { supported } = get().snippetLibrary;

                if (!connected || !url || !token) {
                    if (!silent) toast.error(t("Connect to Remnawave first"));
                    return;
                }
                // A panel that answered 404 once will keep doing so; don't
                // re-probe it on every profile load.
                if (silent && supported === false) return;

                set(produce((state: any) => {
                    state.snippetLibrary.loading = true;
                    state.snippetLibrary.error = null;
                }));

                const client = new RemnawaveClient(url);
                client.setToken(token);

                try {
                    const list = await client.getSnippets();
                    set(produce((state: any) => {
                        state.snippetLibrary.panel = list;
                        state.snippetLibrary.fetchedAt = Date.now();
                        state.snippetLibrary.loading = false;
                        state.snippetLibrary.supported = true;
                        state.snippetLibrary.error = null;
                    }));
                    if (!silent) toast.success(`Loaded ${list.length} snippet(s) from the panel`);
                } catch (e: any) {
                    const message = e?.message || 'Unknown error';
                    const unsupported = message.includes('404');
                    set(produce((state: any) => {
                        state.snippetLibrary.loading = false;
                        if (unsupported) state.snippetLibrary.supported = false;
                        state.snippetLibrary.error = message;
                    }));
                    if (!silent) {
                        toast.error(unsupported
                            ? "This panel has no snippets API"
                            : "Failed to load snippets", { description: message });
                    }
                }
            },

            saveLocalTemplate: ({ name, snippet, description, previousName }) => {
                const trimmed = (name || '').trim();
                const nameError = validateSnippetName(trimmed);
                if (nameError) {
                    toast.error(t("Invalid template name"), { description: nameError });
                    return false;
                }
                const bodyError = validateSnippetBody(snippet);
                if (bodyError) {
                    toast.error(t("Invalid template body"), { description: bodyError });
                    return false;
                }

                const existing = get().snippetLibrary.local;
                const collides = existing.some(tpl => tpl.name === trimmed && tpl.name !== previousName);
                if (collides) {
                    toast.error(t("A template with this name already exists"));
                    return false;
                }

                set(produce((state: any) => {
                    const list: SnippetDefinition[] = state.snippetLibrary.local;
                    const entry: SnippetDefinition = {
                        name: trimmed,
                        snippet,
                        source: 'local',
                        updatedAt: Date.now(),
                        ...(description ? { description } : {}),
                    };
                    const idx = list.findIndex(tpl => tpl.name === (previousName || trimmed));
                    if (idx >= 0) list[idx] = entry;
                    else list.push(entry);
                }));
                toast.success(`Template "${trimmed}" saved`);
                return true;
            },

            deleteLocalTemplate: (name) => {
                set(produce((state: any) => {
                    state.snippetLibrary.local = state.snippetLibrary.local.filter(
                        (snippet: SnippetDefinition) => snippet.name !== name
                    );
                }));
                toast.info(`Template "${name}" deleted`);
            },

            pushSnippetToPanel: async (name, snippet) => {
                const trimmed = (name || '').trim();
                const nameError = validateSnippetName(trimmed);
                if (nameError) {
                    toast.error(t("Invalid snippet name"), { description: nameError });
                    return false;
                }
                const bodyError = validateSnippetBody(snippet);
                if (bodyError) {
                    toast.error(t("Invalid snippet body"), { description: bodyError });
                    return false;
                }

                const { url, token, connected } = get().remnawave;
                if (!connected || !url || !token) {
                    toast.error(t("Connect to Remnawave first"));
                    return false;
                }

                const client = new RemnawaveClient(url);
                client.setToken(token);
                const exists = get().snippetLibrary.panel.some(entry => entry.name === trimmed);

                try {
                    if (exists) await client.updateSnippet(trimmed, snippet);
                    else await client.createSnippet(trimmed, snippet);
                    await get().fetchSnippets({ silent: true });
                    toast.success(exists
                        ? `Snippet "${trimmed}" updated in the panel`
                        : `Snippet "${trimmed}" created in the panel`);
                    return true;
                } catch (e: any) {
                    toast.error(t("Failed to save snippet to the panel"), {
                        description: e?.message || 'Unknown error',
                    });
                    return false;
                }
            },

            deletePanelSnippet: async (name) => {
                const { url, token, connected } = get().remnawave;
                if (!connected || !url || !token) {
                    toast.error(t("Connect to Remnawave first"));
                    return;
                }
                const client = new RemnawaveClient(url);
                client.setToken(token);
                try {
                    await client.deleteSnippet(name);
                    await get().fetchSnippets({ silent: true });
                    toast.success(`Snippet "${name}" deleted from the panel`);
                } catch (e: any) {
                    toast.error(t("Failed to delete snippet"), { description: e?.message || 'Unknown error' });
                }
            },

            syncPanelSnippet: async (name) => {
                const { url, token, connected } = get().remnawave;
                if (!connected || !url || !token) {
                    toast.error(t("Connect to Remnawave first"));
                    return;
                }
                const client = new RemnawaveClient(url);
                client.setToken(token);
                try {
                    await client.syncSnippet(name);
                    toast.success(`Snippet "${name}" synced`, {
                        description: t("Panel is re-applying it to every profile that references it."),
                    });
                } catch (e: any) {
                    toast.error(t("Failed to sync snippet"), { description: e?.message || 'Unknown error' });
                }
            },

            insertSnippetRef: (name, section) => {
                const trimmed = (name || '').trim();
                if (!trimmed) return;
                set((state) => {
                    const fullObj = resolveMutableConfig(state);
                    if (section === 'rules') {
                        if (!fullObj.routing) fullObj.routing = { rules: [], balancers: [] };
                        if (!Array.isArray(fullObj.routing.rules)) fullObj.routing.rules = [];
                        // Rules match top-down, so a new reference goes first
                        // and the user drags it into place - the same
                        // placement the Config Inspector's import uses.
                        fullObj.routing.rules.unshift(makeSnippetRef(trimmed));
                    } else if (section === 'balancers') {
                        if (!fullObj.routing) fullObj.routing = { rules: [], balancers: [] };
                        if (!Array.isArray(fullObj.routing.balancers)) fullObj.routing.balancers = [];
                        fullObj.routing.balancers.push(makeSnippetRef(trimmed));
                    } else {
                        if (!Array.isArray(fullObj.outbounds)) fullObj.outbounds = [];
                        fullObj.outbounds.push(makeSnippetRef(trimmed));
                    }
                    return { config: fullObj, rawConfigText: stringifyJsonc(fullObj, 2) };
                });
                toast.success(`Snippet reference "${trimmed}" added`, {
                    description: section === 'rules'
                        ? 'Placed at the top of the rules list - drag it into position.'
                        : `Appended to ${section}.`,
                });
            },

            insertSnippetBody: (name, section) => {
                const def = get().getSnippetDefs().find(d => d.name === name);
                if (!def || !Array.isArray(def.snippet) || def.snippet.length === 0) {
                    toast.error(`Snippet "${name}" has no loaded body to insert`);
                    return;
                }
                const entries = JSON.parse(JSON.stringify(def.snippet));
                set((state) => {
                    const fullObj = resolveMutableConfig(state);
                    if (section === 'rules') {
                        if (!fullObj.routing) fullObj.routing = { rules: [], balancers: [] };
                        if (!Array.isArray(fullObj.routing.rules)) fullObj.routing.rules = [];
                        fullObj.routing.rules.unshift(...entries);
                    } else if (section === 'balancers') {
                        if (!fullObj.routing) fullObj.routing = { rules: [], balancers: [] };
                        if (!Array.isArray(fullObj.routing.balancers)) fullObj.routing.balancers = [];
                        fullObj.routing.balancers.push(...entries);
                    } else {
                        if (!Array.isArray(fullObj.outbounds)) fullObj.outbounds = [];
                        fullObj.outbounds.push(...entries);
                    }
                    return { config: fullObj, rawConfigText: stringifyJsonc(fullObj, 2) };
                });
                toast.success(`Inserted ${entries.length} item(s) from "${name}"`, {
                    description: t("These are a copy - they no longer follow the panel snippet."),
                });
            },

            initDns: () => set((state) => {
                const fullObj = resolveMutableConfig(state);
                // Shared with the WARP presets and the balancer builder — see
                // core/presets/dns.ts for why there is only one copy.
                if (!fullObj.dns) {
                    fullObj.dns = createDefaultDns();
                }
                const newText = stringifyJsonc(fullObj, 2);
                return { config: fullObj, rawConfigText: newText };
            })
        }),
        {
            name: 'xray-config-storage',
            storage: createJSONStorage(() => idbStorage),
            partialize: (state) => ({ 
                config: state.config,
                rawConfigText: state.rawConfigText,
                coreVersion: state.coreVersion,
                warpWorkerUrl: state.warpWorkerUrl,
                // A list gathered from a real site is work; it should not be
                // lost on reload the way a generated path can be.
                spiderPaths: state.spiderPaths,
                remnawave: { 
                    url: state.remnawave.url, 
                    token: state.remnawave.token, 
                    connected: state.remnawave.connected,
                    activeProfileUuid: state.remnawave.activeProfileUuid 
                },
                profiles: state.profiles,
                activeProfileId: state.activeProfileId,
                baselineConfigJson: state.baselineConfigJson,
                histories: state.histories,
                historyLimit: state.historyLimit,
                autoSave: state.autoSave,
                // Persisted so panel snippet bodies stay readable offline and
                // local templates survive a reload. `loading`/`error` are
                // per-session and deliberately reset on rehydration.
                snippetLibrary: {
                    panel: state.snippetLibrary.panel,
                    local: state.snippetLibrary.local,
                    fetchedAt: state.snippetLibrary.fetchedAt,
                    supported: state.snippetLibrary.supported,
                    loading: false,
                    error: null,
                }
            }),
            // IndexedDB read is async: state before this fires is the
            // hardcoded default (config: null, profiles: [default], ...).
            // Flip hasHydrated once the read settles, success or failure —
            // on failure we stay on defaults deliberately rather than hang.
            onRehydrateStorage: () => (state, error) => {
                if (error) {
                    console.error('Failed to rehydrate config store from IndexedDB:', error);
                }
                state?.setHasHydrated(true);
            },
        }
    )
);