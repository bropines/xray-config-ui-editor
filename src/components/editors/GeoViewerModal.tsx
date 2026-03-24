import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { createProtoWorker } from '../../utils/proto-worker';
import { toast } from 'sonner';

interface GeoItem { code: string; count: number; }

const CUSTOM_PRESETS = [
    { label: '🇷🇺 Zapret (.dat)', format: 'geosite', url: 'https://github.com/kutovoys/ru_gov_zapret/releases/latest/download/zapret.dat' },
    { label: '🇷🇺 Runet GeoSite', format: 'geosite', url: 'https://raw.githubusercontent.com/runetfreedom/russia-v2ray-rules-dat/release/geosite.dat' },
    { label: '🇷🇺 Runet GeoIP', format: 'geoip', url: 'https://raw.githubusercontent.com/runetfreedom/russia-v2ray-rules-dat/release/geoip.dat' },
];

const loadCachedData = (key: string) => {
    try { const c = localStorage.getItem(`geo_data_${key}`); return c ? JSON.parse(c) : null; } catch { return null; }
};
const saveCachedData = (key: string, data: any, meta: any) => {
    try { localStorage.setItem(`geo_data_${key}`, JSON.stringify({ meta, data })); } catch { console.warn("Geo cache full"); }
};

// ============================================================================
// Боковая панель
// ============================================================================
const TagDetailsPanel = ({ tag, customUrl, customFormat, customFileBuffer, onClose }: { tag: string, customUrl?: string, customFormat?: string, customFileBuffer?: ArrayBuffer | null, onClose: () => void }) => {
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const isGeosite = tag.startsWith('geosite:');
        const targetCode = tag.replace('geosite:', '').replace('geoip:', '');
        
        const worker = createProtoWorker();
        worker.onmessage = (e) => {
            if (e.data.error) {
                toast.error("Failed to load details");
                setText("Error loading data.\n" + e.data.error);
            } else if (e.data.type === 'details') {
                setText(e.data.data || "No records found.");
            }
            setLoading(false);
        };
        
        worker.postMessage({ type: 'get_details', dataType: customFormat || (isGeosite ? 'geosite' : 'geoip'), targetCode, customUrl, fileBuffer: customFileBuffer });
        return () => worker.terminate();
    }, [tag, customUrl, customFormat, customFileBuffer]);

    const handleCopy = async () => {
        try {
            if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
            else {
                const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.left = "-999999px";
                document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand('copy'); ta.remove();
            }
            toast.success("Copied to clipboard!");
        } catch { toast.error("Copy failed"); }
    };

    return (
        <div className="w-full md:w-[350px] lg:w-[450px] shrink-0 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden animate-in slide-in-from-right-8 fade-in duration-200 shadow-2xl">
            <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-2 min-w-0">
                    <Icon name="ListDashes" className="text-indigo-400 shrink-0" />
                    <span className="text-sm font-bold text-slate-200 truncate pr-2">{tag}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button onClick={handleCopy} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors" title="Copy raw text"><Icon name="Copy" /></button>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors" title="Close panel"><Icon name="X" /></button>
                </div>
            </div>
            <div className="flex-1 relative bg-slate-950 p-2">
                {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                        <Icon name="Spinner" className="animate-spin text-3xl mb-3 text-indigo-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Extracting...</span>
                    </div>
                ) : (
                    <textarea readOnly className="w-full h-full bg-transparent text-xs font-mono text-emerald-400 resize-none outline-none custom-scroll focus:ring-1 focus:ring-indigo-500/50 rounded p-2" value={text} />
                )}
            </div>
        </div>
    );
};

// ============================================================================
// Основной Вьювер
// ============================================================================
export const GeoViewerModal = ({ onClose }: { onClose: () => void }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [activeTab, setActiveTab] = useState<'geosite' | 'geoip' | 'custom'>(() => (localStorage.getItem('geo_tab') as any) || 'geosite');
    const [customUrl, setCustomUrl] = useState(() => localStorage.getItem('geo_url') || "");
    const [customFormat, setCustomFormat] = useState<'text' | 'geosite' | 'geoip'>(() => (localStorage.getItem('geo_format') as any) || 'geoip');
    
    const [customFileBuffer, setCustomFileBuffer] = useState<ArrayBuffer | null>(null);

    const [customData, setCustomData] = useState<GeoItem[]>(() => {
        const url = localStorage.getItem('geo_url');
        if (url) return loadCachedData(url)?.data || [];
        return [];
    });

    const [geoSites, setGeoSites] = useState<GeoItem[]>([]);
    const [geoIps, setGeoIps] = useState<GeoItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [customLoading, setCustomLoading] = useState(false);

    const [search, setSearch] = useState("");
    const [viewTag, setViewTag] = useState<{ tag: string, code: string, url?: string, format?: string } | null>(null);

    const customWorkerRef = useRef<Worker | null>(null);

    useEffect(() => {
        localStorage.setItem('geo_tab', activeTab);
        localStorage.setItem('geo_url', customUrl);
        localStorage.setItem('geo_format', customFormat);
    }, [activeTab, customUrl, customFormat]);

    useEffect(() => {
        const worker = createProtoWorker();
        const geositeUrl = "https://cdn.jsdelivr.net/gh/v2fly/domain-list-community@release/dlc.dat";
        const geoipUrl = "https://cdn.jsdelivr.net/gh/v2fly/geoip@release/geoip.dat";

        const cacheSite = loadCachedData(geositeUrl);
        const cacheIp = loadCachedData(geoipUrl);

        if (cacheSite) setGeoSites(cacheSite.data);
        if (cacheIp) setGeoIps(cacheIp.data);
        if (!cacheSite || !cacheIp) setLoading(true);

        worker.onmessage = (e) => {
            const { type, targetType, data, meta } = e.data;
            if (type === 'cache_hit') { /* ok */ } 
            else if (type === 'success') {
                const url = targetType === 'geosite' ? geositeUrl : geoipUrl;
                saveCachedData(url, data, meta);
                if (targetType === 'geosite') setGeoSites(data);
                if (targetType === 'geoip') setGeoIps(data);
            }
            setLoading(false);
        };
        
        worker.postMessage({ type: 'geosite', cachedMeta: cacheSite?.meta });
        worker.postMessage({ type: 'geoip', cachedMeta: cacheIp?.meta });
        
        return () => worker.terminate();
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setCustomLoading(true);
        setCustomUrl(file.name); 
        setCustomFileBuffer(null);

        try {
            if (customFormat === 'text') {
                const text = await file.text();
                const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('//'));
                const formattedData = lines.map(line => ({ code: line, count: 1 }));
                setCustomData(formattedData);
                setViewTag(null);
                toast.success(`Loaded ${formattedData.length} items from local file`);
                setCustomLoading(false);
            } else {
                const buffer = await file.arrayBuffer();
                setCustomFileBuffer(buffer);

                if (customWorkerRef.current) customWorkerRef.current.terminate();
                customWorkerRef.current = createProtoWorker();
                
                customWorkerRef.current.onmessage = (evt) => {
                    if (evt.data.error) toast.error("Failed to parse DAT", { description: evt.data.error });
                    else if (evt.data.type === 'success') {
                        setCustomData(evt.data.data);
                        setViewTag(null);
                        toast.success(`Loaded ${evt.data.data.length} categories from local file`);
                    }
                    setCustomLoading(false);
                };

                customWorkerRef.current.postMessage({ type: 'custom', fileBuffer: buffer, dataType: customFormat });
            }
        } catch (err: any) {
            toast.error("File read error", { description: err.message });
            setCustomLoading(false);
        }
        e.target.value = '';
    };

    const fetchCustomList = async () => {
        if (!customUrl || customUrl.includes('.')) { 
            if (customFileBuffer) return toast.info("Local file already loaded");
        }
        if (!customUrl.startsWith('http')) return toast.error("Please enter a valid URL");
        
        setCustomLoading(true);
        setCustomFileBuffer(null);
        
        if (customFormat === 'text') {
            try {
                const fetchWithFallbackText = async (targetUrl: string) => {
                    let targets = [];
                    const myProxy = `https://crs.bropines.workers.dev/${targetUrl}`;
                    
                    if (targetUrl.includes('raw.githubusercontent.com')) {
                        targets = [targetUrl, myProxy, `https://mirror.ghproxy.com/${targetUrl}`];
                    } else if (targetUrl.includes('github.com')) {
                        targets = [
                            myProxy,
                            `https://mirror.ghproxy.com/${targetUrl}`,
                            `https://ghproxy.net/${targetUrl}`,
                            targetUrl
                        ];
                    } else {
                        targets = [targetUrl, myProxy];
                    }
                    
                    let lastErr;
                    for (const target of targets) { 
                        try { 
                            const res = await fetch(target); 
                            if (res.ok) return await res.text(); 
                        } catch (e) { 
                            lastErr = e; 
                        } 
                    }
                    throw lastErr || new Error("Failed to fetch text");
                };

                const text = await fetchWithFallbackText(customUrl);
                const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('//'));
                const formattedData = lines.map(line => ({ code: line, count: 1 }));
                
                saveCachedData(customUrl, formattedData, { size: text.length });
                setCustomData(formattedData);
                setViewTag(null);
                toast.success(`Loaded ${formattedData.length} items`);
            } catch (err: any) {
                toast.error("Failed to fetch list", { description: err.message });
            } finally {
                setCustomLoading(false);
            }
            return;
        }

        if (customWorkerRef.current) customWorkerRef.current.terminate();
        customWorkerRef.current = createProtoWorker();
        
        customWorkerRef.current.onmessage = (e) => {
            if (e.data.error) toast.error("Failed to fetch/parse DAT", { description: e.data.error });
            else if (e.data.type === 'success') {
                saveCachedData(customUrl, e.data.data, e.data.meta);
                setCustomData(e.data.data);
                setViewTag(null);
                toast.success(`Loaded ${e.data.data.length} categories`);
            }
            setCustomLoading(false);
        };

        customWorkerRef.current.postMessage({ type: 'custom', customUrl, dataType: customFormat, force: true });
    };

    const displayData = useMemo(() => {
        let currentData: GeoItem[] = [];
        if (activeTab === 'geosite') currentData = geoSites;
        if (activeTab === 'geoip') currentData = geoIps;
        if (activeTab === 'custom') currentData = customData;

        if (!search) return currentData;
        const lowerSearch = search.toLowerCase();
        return currentData.filter(item => item.code.toLowerCase().includes(lowerSearch));
    }, [activeTab, geoSites, geoIps, customData, search]);

    const handleCopyAll = async () => {
        if (displayData.length === 0) return toast.warning("Nothing to copy");
        const prefix = activeTab === 'geosite' ? 'geosite:' : activeTab === 'geoip' ? 'geoip:' : '';
        const textToCopy = displayData.map(d => `${prefix}${d.code}`).join('\n');
        
        try {
            if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(textToCopy);
            else {
                const ta = document.createElement("textarea"); ta.value = textToCopy; ta.style.position = "fixed"; ta.style.left = "-999999px";
                document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand('copy'); ta.remove();
            }
            toast.success(`Copied ${displayData.length} items`);
        } catch { toast.error("Failed to copy data"); }
    };

    const handleTabChange = (tab: 'geosite' | 'geoip' | 'custom') => {
        setActiveTab(tab); setSearch(""); setViewTag(null);
    };

    return (
        <Modal title="Geo Data Viewer" onClose={onClose} onSave={onClose} className="max-w-6xl"
            extraButtons={
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
                    <button onClick={() => handleTabChange('geosite')} className={`px-4 py-1.5 text-xs font-bold rounded transition-all ${activeTab === 'geosite' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>GeoSite</button>
                    <button onClick={() => handleTabChange('geoip')} className={`px-4 py-1.5 text-xs font-bold rounded transition-all ${activeTab === 'geoip' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>GeoIP</button>
                    <button onClick={() => handleTabChange('custom')} className={`px-4 py-1.5 text-xs font-bold rounded transition-all ${activeTab === 'custom' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}>Custom Source</button>
                </div>
            }
        >
            <div className="h-[650px] flex flex-col gap-4 relative">
                
                {activeTab === 'custom' && (
                    <div className="flex flex-col gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800 shrink-0 animate-in fade-in slide-in-from-top-2">
                        
                        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mr-1">Quick Presets:</span>
                            {CUSTOM_PRESETS.map((p, i) => (
                                <button key={i} onClick={() => { setCustomUrl(p.url); setCustomFormat(p.format as any); }} className="px-2.5 py-1 text-[10px] font-bold bg-slate-950 border border-slate-700 text-slate-300 rounded hover:border-indigo-500 hover:bg-indigo-600/10 hover:text-indigo-300 transition-colors">
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-col md:flex-row gap-2">
                            <select className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none w-full md:w-auto" value={customFormat} onChange={(e: any) => { setCustomFormat(e.target.value); setViewTag(null); }}>
                                <option value="geoip">GeoIP (.dat)</option>
                                <option value="geosite">GeoSite (.dat)</option>
                                <option value="text">Raw Text (.txt)</option>
                            </select>
                            
                            <div className="flex-1 flex gap-2">
                                <div className="flex-1 relative">
                                    <Icon name="Link" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-emerald-500 outline-none transition-colors font-mono" placeholder="Paste URL or select local file..." value={customUrl} onChange={e => { setCustomUrl(e.target.value); setCustomFileBuffer(null); }} onKeyDown={e => e.key === 'Enter' && fetchCustomList()} />
                                </div>
                                
                                <input type="file" ref={fileInputRef} className="hidden" accept=".dat,.txt" onChange={handleFileUpload} />
                                <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="shrink-0" title="Upload Local File">
                                    <Icon name="UploadSimple" />
                                </Button>
                            </div>

                            <Button variant="success" onClick={fetchCustomList} disabled={customLoading}>
                                {customLoading ? <Icon name="Spinner" className="animate-spin" /> : <Icon name="DownloadSimple" />}
                                <span className="hidden md:inline">Fetch</span>
                            </Button>
                        </div>
                    </div>
                )}

                <div className="flex flex-col md:flex-row gap-3 items-center bg-slate-900 p-3 rounded-xl border border-slate-800 shrink-0">
                    <div className="flex-1 relative w-full">
                        <Icon name="MagnifyingGlass" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-indigo-500 outline-none transition-colors" placeholder={`Search in ${activeTab}...`} value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto justify-between">
                        <div className="text-xs text-slate-400 font-mono bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                            Showing: <span className="text-white font-bold">{displayData.length}</span>
                        </div>
                        <Button variant="secondary" onClick={handleCopyAll} icon="Copy">Copy All</Button>
                    </div>
                </div>

                <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto custom-scroll bg-slate-950 rounded-xl border border-slate-800 p-4 relative">
                        {loading && activeTab !== 'custom' ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                                <Icon name="Spinner" className="text-4xl animate-spin mb-4 text-indigo-500" />
                                <p>Validating database hash...</p>
                            </div>
                        ) : displayData.length === 0 ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                                <Icon name="Database" className="text-6xl mb-4 opacity-20" />
                                <p>{activeTab === 'custom' && customData.length === 0 ? "Select a preset, URL, or upload file." : "No items found."}</p>
                            </div>
                        ) : (
                            <div className={`grid gap-2 content-start transition-all duration-300 ${viewTag ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
                                {displayData.slice(0, 3000).map((item, i) => {
                                    const isText = activeTab === 'custom' && customFormat === 'text';
                                    const isActive = viewTag?.code === item.code;
                                    
                                    return (
                                        <div 
                                            key={i} 
                                            onClick={() => {
                                                if (isText) return;
                                                const prefix = activeTab === 'geosite' ? 'geosite:' : activeTab === 'geoip' ? 'geoip:' : customFormat === 'geosite' ? 'geosite:' : 'geoip:';
                                                setViewTag({ tag: `${prefix}${item.code}`, code: item.code, url: activeTab === 'custom' ? customUrl : undefined, format: activeTab === 'custom' ? customFormat : undefined });
                                            }}
                                            className={`flex justify-between items-center p-2.5 rounded-lg transition-all group ${isText ? 'bg-slate-900 border border-slate-800' : isActive ? 'bg-indigo-900/40 border border-indigo-500 ring-1 ring-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-slate-900 border border-slate-800 cursor-pointer hover:border-indigo-500/50 hover:bg-slate-800/80'}`}
                                        >
                                            <span className={`font-mono text-xs truncate pr-2 transition-colors ${isActive ? 'text-white font-bold' : 'text-slate-200 group-hover:text-white'}`} title={item.code}>{item.code}</span>
                                            {!isText && (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 border transition-colors ${isActive ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-slate-950 text-slate-500 border-transparent group-hover:border-indigo-500/50 group-hover:text-indigo-300'}`}>{item.count}</span>
                                            )}
                                        </div>
                                    );
                                })}
                                {displayData.length > 3000 && <div className="col-span-full text-center py-4 text-xs text-slate-500 italic">Showing first 3000 items. Use search to filter.</div>}
                            </div>
                        )}
                    </div>

                    {viewTag && <TagDetailsPanel tag={viewTag.tag} customUrl={viewTag.url} customFormat={viewTag.format} customFileBuffer={customFileBuffer} onClose={() => setViewTag(null)} />}
                </div>
            </div>
        </Modal>
    );
};