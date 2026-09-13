import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useConfigStore } from '../store/configStore';
import { parseRawSubscriptionText } from '../utils/link-parser';
import { stringifyJsonc } from '../utils/jsonc';
import { RUSSIAN_DOMAINS, LEAK_CHECK_DOMAINS } from '../core/presets/bypass-domains';
import {
    buildLocalBalancerConfig,
    groupNodesByLabel,
    isProxyOutbound,
    LOCAL_BALANCER_PRESETS,
    DEFAULT_LOCAL_BALANCER_OPTIONS,
    type BuildResult,
    type LocalBalancerGroup,
    type LocalBalancerOptions,
} from '../core/generators/local-balancer';

export interface BuilderNode {
    id: string;
    label: string;
    address: string;
    protocol: string;
    outbound: any;
    include: boolean;
}

/**
 * Tags that carry no information about *which* node this is — they are what a
 * generated config called its proxies, so when a config of ours is fed back in
 * we fall back to the config's own `remarks` for a label.
 */
const GENERIC_TAG = /^(proxy|out|outbound|node|fb)[-_]?\d*$/i;
const SYNTHETIC_REMARK = /^Imported Node List/i;

const addressOf = (ob: any): string =>
    ob?.settings?.vnext?.[0]?.address ||
    ob?.settings?.servers?.[0]?.address ||
    ob?.settings?.address ||
    ob?.settings?.peers?.[0]?.endpoint ||
    '';

/**
 * State behind the Local Balancer builder.
 *
 * Input is deliberately forgiving — links, a base64 subscription, a JSON
 * subscription, or the outbounds already open in the editor — because the
 * thing people actually have on hand differs every time. Everything after
 * parsing is pure config assembly in core/generators/local-balancer.
 */
export const useLocalBalancerBuilder = () => {
    const config = useConfigStore(state => state.config);
    const loadConfig = useConfigStore(state => state.loadConfig);
    const createProfile = useConfigStore(state => state.createProfile);

    const [input, setInput] = useState('');
    const [nodes, setNodes] = useState<BuilderNode[]>([]);
    const [splitByLocation, setSplitByLocation] = useState(true);
    const [presetKey, setPresetKey] = useState<'simple' | 'fleet' | 'custom'>('simple');
    const [options, setOptions] = useState<LocalBalancerOptions>({
        ...DEFAULT_LOCAL_BALANCER_OPTIONS,
        ...LOCAL_BALANCER_PRESETS.simple!.options,
    });
    const [bypassRussian, setBypassRussian] = useState(true);
    const [bypassLeakChecks, setBypassLeakChecks] = useState(true);
    const [dnsExtraText, setDnsExtraText] = useState('');
    const [previewIndex, setPreviewIndex] = useState(0);

    const addNodes = useCallback((incoming: { outbound: any; label: string }[]) => {
        if (incoming.length === 0) {
            toast.error('No proxy outbounds found in that input');
            return;
        }
        setNodes(prev => {
            const seen = new Set(prev.map(n => JSON.stringify(n.outbound)));
            const fresh = incoming
                .filter(n => !seen.has(JSON.stringify(n.outbound)))
                .map((n, i) => ({
                    id: `node-${Date.now()}-${i}`,
                    label: n.label,
                    address: addressOf(n.outbound),
                    protocol: n.outbound.protocol,
                    outbound: n.outbound,
                    include: true,
                }));
            if (fresh.length < incoming.length) {
                toast.info(`Skipped ${incoming.length - fresh.length} duplicate node(s)`);
            }
            return [...prev, ...fresh];
        });
        setPreviewIndex(0);
    }, []);

    /** Parse whatever is in the textarea: links, base64 sub, or JSON configs. */
    const parseInput = useCallback(() => {
        const text = input.trim();
        if (!text) {
            toast.error('Paste links, a subscription or a JSON config first');
            return;
        }
        try {
            const configs = parseRawSubscriptionText(text);
            const collected: { outbound: any; label: string }[] = [];

            configs.forEach(cfg => {
                const proxies = (cfg?.outbounds || []).filter(isProxyOutbound);
                const remark = cfg?.remarks && !SYNTHETIC_REMARK.test(cfg.remarks) ? String(cfg.remarks).trim() : '';
                proxies.forEach((ob: any, i: number) => {
                    const ownTag = typeof ob.tag === 'string' && !GENERIC_TAG.test(ob.tag) ? ob.tag.trim() : '';
                    const fromRemark = remark
                        ? (proxies.length > 1 ? `${remark} #${i + 1}` : remark)
                        : '';
                    collected.push({ outbound: ob, label: ownTag || fromRemark || `Node ${i + 1}` });
                });
            });

            addNodes(collected);
            if (collected.length > 0) {
                toast.success(`Parsed ${collected.length} node(s)`);
                setInput('');
            }
        } catch (e: any) {
            toast.error('Could not parse that input', { description: e?.message });
        }
    }, [input, addNodes]);

    /** Pull the proxies out of the config already open in the editor. */
    const takeFromCurrentConfig = useCallback(() => {
        const proxies = (config?.outbounds || []).filter(isProxyOutbound);
        addNodes(proxies.map((ob: any, i: number) => ({
            outbound: ob,
            label: typeof ob.tag === 'string' && !GENERIC_TAG.test(ob.tag) ? ob.tag : `Node ${i + 1}`,
        })));
    }, [config, addNodes]);

    const toggleNode = useCallback((id: string) => {
        setNodes(prev => prev.map(n => (n.id === id ? { ...n, include: !n.include } : n)));
    }, []);

    const renameNode = useCallback((id: string, label: string) => {
        setNodes(prev => prev.map(n => (n.id === id ? { ...n, label } : n)));
    }, []);

    const removeNode = useCallback((id: string) => {
        setNodes(prev => prev.filter(n => n.id !== id));
    }, []);

    const clearNodes = useCallback(() => {
        setNodes([]);
        setPreviewIndex(0);
    }, []);

    const applyPreset = useCallback((key: 'simple' | 'fleet') => {
        setPresetKey(key);
        setOptions(prev => ({ ...prev, ...LOCAL_BALANCER_PRESETS[key]!.options }));
    }, []);

    const setOption = useCallback((patch: Partial<LocalBalancerOptions>) => {
        setOptions(prev => ({ ...prev, ...patch }));
        setPresetKey('custom');
    }, []);

    const bypassDomains = useMemo(() => [
        ...(bypassRussian ? RUSSIAN_DOMAINS : []),
        ...(bypassLeakChecks ? LEAK_CHECK_DOMAINS : []),
    ], [bypassRussian, bypassLeakChecks]);

    const dnsExtraDomains = useMemo(
        () => dnsExtraText.split(/[\s,]+/).map(d => d.trim()).filter(Boolean),
        [dnsExtraText]
    );

    const includedNodes = useMemo(() => nodes.filter(n => n.include), [nodes]);

    const groups: LocalBalancerGroup[] = useMemo(() => {
        const asNodes = includedNodes.map(n => ({ outbound: n.outbound, label: n.label }));
        if (asNodes.length === 0) return [];
        if (!splitByLocation) return [{ name: '', nodes: asNodes }];
        return groupNodesByLabel(asNodes);
    }, [includedNodes, splitByLocation]);

    const effectiveOptions = useMemo(
        () => ({ ...options, bypassDomains, dnsExtraDomains }),
        [options, bypassDomains, dnsExtraDomains]
    );

    const { results, error } = useMemo(() => {
        if (groups.length === 0) return { results: [] as BuildResult[], error: null as string | null };
        try {
            return {
                results: groups.map(group => buildLocalBalancerConfig(group.nodes, {
                    ...effectiveOptions,
                    remarks: group.name || undefined,
                })),
                error: null,
            };
        } catch (e: any) {
            return { results: [] as BuildResult[], error: e?.message || 'Could not build a config' };
        }
    }, [groups, effectiveOptions]);

    const preview = results[Math.min(previewIndex, Math.max(results.length - 1, 0))] || null;

    /** One config -> an object; several -> the array a JSON subscription uses. */
    const outputJson = useMemo(() => {
        if (results.length === 0) return '';
        const payload = results.length === 1 ? results[0]!.config : results.map(r => r.config);
        return stringifyJsonc(payload, 2);
    }, [results]);

    const loadIntoEditor = useCallback(() => {
        if (!preview) return;
        const text = stringifyJsonc(preview.config, 2);
        loadConfig(preview.config, `Local balancer (${preview.summary.nodeCount} nodes)`, false, text);
        toast.success('Config loaded into the editor');
    }, [preview, loadConfig]);

    const saveAsProfiles = useCallback(() => {
        if (results.length === 0) return;
        results.forEach((result, i) => {
            const name = result.config.remarks || `Local balancer ${i + 1}`;
            createProfile(name, result.config);
        });
        toast.success(`Created ${results.length} profile(s)`);
    }, [results, createProfile]);

    const download = useCallback(() => {
        if (!outputJson) return;
        const a = document.createElement('a');
        a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(outputJson);
        a.download = results.length === 1 ? 'client-config.json' : 'client-subscription.json';
        a.click();
    }, [outputJson, results.length]);

    const copy = useCallback(async () => {
        if (!outputJson) return;
        try {
            await navigator.clipboard.writeText(outputJson);
            toast.success('Copied to clipboard');
        } catch {
            toast.error('Clipboard is not available here');
        }
    }, [outputJson]);

    return {
        // input
        input, setInput, parseInput, takeFromCurrentConfig,
        hasCurrentOutbounds: (config?.outbounds || []).some(isProxyOutbound),

        // nodes
        nodes, includedNodes, toggleNode, renameNode, removeNode, clearNodes,
        splitByLocation, setSplitByLocation,

        // options
        presetKey, applyPreset, options, setOption,
        bypassRussian, setBypassRussian,
        bypassLeakChecks, setBypassLeakChecks,
        dnsExtraText, setDnsExtraText,

        // output
        groups, results, preview, previewIndex, setPreviewIndex, outputJson, error,
        loadIntoEditor, saveAsProfiles, download, copy,
    };
};
