import { create } from 'zustand';
import { produce } from 'immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import { RemnawaveClient } from '../utils/remnawave-client';
import { toast } from 'sonner';

// --- Полная типизация конфигурации Xray (как было ранее) ---
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
    };
    allocate?: any;
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

// --- Интерфейсы Store ---

interface RemnawaveState {
    url: string;
    username: string;
    token: string | null;
    connected: boolean;
    activeProfileUuid: string | null;
}

interface ConfigState {
    config: XrayConfig | null;
    setConfig: (config: XrayConfig | null) => void;
    
    // Remnawave Actions
    remnawave: RemnawaveState;
    setRemnawaveCreds: (url: string, username: string, token: string) => void;
    connectRemnawave: (password: string) => Promise<void>;
    connectRemnawaveToken: (url: string, token: string) => void;
    fetchRemnawaveProfiles: () => Promise<RemnawaveProfile[]>; // <--- НОВЫЙ МЕТОД
    loadRemnawaveProfile: (uuid: string) => Promise<void>;
    saveToRemnawave: () => Promise<void>;
    disconnectRemnawave: () => void;
    
    // Standard Actions
    updateSection: (section: keyof XrayConfig, data: any) => void;
    toggleSection: (section: keyof XrayConfig, defaultValue: any) => void;
    addItem: (section: 'inbounds' | 'outbounds', item: any) => void;
    updateItem: (section: 'inbounds' | 'outbounds', index: number, item: any) => void;
    deleteItem: (section: 'inbounds' | 'outbounds', index: number) => void;
    reorderRules: (newRules: any[]) => void;
    initDns: () => void;
}

export const useConfigStore = create(
    persist<ConfigState>(
        (set, get) => ({
            config: null,

            remnawave: {
                url: '',
                username: '',
                token: null,
                connected: false,
                activeProfileUuid: null
            },

            setRemnawaveCreds: (url, username, token) => set(produce((state) => {
                state.remnawave.url = url;
                state.remnawave.username = username;
                state.remnawave.token = token;
                state.remnawave.connected = true;
            })),

            disconnectRemnawave: () => set(produce((state) => {
                state.remnawave.token = null;
                state.remnawave.connected = false;
                state.remnawave.activeProfileUuid = null;
                toast.info("Disconnected from Remnawave");
            })),

            connectRemnawave: async (password) => {
                const { url, username } = get().remnawave;
                if (!url || !username) {
                    toast.error("Missing URL or Username");
                    throw new Error("Missing credentials");
                }
                const client = new RemnawaveClient(url);
                try {
                    const token = await client.login(username, password);
                    get().setRemnawaveCreds(url, username, token);
                    toast.success("Connected via Credentials!");
                } catch (e: any) {
                    console.error(e);
                    toast.error("Connection failed", { description: e.message });
                    throw e;
                }
            },

            connectRemnawaveToken: (url, token) => {
                if (!url || !token) {
                    toast.error("Missing URL or Token");
                    return;
                }
                set(produce((state) => {
                    state.remnawave.url = url;
                    state.remnawave.token = token;
                    state.remnawave.username = "API Token User"; 
                    state.remnawave.connected = true;
                }));
                toast.success("Connected via Token!");
            },

            fetchRemnawaveProfiles: async () => {
                const { url, token } = get().remnawave;
                if (!url || !token) {
                    throw new Error("Not connected");
                }
                const client = new RemnawaveClient(url);
                client.setToken(token);
                try {
                    return await client.getConfigProfiles();
                } catch (e: any) {
                    // Если токен протух - отключаем
                    if (e.message.includes("401") || e.message.includes("Unauthorized")) {
                        get().disconnectRemnawave();
                        toast.error("Session expired. Please login again.");
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
                    if (configData) {
                        set({ config: configData as XrayConfig });
                        set(produce((state) => {
                            state.remnawave.activeProfileUuid = uuid;
                        }));
                        toast.success("Profile loaded successfully");
                    } else {
                        toast.warning("Config is empty in this profile");
                        set(produce((state) => {
                            state.remnawave.activeProfileUuid = uuid;
                        }));
                    }
                } catch (e: any) {
                    console.error(e);
                    toast.error("Failed to load profile", { description: e.message });
                }
            },

// Находим метод saveToRemnawave в src/store/configStore.ts

            saveToRemnawave: async () => {
                const { url, token, activeProfileUuid } = get().remnawave;
                const { config } = get();

                if (!url || !token || !activeProfileUuid) {
                    toast.error("Not connected to a profile");
                    return;
                }

                if (!config) {
                    toast.error("Config is empty");
                    return;
                }

                // --- НОВАЯ ВАЛИДАЦИЯ БАЛАНСИРОВЩИКОВ ---
                const balancers = config.routing?.balancers || [];
                const emptyBalancer = balancers.find(b => !b.selector || b.selector.length === 0);
                
                if (emptyBalancer) {
                    toast.error("Validation Failed", {
                        description: `Balancer "${emptyBalancer.tag}" has no target outbounds. This will break the node!`,
                        duration: 5000
                    });
                    return; // ПРЕРЫВАЕМ ПУШ
                }
                // ---------------------------------------

                const client = new RemnawaveClient(url);
                client.setToken(token);

                try {
                    await client.updateConfigProfile(activeProfileUuid, config);
                    toast.success("Config saved to Remnawave cloud!");
                } catch (e: any) {
                    console.error(e);
                    toast.error("Failed to save", { description: e.message });
                }
            },

            // --- Standard Actions ---
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
                        servers: ["1.1.1.1", "8.8.8.8"],
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
                    username: state.remnawave.username,
                    token: null, 
                    connected: false, 
                    activeProfileUuid: null 
                } 
            }),
        }
    )
);