import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useConfigStore } from '../store/configStore';
import { parseRawSubscriptionText } from '../utils/link-parser';
import { stringifyJsonc } from '../utils/jsonc';
import { RUSSIAN_DOMAINS, LEAK_CHECK_DOMAINS } from '../core/presets/bypass-domains';
import { buildClientOutbound, clientOutboundBlocker } from '../core/generators/client-outbound';
import {
    buildLocalBalancerConfig,
    buildLocalBalancerTemplate,
    parseLocalBalancer,
    DEFAULT_INJECT_OPTIONS,
    groupNodesByLabel,
    isProxyOutbound,
    LOCAL_BALANCER_PRESETS,
    DEFAULT_LOCAL_BALANCER_OPTIONS,
    type BuildResult,
    type InjectOptions,
    type LocalBalancerGroup,
    type LocalBalancerOptions,
} from '../core/generators/local-balancer';

/** One row of the panel's host list, with the reason it cannot be used. */
export interface PanelHostRow {
    uuid: string;
    remark: string;
    address: string;
    port: number;
    profileName: string;
    inboundTag: string;
    protocol: string;
    network: string;
    security: string;
    disabled: boolean;
    /** null when this host can be mirrored into a client outbound. */
    blocker: string | null;
}

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
/** The first client id already present in a config, to prefill the UUID field. */
const firstUserIdIn = (config: any): string => {
    for (const ob of config?.outbounds || []) {
        const id = ob?.settings?.vnext?.[0]?.users?.[0]?.id;
        if (typeof id === 'string' && id.length >= 32) return id;
    }
    return '';
};

export const useLocalBalancerBuilder = () => {
    const config = useConfigStore(state => state.config);
    const loadConfig = useConfigStore(state => state.loadConfig);
    const createProfile = useConfigStore(state => state.createProfile);
    const panelCatalog = useConfigStore(state => state.panelCatalog);
    const fetchPanelCatalog = useConfigStore(state => state.fetchPanelCatalog);
    const remnawaveConnected = useConfigStore(state => state.remnawave.connected);
    const panelTemplates = useConfigStore(state => state.panelTemplates);
    const fetchSubscriptionTemplates = useConfigStore(state => state.fetchSubscriptionTemplates);
    const saveSubscriptionTemplate = useConfigStore(state => state.saveSubscriptionTemplate);
    const loadSubscriptionTemplate = useConfigStore(state => state.loadSubscriptionTemplate);
    const createPanelHost = useConfigStore(state => state.createPanelHost);
    const updatePanelHosts = useConfigStore(state => state.updatePanelHosts);

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
    /** Bypass entries that belong to neither preset list — kept so loading an
     *  existing balancer never silently drops someone's own domains. */
    const [bypassCustom, setBypassCustom] = useState<string[]>([]);
    const [dnsExtraText, setDnsExtraText] = useState('');
    const [previewIndex, setPreviewIndex] = useState(0);
    const [source, setSource] = useState<'paste' | 'panel'>('paste');
    const [panelUserId, setPanelUserId] = useState(() => firstUserIdIn(config));
    const [panelSearch, setPanelSearch] = useState('');
    const [panelSelection, setPanelSelection] = useState<Set<string>>(new Set());

    // Output mode: a finished client config, or the template the panel renders
    // per subscriber with its own hosts injected into it.
    const [outputMode, setOutputMode] = useState<'config' | 'template'>('config');
    const [inject, setInject] = useState<InjectOptions>(DEFAULT_INJECT_OPTIONS);
    const [templateName, setTemplateName] = useState('');
    const [templateTargetUuid, setTemplateTargetUuid] = useState('');

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

    /**
     * The panel's hosts, each paired with the inbound it points at and the
     * reason (if any) it cannot become a client outbound. Rows that cannot be
     * used are kept and explained rather than hidden — "why is my node
     * missing" is the question this list exists to answer.
     */
    const panelRows: PanelHostRow[] = useMemo(() => {
        return (panelCatalog.hosts || []).map((host: any) => {
            const entry = panelCatalog.inbounds[host?.inbound?.configProfileInboundUuid];
            const raw = entry?.rawInbound;
            const stream = raw?.streamSettings || {};
            return {
                uuid: host.uuid,
                remark: host.remark || host.address || 'host',
                address: host.address,
                port: host.port,
                profileName: entry?.profileName || '',
                inboundTag: entry?.tag || raw?.tag || '',
                protocol: raw?.protocol || '',
                network: stream.network || '',
                security: (host.securityLayer && host.securityLayer !== 'DEFAULT')
                    ? String(host.securityLayer).toLowerCase()
                    : (stream.security || 'none'),
                disabled: !!host.isDisabled,
                blocker: clientOutboundBlocker(host, raw),
            };
        });
    }, [panelCatalog.hosts, panelCatalog.inbounds]);

    const filteredPanelRows = useMemo(() => {
        const q = panelSearch.trim().toLowerCase();
        if (!q) return panelRows;
        return panelRows.filter(r =>
            r.remark.toLowerCase().includes(q) ||
            r.address.toLowerCase().includes(q) ||
            r.profileName.toLowerCase().includes(q) ||
            r.inboundTag.toLowerCase().includes(q)
        );
    }, [panelRows, panelSearch]);

    const togglePanelHost = useCallback((uuid: string) => {
        setPanelSelection(prev => {
            const next = new Set(prev);
            if (next.has(uuid)) next.delete(uuid);
            else next.add(uuid);
            return next;
        });
    }, []);

    const selectAllPanel = useCallback(() => {
        setPanelSelection(new Set(filteredPanelRows.filter(r => !r.blocker && !r.disabled).map(r => r.uuid)));
    }, [filteredPanelRows]);

    const clearPanelSelection = useCallback(() => setPanelSelection(new Set()), []);

    /**
     * Mirror the selected hosts into client outbounds and add them as nodes.
     * The user id is the one thing the panel cannot supply here — it belongs
     * to a specific subscriber — so it is required rather than invented.
     */
    const addSelectedFromPanel = useCallback(() => {
        const id = panelUserId.trim();
        if (!id) {
            toast.error('Enter the client UUID first', {
                description: 'It is the id from that user\'s vless:// link in the panel.',
            });
            return;
        }
        if (panelSelection.size === 0) {
            toast.error('Select at least one host');
            return;
        }

        const collected: { outbound: any; label: string }[] = [];
        const allNotes = new Set<string>();
        const failures: string[] = [];

        panelSelection.forEach(uuid => {
            const host = (panelCatalog.hosts || []).find((h: any) => h.uuid === uuid);
            if (!host) return;
            const raw = panelCatalog.inbounds[host?.inbound?.configProfileInboundUuid]?.rawInbound;
            try {
                const { outbound, notes } = buildClientOutbound({
                    host,
                    inbound: raw,
                    userId: id,
                    tag: host.remark || host.address,
                });
                notes.forEach(n => allNotes.add(n));
                collected.push({ outbound, label: host.remark || host.address });
            } catch (e: any) {
                failures.push(`${host.remark || host.address}: ${e?.message || 'could not be mirrored'}`);
            }
        });

        addNodes(collected);
        if (collected.length > 0) {
            toast.success(`Added ${collected.length} node(s) from the panel`, {
                description: allNotes.size > 0 ? [...allNotes][0] : undefined,
            });
            setPanelSelection(new Set());
        }
        if (failures.length > 0) {
            toast.warning(`${failures.length} host(s) skipped`, { description: failures[0] });
        }
    }, [panelUserId, panelSelection, panelCatalog, addNodes]);

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
        ...bypassCustom,
    ], [bypassRussian, bypassLeakChecks, bypassCustom]);

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

    const template = useMemo(
        () => buildLocalBalancerTemplate(effectiveOptions, inject),
        [effectiveOptions, inject]
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
        if (outputMode === 'template') return stringifyJsonc(template, 2);
        if (results.length === 0) return '';
        const payload = results.length === 1 ? results[0]!.config : results.map(r => r.config);
        return stringifyJsonc(payload, 2);
    }, [outputMode, template, results]);

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

    /** The selector shape the panel expects, filled from the chosen source. */
    const setInjectSelector = useCallback((type: InjectOptions['selector']['type']) => {
        setInject(prev => {
            if (type === 'sameTagAsRecipient') return { ...prev, selector: { type } };
            if (type === 'uuids') return { ...prev, selector: { type, values: [] } };
            const pattern = 'pattern' in prev.selector ? prev.selector.pattern : '';
            return { ...prev, selector: { type, pattern } };
        });
    }, []);

    const setInjectPattern = useCallback((pattern: string) => {
        setInject(prev => ('pattern' in prev.selector
            ? { ...prev, selector: { ...prev.selector, pattern } }
            : prev));
    }, []);

    /** Point the injector at exactly the hosts ticked in the panel picker. */
    const useSelectedHostsAsSelector = useCallback(() => {
        const values = [...panelSelection];
        if (values.length === 0) {
            toast.error('Select hosts in the panel list first');
            return;
        }
        setInject(prev => ({ ...prev, selector: { type: 'uuids', values }, selectFrom: 'ALL' }));
        toast.success(`Injector points at ${values.length} host(s)`);
    }, [panelSelection]);

    /**
     * Apply a parsed balancer to the builder's controls. The bypass list is
     * split back into the two preset toggles plus whatever else it contained,
     * so a list this app did not write survives a load/save round trip.
     */
    const applyParsed = useCallback((parsed: ReturnType<typeof parseLocalBalancer>) => {
        const domains = parsed.options.bypassDomains || [];
        const hasAll = (list: string[]) => list.length > 0 && list.every(d => domains.includes(d));
        const ru = hasAll(RUSSIAN_DOMAINS);
        const leak = hasAll(LEAK_CHECK_DOMAINS);
        const known = new Set([
            ...(ru ? RUSSIAN_DOMAINS : []),
            ...(leak ? LEAK_CHECK_DOMAINS : []),
        ]);

        setBypassRussian(ru);
        setBypassLeakChecks(leak);
        setBypassCustom(domains.filter(d => !known.has(d)));
        setDnsExtraText((parsed.options.dnsExtraDomains || []).join(', '));
        setOptions(prev => ({ ...prev, ...parsed.options }));
        if (parsed.inject) setInject(parsed.inject);
        setPresetKey('custom');

        if (parsed.notes.length > 0) {
            toast.warning('Loaded with caveats', { description: parsed.notes[0], duration: 8000 });
        }
    }, []);

    /** Open an existing panel template in the builder for editing. */
    const loadTemplateIntoBuilder = useCallback(async (uuid: string) => {
        if (!uuid) return;
        const full = await loadSubscriptionTemplate(uuid);
        const body = full?.templateJson;
        if (!body) {
            toast.error('That template has no JSON body yet');
            return;
        }
        try {
            applyParsed(parseLocalBalancer(body));
            setOutputMode('template');
            setTemplateTargetUuid(uuid);
            setTemplateName(full.name || '');
            toast.success(`Loaded "${full.name}" into the builder`);
        } catch (e: any) {
            toast.error('Could not read that template', { description: e?.message });
        }
    }, [loadSubscriptionTemplate, applyParsed]);

    /** Read the config currently open in the editor back into the controls. */
    const loadFromCurrentConfig = useCallback(() => {
        if (!config) {
            toast.error('No config open in the editor');
            return;
        }
        try {
            const parsed = parseLocalBalancer(config);
            applyParsed(parsed);
            setOutputMode(parsed.kind === 'template' ? 'template' : 'config');
            toast.success('Loaded the open config into the builder');
        } catch (e: any) {
            toast.error('Could not read the open config', { description: e?.message });
        }
    }, [config, applyParsed]);

    const saveTemplate = useCallback(async () => {
        const name = templateName.trim();
        if (!templateTargetUuid && !name) {
            toast.error('Name the new template, or pick an existing one to update');
            return;
        }
        await saveSubscriptionTemplate(
            templateTargetUuid
                ? { mode: 'update', uuid: templateTargetUuid, templateJson: template }
                : { mode: 'create', name, templateJson: template }
        );
    }, [templateName, templateTargetUuid, template, saveSubscriptionTemplate]);

    // --- Publishing hosts -------------------------------------------------
    // A generated template only reaches subscribers once hosts point at it:
    // the nodes become hidden hosts sharing one tag, and one visible host
    // carries that same tag plus the template. These actions do exactly that
    // and nothing implicit — each is a button.

    const [poolTag, setPoolTag] = useState('');
    const [entryRemark, setEntryRemark] = useState('');
    const [entryAddress, setEntryAddress] = useState('');
    const [entryPort, setEntryPort] = useState<number | undefined>(443);
    const [entryInboundUuid, setEntryInboundUuid] = useState('');

    /** Inbounds the panel knows about, for choosing what an entry host binds to. */
    const panelInboundOptions = useMemo(() => Object.values(panelCatalog.inbounds).map((entry: any) => ({
        uuid: entry.uuid,
        profileUuid: entry.profileUuid,
        label: `${entry.profileName} · ${entry.tag}`,
    })), [panelCatalog.inbounds]);

    const normalisedPoolTag = useMemo(
        // Panel tags are uppercase letters, digits, underscores and colons.
        () => poolTag.trim().toUpperCase().replace(/[^A-Z0-9_:]/g, ''),
        [poolTag]
    );

    /** Mark the ticked hosts as the hidden pool behind one tag. */
    const tagSelectedHostsAsPool = useCallback(async () => {
        if (!normalisedPoolTag) {
            toast.error('Enter a pool tag first');
            return;
        }
        if (panelSelection.size === 0) {
            toast.error('Select the hosts that should form the pool');
            return;
        }
        await updatePanelHosts([...panelSelection].map(uuid => ({
            uuid,
            isHidden: true,
            tag: normalisedPoolTag,
            tags: [normalisedPoolTag],
        })));
    }, [normalisedPoolTag, panelSelection, updatePanelHosts]);

    /** Create the visible host that hands the template to subscribers. */
    const createEntryHost = useCallback(async () => {
        if (!normalisedPoolTag) {
            toast.error('Enter the pool tag — the entry host must share it with the nodes');
            return;
        }
        if (!entryRemark.trim() || !entryAddress.trim() || !entryPort) {
            toast.error('Fill in the remark, address and port');
            return;
        }
        if (!entryInboundUuid) {
            toast.error('Pick the inbound this host binds to');
            return;
        }
        if (!templateTargetUuid) {
            toast.error('Save or pick the template first', {
                description: 'The entry host needs a template to point at.',
            });
            return;
        }
        const inbound = panelInboundOptions.find(i => i.uuid === entryInboundUuid);
        if (!inbound?.profileUuid) {
            toast.error('That inbound has no config profile attached');
            return;
        }

        await createPanelHost({
            inbound: { configProfileUuid: inbound.profileUuid, configProfileInboundUuid: inbound.uuid },
            remark: entryRemark.trim(),
            address: entryAddress.trim(),
            port: entryPort,
            isHidden: false,
            tag: normalisedPoolTag,
            tags: [normalisedPoolTag],
            xrayJsonTemplateUuid: templateTargetUuid,
        });
    }, [normalisedPoolTag, entryRemark, entryAddress, entryPort, entryInboundUuid, templateTargetUuid, panelInboundOptions, createPanelHost]);

    const download = useCallback(() => {
        if (!outputJson) return;
        const a = document.createElement('a');
        a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(outputJson);
        a.download = outputMode === 'template'
            ? 'xray-json-template.json'
            : (results.length === 1 ? 'client-config.json' : 'client-subscription.json');
        a.click();
    }, [outputJson, outputMode, results.length]);

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
        source, setSource,
        input, setInput, parseInput, takeFromCurrentConfig,
        hasCurrentOutbounds: (config?.outbounds || []).some(isProxyOutbound),

        // panel source
        panelConnected: remnawaveConnected,
        panelLoading: panelCatalog.loading,
        panelError: panelCatalog.error,
        panelFetchedAt: panelCatalog.fetchedAt,
        panelRows, filteredPanelRows,
        panelSearch, setPanelSearch,
        panelSelection, togglePanelHost, selectAllPanel, clearPanelSelection,
        panelUserId, setPanelUserId,
        loadPanelHosts: fetchPanelCatalog,
        addSelectedFromPanel,

        // nodes
        nodes, includedNodes, toggleNode, renameNode, removeNode, clearNodes,
        splitByLocation, setSplitByLocation,

        // options
        presetKey, applyPreset, options, setOption,
        bypassRussian, setBypassRussian,
        bypassLeakChecks, setBypassLeakChecks,
        dnsExtraText, setDnsExtraText,

        // loading an existing balancer
        loadTemplateIntoBuilder, loadFromCurrentConfig,
        bypassCustom,

        // publishing hosts
        poolTag, setPoolTag, normalisedPoolTag,
        entryRemark, setEntryRemark,
        entryAddress, setEntryAddress,
        entryPort, setEntryPort,
        entryInboundUuid, setEntryInboundUuid,
        panelInboundOptions,
        tagSelectedHostsAsPool, createEntryHost,

        // template mode
        outputMode, setOutputMode,
        inject, setInject, setInjectSelector, setInjectPattern, useSelectedHostsAsSelector,
        template, templateName, setTemplateName,
        templateTargetUuid, setTemplateTargetUuid,
        panelTemplateItems: panelTemplates.items,
        panelTemplatesLoading: panelTemplates.loading,
        loadPanelTemplates: fetchSubscriptionTemplates,
        saveTemplate,

        // output
        groups, results, preview, previewIndex, setPreviewIndex, outputJson, error,
        loadIntoEditor, saveAsProfiles, download, copy,
    };
};
