import { create } from 'zustand';
import { produce } from 'immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import { RemnawaveClient, type RemnawaveProfile } from '../utils/remnawave-client';
import { toast } from 'sonner';
import { validateBalancer } from '../utils/validator';

export interface LogConfig {
    access?: string;
    error?: string;
    loglevel?: "debug" | "info" | "warning" | "error" | "none";
    dnsLog?: boolean;
    maskAddress?: string;
}

export interface ApiConfig {
    tag?: string;
    listen?: string;
    services?: string[];
}

export interface DnsServerObject {
    address?: string;
    port?: number;
    domains?: string[];
    expectIPs?: string[];
    skipFallback?: boolean;
    clientIp?: string;
    queryStrategy?: "UseIP" | "UseIPv4" | "UseIPv6";
    disableCache?: boolean;
    tag?: string;
}

export interface DnsConfig {
    servers?: (string | DnsServerObject)[];
    hosts?: Record<string, string | string[]>;
    clientIp?: string;
    queryStrategy?: "UseIP" | "UseIPv4" | "UseIPv6";
    disableCache?: boolean;
    disableFallback?: boolean;
    disableFallbackIfMatch?: boolean;
    tag?: string;
}

export interface RoutingRule {
    type?: string;
    domain?: string[];
    ip?: string[];
    port?: string;
    sourcePort?: string;
    network?: string;
    source?: string[];
    user?: string[];
    inboundTag?: string[];
    protocol?: string[];
    attrs?: Record<string, string>;
    outboundTag?: string;
    balancerTag?: string;
}

export interface Balancer {
    tag: string;
    selector: string[];
    strategy?: {
        type: "random" | "roundRobin" | "leastPing" | "leastLoad";
    };
    fallbackTag?: string;
}

export interface RoutingConfig {
    domainStrategy?: "AsIs" | "IPIfNonMatch" | "IPOnDemand";
    rules?: RoutingRule[];
    balancers?: Balancer[];
}

export interface Inbound {
    tag?: string;
    port?: number | string;
    listen?: string;
    protocol: string;
    settings?: any;
    streamSettings?: any;
    sniffing?: {
        enabled?: boolean;
        destOverride?: string[];
        metadataOnly?: boolean;
        routeOnly?: boolean;
    };
    allocate?: {
        strategy?: string;
        refresh?: number;
        concurrency?: number;
    };
}

export interface Outbound {
    tag?: string;
    sendThrough?: string;
    protocol: string;
    settings?: any;
    streamSettings?: any;
    proxySettings?: {
        tag?: string;
        transportLayer?: boolean;
    };
    mux?: {
        enabled?: boolean;
        concurrency?: number;
        xudpConcurrency?: number;
        xudpProxyUDP443?: string;
    };
}

export interface PolicyLevel {
    handshake?: number;
    connIdle?: number;
    uplinkOnly?: number;
    downlinkOnly?: number;
    statsUserUplink?: boolean;
    statsUserDownlink?: boolean;
    bufferSize?: number;
}

export interface PolicyConfig {
    levels?: Record<string, PolicyLevel>;
    system?: {
        statsInboundUplink?: boolean;
        statsInboundDownlink?: boolean;
        statsOutboundUplink?: boolean;
        statsOutboundDownlink?: boolean;
    };
}

export interface StatsConfig {}

export interface ReverseConfig {
    bridges?: { tag: string; domain: string }[];
    portals?: { tag: string; domain: string }[];
}

export interface FakednsPool {
    ipPool: string;
    poolSize: number;
}

export interface ObservatoryConfig {
    subjectSelector?: string[];
    probeUrl?: string;
    probeInterval?: string;
}

export interface XrayConfig {
    log?: LogConfig;
    api?: ApiConfig;
    dns?: DnsConfig;
    routing?: RoutingConfig;
    policy?: PolicyConfig;
    inbounds?: Inbound[];
    outbounds?: Outbound[];
    transport?: any;
    stats?: StatsConfig;
    reverse?: ReverseConfig;
    fakedns?: FakednsPool[];
    observatory?: ObservatoryConfig;
    [key: string]: any; 
}

// --- Интерфейсы Состояния Store ---

interface RemnawaveState {
    url: string;
    token: string | null;
    connected: boolean;
    activeProfileUuid: string | null;
}

interface ConfigState {
    config: XrayConfig | null;
    setConfig: (config: XrayConfig | null) => void;
    
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
    
    reorderRules: (newRules: RoutingRule[]) => void;
    initDns: () => void;
}

// --- Implementation ---

export const useConfigStore = create(
    persist<ConfigState>(
        (set, get) => ({
            config: null,

            // --- Remnawave Connection ---
            remnawave: {
                url: '',
                token: null,
                connected: false,
                activeProfileUuid: null
            },

            disconnectRemnawave: () => set(produce((state) => {
                state.remnawave.token = null;
                state.remnawave.connected = false;
                state.remnawave.activeProfileUuid = null;
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
            },

            fetchRemnawaveProfiles: async () => {
                const { url, token } = get().remnawave;
                if (!url || !token) throw new Error("Not authenticated");
                
                const client = new RemnawaveClient(url);
                client.setToken(token);
                try {
                    return await client.getConfigProfiles();
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

                try {
                    const configData = await client.getConfigProfile(uuid);
                    set({ config: configData as XrayConfig });
                    set(produce((state) => {
                        state.remnawave.activeProfileUuid = uuid;
                    }));
                    toast.success("Profile config loaded");
                } catch (e: any) {
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

            // --- Standard CRUD Actions ---
            
            setConfig: (config) => set({ config }),

            updateSection: (section, data) => set(produce((state) => {
                if (!state.config) state.config = { inbounds: [], outbounds: [] };
                state.config[section] = data;
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
                remnawave: { 
                    url: state.remnawave.url, 
                    token: state.remnawave.token, 
                    connected: state.remnawave.connected,
                    activeProfileUuid: state.remnawave.activeProfileUuid 
                } 
            }),
        }
    )
);