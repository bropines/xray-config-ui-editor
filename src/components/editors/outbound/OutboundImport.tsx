import React, { useState } from 'react';
import { Button } from '../../ui/Button';
import { parseXrayLink, parseWireguardConfig } from '../../../utils/link-parser';
import { toast } from 'sonner';

export const OutboundImport = ({ onImport }: any) => {
    const [input, setInput] = useState("");

    const handleImport = () => {
        const trimmed = input.trim();
        if (!trimmed) return;

        // Try link first
        if (trimmed.includes('://')) {
            const parsed = parseXrayLink(trimmed);
            if (parsed) {
                onImport(parsed);
                setInput("");
                toast.success("Link imported successfully");
                return;
            }
        }

        // Try WG config
        if (trimmed.includes('[Interface]')) {
            const parsed = parseWireguardConfig(trimmed);
            if (parsed) {
                onImport(parsed);
                setInput("");
                toast.success("WireGuard / AmneziaWG config imported");
                return;
            }
        }

        toast.error("Unrecognized import format");
    };

    return (
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl mb-6 space-y-3">
            <label className="label-xs flex justify-between">
                Import from Link or WG Config
                <span className="text-[10px] text-slate-500 font-normal">Supports AmneziaWG + Noise gen</span>
            </label>
            <div className="flex flex-col gap-2">
                <textarea 
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white text-[11px] focus:border-indigo-500 outline-none transition-colors font-mono min-h-[80px] custom-scroll" 
                    placeholder="Paste vless://... or [Interface]... config here" 
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                />
                <Button variant="primary" className="text-xs py-2" onClick={handleImport} icon="DownloadSimple">Import & Parse</Button>
            </div>
        </div>
    );
};