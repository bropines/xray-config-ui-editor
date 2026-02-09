import React, { useState } from "react";
import { useConfigStore, type XrayConfig } from "./store/configStore";
import { Button } from "./components/ui/Button";
import { Icon } from "./components/ui/Icon";
import { InboundModal } from "./components/editors/InboundModal";
import { OutboundModal } from "./components/editors/OutboundModal";
import { RoutingModal } from "./components/editors/RoutingModal";
import { DnsModal } from "./components/editors/DnsModal";
import { SettingsModal } from "./components/editors/SettingsModal";
import { ReverseModal } from "./components/editors/ReverseModal";
import { TopologyModal } from "./components/topology/TopologyModal";
import { RemnawaveModal } from "./components/editors/RemnawaveModal";
import { SectionJsonModal } from "./components/editors/SectionJsonModal";
import { JsonField } from "./components/ui/JsonField";
import { Toaster } from 'sonner';
import { getPresets } from "./utils/presets";

// Компонент карточки для списков (Inbounds, Outbounds, Routing preview)
const Card = ({ title, icon, color, children, actions, className = "" }: any) => (
    <div className={`bg-slate-800 border border-slate-700/50 rounded-xl flex flex-col hover:border-slate-600 transition-colors shadow-xl overflow-hidden ${className}`}>
        <div className="flex justify-between items-center p-4 border-b border-slate-700/50 bg-slate-800/50 shrink-0">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${color} text-white shadow-lg`}>
                    <Icon name={icon} className="text-xl" />
                </div>
                <h2 className="text-lg font-bold text-slate-100">{title}</h2>
            </div>
            <div className="flex gap-2">{actions}</div>
        </div>
        <div className="flex-1 p-4 space-y-3 overflow-y-auto custom-scroll bg-slate-900/30 min-h-0">{children}</div>
    </div>
);

export const App = () => {
    // Достаем всё из стора
    const {
        config,
        setConfig,
        deleteItem,
        updateItem,
        addItem,
        updateSection,
        remnawave,
        saveToRemnawave,
        disconnectRemnawave,
        initDns
    } = useConfigStore();

    // Локальные стейты UI
    const [modal, setModal] = useState<{ type: string | null, data: any, index: number | null }>({ type: null, data: null, index: null });
    
    // Стейт для частичного JSON
    const [sectionModal, setSectionModal] = useState<{ open: boolean, title: string, section: string, data: any, schemaMode: any }>({ 
        open: false, title: "", section: "", data: null, schemaMode: "full" 
    });

    // Стейт для поиска по аутбаундам
    const [obSearch, setObSearch] = useState("");

    const [rawMode, setRawMode] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [remnawaveModalOpen, setRemnawaveModalOpen] = useState(false);

    // --- File Handlers ---

    const loadFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target?.result as string);
                setConfig(parsed as XrayConfig);
                setRawMode(false);
            } catch (err) {
                alert("Invalid JSON file");
            }
        };
        reader.readAsText(file);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) loadFile(e.target.files[0]);
    };

    const downloadConfig = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = "config.json";
        a.click();
    };

    // --- Drag & Drop ---

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.relatedTarget === null || !e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
    };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
    };

    // --- Modal Helpers ---

    const handleSaveModal = (data: any) => {
        const { type, index } = modal;
        if (type === 'inbound') {
            if (index !== null) updateItem('inbounds', index, data);
            else addItem('inbounds', data);
        }
        if (type === 'outbound') {
            if (index !== null) updateItem('outbounds', index, data);
            else addItem('outbounds', data);
        }
        setModal({ type: null, data: null, index: null });
    };

    const handleSaveSection = (newData: any) => {
        updateSection(sectionModal.section as any, newData);
        setSectionModal({ ...sectionModal, open: false });
    };

const openSectionJson = (section: string, title: string) => {
        const modeMap: Record<string, string> = {
            inbounds: 'inbounds',  
            outbounds: 'outbounds',
            routing: 'routing',
            dns: 'dns'
        };
        setSectionModal({
            open: true,
            title: title + " (JSON)",
            section,
            data: config ? config[section] : (section === 'inbounds' || section === 'outbounds' ? [] : {}),
            schemaMode: modeMap[section] || 'full'
        });
    };

    const presets = getPresets();

    // --- Validation for Header ---
    const getFullConfigValidation = () => {
        if (!config) return [];
        let allErrors: string[] = [];
        config.routing?.balancers?.forEach((b: any) => {
            if (!b.selector || b.selector.length === 0) {
                allErrors.push(`Balancer [${b.tag}] is empty!`);
            }
        });
        const tags = config.inbounds?.map((i: any) => i.tag);
        if (new Set(tags).size !== tags?.length) {
            allErrors.push("Duplicate Inbound tags found!");
        }
        return allErrors;
    };
    const configErrors = getFullConfigValidation();

    // --- Filter Outbounds ---
    const filteredOutbounds = (config?.outbounds || []).map((ob: any, i: number) => ({ ...ob, i }))
        .filter((ob: any) => {
            const q = obSearch.toLowerCase();
            if (!q) return true;
            
            const settings = ob.settings || {};
            const vnext = settings.vnext?.[0] || {};
            const server = settings.servers?.[0] || settings;
            
            const address = (vnext.address || server.address || "").toLowerCase();
            const key = (vnext.users?.[0]?.id || server.password || server.id || "").toLowerCase();
            
            return (
                ob.tag?.toLowerCase().includes(q) ||
                ob.protocol.toLowerCase().includes(q) ||
                address.includes(q) ||
                key.includes(q)
            );
        });

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 relative flex flex-col xl:h-screen xl:overflow-hidden h-auto"
            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        >
            <Toaster theme="dark" position="bottom-right" toastOptions={{ style: { background: '#1e293b', border: '1px solid #334155', color: 'white' } }} />

            {/* Drag Overlay */}
            {isDragging && (
                <div className="absolute inset-0 z-50 bg-indigo-900/80 backdrop-blur-sm border-4 border-indigo-500 border-dashed flex flex-col items-center justify-center pointer-events-none transition-all fixed">
                    <Icon name="FileArrowDown" className="text-8xl text-indigo-400 mb-4 animate-bounce" weight="fill" />
                    <h2 className="text-2xl md:text-3xl font-bold text-white shadow-sm text-center px-4">Drop config.json here</h2>
                </div>
            )}

            {/* --- HEADER --- */}
            <nav className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 md:px-6 py-3 shadow-md flex flex-wrap gap-4 justify-between items-center shrink-0 h-16 box-border">
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="bg-indigo-600 p-1.5 md:p-2 rounded-lg text-white shadow-lg">
                        <Icon name="Planet" className="text-lg md:text-xl" />
                    </div>
                    <span className="font-bold text-base md:text-lg tracking-tight text-white">Xray GUI</span>
                    
                    {configErrors.length > 0 && (
                        <div className="flex items-center gap-2 text-rose-400 bg-rose-400/10 px-3 py-1 rounded-full border border-rose-400/20 animate-pulse cursor-help ml-2" 
                             title={configErrors.join('\n')}>
                            <Icon name="Warning" />
                            <span className="text-[10px] font-bold uppercase hidden md:inline">Config Invalid</span>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 items-center">
                    {remnawave.connected ? (
                        <div className="flex items-center gap-1 bg-indigo-900/50 border border-indigo-500/50 px-2 py-1 md:px-3 md:py-1.5 rounded-lg mr-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)] mr-2"></div>
                            <span className="text-xs font-bold text-indigo-200 hidden md:inline mr-2">Remnawave</span>

                            <div className="w-px h-4 bg-indigo-500/30 mx-1"></div>

                            <Button variant="ghost" className="p-1 h-auto text-xs text-indigo-300 hover:text-white" onClick={() => setRemnawaveModalOpen(true)} title="Switch Profile">
                                <Icon name="ListDashes" weight="bold" />
                            </Button>

                            <Button variant="ghost" className="p-1 h-auto text-xs text-indigo-300 hover:text-white" onClick={saveToRemnawave} title="Save to Cloud">
                                <Icon name="CloudArrowUp" weight="bold" />
                            </Button>

                            <div className="w-px h-4 bg-indigo-500/30 mx-1"></div>

                            <Button variant="ghost" className="p-1 h-auto text-xs text-rose-400 hover:text-rose-200" onClick={disconnectRemnawave} title="Disconnect">
                                <Icon name="LinkBreak" weight="bold" />
                            </Button>
                        </div>
                    ) : (
                        <Button variant="secondary" onClick={() => setRemnawaveModalOpen(true)} className="text-xs mr-2 border-indigo-500/30 hover:border-indigo-500/80">
                            <Icon name="Cloud" className="text-indigo-400" /> <span className="hidden md:inline">Remnawave</span>
                        </Button>
                    )}

                    <div className="w-px h-6 bg-slate-800 mx-1 hidden md:block"></div>

                    <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 md:px-4 md:py-2 rounded-lg font-bold cursor-pointer transition-all border border-slate-700 flex items-center gap-2 text-xs md:text-sm">
                        <Icon name="FolderOpen" /> <span className="hidden md:inline">Open File</span>
                        <input type="file" className="hidden" accept=".json" onChange={handleFileUpload} />
                    </label>
                    <Button variant="success" onClick={downloadConfig} icon="DownloadSimple" className="font-bold p-2 md:px-4 md:py-2 text-xs md:text-sm" disabled={!config}>
                        <span className="hidden md:inline">Download</span>
                    </Button>
                </div>
            </nav>

            {/* --- MAIN CONTENT --- */}
            <main className="p-4 md:p-6 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex-1 flex flex-col min-h-0 h-auto xl:h-[calc(100vh-4rem)]">
                {!config ? (
                    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
                        <div className="text-center mb-10">
                            <h1 className="text-3xl md:text-4xl text-white font-bold mb-3 tracking-tight">Welcome to Xray GUI</h1>
                            <p className="text-slate-400 max-w-md mx-auto">
                                Drag & Drop your <code>config.json</code> anywhere or choose a template to start.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl px-4">
                            {presets.map((preset, i) => (
                                <div key={i}
                                    onClick={() => setConfig(preset.config as any)}
                                    className="bg-slate-900/50 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-6 cursor-pointer transition-all group shadow-lg hover:shadow-indigo-500/10 flex flex-col gap-3"
                                >
                                    <div className="bg-slate-950 w-12 h-12 rounded-lg flex items-center justify-center border border-slate-800 group-hover:border-indigo-500/50 group-hover:text-indigo-400 transition-colors">
                                        <Icon name={preset.icon} className="text-2xl" weight="duotone" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-200 group-hover:text-white mb-1">{preset.name}</h3>
                                        <p className="text-xs text-slate-500 leading-relaxed">{preset.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-12 flex flex-col items-center gap-4 opacity-70 hover:opacity-100 transition-opacity">
                            <div className="text-sm text-slate-500">Or import from sources:</div>
                            <div className="flex gap-4">
                                <label className="text-sm text-slate-400 cursor-pointer flex items-center gap-2 hover:text-indigo-400 transition-colors bg-slate-900 border border-slate-800 px-4 py-2 rounded-full">
                                    <Icon name="FolderOpen" /> Local File
                                    <input type="file" className="hidden" accept=".json" onChange={handleFileUpload} />
                                </label>
                                <button onClick={() => setRemnawaveModalOpen(true)} className="text-sm text-slate-400 cursor-pointer flex items-center gap-2 hover:text-indigo-400 transition-colors bg-slate-900 border border-slate-800 px-4 py-2 rounded-full">
                                    <Icon name="Cloud" /> Remnawave Panel
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 md:gap-6 h-full min-h-0 pb-2">
                        {/* TOOLBAR */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-3 md:px-6 md:py-3 rounded-xl shadow-lg gap-3 shrink-0">
                            <h2 className="font-bold text-slate-300 flex items-center gap-2 text-sm md:text-base">
                                <Icon name="SlidersHorizontal" /> Core Modules
                            </h2>
                            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                                <Button className="flex-1 md:flex-none text-xs" variant="secondary" onClick={() => setModal({ type: 'topology', data: null, index: null })} icon="GitMerge" title="Topology" />
                                <Button className="flex-1 md:flex-none text-xs" variant="secondary" onClick={() => setModal({ type: 'reverse', data: null, index: null })} icon="ArrowsLeftRight" title="Reverse" />
                                <Button className="flex-1 md:flex-none text-xs" variant="secondary" onClick={() => setModal({ type: 'settings', data: null, index: null })} icon="Gear">Settings</Button>
                                <div className="hidden md:block w-px bg-slate-800 mx-2"></div>
                                <Button
                                    variant="secondary"
                                    onClick={() => setRawMode(!rawMode)}
                                    icon={rawMode ? "Layout" : "Code"}
                                    className={`flex-1 md:flex-none text-xs ${rawMode ? "bg-indigo-600 border-indigo-500 text-white" : ""}`}
                                >
                                    {rawMode ? "UI" : "JSON"}
                                </Button>
                                <Button variant="danger" className="text-xs px-3 ml-2" onClick={() => { if (confirm('Clear config?')) setConfig(null); }} icon="XCircle" title="Close Config" />
                            </div>
                        </div>

                        {/* CONTENT AREA */}
                        {rawMode ? (
                            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-1 shadow-2xl min-h-[600px] xl:min-h-0">
                                <JsonField label="Full Configuration" value={config} onChange={(newConfig: any) => { if (newConfig) setConfig(newConfig); }} className="h-full" />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-6 flex-1 min-h-0 xl:overflow-hidden">

                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:flex-1 xl:min-h-0">
                                    {/* Inbounds */}
                                    <Card
                                        title={`Inbounds (${config.inbounds?.length || 0})`}
                                        icon="ArrowCircleDown"
                                        color="bg-emerald-600"
                                        className="h-[500px] xl:h-full"
                                        actions={
                                            <div className="flex gap-1">
                                                <Button variant="ghost" className="p-1.5" onClick={() => openSectionJson("inbounds", "Inbounds")} icon="Code" title="View JSON"/>
                                                <Button variant="ghost" onClick={() => setModal({ type: 'inbound', data: null, index: null })} icon="Plus" />
                                            </div>
                                        }
                                    >
                                        {(config.inbounds || []).map((ib: any, i: number) => (
                                            <div key={i} className="card-item group flex justify-between items-start">
                                                <div className="min-w-0 pr-2">
                                                    <div className="font-bold text-emerald-400 text-sm flex items-center gap-2 truncate"><Icon name="Hash" /> {ib.tag || "no-tag"}</div>
                                                    <div className="text-xs text-slate-400 mt-1 font-mono pl-6 truncate">{ib.protocol} : {ib.port}</div>
                                                </div>
                                                <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setModal({ type: 'inbound', data: ib, index: i })} className="btn-icon"><Icon name="PencilSimple" /></button>
                                                    <button onClick={() => deleteItem('inbounds', i)} className="btn-icon-danger"><Icon name="Trash" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </Card>

                                    {/* Routing (С ОБНОВЛЕННЫМ ДИЗАЙНОМ) */}
                                    <Card
                                        title="Routing"
                                        icon="ArrowsSplit"
                                        color="bg-purple-600"
                                        className="h-[500px] xl:h-full"
                                        actions={
                                            <div className="flex gap-1">
                                                <Button variant="ghost" className="p-1.5" onClick={() => openSectionJson("routing", "Routing")} icon="Code" title="View JSON"/>
                                                <Button variant="ghost" onClick={() => setModal({ type: 'routing', data: null, index: null })} icon="PencilSimple">Edit</Button>
                                            </div>
                                        }
                                    >
                                        <div className="text-xs text-center text-purple-300 bg-purple-900/20 p-2 rounded mb-2 border border-purple-500/20 flex justify-between px-4">
                                            <span className="opacity-70">Strategy:</span>
                                            <span className="font-bold text-white">{config.routing?.domainStrategy || "AsIs"}</span>
                                        </div>

                                        <div className="space-y-2">
                                            {(config.routing?.rules || []).slice(0, 20).map((rule: any, i: number) => {
                                                const hasName = !!rule.ruleTag;
                                                const conditions = [];
                                                if (rule.domain) conditions.push(`${rule.domain.length} dom`);
                                                if (rule.ip) conditions.push(`${rule.ip.length} ip`);
                                                if (rule.port) conditions.push(`port`);
                                                if (rule.protocol) conditions.push(`proto`);
                                                if (rule.inboundTag) conditions.push(`inbound`);
                                                if (conditions.length === 0) conditions.push('match all');

                                                const conditionText = conditions.join(', ');
                                                const isBalancer = !!rule.balancerTag;
                                                const target = rule.outboundTag || rule.balancerTag || "null";

                                                return (
                                                    <div key={i} className="text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800 hover:border-indigo-500/50 transition-colors flex flex-col gap-1.5 group">
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isBalancer ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                                                                <span className={`font-bold truncate ${hasName ? 'text-white' : 'text-slate-400 font-mono'}`}>
                                                                    {rule.ruleTag || conditionText}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 shrink-0 pl-2">
                                                                <Icon name="ArrowRight" className="text-slate-700 text-[10px]" />
                                                                <span className={`font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 max-w-[100px] truncate ${isBalancer ? 'text-purple-400' : 'text-blue-400'}`}>
                                                                    {target}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {hasName && (
                                                            <div className="text-[10px] text-slate-500 font-mono pl-3.5 flex items-center gap-2">
                                                                <span className="truncate">{conditionText}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {(config.routing?.rules || []).length === 0 && (
                                                <div className="text-center text-slate-600 py-8 italic text-xs">
                                                    No routing rules defined.<br />Traffic will follow the first outbound.
                                                </div>
                                            )}

                                            {(config.routing?.rules || []).length > 20 && (
                                                <div className="text-center text-xs text-slate-500 italic pt-2 border-t border-slate-800">
                                                    ... +{(config.routing?.rules || []).length - 20} more rules
                                                </div>
                                            )}
                                        </div>
                                    </Card>

                                    {/* Outbounds (С ПОИСКОМ) */}
                                    <Card
                                        title={`Outbounds (${config.outbounds?.length || 0})`}
                                        icon="ArrowCircleUp"
                                        color="bg-blue-600"
                                        className="h-[500px] xl:h-full"
                                        actions={
                                            <div className="flex gap-2 items-center">
                                                <div className="relative hidden md:block">
                                                    <Icon name="MagnifyingGlass" className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
                                                    <input 
                                                        className="bg-slate-900 border border-slate-700 rounded-md pl-7 pr-2 py-1 text-[10px] w-32 outline-none focus:w-48 focus:border-indigo-500 transition-all text-white"
                                                        placeholder="Search IP, UUID..."
                                                        value={obSearch}
                                                        onChange={e => setObSearch(e.target.value)}
                                                    />
                                                </div>
                                                <Button variant="ghost" className="p-1.5" onClick={() => openSectionJson("outbounds", "Outbounds")} icon="Code" title="View JSON"/>
                                                <Button variant="ghost" onClick={() => setModal({ type: 'outbound', data: null, index: null })} icon="Plus" />
                                            </div>
                                        }
                                    >
                                        <div className="md:hidden mb-2 relative">
                                             <Icon name="MagnifyingGlass" className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                                             <input className="input-base pl-8 text-xs py-1.5" placeholder="Search..." value={obSearch} onChange={e => setObSearch(e.target.value)} />
                                        </div>

                                        {filteredOutbounds.map((ob: any) => (
                                            <div key={ob.i} className="card-item group flex justify-between items-start">
                                                <div className="min-w-0 pr-2">
                                                    <div className="font-bold text-blue-400 text-sm flex items-center gap-2 truncate"><Icon name="PaperPlaneRight" /> {ob.tag || "no-tag"}</div>
                                                    <div className="text-[10px] text-slate-400 mt-1 font-mono pl-6 truncate">
                                                        {ob.protocol} {ob.settings?.vnext?.[0]?.address || ob.settings?.servers?.[0]?.address || ob.settings?.address || ""}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setModal({ type: 'outbound', data: ob, index: ob.i })} className="btn-icon"><Icon name="PencilSimple" /></button>
                                                    <button onClick={() => deleteItem('outbounds', ob.i)} className="btn-icon-danger"><Icon name="Trash" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </Card>
                                </div>

                                {/* DNS Configuration */}
                                <Card title="DNS" icon="Globe" color="bg-indigo-600" className="h-fit shrink-0 mb-6 xl:mb-0"
                                    actions={
                                        <div className="flex gap-1">
                                            <Button variant="ghost" className="p-1.5" onClick={() => openSectionJson("dns", "DNS Config")} icon="Code" title="View JSON"/>
                                            <Button variant="ghost" onClick={() => { initDns(); setModal({ type: 'dns', data: null, index: null }) }} icon="PencilSimple">Edit</Button>
                                        </div>
                                    }
                                >
                                    {config.dns ? (
                                        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                                            <div className="grid grid-cols-2 gap-2 text-xs flex-1">
                                                <div className="bg-slate-900 p-2 rounded border border-slate-700/50 flex items-center justify-between px-4">
                                                    <span className="text-slate-500 block text-[10px] uppercase">Servers</span>
                                                    <span className="text-white font-bold font-mono text-lg">{config.dns.servers?.length || 0}</span>
                                                </div>
                                                <div className="bg-slate-900 p-2 rounded border border-slate-700/50 flex items-center justify-between px-4">
                                                    <span className="text-slate-500 block text-[10px] uppercase">Hosts</span>
                                                    <span className="text-white font-bold font-mono text-lg">{Object.keys(config.dns.hosts || {}).length}</span>
                                                </div>
                                            </div>
                                            <div className="text-xs text-slate-400 md:border-l border-slate-800 md:pl-4 flex flex-col gap-1 min-w-[200px]">
                                                <div className="flex justify-between">
                                                    <span>Strategy:</span> <span className="text-indigo-300 font-bold">{config.dns.queryStrategy || "UseIP"}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Client IP:</span> <span className="font-mono text-slate-500">{config.dns.clientIp || "N/A"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 text-slate-500 text-xs">DNS not configured. Click Edit to initialize defaults.</div>
                                    )}
                                </Card>
                            </div>
                        )}
                    </div>
                )}

                {/* MODALS */}
                {modal.type === 'inbound' && <InboundModal data={modal.data} onClose={() => setModal({ type: null, data: null, index: null })} onSave={handleSaveModal} />}
                {modal.type === 'outbound' && <OutboundModal data={modal.data} onClose={() => setModal({ type: null, data: null, index: null })} index={modal.index} onSave={handleSaveModal} />}
                {modal.type === 'routing' && <RoutingModal onClose={() => setModal({ type: null, data: null, index: null })} />}
                {modal.type === 'dns' && <DnsModal onClose={() => setModal({ type: null, data: null, index: null })} />}
                {modal.type === 'settings' && <SettingsModal onClose={() => setModal({ type: null, data: null, index: null })} />}
                {modal.type === 'reverse' && <ReverseModal onClose={() => setModal({ type: null, data: null, index: null })} />}
                {modal.type === 'topology' && <TopologyModal onClose={() => setModal({ type: null, data: null, index: null })} />}

                {/* NEW: Section JSON Modal */}
                {sectionModal.open && <SectionJsonModal 
                    title={sectionModal.title} 
                    data={sectionModal.data} 
                    schemaMode={sectionModal.schemaMode}
                    onClose={() => setSectionModal({ ...sectionModal, open: false })}
                    onSave={handleSaveSection} 
                />}

                {/* Remnawave Modal */}
                {remnawaveModalOpen && <RemnawaveModal onClose={() => setRemnawaveModalOpen(false)} />}
            </main>
        </div>
    );
};