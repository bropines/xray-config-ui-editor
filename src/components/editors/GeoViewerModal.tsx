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

// ============================================================================
// Глобальный кэш бинарников в памяти
// ============================================================================
const binaryCache = new Map<string, ArrayBuffer>();

// ============================================================================
// IndexedDB Кеширование
// ============================================================================
const DB_NAME = 'GeoCacheDB';
const STORE_NAME = 'geo_data';

const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(STORE_NAME)) {
                request.result.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const loadCachedData = async (key: string): Promise<any> => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    } catch { return null; }
};

const saveCachedData = async (key: string, data: any, meta: any, rawBuffer?: ArrayBuffer) => {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const payload: any = { meta: { ...meta, timestamp: Date.now() }, data };
            if (rawBuffer) payload.buffer = rawBuffer;
            const req = store.put(payload, key);
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
        });
    } catch (err) { console.warn("Geo cache write failed", err); }
};

// ============================================================================
// Боковая панель
// ============================================================================
const TagDetailsPanel = ({ tag, customUrl, customFormat, customFileBuffer, onClose }: { tag: string, customUrl?: string, customFormat?: string, customFileBuffer?: ArrayBuffer | null, onClose: () => void }) => {
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isCancelled = false;
        setLoading(true);
        const isGeosite = tag.startsWith('geosite:');
        const targetCode = tag.replace('geosite:', '').replace('geoip:', '');
        
        const defaultUrl = isGeosite 
            ? "https://cdn.jsdelivr.net/gh/v2fly/domain-list-community@release/dlc.dat" 
            : "https://cdn.jsdelivr.net/gh/v2fly/geoip@release/geoip.dat";
        
        const currentUrl = customUrl || defaultUrl;
        let activeWorker: Worker | null = null;

        const loadData = async () => {
            let buffer = customFileBuffer;

            if (!buffer) {
                if (binaryCache.has(currentUrl)) {
                    buffer = binaryCache.get(currentUrl)!;
                } else {
                    try {
                        const cached = await loadCachedData(currentUrl + "_raw");
                        if (cached && cached.buffer) {
                            buffer = cached.buffer;
                            binaryCache.set(currentUrl, buffer);
                        } else {
                            const myProxy = `https://crs.bropines.workers.dev/${currentUrl}`;
                            const targets = currentUrl.includes('github') || currentUrl.includes('jsdelivr') 
                                ? [myProxy, currentUrl, `https://mirror.ghproxy.com/${currentUrl}`] 
                                : [currentUrl, myProxy];
                            
                            let res;
                            for (const target of targets) {
                                try {
                                    res = await fetch(target);
                                    if (res.ok) break;
                                } catch (e) {}
                            }

                            if (res && res.ok) {
                                buffer = await res.arrayBuffer();
                                binaryCache.set(currentUrl, buffer);
                                await saveCachedData(currentUrl + "_raw", null, {}, buffer);
                            } else {
                                throw new Error("Fetch failed");
                            }
                        }
                    } catch (err) {
                        if (!isCancelled) {
                            toast.error("Failed to download database for extraction");
                            setText("Network error.");
                            setLoading(false);
                        }
                        return;
                    }
                }
            }

            if (isCancelled) return;

            activeWorker = createProtoWorker();
            activeWorker.onmessage = (e) => {
                if (isCancelled) return;
                if (e.data.error) {
                    toast.error("Failed to load details");
                    setText("Error loading data.\n" + e.data.error);
                } else if (e.data.type === 'details') {
                    setText(e.data.data || "No records found.");
                }
                setLoading(false);
            };
           
            activeWorker.postMessage({ 
                type: 'get_details', 
                dataType: customFormat || (isGeosite ? 'geosite' : 'geoip'), 
                targetCode, 
                customUrl: undefined,
                fileBuffer: buffer 
            });
        };

        loadData();

        return () => {
            isCancelled = true;
            if (activeWorker) activeWorker.terminate();
        };
    }, [tag, customUrl, customFormat, customFileBuffer]);

    const handleCopy = async () => {
        try {
            if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
            else {
                const ta = document.createElement("textarea");
                ta.value = text; ta.style.position = "fixed"; ta.style.left = "-999999px";
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
// VIRTUAL GRID (Кастомный рендер для 1+ млн строк)
// ============================================================================
const VirtualGrid = ({ items, activeTab, customFormat, customUrl, viewTag, setViewTag }: any) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [dimensions, setDimensions] = useState({ width: 0, height: 600 });

    useEffect(() => {
        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
            }
        });
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const cols = useMemo(() => {
        const w = dimensions.width;
        if (viewTag) {
            if (w >= 1280) return 3; // xl
            if (w >= 640) return 2;  // sm
            return 1;
        } else {
            if (w >= 1024) return 4; // lg
            if (w >= 768) return 3;  // md
            if (w >= 640) return 2;  // sm
            return 1;
        }
    }, [dimensions.width, viewTag]);

    const ROW_HEIGHT = 46; // 38px высота элемента + 8px gap
    const OVERSCAN = 10; // Сколько невидимых рядов рендерить сверху и снизу для плавности

    const totalRows = Math.ceil(items.length / cols);
    const totalHeight = totalRows * ROW_HEIGHT;

    const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const endRow = Math.min(totalRows, Math.floor((scrollTop + dimensions.height) / ROW_HEIGHT) + OVERSCAN);

    const visibleItems = items.slice(startRow * cols, endRow * cols);
    const offsetY = startRow * ROW_HEIGHT;

    return (
        <div 
            ref={containerRef} 
            onScroll={(e: any) => setScrollTop(e.target.scrollTop)} 
            className="flex-1 overflow-y-auto custom-scroll bg-slate-950 rounded-xl border border-slate-800 relative"
        >
            <div style={{ height: totalHeight + 32, minHeight: '100%' }}> {/* 32px для отступов */}
                <div style={{ transform: `translateY(${offsetY + 16}px)`, padding: '0 16px', position: 'absolute', left: 0, right: 0 }}>
                    <div className={`grid gap-2 content-start transition-all duration-300 ${viewTag ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
                        {visibleItems.map((item: any) => {
                            const isText = activeTab === 'custom' && customFormat === 'text';
                            const isActive = viewTag?.code === item.code;
                            return (
                                <div 
                                    key={item.code} 
                                    onClick={() => {
                                        if (isText) return;
                                        const prefix = activeTab === 'geosite' ? 'geosite:' : activeTab === 'geoip' ? 'geoip:' : customFormat === 'geosite' ? 'geosite:' : 'geoip:';
                                        setViewTag({ tag: `${prefix}${item.code}`, code: item.code, url: activeTab === 'custom' ? customUrl : undefined, format: activeTab === 'custom' ? customFormat : undefined });
                                    }}
                                    className={`flex justify-between items-center p-2.5 h-[38px] rounded-lg transition-all group ${isText ? 'bg-slate-900 border border-slate-800' : isActive ? 'bg-indigo-900/40 border border-indigo-500 ring-1 ring-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-slate-900 border border-slate-800 cursor-pointer hover:border-indigo-500/50 hover:bg-slate-800/80'}`}
                                >
                                    <span className={`font-mono text-xs truncate pr-2 transition-colors ${isActive ? 'text-white font-bold' : 'text-slate-200 group-hover:text-white'}`} title={item.code}>{item.code}</span>
                                    {!isText && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 border transition-colors ${isActive ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-slate-950 text-slate-500 border-transparent group-hover:border-indigo-500/50 group-hover:text-indigo-300'}`}>{item.count}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
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
    const [customData, setCustomData] = useState<GeoItem[]>([]);
    
    const [geoSites, setGeoSites] = useState<GeoItem[]>([]);
    const [geoIps, setGeoIps] = useState<GeoItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [customLoading, setCustomLoading] = useState(false);
    
    // Стейты для Debounce поиска
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [viewTag, setViewTag] = useState<{ tag: string, code: string, url?: string, format?: string } | null>(null);

    const customWorkerRef = useRef<Worker | null>(null);

    // Debounce эффект для поиска (чтобы интерфейс не вис при поиске по миллиону элементов)
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        localStorage.setItem('geo_tab', activeTab);
        localStorage.setItem('geo_url', customUrl);
        localStorage.setItem('geo_format', customFormat);
    }, [activeTab, customUrl, customFormat]);

    useEffect(() => {
        const url = localStorage.getItem('geo_url');
        if (url) {
            loadCachedData(url).then(cache => {
                if (cache?.data) setCustomData(cache.data);
            });
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        const worker = createProtoWorker();
        const geositeUrl = "https://cdn.jsdelivr.net/gh/v2fly/domain-list-community@release/dlc.dat";
        const geoipUrl = "https://cdn.jsdelivr.net/gh/v2fly/geoip@release/geoip.dat";
        
        const CACHE_TTL = 24 * 60 * 60 * 1000;

        const loadCachesAndStart = async () => {
            setLoading(true);
            const now = Date.now();

            const cacheSite = await loadCachedData(geositeUrl);
            const cacheIp = await loadCachedData(geoipUrl);

            if (cacheSite?.data && isMounted) setGeoSites(cacheSite.data);
            if (cacheIp?.data && isMounted) setGeoIps(cacheIp.data);

            const siteNeedsUpdate = !cacheSite || (now - (cacheSite.meta?.timestamp || 0) > CACHE_TTL);
            const ipNeedsUpdate = !cacheIp || (now - (cacheIp.meta?.timestamp || 0) > CACHE_TTL);

            if (!siteNeedsUpdate && !ipNeedsUpdate) {
                if (isMounted) setLoading(false);
                return;
            }

            worker.onmessage = (e) => {
                if (!isMounted) return;
                const { type, targetType, data, meta } = e.data;
                
                if (type === 'cache_hit') { 
                    if (targetType === 'geosite' && cacheSite?.data) setGeoSites(cacheSite.data);
                    if (targetType === 'geoip' && cacheIp?.data) setGeoIps(cacheIp.data);
                } 
                else if (type === 'success') {
                    const url = targetType === 'geosite' ? geositeUrl : geoipUrl;
                    saveCachedData(url, data, meta);
                    if (targetType === 'geosite') setGeoSites(data);
                    if (targetType === 'geoip') setGeoIps(data);
                }
                
                setLoading(false);
            };
            
            if (siteNeedsUpdate) worker.postMessage({ type: 'geosite', cachedMeta: cacheSite?.meta });
            if (ipNeedsUpdate) worker.postMessage({ type: 'geoip', cachedMeta: cacheIp?.meta });
        };

        loadCachesAndStart();
        
        return () => {
            isMounted = false;
            worker.terminate();
        };
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

        try {
            const myProxy = `https://crs.bropines.workers.dev/${customUrl}`;
            let targets = [];
            if (customUrl.includes('raw.githubusercontent.com')) {
                targets = [customUrl, myProxy, `https://mirror.ghproxy.com/${customUrl}`];
            } else if (customUrl.includes('github.com')) {
                targets = [myProxy, `https://mirror.ghproxy.com/${customUrl}`, `https://ghproxy.net/${customUrl}`, customUrl];
            } else {
                targets = [customUrl, myProxy];
            }
            
            let res;
            for (const target of targets) { 
                try { 
                    res = await fetch(target);
                    if (res.ok) break;
                } catch (e) {} 
            }
            if (!res || !res.ok) throw new Error("Failed to fetch list from URL");

            if (customFormat === 'text') {
                const text = await res.text();
                const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('//'));
                const formattedData = lines.map(line => ({ code: line, count: 1 }));
                
                await saveCachedData(customUrl, formattedData, { size: text.length });
                setCustomData(formattedData);
                setViewTag(null);
                toast.success(`Loaded ${formattedData.length} items`);
                setCustomLoading(false);
            } else {
                const buffer = await res.arrayBuffer();
                binaryCache.set(customUrl, buffer);
                await saveCachedData(customUrl + "_raw", null, { timestamp: Date.now() }, buffer);

                if (customWorkerRef.current) customWorkerRef.current.terminate();
                customWorkerRef.current = createProtoWorker();

                customWorkerRef.current.onmessage = async (e) => {
                    if (e.data.error) toast.error("Failed to parse DAT", { description: e.data.error });
                    else if (e.data.type === 'success') {
                        await saveCachedData(customUrl, e.data.data, e.data.meta || { timestamp: Date.now() });
                        setCustomData(e.data.data);
                        setViewTag(null);
                        toast.success(`Loaded ${e.data.data.length} categories`);
                    }
                    setCustomLoading(false);
                };

                customWorkerRef.current.postMessage({ type: 'custom', fileBuffer: buffer, dataType: customFormat });
            }
        } catch (err: any) {
            toast.error("Failed to fetch list", { description: err.message });
            setCustomLoading(false);
        }
    };

    const displayData = useMemo(() => {
        let currentData: GeoItem[] = [];
        if (activeTab === 'geosite') currentData = geoSites;
        if (activeTab === 'geoip') currentData = geoIps;
        if (activeTab === 'custom') currentData = customData;

        // Поиск теперь использует debouncedSearch
        if (!debouncedSearch) return currentData;
        const lowerSearch = debouncedSearch.toLowerCase();
        return currentData.filter(item => item.code.toLowerCase().includes(lowerSearch));
    }, [activeTab, geoSites, geoIps, customData, debouncedSearch]);

    const handleCopyAll = async () => {
        if (displayData.length === 0) return toast.warning("Nothing to copy");
        const prefix = activeTab === 'geosite' ? 'geosite:' : activeTab === 'geoip' ? 'geoip:' : '';
        const textToCopy = displayData.map(d => `${prefix}${d.code}`).join('\n');
        
        try {
            if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(textToCopy);
            else {
                const ta = document.createElement("textarea");
                ta.value = textToCopy; ta.style.position = "fixed"; ta.style.left = "-999999px";
                document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand('copy'); ta.remove();
            }
            toast.success(`Copied ${displayData.length} items`);
        } catch { toast.error("Failed to copy data"); }
    };

    const handleTabChange = (tab: 'geosite' | 'geoip' | 'custom') => {
        setActiveTab(tab); setSearch(""); setDebouncedSearch("");
        setViewTag(null);
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
                    {loading && activeTab !== 'custom' ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                            <Icon name="Spinner" className="text-4xl animate-spin mb-4 text-indigo-500" />
                            <p>Validating database hash...</p>
                        </div>
                    ) : displayData.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600 bg-slate-950 rounded-xl border border-slate-800">
                            <Icon name="Database" className="text-6xl mb-4 opacity-20" />
                            <p>{activeTab === 'custom' && customData.length === 0 ? "Select a preset, URL, or upload file." : "No items found."}</p>
                        </div>
                    ) : (
                        // Используем наш VirtualGrid вместо обычного map()
                        <VirtualGrid 
                            items={displayData} 
                            activeTab={activeTab} 
                            customFormat={customFormat} 
                            customUrl={customUrl} 
                            viewTag={viewTag} 
                            setViewTag={setViewTag} 
                        />
                    )}

                    {viewTag && <TagDetailsPanel tag={viewTag.tag} customUrl={viewTag.url} customFormat={viewTag.format} customFileBuffer={customFileBuffer} onClose={() => setViewTag(null)} />}
                </div>
            </div>
        </Modal>
    );
};