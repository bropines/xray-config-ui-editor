import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useConfigStore } from '../store/configStore';
import { parseRawSubscriptionText } from '../utils/link-parser';
import { generateUUID } from '../core/generators/crypto';

/**
 * All the state, localStorage persistence, and multi-step handlers behind
 * ConfigInspectorModal.tsx: subscription fetching (with Remnawave HWID/UA
 * emulation headers), raw-payload beautify/parse, and the harvest/import
 * actions that push parsed inbounds/outbounds/routing items into the store
 * or open them in a GUI editor. Extracted so the component is left as pure
 * JSX composition — rewriting its layout doesn't risk touching this logic.
 */

const HWID_STORAGE_KEY = 'xray_editor_v2_hwid';
const OS_STORAGE_KEY = 'xray_editor_v2_device_os';
const VER_STORAGE_KEY = 'xray_editor_v2_ver_os';
const MODEL_STORAGE_KEY = 'xray_editor_v2_device_model';

const autoDetectSystemParams = () => {
    const ua = navigator.userAgent;
    let os = "Windows";
    let ver = "10.0.26220";
    let model = "PC";

    if (/Windows/i.test(ua)) {
        os = "Windows";
        const match = ua.match(/Windows NT ([\d.]+)/);
        ver = match ? match[1] : "10.0";
        model = "Windows PC";
    } else if (/Macintosh|Mac OS X/i.test(ua)) {
        os = "macOS";
        const match = ua.match(/Mac OS X ([\d_]+)/);
        ver = match ? match[1].replace(/_/g, '.') : "14.0";
        model = "Macintosh";
    } else if (/Android/i.test(ua)) {
        os = "Android";
        const match = ua.match(/Android ([\d.]+)/);
        ver = match ? match[1] : "14";
        model = "Android Device";
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
        os = "iOS";
        const match = ua.match(/OS ([\d_]+)/);
        ver = match ? match[1].replace(/_/g, '.') : "18.3";
        model = "iPhone";
    }
    return { os, ver, model };
};

export function useConfigInspector(setModal: (m: any) => void) {
    const { config: currentConfig, addOutbounds, updateSection, addItem } = useConfigStore();

    const [inputText, setInputText] = useState("");
    const [subUrl, setSubUrl] = useState("");
    const [selectedUa, setSelectedUa] = useState("Happ/1.0.0");
    const [customUa, setCustomUa] = useState("");
    const [showHwidSettings, setShowHwidSettings] = useState(false);

    // Remnawave system parameters (persisted to localStorage across sessions)
    const [hwid, setHwid] = useState(() => {
        const saved = localStorage.getItem(HWID_STORAGE_KEY);
        if (saved) return saved;
        const newId = generateUUID();
        localStorage.setItem(HWID_STORAGE_KEY, newId);
        return newId;
    });
    const [deviceOs, setDeviceOs] = useState(() => localStorage.getItem(OS_STORAGE_KEY) || "Windows");
    const [verOs, setVerOs] = useState(() => localStorage.getItem(VER_STORAGE_KEY) || "10.0.26220");
    const [deviceModel, setDeviceModel] = useState(() => localStorage.getItem(MODEL_STORAGE_KEY) || "MS-7E06/PRO Z790-P WIFI");

    const [isFetching, setIsFetching] = useState(false);
    const [parsedConfigs, setParsedConfigs] = useState<any[] | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const effectiveUa = selectedUa === "custom" ? customUa.trim() || "Happ/1.0.0" : selectedUa;

    const handleHwidChange = (value: string) => {
        setHwid(value);
        localStorage.setItem(HWID_STORAGE_KEY, value);
    };
    const handleDeviceOsChange = (value: string) => {
        setDeviceOs(value);
        localStorage.setItem(OS_STORAGE_KEY, value);
    };
    const handleVerOsChange = (value: string) => {
        setVerOs(value);
        localStorage.setItem(VER_STORAGE_KEY, value);
    };
    const handleDeviceModelChange = (value: string) => {
        setDeviceModel(value);
        localStorage.setItem(MODEL_STORAGE_KEY, value);
    };

    const handleGenerateNewHwid = () => {
        const newId = generateUUID();
        setHwid(newId);
        localStorage.setItem(HWID_STORAGE_KEY, newId);
        toast.info("Generated new HWID", { description: newId });
    };

    const handleAutoDetect = () => {
        const detected = autoDetectSystemParams();
        setDeviceOs(detected.os);
        setVerOs(detected.ver);
        setDeviceModel(detected.model);
        localStorage.setItem(OS_STORAGE_KEY, detected.os);
        localStorage.setItem(VER_STORAGE_KEY, detected.ver);
        localStorage.setItem(MODEL_STORAGE_KEY, detected.model);
        toast.success("Detected system parameters", { description: `${detected.os} ${detected.ver} • ${detected.model}` });
    };

    const handleFetchSub = async () => {
        if (!subUrl.trim()) return;
        setIsFetching(true);
        try {
            const targetUrl = subUrl.trim();
            const proxyUrl = `https://crs.bropines.workers.dev/${targetUrl}`;

            const headers: Record<string, string> = {
                "x-custom-user-agent": effectiveUa,
                "User-Agent": effectiveUa,
                "x-hwid": hwid.trim(),
                "x-custom-x-hwid": hwid.trim(),
                "x-device-os": deviceOs.trim(),
                "x-custom-x-device-os": deviceOs.trim(),
                "x-ver-os": verOs.trim(),
                "x-custom-x-ver-os": verOs.trim(),
                "x-device-model": deviceModel.trim(),
                "x-custom-x-device-model": deviceModel.trim(),
                "x-app-version": "1.0.0",
                "x-custom-x-app-version": "1.0.0"
            };

            const response = await fetch(proxyUrl, { headers });
            if (!response.ok) {
                if (response.status === 403 || response.status === 429) {
                    if (response.headers.get('x-hwid-max-devices-reached') === 'true' || response.headers.get('x-hwid-limit') === 'true') {
                        throw new Error("Remnawave HWID device limit reached. Try using the HWID from your already active client (e.g. Throne).");
                    }
                }
                throw new Error(`HTTP ${response.status}`);
            }

            const rawText = await response.text();
            let decoded = rawText.trim();

            if (!decoded.startsWith('{') && !decoded.startsWith('[')) {
                try {
                    let b64 = decoded.replace(/\s/g, '');
                    while (b64.length % 4 !== 0) b64 += '=';
                    const dec = atob(b64);
                    try { decoded = decodeURIComponent(escape(dec)); } catch (e) { decoded = dec; }
                } catch (e) {
                    decoded = rawText.trim();
                }
            }

            // Auto-beautify JSON if it is valid JSON
            try {
                if (decoded.startsWith('{') || decoded.startsWith('[')) {
                    const parsed = JSON.parse(decoded);
                    decoded = JSON.stringify(parsed, null, 2);
                }
            } catch (e) { }

            setInputText(decoded);
            toast.success("Subscription fetched successfully", { description: `HWID: ${hwid.substring(0, 8)}...` });
        } catch (error: any) {
            toast.error("Fetch failed", { description: error.message });
        } finally {
            setIsFetching(false);
        }
    };

    const handleBeautifyInput = () => {
        if (!inputText.trim()) return;
        try {
            const data = JSON.parse(inputText);
            setInputText(JSON.stringify(data, null, 2));
            toast.success("JSON beautified");
        } catch {
            try {
                const configs = parseRawSubscriptionText(inputText);
                if (configs && configs.length > 0) {
                    setInputText(JSON.stringify(configs.length === 1 ? configs[0] : configs, null, 2));
                    toast.success("Parsed & beautified as JSON");
                }
            } catch {
                toast.error("Could not beautify: input is not valid JSON");
            }
        }
    };

    const handleParse = () => {
        try {
            const configs = parseRawSubscriptionText(inputText);
            if (!configs || configs.length === 0) throw new Error("No valid configurations found in input");
            setParsedConfigs(configs);
            setSelectedIndex(0);

            // Check if returned configuration contains dummy/advisory warning nodes (e.g. 0.0.0.0:1)
            const firstConfig = configs[0];
            const isDummyOnly = firstConfig?.outbounds?.every((o: any) => {
                const addr = o?.settings?.vnext?.[0]?.address || o?.settings?.servers?.[0]?.address;
                const port = o?.settings?.vnext?.[0]?.port || o?.settings?.servers?.[0]?.port;
                return addr === '0.0.0.0' && port === 1;
            });

            if (isDummyOnly) {
                toast.warning("Warning: Provider returned announcement/dummy nodes", {
                    description: "Your provider may require a different User-Agent or device authorization."
                });
            } else {
                toast.success(`Analyzed ${configs.length} configuration(s) (${firstConfig?.outbounds?.length || 0} nodes found)`);
            }
        } catch (e: any) {
            toast.error("Parse failed", { description: e.message });
        }
    };

    const selectedConfig = useMemo(() => {
        if (!parsedConfigs || !parsedConfigs[selectedIndex]) return null;
        return parsedConfigs[selectedIndex];
    }, [parsedConfigs, selectedIndex]);

    const importOutbound = (proxy: any, customTag?: string) => {
        addOutbounds([{ ...proxy, tag: customTag || proxy.tag }]);
        toast.success("Node added to outbounds");
    };

    const importInbound = (ib: any) => {
        addItem('inbounds', ib);
        toast.success("Inbound added");
    };

    const openInboundEditor = (ib: any) => {
        setModal({ type: 'inbound', data: ib, index: null });
    };

    const openOutboundEditor = (ob: any) => {
        setModal({ type: 'outbound', data: ob, index: null });
    };

    const importRoutingItem = (section: 'rules' | 'balancers', item: any) => {
        const currentRouting = currentConfig?.routing || { rules: [], balancers: [] };
        const updated = {
            ...currentRouting,
            [section]: [item, ...(currentRouting[section] || [])]
        };
        updateSection('routing', updated);
        toast.success(`Imported to your routing (at the top)`);
    };

    const extractAllFromSelected = () => {
        if (!selectedConfig) return;
        const proxies = (selectedConfig.outbounds || []).filter((o: any) =>
            !['freedom', 'dns', 'blackhole', 'direct', 'block'].includes(o.protocol)
        );
        const name = selectedConfig.remarks || "Config";
        const cleaned = proxies.map((p: any, i: number) => ({
            ...p,
            tag: proxies.length > 1 ? `${name}-${i + 1}` : name
        }));
        addOutbounds(cleaned);
        toast.success(`Extracted ${cleaned.length} nodes from ${name}`);
    };

    const handleSaveShortcut = () => useConfigStore.getState().saveActiveProfile();
    const handleCommitShortcut = () => useConfigStore.getState().recordSnapshot("Manual Commit (Ctrl+Shift+S)");

    return {
        inputText, setInputText,
        subUrl, setSubUrl,
        selectedUa, setSelectedUa,
        customUa, setCustomUa,
        showHwidSettings, setShowHwidSettings,

        hwid, handleHwidChange,
        deviceOs, handleDeviceOsChange,
        verOs, handleVerOsChange,
        deviceModel, handleDeviceModelChange,

        isFetching,
        parsedConfigs, setParsedConfigs,
        selectedIndex, setSelectedIndex,
        selectedConfig,

        handleGenerateNewHwid,
        handleAutoDetect,
        handleFetchSub,
        handleBeautifyInput,
        handleParse,
        handleSaveShortcut,
        handleCommitShortcut,

        importOutbound,
        importInbound,
        openInboundEditor,
        openOutboundEditor,
        importRoutingItem,
        extractAllFromSelected,
    };
}
