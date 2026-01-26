import { create } from 'zustand';
import { produce } from 'immer';
import { persist, createJSONStorage } from 'zustand/middleware';

// Типизация (можно расширять)
interface XrayConfig {
    log?: any;
    api?: any;
    dns?: any;
    routing?: { domainStrategy?: string; rules: any[]; balancers: any[] };
    inbounds: any[];
    outbounds: any[];
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
            }))
        }),
        {
            name: 'xray-config-storage', // Уникальное имя ключа в LocalStorage
            storage: createJSONStorage(() => localStorage),
        }
    )
);