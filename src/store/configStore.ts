import { create } from 'zustand';
import { produce } from 'immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import { RemnawaveClient } from '../core/api/remnawave-client';
import { validateBalancer } from '../core/validators';
import { toast } from 'sonner';
import type { RemnawaveProfile } from '../core/types';
import { XrayConfigSchema } from '../core/xray/schemas';
import { diffLines } from 'diff';

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

import type { XrayConfig, Inbound, Outbound, RoutingRule } from '../core/types';

export interface LocalProfile {
    id: string;
    name: string;
    updatedAt: number;
    config: XrayConfig;
}

export interface ConfigHistorySnapshot {
    id: string;
    timestamp: number;
    label: string;
    summary: string;
    config: XrayConfig;
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

interface ConfigState {
    config: XrayConfig | null;
    setConfig: (config: XrayConfig | null) => void;
    loadConfig: (json: unknown, label?: string, isCloud?: boolean) => void;
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

    // Remnawave Actions

    remnawave: RemnawaveState;
    connectRemnawaveToken: (url: string, token: string) => void; 
    fetchRemnawaveProfiles: () => Promise<RemnawaveProfile[]>;
    loadRemnawaveProfile: (uuid: string) => Promise<void>;
    saveToRemnawave: () => Promise<void>;
    disconnectRemnawave: () => void;
    
    // Standard CRUD Actions
    updateSection: (section: keyof XrayConfig, data: any) => void;
    toggleSection: (section: keyof XrayConfig, defaultValue: any) => void;
    addItem: (section: 'inbounds' | 'outbounds', item: any) => void;
    updateItem: (section: 'inbounds' | 'outbounds', index: number, item: any) => void;
    deleteItem: (section: 'inbounds' | 'outbounds', index: number) => void;
    deleteItems: (section: 'inbounds' | 'outbounds', indices: number[]) => void;
    moveItem: (section: 'inbounds' | 'outbounds', fromIndex: number, toIndex: number) => void;
    addOutbounds: (items: any[]) => void;
    
    reorderRules: (newRules: RoutingRule[]) => void;
    initDns: () => void;
}

// --- Implementation ---

export const useConfigStore = create(
    persist<ConfigState>(
        (set, get) => ({
            config: null,
            coreVersion: 'v1.8.10',
            setCoreVersion: (version: string) => set({ coreVersion: version }),
            
            warpWorkerUrl: '',
            setWarpWorkerUrl: (url: string) => set({ warpWorkerUrl: url }),

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
                toast.info("Remnawave connection closed");
            })),

            connectRemnawaveToken: (url, token) => {
                if (!url || !token) {
                    toast.error("URL and Token are required");
                    return;
                }
                set(produce((state) => {
                    state.remnawave.url = url;
                    state.remnawave.token = token;
                    state.remnawave.connected = true;
                }));
                toast.success("Linked to Remnawave via Token");
                get().fetchRemnawaveProfiles().catch(() => {});
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
                        toast.error("Session expired");
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
                    get().loadConfig(configData, `Loaded Profile (${profile?.name || 'Cloud'})`, true);
                    toast.success("Profile config loaded");
                } catch (e: any) {
                    set(produce((state) => {
                        state.remnawave.activeProfileUuid = prevUuid;
                    }));
                    toast.error("Failed to load profile from cloud");
                }
            },

            saveToRemnawave: async () => {
                const { url, token, activeProfileUuid } = get().remnawave;
                const { config } = get();

                if (!url || !token || !activeProfileUuid || !config) {
                    toast.error("Cannot save: No active cloud profile");
                    return;
                }

                // --- КРИТИЧЕСКАЯ ВАЛИДАЦИЯ БАЛАНСИРОВЩИКОВ ПЕРЕД ПУШЕМ ---
                const balancers = config.routing?.balancers || [];
                const invalidBalancer = balancers.find(b => validateBalancer(b).length > 0);
                
                if (invalidBalancer) {
                    toast.error("Push Blocked!", {
                        description: `Balancer "${invalidBalancer.tag}" has no target outbounds. Node will crash if you push this.`,
                        duration: 6000
                    });
                    return;
                }

                const client = new RemnawaveClient(url);
                client.setToken(token);

                try {
                    await client.updateConfigProfile(activeProfileUuid, config);
                    toast.success("Cloud Profile Updated!");
                } catch (e: any) {
                    toast.error("Failed to push config to cloud");
                }
            },

            // --- Profiles & Local Version Control ---
            profiles: [
                {
                    id: 'default',
                    name: 'Default',
                    updatedAt: Date.now(),
                    config: { inbounds: [], outbounds: [] }
                }
            ],
            activeProfileId: 'default',
            baselineConfigJson: null,
            histories: {},
            historyLimit: 50,
            autoSave: true,

            recordSnapshot: (label = "Config Edit") => {
                const { config, histories, historyLimit, activeProfileId, remnawave } = get();
                if (!config) return null;

                // Determine active history key
                const key = remnawave.activeProfileUuid
                    ? `rw:${remnawave.activeProfileUuid}`
                    : activeProfileId;

                const history = histories[key] || [];

                // Compare against previous snapshot — skip if nothing changed
                const prevConfig = history.length > 0 ? history[0].config : null;
                const currentJson = JSON.stringify(config);
                const prevJson = prevConfig ? JSON.stringify(prevConfig) : '';
                if (currentJson === prevJson) return null;

                // Count line-level additions/deletions on pretty-printed JSON
                let additions = 0;
                let deletions = 0;
                try {
                    const prettyCurrent = JSON.stringify(config, null, 2);
                    const prettyPrev = prevConfig ? JSON.stringify(prevConfig, null, 2) : '';
                    const changes = diffLines(prettyPrev, prettyCurrent);
                    changes.forEach((c) => {
                        if (c.added) additions += c.count || 1;
                        if (c.removed) deletions += c.count || 1;
                    });
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
                    config: JSON.parse(JSON.stringify(config)),
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
                    const restored = JSON.parse(JSON.stringify(found.config));
                    set({ config: restored });
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
                toast.info("Version history cleared");
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
                    return JSON.stringify(snapshot.config) !== JSON.stringify(next.config);
                });
                const removed = history.length - deduped.length;
                set({ histories: { ...histories, [key]: deduped } });
                if (removed > 0) {
                    toast.success(`Removed ${removed} duplicate snapshot${removed > 1 ? 's' : ''}`);
                } else {
                    toast.info('No duplicates found');
                }
            },

            setHistoryLimit: (limit) => {
                const clamped = Math.max(10, Math.min(1000, limit));
                set(produce((state) => {
                    state.historyLimit = clamped;
                    state.history = state.history.slice(0, clamped);
                }));
            },

            setAutoSave: (enabled) => set({ autoSave: enabled }),

            createProfile: (name, initialConfig) => {
                const newId = `profile-${Math.random().toString(36).substring(2, 8)}`;
                const cfg = initialConfig || get().config || { inbounds: [], outbounds: [] };
                const newProfile: LocalProfile = {
                    id: newId,
                    name: name.trim() || 'New Profile',
                    updatedAt: Date.now(),
                    config: JSON.parse(JSON.stringify(cfg))
                };
                set(produce((state) => {
                    state.profiles.push(newProfile);
                    state.activeProfileId = newId;
                    state.config = newProfile.config;
                    state.baselineConfigJson = JSON.stringify(newProfile.config);
                    state.remnawave.activeProfileUuid = null;
                }));
                get().recordSnapshot(`Created Profile (${newProfile.name})`);
                toast.success(`Created profile "${newProfile.name}"`);
            },

            switchProfile: (id) => {
                const { profiles } = get();
                const target = profiles.find(p => p.id === id);
                if (!target) return;
                set(produce((state) => {
                    state.activeProfileId = id;
                    state.config = JSON.parse(JSON.stringify(target.config));
                    state.baselineConfigJson = JSON.stringify(target.config);
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
                    toast.error("Cannot delete the only profile");
                    return;
                }
                const remaining = profiles.filter(p => p.id !== id);
                const nextActive = activeProfileId === id ? remaining[0].id : activeProfileId;
                const nextConfig = remaining.find(p => p.id === nextActive)?.config || null;
                // Remove history for deleted profile
                const { histories } = get();
                const newHistories = { ...histories };
                delete newHistories[id];
                set({
                    profiles: remaining,
                    activeProfileId: nextActive,
                    config: nextConfig ? JSON.parse(JSON.stringify(nextConfig)) : null,
                    baselineConfigJson: nextConfig ? JSON.stringify(nextConfig) : null,
                    histories: newHistories
                });
                toast.success("Profile deleted");
            },

            saveActiveProfile: () => {
                const { config, activeProfileId, remnawave } = get();
                if (!config) return;
                // If a cloud profile is active, do not overwrite the local profile
                if (remnawave.activeProfileUuid) {
                    get().recordSnapshot("Profile Saved");
                    return;
                }
                set(produce((state) => {
                    const target = state.profiles.find((p: any) => p.id === activeProfileId);
                    if (target) {
                        target.config = JSON.parse(JSON.stringify(config));
                        target.updatedAt = Date.now();
                    }
                    state.baselineConfigJson = JSON.stringify(config);
                }));
                get().recordSnapshot("Profile Saved");
                toast.success("Local Profile Saved!");
            },

            revertToBaseline: () => {
                const { baselineConfigJson } = get();
                if (!baselineConfigJson) return;
                try {
                    const reverted = JSON.parse(baselineConfigJson);
                    set({ config: reverted });
                    toast.info("Reverted changes to baseline");
                } catch (e) {}
            },

            markBaseline: () => {
                const { config } = get();
                if (config) {
                    set({ baselineConfigJson: JSON.stringify(config) });
                }
            },

            // --- Standard CRUD Actions ---
            
            setConfig: (config) => set({ config }),

            loadConfig: (json, label, isCloud = false) => {
                const result = XrayConfigSchema.safeParse(json);
                const parsedConfig = result.success ? result.data : (json as XrayConfig);
                if (!result.success) {
                    console.warn('Validation warnings:', result.error.issues);
                    toast.warning("Configuration loaded with validation warnings. Check console.");
                }
                set(produce((state) => {
                    state.config = parsedConfig;
                    state.baselineConfigJson = JSON.stringify(parsedConfig);
                    if (!isCloud) {
                        state.remnawave.activeProfileUuid = null;
                    }
                    const active = state.profiles.find((p: any) => p.id === state.activeProfileId);
                    if (active) {
                        active.config = JSON.parse(JSON.stringify(parsedConfig));
                        active.updatedAt = Date.now();
                    }
                }));
                get().recordSnapshot(label || "Loaded Config");
            },

            updateSection: (section, data) => set(produce((state) => {
                if (!state.config) {
                    state.config = { inbounds: [], outbounds: [] };
                }
                if (data !== undefined) {
                    state.config[section] = data;
                }
            })),

            toggleSection: (section, defaultValue) => set(produce((state) => {
                if (!state.config) return;
                if (state.config[section]) {
                    delete state.config[section];
                } else {
                    state.config[section] = defaultValue;
                }
            })),

            addItem: (section, item) => set(produce((state) => {
                if (state.config) {
                    state.config[section] = state.config[section] || [];
                    state.config[section].push(item);
                }
            })),

            addOutbounds: (items) => set(produce((state) => {
                if (!state.config) state.config = { inbounds: [], outbounds: [] };
                const existingTags = new Set(state.config.outbounds?.map((o: any) => o.tag));
                
                const cleanItems = items.map((item) => {
                    let tag = item.tag || `${item.protocol}-${Math.floor(Math.random() * 1000)}`;
                    
                    if (existingTags.has(tag)) {
                        const suffix = Math.random().toString(36).substring(2, 5);
                        tag = `${tag}-${suffix}`;
                    }
                    
                    existingTags.add(tag);
                    return { ...item, tag };
                });
                
                state.config.outbounds.push(...cleanItems);
            })),

            updateItem: (section, index, item) => set(produce((state) => {
                if (state.config && state.config[section]) {
                    state.config[section][index] = item;
                }
            })),

            deleteItem: (section, index) => set(produce((state) => {
                if (state.config && state.config[section]) {
                    state.config[section].splice(index, 1);
                }
            })),

            deleteItems: (section, indices) => set(produce((state) => {
                if (state.config && state.config[section]) {
                    const sorted = Array.from(new Set(indices)).sort((a, b) => b - a);
                    for (const idx of sorted) {
                        if (idx >= 0 && idx < state.config[section].length) {
                            state.config[section].splice(idx, 1);
                        }
                    }
                }
            })),
            
            moveItem: (section, fromIndex, toIndex) => set(produce((state) => {
                if (!state.config || !state.config[section]) return;
                const list = state.config[section];
                if (toIndex < 0 || toIndex >= list.length) return;
                
                const [movedItem] = list.splice(fromIndex, 1);
                list.splice(toIndex, 0, movedItem);
            })),

            reorderRules: (newRules) => set(produce((state) => {
                if (state.config) {
                    if (!state.config.routing) state.config.routing = { rules: [], balancers: [] };
                    state.config.routing.rules = newRules;
                }
            })),

            initDns: () => set(produce((state) => {
                if (state.config && !state.config.dns) {
                    state.config.dns = {
                        servers: ["1.1.1.1", "8.8.8.8", "localhost"],
                        queryStrategy: "UseIP",
                        tag: "dns_inbound"
                    };
                }
            }))
        }),
        {
            name: 'xray-config-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ 
                config: state.config,
                coreVersion: state.coreVersion,
                warpWorkerUrl: state.warpWorkerUrl,
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
                autoSave: state.autoSave
            }),
        }
    )
);