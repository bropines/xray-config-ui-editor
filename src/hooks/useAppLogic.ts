import { useState, useEffect, useCallback, useMemo } from 'react';
import { parseJsonc } from '../utils/jsonc';
import { useConfigStore, type XrayConfig } from '../store/configStore';
import { runFullDiagnostics } from '../core/diagnostics';
import { parseJsonSubscription } from '../utils/link-parser';
import { toast } from 'sonner';

export const useAppLogic = () => {
    const {
        config,
        setConfig,
        loadConfig,
        deleteItem,
        deleteItems,
        moveItem,
        updateItem,
        addItem,
        addOutbounds,
        updateSection,
        remnawave,
        saveToRemnawave,
        disconnectRemnawave,
        initDns,
        hasHydrated
    } = useConfigStore();

    // Modal states
    const [modal, setModal] = useState<{ type: string | null, data: any, index: number | null }>({ type: null, data: null, index: null });
    const [sectionModal, setSectionModal] = useState<{ open: boolean, title: string, section: string, data: any, schemaMode: any }>({
        open: false, title: "", section: "", data: null, schemaMode: "full"
    });
    const [remnawaveModalOpen, setRemnawaveModalOpen] = useState(false);
    const [batchModalOpen, setBatchModalOpen] = useState(false);
    const [geoViewerOpen, setGeoViewerOpen] = useState(false);
    const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
    const [aboutOpen, setAboutOpen] = useState(false);
    const [warpModalOpen, setWarpModalOpen] = useState(false);
    const [configInspectorOpen, setConfigInspectorOpen] = useState(false);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [editorSettingsOpen, setEditorSettingsOpen] = useState(false);
    
    // UI states
    const [rawMode, setRawMode] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [obSearch, setObSearch] = useState("");
    const [pushStage, setPushStage] = useState<'idle' | 'confirm'>('idle');

    // Auto-fetch Remnawave cloud profiles on startup / connection state load
    useEffect(() => {
        if (remnawave.connected && remnawave.url && remnawave.token) {
            useConfigStore.getState().fetchRemnawaveProfiles().catch(() => {});
        }
    }, [remnawave.connected, remnawave.url, remnawave.token]);

    useEffect(() => {
        if (pushStage === 'confirm') {
            const timer = setTimeout(() => setPushStage('idle'), 3000);
            return () => clearTimeout(timer);
        }
    }, [pushStage]);

    // Global Ctrl+S (Memory Save & UI Sync) and Ctrl+Shift+S (Git Commit)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                e.stopPropagation();
                const store = useConfigStore.getState();
                if (!store.config) return;

                if (e.shiftKey) {
                    // Ctrl + Shift + S -> Git Commit
                    console.log('[Hotkeys] Ctrl+Shift+S -> Creating Git Commit...');
                    store.saveActiveProfile();
                    const snapshot = store.recordSnapshot("Manual Commit (Ctrl+Shift+S)");
                    if (snapshot) {
                        toast.success(`✓ Git Commit: ${snapshot.id.substring(0, 7)} (+${snapshot.additions} -${snapshot.deletions})`, { id: 'global-commit-toast' });
                    } else {
                        toast.info("Already at HEAD (no changes to commit)", { id: 'global-commit-toast' });
                    }
                } else {
                    // Ctrl + S -> Instant Memory Save & UI Sync
                    console.log('[Hotkeys] Ctrl+S -> Syncing memory & UI...');
                    store.saveActiveProfile();
                    toast.success("✓ Saved to memory & UI updated", { id: 'global-save-toast' });
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, []);

    const handleRealPush = useCallback(() => {
        // Auto-commit before pushing to Remnawave
        const store = useConfigStore.getState();
        if (store.config) {
            const inbounds = store.config.inbounds?.length || 0;
            const outbounds = store.config.outbounds?.length || 0;
            const rules = store.config.routing?.rules?.length || 0;
            store.recordSnapshot(`Push to Remnawave (${inbounds} in, ${outbounds} out, ${rules} rules)`);
            store.saveActiveProfile();
        }
        saveToRemnawave();
        setPushStage('idle');
    }, [saveToRemnawave]);

    const loadFile = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            try {
                const result = e.target?.result;
                if (typeof result === 'string') {
                    const parsed = parseJsonc(result);
                    
                    if (Array.isArray(parsed)) {
                        // Это JSON-подписка (массив конфигов)
                        const obs = parseJsonSubscription(result);
                        if (obs.length > 0) {
                            addOutbounds(obs);
                            toast.success(`Imported ${obs.length} nodes from JSON file`);
                        } else {
                            toast.error("JSON array detected, but no valid outbounds found");
                        }
                    } else {
                        // Это обычный конфиг (объект)
                        loadConfig(parsed, undefined, false, result);
                        toast.success("Configuration loaded from file");
                    }
                    setRawMode(false);
                }
            } catch { toast.error("Invalid JSON file"); }
        };
        reader.readAsText(file);
    }, [loadConfig, addOutbounds]);

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) loadFile(e.target.files[0]);
    }, [loadFile]);

    const downloadConfig = useCallback(() => {
        const { config, rawConfigText } = useConfigStore.getState();
        let contentToDownload = rawConfigText;
        if (contentToDownload) {
            try {
                const parsed = parseJsonc(contentToDownload);
                if (JSON.stringify(parsed) !== JSON.stringify(config)) {
                    contentToDownload = JSON.stringify(config, null, 2);
                }
            } catch {
                contentToDownload = JSON.stringify(config, null, 2);
            }
        } else {
            contentToDownload = JSON.stringify(config, null, 2);
        }
        const a = document.createElement('a');
        a.href = "data:text/json;charset=utf-8," + encodeURIComponent(contentToDownload);
        a.download = "config.json";
        a.click();
    }, [config]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (e.relatedTarget === null || !e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
    }, [loadFile]);

    const handleSaveModal = useCallback((data: any, rawText?: string | null) => {
        const { type, index } = modal;
        if (type === 'inbound') {
            if (index !== null) updateItem('inbounds', index, data, rawText); else addItem('inbounds', data);
        }
        if (type === 'outbound') {
            if (index !== null) updateItem('outbounds', index, data, rawText); else addItem('outbounds', data);
        }
        setModal({ type: null, data: null, index: null });
    }, [modal, updateItem, addItem]);

    const handleSaveSection = useCallback((newData: any, rawText?: string) => {
        updateSection(sectionModal.section as any, newData, rawText);
        setSectionModal(prev => ({ ...prev, open: false }));
    }, [sectionModal.section, updateSection]);

    const openSectionJson = useCallback((section: string, title: string, explicitData?: any) => {
        const modeMap: Record<string, string> = { inbounds: 'inbounds', outbounds: 'outbounds', routing: 'routing', dns: 'dns', reverse: 'reverse' };
        setSectionModal({
            open: true, title: title + " (JSON)", section,
            data: explicitData !== undefined ? explicitData : (config ? config[section as keyof typeof config] : (section === 'inbounds' || section === 'outbounds' ? [] : {})),
            schemaMode: modeMap[section] || 'full'
        });
    }, [config]);

    const diagnostics = useMemo(() => runFullDiagnostics(config), [config]);
    const criticalCount = useMemo(() => diagnostics.filter(d => d.severity === 'critical').length, [diagnostics]);
    const warningCount = useMemo(() => diagnostics.filter(d => d.severity === 'warning').length, [diagnostics]);

    const filteredOutbounds = useMemo(() => {
        return (config?.outbounds || [])
            .map((ob: any, originalIndex: number) => ({ ob, originalIndex }))
            .filter(({ ob }) => {
                const q = obSearch.toLowerCase();
                if (!q) return true;
                const s = ob.settings || {};
                const vnext = s.vnext?.[0] || {};
                const server = s.servers?.[0] || s;
                return (
                    String(ob.tag || "").toLowerCase().includes(q) ||
                    String(ob.protocol || "").toLowerCase().includes(q) ||
                    String(vnext.address || server.address || "").toLowerCase().includes(q) ||
                    String(vnext.users?.[0]?.id || server.password || server.id || "").toLowerCase().includes(q)
                );
            });
    }, [config?.outbounds, obSearch]);

    return {
        config, setConfig, deleteItem, deleteItems, addItem, remnawave, disconnectRemnawave, initDns,
        hasHydrated,
        modal, setModal,
        sectionModal, setSectionModal,
        remnawaveModalOpen, setRemnawaveModalOpen,
        batchModalOpen, setBatchModalOpen,
        geoViewerOpen, setGeoViewerOpen,
        diagnosticsOpen, setDiagnosticsOpen,
        aboutOpen, setAboutOpen,
        warpModalOpen, setWarpModalOpen,
        configInspectorOpen, setConfigInspectorOpen,
        historyModalOpen, setHistoryModalOpen,
        onOpenHistory: () => setHistoryModalOpen(true),
        onCloseHistory: () => setHistoryModalOpen(false),
        editorSettingsOpen, setEditorSettingsOpen,
        onOpenEditorSettings: () => setEditorSettingsOpen(true),
        onCloseEditorSettings: () => setEditorSettingsOpen(false),
        rawMode, setRawMode,
        isDragging,
        obSearch, setObSearch,
        pushStage, setPushStage,
        handleRealPush,
        handleFileUpload,
        downloadConfig,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleSaveModal,
        handleSaveSection,
        openSectionJson,
        diagnostics,
        criticalCount,
        warningCount,
        filteredOutbounds,
        moveItem
    };
};
