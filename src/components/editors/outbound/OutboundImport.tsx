import React, { useState } from 'react';
import { Button } from '../../ui/Button';
import { Help } from '../../ui/Help';
import { Icon } from '../../ui/Icon';
import { parseXrayLink, parseWireguardConfig, parseJsonSubscription } from '../../../utils/link-parser';
import { toast } from 'sonner';
import { t } from '../../../i18n';

export const OutboundImport = ({ onImport }: any) => {
    const [input, setInput] = useState("");

    const handleImport = (mode: 'direct' | 'chained' | 'only-obfuscator') => {
        const trimmed = input.trim();
        if (!trimmed) return;

        // Try link first
        if (trimmed.includes('://')) {
            const parsed = parseXrayLink(trimmed);
            if (parsed) {
                onImport(parsed);
                setInput("");
                toast.success(t("Link imported successfully"));
                return;
            }
        }

        // Try JSON config
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            const parsed = parseJsonSubscription(trimmed);
            if (parsed && parsed.length > 0) {
                if (parsed.length === 1) {
                    onImport(parsed[0]);
                    toast.success(t("JSON configuration imported"));
                } else {
                    onImport({ multiple: true, outbounds: parsed });
                    toast.success(`Imported ${parsed.length} outbounds from JSON`);
                }
                setInput("");
                return;
            }
        }

        // Try WG config
        if (trimmed.includes('[Interface]')) {
            const parsed = parseWireguardConfig(trimmed, mode === 'chained' ? 'chained' : 'direct');
            if (parsed) {
                if (mode === 'only-obfuscator') {
                    // Если режим "только обфускатор", парсим в chained и берем только freedom
                    const chained = parseWireguardConfig(trimmed, 'chained');
                    const obfuscator = chained.outbounds?.find((o: any) => o.protocol === 'freedom');
                    if (obfuscator) {
                        onImport(obfuscator);
                        setInput("");
                        toast.success(t("Only Obfuscator (Freedom) imported"));
                        return;
                    }
                }
                onImport(parsed);
                setInput("");
                toast.success(mode === 'chained'
                ? t("WG + Obfuscator (Legacy Chain) imported")
                : t("Direct WireGuard (Modern) imported"));
                return;
            }
        }

        toast.error(t("Unrecognized import format"));
    };

    const isAWGDetected = input.includes('[Interface]') && (input.includes('Jc') || input.includes('Jmin') || input.includes('<b 0x'));

    return (
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl mb-6 space-y-3">
            <div className="flex justify-between items-center">
                <label className="label-xs flex items-center gap-2">
                    Import from Link or WG Config
                    <Help>
                        Paste a link or a .conf file. 
                        <b>{t("Direct")}</b>: Finalmask inside WG (Xray 1.26+).
                        <b>{t("Chained")}</b>: Separate Freedom obfuscator (Legacy/Stale cores).
                    </Help>
                </label>
                {isAWGDetected && (
                    <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold animate-pulse">
                        <Icon name="MagicWand" />
{t("AmneziaWG Detected")}
</span>
                )}
            </div>
            <div className="flex flex-col gap-2">
                <textarea 
                    className={`w-full bg-slate-900 border rounded-lg p-2.5 text-white text-[11px] focus:border-indigo-500 outline-none transition-all font-mono min-h-[100px] custom-scroll ${isAWGDetected ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.05)]' : 'border-slate-800'}`} 
                    placeholder={t("Paste vless://... or [Interface]... config here")} 
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                />
                <div className="flex flex-wrap gap-2">
                    {isAWGDetected ? (
                        <>
                            <Button 
                                variant="success" 
                                className="flex-1 text-xs py-2 shadow-lg min-w-[140px]" 
                                onClick={() => handleImport('direct')} 
                                icon="Lightning"
                            >
                                {t("Modern (Direct)")}
                                </Button>
                            <Button 
                                variant="primary" 
                                className="flex-1 text-xs py-2 shadow-lg min-w-[140px]" 
                                onClick={() => handleImport('chained')} 
                                icon="Link"
                            >
                                {t("Legacy (Chained)")}
                                </Button>
                            <Button 
                                variant="secondary" 
                                className="text-[10px] py-2 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400" 
                                onClick={() => handleImport('only-obfuscator')} 
                                icon="ShieldCheck"
                            >
                                {t("Obfuscator Only")}
                                </Button>
                        </>
                    ) : (
                        <Button 
                            variant="primary" 
                            className="w-full text-xs py-2 shadow-lg" 
                            onClick={() => handleImport('direct')} 
                            icon="DownloadSimple"
                        >
                            {t("Import & Parse")}
                            </Button>
                    )}
                </div>
            </div>
        </div>
    );
};