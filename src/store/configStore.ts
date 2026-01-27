import { create } from 'zustand';
import { produce } from 'immer';
import { persist, createJSONStorage } from 'zustand/middleware';

// Типизация
interface XrayConfig {
    log?: any;
    api?: any;
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
    policy?: any;
}

interface ConfigState {
    config: XrayConfig | null;
    setConfig: (config: XrayConfig | null) => void;
    
    // Generic Actions
    updateSection: (section: keyof XrayConfig, data: any) => void;
    
    // Array Actions
    addItem: (section: 'inbounds' | 'outbounds', item: any) => void;
    updateItem: (section: 'inbounds' | 'outbounds', index: number, item: any) => void;
    deleteItem: (section: 'inbounds' | 'outbounds', index: number) => void;
    
    // Routing Specific
    reorderRules: (newRules: any[]) => void;

    // DNS Specific (инициализация если null)
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