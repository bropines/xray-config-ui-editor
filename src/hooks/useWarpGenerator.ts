import { useState } from 'react';
import { toast } from 'sonner';
import { generateWarpAccount } from '../core/generators/warp';
import { useConfigStore } from '../store/configStore';
import { getPresets } from '../core/presets';

/**
 * Business logic for the WARP(WireGuard) outbound generator wizard:
 * account registration, preset lookup/merging, allowed-IPs construction,
 * and tag assignment for the resulting outbound object.
 *
 * Extracted out of WarpGeneratorModal.tsx (RuleEditor-style) because
 * `onGenerate` hands back a whole replacement outbound object rather than
 * a config path — there is no `local`/`updateField` pair here for
 * useField/useArrayField to bind to, so the logic-hook extraction pattern
 * applies instead. The component is left as pure JSX composition over the
 * state and handler returned below.
 */
export function useWarpGenerator(onGenerate: (outbound: any) => void, onClose: () => void) {
    const { warpWorkerUrl } = useConfigStore();
    const [loading, setLoading] = useState(false);
    const [presetType, setPresetType] = useState('standard');
    const [excludeLocal, setExcludeLocal] = useState(true);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            // 1. Generate WARP account
            const warp = await generateWarpAccount(warpWorkerUrl);

            // 2. Fetch templates
            const allPresets = getPresets();
            let baseOutbound: any;

            if (presetType === 'standard') {
                baseOutbound = {
                    tag: `profile-a-${Math.floor(Math.random() * 1000)}`,
                    protocol: 'wireguard',
                    settings: {
                        secretKey: '',
                        address: [],
                        mtu: 1280,
                        reserved: [0, 0, 0],
                        peers: [{ endpoint: '', publicKey: '', keepAlive: 15, allowedIPs: ['0.0.0.0/0', '::/0'] }]
                    },
                    streamSettings: { network: 'udp' }
                };
            } else {
                const targetPresetName =
                    presetType === 'awgm1' ? 'WARP Profile A' :
                    presetType === 'awgm2' ? 'WARP Profile B' :
                    presetType === 'awgm3' ? 'WARP Profile C' : '';

                const preset = allPresets.find(p => p.name === targetPresetName);
                if (!preset || !preset.config.outbounds || preset.config.outbounds.length === 0) {
                    console.error("Mismatched target:", targetPresetName, "Available:", allPresets.map(p => p.name));
                    throw new Error(`Internal lookup failed for "${targetPresetName}"`);
                }

                // Clone the outbound from preset to avoid mutations
                const originalOb = preset.config.outbounds.find(o => o.protocol === 'wireguard');
                if (!originalOb) throw new Error("WireGuard outbound not found in preset");

                baseOutbound = JSON.parse(JSON.stringify(originalOb));
            }

            if (!baseOutbound) throw new Error("Base outbound generation failed");

            // Ensure settings exists
            if (!baseOutbound.settings) baseOutbound.settings = {};
            if (!baseOutbound.settings.peers) baseOutbound.settings.peers = [{}];

            // 3. Merge data
            baseOutbound.settings.secretKey = warp.privateKey;
            baseOutbound.settings.address = [`${warp.ipv4}/32`, `${warp.ipv6}/128`];
            baseOutbound.settings.reserved = warp.reserved;
            baseOutbound.settings.peers[0].endpoint = warp.endpoint;
            baseOutbound.settings.peers[0].publicKey = warp.peerPublicKey;

            // 4. Allowed IPs logic
            if (excludeLocal) {
                baseOutbound.settings.peers[0].allowedIPs = [
                    "0.0.0.0/5", "8.0.0.0/7", "11.0.0.0/8", "12.0.0.0/6", "16.0.0.0/4", "32.0.0.0/3",
                    "64.0.0.0/2", "128.0.0.0/3", "160.0.0.0/5", "168.0.0.0/6", "172.0.0.0/12",
                    "172.32.0.0/11", "172.64.0.0/10", "172.128.0.0/9", "173.0.0.0/8", "174.0.0.0/7",
                    "176.0.0.0/4", "192.0.0.0/9", "192.64.0.0/10", "192.128.0.0/11", "192.160.0.0/13",
                    "192.169.0.0/16", "192.170.0.0/15", "192.172.0.0/14", "192.176.0.0/12",
                    "192.192.0.0/10", "193.0.0.0/8", "194.0.0.0/7", "196.0.0.0/6", "200.0.0.0/5",
                    "208.0.0.0/4", "::/0"
                ];
            } else {
                baseOutbound.settings.peers[0].allowedIPs = ["0.0.0.0/0", "::/0"];
            }

            // Generate a unique tag
            const prefix = presetType === 'standard' ? 'cloud' : (presetType.startsWith('awg') ? presetType : 'profile');
            baseOutbound.tag = `${prefix}-${Math.floor(Math.random() * 1000)}`;

            onGenerate(baseOutbound);
            toast.success("Outbound profile generated successfully");
            onClose();

        } catch (e: any) {
            console.error(e);
            toast.error("Generation failed", {
                description: e.message || "Network error or proxy timeout."
            });
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        presetType,
        setPresetType,
        excludeLocal,
        setExcludeLocal,
        handleGenerate,
    };
}
