import React, { useState } from 'react';
import { Button } from '../../ui/Button';
import { Help } from '../../ui/Help';
import { Icon } from '../../ui/Icon';
import { parseXrayLink, parseWireguardConfig } from '../../../utils/link-parser';
import { toast } from 'sonner';

export const OutboundImport = ({ onImport }: any) => {
    const [input, setInput] = useState("");

    const handleImport = (onlyObfuscator = false) => {
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
                if (parsed.multiple && onlyObfuscator) {
                    const obfuscator = parsed.outbounds.find((o: any) => o.protocol === 'freedom');
                    if (obfuscator) {
                        onImport(obfuscator);
                        setInput("");
                        toast.success("Only Obfuscator (Freedom) imported");
                        return;
                    }
                }
                onImport(parsed);
                setInput("");
                toast.success("WireGuard / AmneziaWG config imported");
                return;
            }
        }

        toast.error("Unrecognized import format");
    };

    const isAWGDetected = input.includes('[Interface]') && (input.includes('Jc') || input.includes('Jmin') || input.includes('<b 0x'));

    return (
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl mb-6 space-y-3">
            <div className="flex justify-between items-center">
                <label className="label-xs flex items-center gap-2">
                    Import from Link or WG Config
                    <Help>
                        Paste a vless/vmess/trojan/ss link or a full WireGuard/AmneziaWG .conf file. 
                        If Amnezia parameters (Jc, Jmin, I1, etc.) are detected, the system will automatically 
                        generate a chained Freedom-obfuscator with Finalmask noise.
                    </Help>
                </label>
                {isAWGDetected && (
                    <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold animate-pulse">
                        <Icon name="MagicWand" /> AmneziaWG Detected
                    </span>
                )}
            </div>
            <div className="flex flex-col gap-2">
                <textarea 
                    className={`w-full bg-slate-900 border rounded-lg p-2.5 text-white text-[11px] focus:border-indigo-500 outline-none transition-all font-mono min-h-[100px] custom-scroll ${isAWGDetected ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.05)]' : 'border-slate-800'}`} 
                    placeholder="Paste vless://... or [Interface]... config here" 
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                />
                <div className="flex gap-2">
                    <Button 
                        variant={isAWGDetected ? "success" : "primary"} 
                        className="flex-1 text-xs py-2 shadow-lg" 
                        onClick={() => handleImport(false)} 
                        icon={isAWGDetected ? "MagicWand" : "DownloadSimple"}
                    >
                        {isAWGDetected ? "Smart Convert AmneziaWG" : "Import & Parse"}
                    </Button>
                    {isAWGDetected && (
                        <Button 
                            variant="secondary" 
                            className="text-[10px] py-2 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400" 
                            onClick={() => handleImport(true)} 
                            icon="ShieldCheck"
                        >
                            Obfuscator Only
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};