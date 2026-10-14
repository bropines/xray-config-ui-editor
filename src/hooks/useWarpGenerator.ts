import { useState } from 'react';
import { toast } from 'sonner';
import { generateWarpAccount, withWarpAccount, withoutWarpAccount, type WarpAccount } from '../core/generators/warp';
import { useWarpRelay } from './useWarpRelay';
import { describeRelayError } from '../core/generators/warp-relay';
import { buildWarpMasqueOutbound, generateWarpMasqueAccount } from '../core/generators/warp-masque';
import { useCoreVersion } from './useCoreVersion';
import { getPresets } from '../core/presets';
import { t } from '../i18n';

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
export type WarpTunnel = 'wireguard' | 'masque';

/**
 * Where the MASQUE-to-WARP block lives, as the version table names it. Only a
 * line whose masque transport has `warp` can reach Cloudflare over MASQUE
 * (26.10 on; v26.10.10:infra/conf/transport_method.go:798-840).
 */
export const MASQUE_WARP_PATH = 'streamSettings.masqueSettings.warp';

export function useWarpGenerator(onGenerate: (outbound: any) => void, onClose: () => void) {
    const relay = useWarpRelay();
    const { offersAt, tag: coreTag } = useCoreVersion();
    const masqueOffered = offersAt('outbound', MASQUE_WARP_PATH, 'masque');
    const [loading, setLoading] = useState(false);
    const [tunnel, setTunnel] = useState<WarpTunnel>('wireguard');
    const [presetType, setPresetType] = useState('standard');
    const [excludeLocal, setExcludeLocal] = useState(true);

    /**
     * MASQUE has no keyless fallback: a masque outbound whose warp block has
     * no key is a config the core refuses, so a failed registration adds
     * nothing and says why.
     */
    const generateMasque = async () => {
        try {
            const account = await generateWarpMasqueAccount(relay);
            const outbound = buildWarpMasqueOutbound(account, `warp-masque-${Math.floor(Math.random() * 1000)}`);
            onGenerate(outbound);
            toast.success(t("WARP over MASQUE added as {tag}", { tag: outbound.tag }));
            onClose();
        } catch (e) {
            console.error(e);
            toast.error(t("WARP did not register"), { description: describeRelayError(e), duration: 12000 });
        }
    };

    const handleGenerate = async () => {
        setLoading(true);
        if (tunnel === 'masque') {
            await generateMasque();
            setLoading(false);
            return;
        }
        try {
            // 1. Register a WARP account. A failure does not stop the
            //    profile: it is built without keys, and the outbound's own
            //    Generate WARP button registers it later.
            let warp: WarpAccount | null = null;
            let failure = '';
            try {
                warp = await generateWarpAccount(relay);
            } catch (e: any) {
                console.error(e);
                failure = describeRelayError(e);
            }

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
                    // `udp` is not a transport name — every core refuses it with
                    // "unknown transport protocol". `raw` is what the other
                    // presets write, and WireGuard ignores the choice anyway.
                    streamSettings: { network: 'raw' }
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

            // 3. Merge data
            baseOutbound.settings = warp
                ? withWarpAccount(baseOutbound.settings || {}, warp)
                : withoutWarpAccount(baseOutbound.settings || {});

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
            if (warp) {
                toast.success(t("Outbound profile generated successfully"));
            } else {
                toast.warning(t("WARP did not register — {tag} was added without keys", { tag: baseOutbound.tag }), {
                    description: t("Open the outbound and press Generate WARP to register it. Reason: {reason}", { reason: failure }),
                    duration: 12000,
                });
            }
            onClose();

        } catch (e: any) {
            console.error(e);
            toast.error(t("Generation failed"), {
                description: e.message || "Network error or proxy timeout."
            });
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        tunnel,
        setTunnel,
        masqueOffered,
        coreTag,
        presetType,
        setPresetType,
        excludeLocal,
        setExcludeLocal,
        handleGenerate,
    };
}
