import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Select } from '../ui/Select';
import { JsonEditor } from '../ui/JsonEditor';
import { toast } from 'sonner';
import { useConfigInspector } from '../../hooks/useConfigInspector';

const UA_PRESETS = [
    { value: "Happ/1.0.0", label: "Happ (iOS / Android)" },
    { value: "v2rayNG/1.9.13", label: "v2rayNG (Android)" },
    { value: "Shadowrocket/1982 CFNetwork/1408.0.4 Darwin/22.5.0", label: "Shadowrocket (iOS)" },
    { value: "ClashMeta/v1.18.0", label: "Clash.Meta / Mihomo" },
    { value: "sing-box/1.10.0", label: "sing-box" },
    { value: "FoXray/1.4.2", label: "FoXray" },
    { value: "NekoBox/1.3.1", label: "NekoBox" },
    { value: "custom", label: "Custom User-Agent..." },
];

export const ConfigInspectorModal = ({ onClose, setModal, openSectionJson }: {
    onClose: () => void,
    setModal: (m: any) => void,
    openSectionJson: (section: string, title: string, data: any) => void
}) => {
    const {
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
    } = useConfigInspector(setModal);

    return (
        <Modal title="Config Harvester & Inspector" onClose={onClose} className="max-w-[95vw] 2xl:max-w-[1600px]" hideSave>
            <div className="h-[80vh] flex flex-col min-h-[600px]">
                {!parsedConfigs ? (
                    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full space-y-4 py-4 min-h-0">
                        <div className="text-center space-y-2 shrink-0">
                            <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto border border-indigo-500/20 shadow-inner">
                                <Icon name="Briefcase" className="text-3xl text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-black text-white italic tracking-tight">Configuration Harvester</h3>
                            <p className="text-slate-500 text-xs max-w-md mx-auto leading-relaxed">
                                Paste raw proxy links (VLESS, VMess, SS, Trojan, WG), JSON configs, or fetch directly from a subscription URL.
                            </p>
                        </div>

                        {/* Subscription & User-Agent Section */}
                        <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800/80 space-y-3 shrink-0">
                            <div className="flex flex-col md:flex-row gap-2">
                                <input
                                    type="text"
                                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm font-mono text-white outline-none focus:border-indigo-500 transition-all shadow-inner"
                                    placeholder="https://example.com/subscription..."
                                    value={subUrl}
                                    onChange={(e) => setSubUrl(e.target.value)}
                                />
                                <Button variant="secondary" className="px-5 rounded-xl border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 shadow-lg" onClick={handleFetchSub} disabled={!subUrl.trim() || isFetching} icon="CloudArrowDown">
                                    {isFetching ? "Fetching..." : "Fetch Remote"}
                                </Button>
                            </div>

                            <div className="space-y-3 pt-2 border-t border-slate-800/60">
                                <div className="flex flex-col sm:flex-row items-center gap-3">
                                    <label className="text-[11px] font-bold text-slate-400 shrink-0 flex items-center gap-1.5">
                                        <Icon name="DeviceMobile" className="text-indigo-400" /> Emulated Client:
                                    </label>
                                    <div className="w-full sm:w-64">
                                        <Select
                                            value={selectedUa}
                                            onChange={setSelectedUa}
                                            options={UA_PRESETS}
                                        />
                                    </div>
                                    {selectedUa === 'custom' && (
                                        <input
                                            type="text"
                                            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-indigo-500"
                                            placeholder="e.g. FoXray/1.4.2 (iPhone; iOS 17.5)"
                                            value={customUa}
                                            onChange={e => setCustomUa(e.target.value)}
                                        />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setShowHwidSettings(!showHwidSettings)}
                                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 ml-auto shrink-0 bg-indigo-950/40 px-2 py-1 rounded-lg border border-indigo-500/30"
                                    >
                                        <Icon name="Fingerprint" /> {showHwidSettings ? "Hide HWID" : "Device HWID"}
                                    </button>
                                </div>

                                {showHwidSettings && (
                                    <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3 animate-in fade-in">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                                <Icon name="Fingerprint" className="text-purple-400 text-sm" /> Remnawave Device & System Parameters
                                            </span>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleAutoDetect}
                                                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-950/40 hover:bg-indigo-900/60 px-2 py-0.5 rounded-lg border border-indigo-500/40 transition-colors"
                                                >
                                                    <Icon name="Laptop" /> Auto-Detect
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleGenerateNewHwid}
                                                    className="text-[10px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 bg-purple-950/40 hover:bg-purple-900/60 px-2 py-0.5 rounded-lg border border-purple-500/40 transition-colors"
                                                >
                                                    <Icon name="ArrowsClockwise" /> New HWID
                                                </button>
                                            </div>
                                        </div>

                                        {/* HWID Field */}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400">Device HWID (x-hwid):</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-xs font-mono text-purple-200 outline-none focus:border-purple-500"
                                                    value={hwid}
                                                    onChange={e => handleHwidChange(e.target.value)}
                                                    placeholder="UUID or 10-64 char alphanumeric string"
                                                />
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="!py-1 !px-2.5 !text-[10px]"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(hwid);
                                                        toast.success("HWID copied to clipboard");
                                                    }}
                                                    icon="Copy"
                                                >
                                                    Copy
                                                </Button>
                                            </div>
                                        </div>

                                        {/* OS, Version, Model */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400">Device OS (x-device-os):</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-xs font-mono text-slate-200 outline-none focus:border-indigo-500"
                                                    value={deviceOs}
                                                    onChange={e => handleDeviceOsChange(e.target.value)}
                                                    placeholder="e.g. Windows, iOS, Android"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400">OS Version (x-ver-os):</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-xs font-mono text-slate-200 outline-none focus:border-indigo-500"
                                                    value={verOs}
                                                    onChange={e => handleVerOsChange(e.target.value)}
                                                    placeholder="e.g. 10.0.26220 or 18.3"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400">Device Model (x-device-model):</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-xs font-mono text-slate-200 outline-none focus:border-indigo-500"
                                                    value={deviceModel}
                                                    onChange={e => handleDeviceModelChange(e.target.value)}
                                                    placeholder="e.g. MS-7E06 / iPhone 16 Pro"
                                                />
                                            </div>
                                        </div>

                                        <p className="text-[9px] text-slate-500 pt-1 leading-relaxed">
                                            💡 <b>Tip:</b> If your subscription has a strict 1-device limit, copy your existing HWID and OS from your active client (e.g. Throne / v2rayTun) above to fetch your real proxy nodes.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* JSON & Plaintext Editor Container */}
                        <div className="flex-1 flex flex-col min-h-[300px] bg-slate-950 border border-slate-800/90 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="flex justify-between items-center px-4 py-2 bg-slate-900/80 border-b border-slate-800 text-xs shrink-0">
                                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                                    <Icon name="Code" className="text-indigo-400" /> Source Payload (JSON / Links / Base64)
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleBeautifyInput}
                                        disabled={!inputText.trim()}
                                        className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-950/40 hover:bg-indigo-900/60 px-2.5 py-1 rounded-lg border border-indigo-500/30 transition-colors disabled:opacity-40"
                                    >
                                        <Icon name="MagicWand" /> Beautify JSON
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(inputText);
                                            toast.success("Copied payload to clipboard");
                                        }}
                                        disabled={!inputText.trim()}
                                        className="text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors disabled:opacity-40"
                                    >
                                        <Icon name="Copy" /> Copy
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setInputText("")}
                                        disabled={!inputText.trim()}
                                        className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 bg-rose-950/30 hover:bg-rose-900/40 px-2 py-1 rounded-lg border border-rose-900/50 transition-colors disabled:opacity-40"
                                        title="Clear Input"
                                    >
                                        <Icon name="Trash" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 min-h-0 relative">
                                <JsonEditor
                                    value={inputText}
                                    onChange={setInputText}
                                    schemaMode="full"
                                    mode={inputText.trim().startsWith('{') || inputText.trim().startsWith('[') ? 'json' : 'plaintext'}
                                    onSaveShortcut={handleSaveShortcut}
                                    onCommitShortcut={handleCommitShortcut}
                                />
                            </div>
                        </div>

                        <Button className="w-full py-3.5 shrink-0 text-sm font-black uppercase tracking-widest shadow-2xl shadow-indigo-500/20 rounded-2xl bg-indigo-600 hover:bg-indigo-500 border-none" onClick={handleParse} disabled={!inputText.trim()} icon="Lightning">
                            Analyze All Components
                        </Button>
                    </div>
                ) : (
                    <div className="flex-1 flex overflow-hidden gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Sidebar: Navigation */}
                        <div className="w-80 shrink-0 flex flex-col bg-slate-900/40 border border-slate-800/60 rounded-3xl overflow-hidden shadow-2xl">
                            <div className="p-4 border-b border-slate-800/60 bg-slate-950/40 flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Source Index</span>
                                    <span className="text-xs font-bold text-white mt-1">{parsedConfigs.length} Objects Found</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 text-[11px] font-bold bg-slate-800/50 hover:bg-slate-700 text-slate-300"
                                        onClick={() => setParsedConfigs(null)}
                                        title="Edit or view raw source input"
                                    >
                                        <Icon name="ArrowLeft" /> Source
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 bg-slate-800/50 hover:bg-rose-500/20 hover:text-rose-400"
                                        onClick={() => {
                                            setParsedConfigs(null);
                                            setInputText("");
                                        }}
                                        title="Clear All"
                                    >
                                        <Icon name="Trash" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scroll p-3 space-y-2">
                                {parsedConfigs.map((c, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedIndex(i)}
                                        className={`w-full text-left p-4 rounded-2xl transition-all border ${
                                            selectedIndex === i 
                                            ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 border-indigo-500 text-white shadow-xl scale-[1.02]' 
                                            : 'bg-slate-950/40 border-slate-800/50 text-slate-400 hover:border-slate-600 hover:bg-slate-900/60'
                                        }`}
                                    >
                                        <div className="text-xs font-black truncate leading-none mb-2">{c.remarks || `Object #${i + 1}`}</div>
                                        <div className="flex gap-3 items-center opacity-70">
                                            <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-400">
                                                <Icon name="ArrowCircleDown" weight="fill" /> {c.inbounds?.length || 0}
                                            </div>
                                            <div className="flex items-center gap-1 text-[9px] font-bold text-indigo-300">
                                                <Icon name="PaperPlaneRight" weight="fill" /> {c.outbounds?.length || 0}
                                            </div>
                                            <div className="flex items-center gap-1 text-[9px] font-bold text-purple-400">
                                                <Icon name="ArrowsSplit" weight="fill" /> {c.routing?.rules?.length || 0}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Content: Harvesting Board */}
                        <div className="flex-1 flex flex-col min-w-0 gap-6">
                            {/* Dashboard Header */}
                            <div className="bg-slate-900/60 border border-slate-800/60 p-5 rounded-3xl flex justify-between items-center shadow-xl backdrop-blur-xl">
                                <div className="min-w-0 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-white shadow-lg border border-slate-700">
                                        <Icon name="Target" className="text-2xl" weight="duotone" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white italic tracking-tighter truncate leading-none">
                                            {selectedConfig?.remarks || "Harvester Target"}
                                        </h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                                            Source #{selectedIndex + 1} • {parsedConfigs.length} total
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2.5">
                                    <Button
                                        variant="secondary"
                                        className="px-4 bg-slate-800 border-slate-700 text-xs font-bold hover:bg-slate-700"
                                        onClick={() => {
                                            navigator.clipboard.writeText(inputText);
                                            toast.success("Copied analyzed source payload to clipboard");
                                        }}
                                        icon="Copy"
                                        title="Copy raw response/input that was analyzed"
                                    >
                                        Copy Analyzed Response
                                    </Button>
                                    <Button variant="secondary" className="px-4 bg-slate-800 border-slate-700 text-xs font-bold" onClick={() => openSectionJson('full', 'Source JSON', selectedConfig)} icon="Code">
                                        RAW JSON
                                    </Button>
                                    <Button variant="success" className="px-6 shadow-lg shadow-emerald-500/10 text-xs font-black uppercase" onClick={extractAllFromSelected} icon="DownloadSimple">
                                        Harvest Selected Config
                                    </Button>
                                </div>
                            </div>

                            {/* Harvesting Grid */}
                            <div className="flex-1 overflow-y-auto custom-scroll pr-3 space-y-8 pb-20">
                                {/* Inbounds Grid */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/40 to-transparent"></div>
                                        <h4 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                            <Icon name="ArrowCircleDown" weight="fill" /> Inbound Harvester
                                        </h4>
                                        <div className="h-px flex-1 bg-gradient-to-l from-emerald-500/40 to-transparent"></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {(selectedConfig?.inbounds || []).map((ib: any, i: number) => (
                                            <div key={i} className="bg-emerald-500/20 border border-emerald-500/40 p-4 rounded-2xl flex justify-between items-center group hover:border-emerald-500/60 hover:bg-emerald-500/20 transition-all shadow-lg text-left">
                                                <div className="min-w-0">
                                                    <div className="text-[12px] font-black text-slate-200 truncate">{ib.tag}</div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[9px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full">{ib.protocol}</span>
                                                        <span className="text-[10px] text-slate-500 font-mono font-bold">PORT {ib.port}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                                                                                                    <button onClick={() => openSectionJson('inbound', `JSON: ${ib.tag}`, ib)} title="Edit JSON" className="p-2 rounded-md bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"><Icon name="Code" weight="bold" /></button>
                                                                                                    <button onClick={() => openInboundEditor(ib)} title="Open GUI Editor" className="p-2 rounded-md bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"><Icon name="PencilSimple" weight="bold" /></button>
                                                                                                    <button onClick={() => importInbound(ib)} title="Add to Config" className="p-2 rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all"><Icon name="Plus" weight="bold" /></button>
                                                                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Outbounds Grid */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/40 to-transparent"></div>
                                        <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                            <Icon name="PaperPlaneRight" weight="fill" /> Outbound Harvester
                                        </h4>
                                        <div className="h-px flex-1 bg-gradient-to-l from-indigo-500/40 to-transparent"></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {(selectedConfig?.outbounds || []).filter((o: any) => !['freedom', 'blackhole', 'dns'].includes(o.protocol)).map((ob: any, i: number) => (
                                            <div key={i} className="bg-indigo-500/10 border border-indigo-500/30 p-4 rounded-2xl flex justify-between items-center group hover:border-indigo-500/60 hover:bg-indigo-500/20 transition-all shadow-lg text-left">
                                                <div className="min-w-0">
                                                    <div className="text-[12px] font-black text-slate-200 truncate">{ob.tag}</div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[9px] font-black text-indigo-400 uppercase bg-indigo-500/10 px-2 py-0.5 rounded-full">{ob.protocol}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                                                                                                    <button onClick={() => openSectionJson('outbound', `JSON: ${ob.tag}`, ob)} title="Edit JSON" className="p-2 rounded-md bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"><Icon name="Code" weight="bold" /></button>
                                                                                                    <button onClick={() => openOutboundEditor(ob)} title="Open GUI Editor" className="p-2 rounded-md bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"><Icon name="PencilSimple" weight="bold" /></button>
                                                                                                    <button onClick={() => importOutbound(ob)} title="Add to Config" className="p-2 rounded-md bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all"><Icon name="Plus" weight="bold" /></button>
                                                                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Routing Modules Row */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Routing Section */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="h-px flex-1 bg-gradient-to-r from-purple-500/40 to-transparent"></div>
                                            <h4 className="text-[11px] font-black text-purple-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                                <Icon name="ArrowsSplit" weight="fill" /> Rules
                                            </h4>
                                            <div className="h-px flex-1 bg-transparent"></div>
                                        </div>
                                        <div className="space-y-2 text-left">
                                            {(selectedConfig?.routing?.rules || []).map((rule: any, i: number) => (
                                                <div key={i} className="bg-purple-500/10 border border-purple-500/30 p-4 rounded-2xl group hover:border-purple-500/60 hover:bg-purple-500/20 transition-all shadow-lg">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="min-w-0">
                                                            <div className="text-[12px] font-black text-slate-200 truncate">{rule.ruleTag || `Rule #${i+1}`}</div>
                                                            <div className="inline-block px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-[10px] text-purple-400 font-black uppercase mt-1.5 shadow-inner">
                                                                ➔ {rule.outboundTag || rule.balancerTag}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                            <button onClick={() => openSectionJson('rule', 'Rule JSON', rule)} title="JSON" className="p-2 rounded-md bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"><Icon name="Code" weight="bold" /></button>
                                                            <button onClick={() => importRoutingItem('rules', rule)} title="Steal to Top" className="p-2 rounded-md bg-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white"><Icon name="ArrowCircleUp" weight="bold" /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Balancers Section */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="h-px flex-1 bg-gradient-to-r from-amber-500/40 to-transparent"></div>
                                            <h4 className="text-[11px] font-black text-amber-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                                <Icon name="Graph" weight="fill" /> Balancers
                                            </h4>
                                            <div className="h-px flex-1 bg-transparent"></div>
                                        </div>
                                        <div className="space-y-2 text-left">
                                            {(selectedConfig?.routing?.balancers || []).map((bal: any, i: number) => (
                                                <div key={i} className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex justify-between items-center group hover:border-amber-500/60 hover:bg-amber-500/20 transition-all shadow-lg">
                                                    <div className="min-w-0">
                                                        <div className="text-[12px] font-black text-amber-500 italic truncate mb-1">{bal.tag}</div>
                                                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">STRATEGY: {bal.strategy?.type}</div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                        <button onClick={() => openSectionJson('balancer', 'Balancer JSON', bal)} title="JSON" className="p-2 rounded-md bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"><Icon name="Code" weight="bold" /></button>
                                                        <button onClick={() => importRoutingItem('balancers', bal)} title="Import Balancer" className="p-2 rounded-md bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white"><Icon name="ArrowCircleUp" weight="bold" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};