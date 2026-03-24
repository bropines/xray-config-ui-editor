import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { createProtoWorker } from '../../utils/proto-worker';
import { toast } from 'sonner';

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
        
        // Воркер сам применит прокси-каскад, если это GitHub ссылка
        worker.postMessage({ 
            type: 'get_details', 
            dataType: customFormat || (isGeosite ? 'geosite' : 'geoip'),
            targetCode,
            customUrl
        });

        return () => worker.terminate();
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