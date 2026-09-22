import { useState, useMemo, useCallback } from 'react';
import { useConfigStore } from '../store/configStore';
import { getCriticalRuleErrors } from '../core/validators';
import { createDefaultRoutingRule, createDefaultBalancer } from '../utils/protocol-factories';
import { getSnippetRefName } from '../core/snippets';
import { toast } from 'sonner';
import { t } from '../i18n';

export const useRoutingEditor = (onClose: () => void) => {
    const { config, updateSection, reorderRules, updateRoutingRule, updateBalancer } = useConfigStore();
    const snippetLibrary = useConfigStore(state => state.snippetLibrary);

    // Panel snippets shadow same-named local templates: the panel's body is
    // the one Remnawave will actually splice into this config.
    const snippets = useMemo(
        () => [...snippetLibrary.local, ...snippetLibrary.panel],
        [snippetLibrary.local, snippetLibrary.panel]
    );
    // `|| []` mints a new array on every render; memoising it is what makes
    // the memos below it actually memoise.
    const rules = useMemo(() => config?.routing?.rules || [], [config?.routing?.rules]);
    const balancers = useMemo(() => config?.routing?.balancers || [], [config?.routing?.balancers]);
    
    const outboundTags = useMemo(() => (config?.outbounds || []).map((o: any) => o.tag).filter(Boolean), [config?.outbounds]);
    const inboundTags = useMemo(() => (config?.inbounds || []).map((i: any) => i.tag).filter(Boolean), [config?.inbounds]);
    const balancerTags = useMemo(() => balancers.map((b: any) => b.tag).filter(Boolean), [balancers]);

    const [activeTab, setActiveTab] = useState<'rules' | 'balancers'>('rules');
    const [activeRuleIdx, setActiveRuleIdx] = useState<number | null>(null);
    const [activeBalancerIdx, setActiveBalancerIdx] = useState<number | null>(null);
    const [rawMode, setRawMode] = useState(false);
    const [mobileEditMode, setMobileEditMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [balancerSearchQuery, setBalancerSearchQuery] = useState("");

    const brokenRules = useMemo(() => rules
        .map((r: any, i: number) => ({
            idx: i,
            label: r.ruleTag || r.outboundTag || r.balancerTag || `Rule #${i + 1}`,
            errors: getCriticalRuleErrors(r)
        }))
        .filter(r => r.errors.length > 0), [rules]);

    const hasCriticalErrors = brokenRules.length > 0;

    const handleSelectRule = useCallback((originalIdx: number) => {
        setActiveRuleIdx(originalIdx);
        setRawMode(false);
        setMobileEditMode(true);
    }, []);

    const handleClose = useCallback(() => {
        if (hasCriticalErrors) {
            const first = brokenRules[0];
            if (first) {
                setActiveTab('rules');
                handleSelectRule(first.idx);
            }
            return;
        }
        onClose();
    }, [hasCriticalErrors, brokenRules, handleSelectRule, onClose]);

    const filteredRules = useMemo(() => rules
        .map((r: any, originalIndex: number) => ({ ...r, originalIndex }))
        .filter((rule: any) => {
            const q = searchQuery.toLowerCase();
            if (!q) return true;
            return (
                getSnippetRefName(rule)?.toLowerCase().includes(q) ||
                rule.ruleTag?.toLowerCase().includes(q) ||
                rule.outboundTag?.toLowerCase().includes(q) ||
                rule.balancerTag?.toLowerCase().includes(q) ||
                rule.domain?.some((d: string) => d.toLowerCase().includes(q)) ||
                rule.ip?.some((ip: string) => ip.toLowerCase().includes(q)) ||
                rule.inboundTag?.some((tag: string) => tag.toLowerCase().includes(q)) ||
                rule.protocol?.some((p: string) => p.toLowerCase().includes(q))
            );
        }), [rules, searchQuery]);

    const filteredBalancers = useMemo(() => balancers
        .map((b: any, originalIndex: number) => ({ ...b, originalIndex }))
        .filter((balancer: any) => {
            const q = balancerSearchQuery.toLowerCase();
            if (!q) return true;
            return (
                getSnippetRefName(balancer)?.toLowerCase().includes(q) ||
                balancer.tag?.toLowerCase().includes(q) ||
                balancer.strategy?.type?.toLowerCase().includes(q) ||
                balancer.selector?.some((s: string) => s.toLowerCase().includes(q))
            );
        }), [balancers, balancerSearchQuery]);

    const handleAddRule = useCallback(() => {
        const newRule = createDefaultRoutingRule();
        reorderRules([newRule, ...rules]);
        handleSelectRule(0);
    }, [reorderRules, rules, handleSelectRule]);

    const handleDeleteRule = useCallback((originalIdx: number) => {
        const n = [...rules];
        n.splice(originalIdx, 1);
        reorderRules(n);
        if (activeRuleIdx === originalIdx) {
            setActiveRuleIdx(null);
            setMobileEditMode(false);
        }
    }, [rules, reorderRules, activeRuleIdx]);

    const handleUpdateRule = useCallback((updatedRule: any, rawText?: string | null) => {
        if (activeRuleIdx === null) return;
        const cleanRule = { ...updatedRule };
        delete cleanRule.originalIndex;
        updateRoutingRule(activeRuleIdx, cleanRule, rawText);
    }, [activeRuleIdx, updateRoutingRule]);

    /**
     * Replace a snippet reference with a copy of its contents.
     *
     * Deliberately explicit and confirmed in the UI: the copy no longer
     * tracks the panel's snippet, so a later change there stops reaching
     * this profile.
     */
    const handleInlineSnippet = useCallback((name: string) => {
        if (activeRuleIdx === null) return;
        const def = snippets.find(d => d.name === name);
        if (!def || !Array.isArray(def.snippet) || def.snippet.length === 0) {
            toast.error(`Snippet "${name}" has no loaded body to inline`);
            return;
        }
        const entries = JSON.parse(JSON.stringify(def.snippet));
        const next = [...rules];
        next.splice(activeRuleIdx, 1, ...entries);
        reorderRules(next);
        setActiveRuleIdx(null);
        setMobileEditMode(false);
        toast.success(`Inlined ${entries.length} rule(s) from "${name}"`, {
            description: t("This copy no longer follows the panel snippet."),
        });
    }, [activeRuleIdx, snippets, rules, reorderRules]);

    /** Same as handleInlineSnippet, for a reference in the balancers array. */
    const handleInlineBalancerSnippet = useCallback((name: string) => {
        if (activeBalancerIdx === null) return;
        const def = snippets.find(d => d.name === name);
        if (!def || !Array.isArray(def.snippet) || def.snippet.length === 0) {
            toast.error(`Snippet "${name}" has no loaded body to inline`);
            return;
        }
        const entries = JSON.parse(JSON.stringify(def.snippet));
        const next = [...balancers];
        next.splice(activeBalancerIdx, 1, ...entries);
        updateSection('routing', { ...config?.routing, balancers: next });
        setActiveBalancerIdx(null);
        setMobileEditMode(false);
        toast.success(`Inlined ${entries.length} balancer(s) from "${name}"`, {
            description: t("This copy no longer follows the panel snippet."),
        });
    }, [activeBalancerIdx, snippets, balancers, config?.routing, updateSection]);

    const handleAddBalancer = useCallback(() => {
        const nb = createDefaultBalancer();
        updateSection('routing', { ...config?.routing, balancers: [...balancers, nb] });
    }, [config?.routing, balancers, updateSection]);

    const handleUpdateBalancer = useCallback((val: any, rawText?: string | null) => {
        if (activeBalancerIdx === null) return;
        updateBalancer(activeBalancerIdx, val, rawText);
    }, [activeBalancerIdx, updateBalancer]);

    const handleDeleteBalancer = useCallback((idx: number) => {
        const n = [...balancers];
        n.splice(idx, 1);
        updateSection('routing', { ...config?.routing, balancers: n });
        if (activeBalancerIdx === idx) {
            setActiveBalancerIdx(null);
            setMobileEditMode(false);
        }
    }, [balancers, activeBalancerIdx, config?.routing, updateSection]);

    return {
        rules,
        balancers,
        outboundTags,
        inboundTags,
        balancerTags,
        activeTab,
        setActiveTab,
        activeRuleIdx,
        activeBalancerIdx,
        setActiveBalancerIdx,
        rawMode,
        setRawMode,
        mobileEditMode,
        setMobileEditMode,
        searchQuery,
        setSearchQuery,
        balancerSearchQuery,
        setBalancerSearchQuery,
        brokenRules,
        hasCriticalErrors,
        handleClose,
        filteredRules,
        filteredBalancers,
        handleSelectRule,
        handleAddRule,
        handleDeleteRule,
        handleUpdateRule,
        snippets,
        handleInlineSnippet,
        handleInlineBalancerSnippet,
        handleAddBalancer,
        handleUpdateBalancer,
        handleDeleteBalancer
    };
};
