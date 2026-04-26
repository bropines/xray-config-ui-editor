import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { createProtoWorker } from '../utils/proto-worker';
import { binaryCache, loadCachedData, saveCachedData } from '../utils/geo-data';

export const useTagDetails = (tag: string, customUrl?: string, customFormat?: string, customFileBuffer?: ArrayBuffer | null) => {
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isCancelled = false;
        setLoading(true);
        const isGeosite = tag.toLowerCase().startsWith('geosite:');
        
        // ВАЖНО: Внутри .dat файлов (geosite/geoip) названия категорий всегда в UPPERCASE 
        // (например STEAM, GOOGLE, CN). Но в UI они часто в нижнем регистре.
        // Поэтому очищаем префикс и принудительно делаем UPPERCASE для поиска по БД:
        const targetCode = tag.replace(/^(geosite:|geoip:)/i, '').toUpperCase();
        
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

    const handleCopy = useCallback(async () => {
        try {
            if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
            else {
                const ta = document.createElement("textarea");
                ta.value = text; ta.style.position = "fixed"; ta.style.left = "-999999px";
                document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand('copy'); ta.remove();
            }
            toast.success("Copied to clipboard!");
        } catch { toast.error("Copy failed"); }
    }, [text]);

    return { text, loading, handleCopy };
};
