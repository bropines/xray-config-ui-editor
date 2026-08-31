import { useMemo } from 'react';
import { useConfigStore } from '../store/configStore';

export interface AppNavSelectorOption {
    value: string;
    label: string;
    description?: string;
}

/**
 * Store access + derived state + handlers for AppNav's profile selector.
 *
 * Extracted out of AppNav.tsx so that component is left as composition of
 * a desktop toolbar block and a mobile drawer block, both of which render
 * the SAME <Select value={currentOptionValue} onChange={handleSelectChange}
 * options={selectorOptions} /> sourced from this one hook call — rewriting
 * either block's markup doesn't risk touching the store wiring, and there is
 * only ever one handleSelectChange to dispatch through (the mobile call site
 * wraps it to also close the drawer, but calls this same function).
 */
export function useAppNavLogic() {
    const {
        profiles,
        activeProfileId,
        switchProfile,
        createProfile,
        remnawave,
        loadRemnawaveProfile,
        config
    } = useConfigStore();

    // Compute selector options for cloud + local profiles
    const selectorOptions = useMemo<AppNavSelectorOption[]>(() => {
        const opts: AppNavSelectorOption[] = [];

        // Remnawave Cloud Profiles (if connected)
        if (remnawave.connected && remnawave.profiles?.length > 0) {
            remnawave.profiles.forEach((rp) => {
                opts.push({
                    value: `cloud:${rp.uuid}`,
                    label: `☁ ${rp.name || 'Unnamed Cloud Profile'}`,
                    description: `Remnawave Cloud Config (${rp.uuid.substring(0, 8)})`
                });
            });
        }

        // Local Config Profiles
        profiles.forEach((p) => {
            const isCurrent = p.id === activeProfileId && !remnawave.activeProfileUuid;
            const inCount = isCurrent ? (config?.inbounds?.length || 0) : (p.config?.inbounds?.length || 0);
            const outCount = isCurrent ? (config?.outbounds?.length || 0) : (p.config?.outbounds?.length || 0);
            const name = p.name === 'Default Profile' ? 'Default' : p.name;

            opts.push({
                value: `local:${p.id}`,
                label: remnawave.connected ? `💻 Local: ${name}` : name,
                description: `${inCount} inbounds, ${outCount} outbounds`
            });
        });

        // Action to create new local profile
        opts.push({
            value: `action:new_local`,
            label: `+ New Local Profile`,
            description: `Create a new local profile`
        });

        return opts;
    }, [remnawave.connected, remnawave.profiles, profiles, activeProfileId, remnawave.activeProfileUuid, config]);

    // Active option value
    const currentOptionValue = useMemo(() => {
        if (remnawave.connected && remnawave.activeProfileUuid) {
            return `cloud:${remnawave.activeProfileUuid}`;
        }
        const activeExists = profiles.some(p => p.id === activeProfileId);
        const fallbackId = activeExists ? activeProfileId : (profiles[0]?.id || 'default');
        return `local:${fallbackId}`;
    }, [remnawave.connected, remnawave.activeProfileUuid, activeProfileId, profiles]);

    const handleSelectChange = (val: string) => {
        if (val.startsWith('cloud:')) {
            const uuid = val.replace('cloud:', '');
            loadRemnawaveProfile(uuid);
        } else if (val.startsWith('local:')) {
            const id = val.replace('local:', '');
            switchProfile(id);
        } else if (val === 'action:new_local') {
            const name = prompt("Enter new local profile name:");
            if (name && name.trim()) {
                createProfile(name.trim());
            }
        }
    };

    return {
        selectorOptions,
        currentOptionValue,
        handleSelectChange,
    };
}
