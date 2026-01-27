import { create } from 'zustand';
import { produce } from 'immer';
import { persist, createJSONStorage } from 'zustand/middleware';

// Полная типизация конфига
interface XrayConfig {
    log?: {
        access?: string;
        error?: string;
        loglevel?: "debug" | "info" | "warning" | "error" | "none";
        dnsLog?: boolean;
    };
    api?: {
        tag?: string;
        services?: string[];
    };
    stats?: {};
    policy?: {
        levels?: { [key: string]: any };
        system?: {
            statsInboundUplink?: boolean;
            statsInboundDownlink?: boolean;
            statsOutboundUplink?: boolean;
            statsOutboundDownlink?: boolean;
        };
    };
    observatory?: {
        subjectSelector?: string[];
        probeUrl?: string;
        probeInterval?: string;
    };
    dns?: {
        servers?: any[];
        hosts?: Record<string, string | string[]>;
        clientIp?: string;
        queryStrategy?: string;
        disableCache?: boolean;
        disableFallback?: boolean;
        disableFallbackIfMatch?: boolean;
        tag?: string;
    };
    routing?: { domainStrategy?: string; rules: any[]; balancers: any[] };
    inbounds: any[];
    outbounds: any[];
    fakedns?: { ipPool: string; poolSize: number }[];
    reverse?: {
        bridges?: { tag: string; domain: string }[];
        portals?: { tag: string; domain: string }[];
    };
}

interface ConfigState {
    config: XrayConfig | null;
    setConfig: (config: XrayConfig | null) => void;
    
    // Generic Actions
    updateSection: (section: keyof XrayConfig, data: any) => void;
    toggleSection: (section: keyof XrayConfig, defaultValue: any) => void; // Новое!
    
    // Array Actions
    addItem: (section: 'inbounds' | 'outbounds', item: any) => void;
    updateItem: (section: 'inbounds' | 'outbounds', index: number, item: any) => void;
    deleteItem: (section: 'inbounds' | 'outbounds', index: number) => void;
    
    // Complex Actions
    reorderRules: (newRules: any[]) => void;
    initDns: () => void;
}

export const useConfigStore = create(
    persist<ConfigState>(
        (set) => ({
            config: null,

            setConfig: (config) => set({ config }),

            updateSection: (section, data) => set(produce((state) => {
                if (state.config) state.config[section] = data;
            })),

            // Включить/Выключить секцию (null/object)
            toggleSection: (section, defaultValue) => set(produce((state) => {
                if (!state.config) return;
                if (state.config[section]) {
                    delete state.config[section]; // Выключаем
                } else {
                    state.config[section] = defaultValue; // Включаем
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
        }
    )
);