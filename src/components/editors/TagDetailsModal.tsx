import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { createProtoWorker } from '../../utils/proto-worker';
import { toast } from 'sonner';
import { binaryCache, loadCachedData, saveCachedData } from '../../utils/geo-data';

export const TagDetailsModal = ({ 
    tag, 
    customUrl, 
    customFormat, 
    onClose 
}: { 
    tag: string, 
    customUrl?: string, 
    customFormat?: string, 
    onClose: () => void 
}) => {
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
            let buffer: ArrayBuffer | null = null;
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
                            ?[myProxy, currentUrl, `https://mirror.ghproxy.com/${currentUrl}`] 
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
    }, [tag, customUrl, customFormat]);

    const handleCopy = async () => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.left = "-999999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }
            toast.success("Copied to clipboard!");
        } catch (err) {
            toast.error("Copy failed");
        }
    };

    return (
        <Modal 
            title={`Details: ${tag}`} 
            onClose={onClose} 
            onSave={onClose} 
            className="max-w-2xl" 
            extraButtons={<Button variant="secondary" onClick={handleCopy} icon="Copy">Copy Raw Text</Button>}
        >
            <div className="h-[400px] relative">
                {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 rounded-xl">
                        <Icon name="Spinner" className="animate-spin text-4xl mb-3 text-indigo-500" />
                        <span className="text-xs font-bold uppercase tracking-wider">Extracting records...</span>
                    </div>
                ) : (
                    <textarea 
                        readOnly 
                        className="w-full h-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-xs font-mono text-emerald-400 resize-none outline-none custom-scroll focus:border-indigo-500 shadow-inner"
                        value={text}
                    />
                )}
            </div>
        </Modal>
    );
};