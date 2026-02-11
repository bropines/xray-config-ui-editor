import React, { useState, useEffect } from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { useConfigStore } from '../../../store/configStore';
import { parseXrayLink } from '../../../utils/link-parser';
import { generateLink } from '../../../utils/link-generator';
import { toast } from 'sonner';

export const BatchOutboundModal = ({ onClose }: { onClose: () => void }) => {
    const { config, addOutbounds } = useConfigStore();
    const [mode, setMode] = useState<'import' | 'export'>('import');
    const [text, setText] = useState("");

    // Логика Экспорта: при переключении на экспорт генерируем ссылки
    useEffect(() => {
        if (mode === 'export') {
            const links: string[] = [];
            config?.outbounds?.forEach((ob: any) => {
                const link = generateLink(ob);
                if (link) links.push(link);
            });
            setText(links.join('\n'));
        } else {
            setText("");
        }
    }, [mode, config]);

    const handleImport = () => {
        if (!text.trim()) return;

        const lines = text.split(/\r?\n/);
        const newOutbounds: any[] = [];
        let failed = 0;

        lines.forEach(line => {
            const cleanLine = line.trim();
            if (!cleanLine) return;
            const parsed = parseXrayLink(cleanLine);
            if (parsed) {
                newOutbounds.push(parsed);
            } else {
                failed++;
            }
        });

        if (newOutbounds.length > 0) {
            addOutbounds(newOutbounds);
            toast.success(`Imported ${newOutbounds.length} outbounds`);
            if (failed > 0) {
                toast.warning(`Skipped ${failed} invalid lines`);
            }
            onClose();
        } else {
            toast.error("No valid links found");
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    };

    return (
        <Modal 
            title="Batch Operations" 
            onClose={onClose}
            className="max-w-2xl"
            extraButtons={
                mode === 'import' ? (
                    <Button onClick={handleImport} icon="DownloadSimple">Import Links</Button>
                ) : (
                    <Button onClick={handleCopy} icon="Copy">Copy All</Button>
                )
            }
            onSave={mode === 'import' ? handleImport : onClose}
        >
            <div className="space-y-4">
                {/* Tabs */}
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button 
                        onClick={() => setMode('import')} 
                        className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${mode === 'import' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-white'}`}
                    >
                        <Icon name="ArrowDown" className="mr-2"/> Import
                    </button>
                    <button 
                        onClick={() => setMode('export')} 
                        className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${mode === 'export' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:text-white'}`}
                    >
                        <Icon name="ArrowUp" className="mr-2"/> Export
                    </button>
                </div>

                <div className="relative">
                    <textarea 
                        className="w-full h-[400px] bg-slate-950 border border-slate-700 rounded-lg p-4 text-xs font-mono text-white focus:border-indigo-500 outline-none resize-none leading-relaxed"
                        placeholder={mode === 'import' ? "Paste multiple vless://, vmess://, ss:// links here (one per line)..." : "Generated links will appear here..."}
                        value={text}
                        onChange={e => setText(e.target.value)}
                        readOnly={mode === 'export'}
                    />
                    {mode === 'export' && (
                        <div className="absolute bottom-4 right-4 text-[10px] text-slate-500 bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
                            {text.split('\n').filter(l => l).length} links generated
                        </div>
                    )}
                </div>

                {mode === 'import' && (
                    <div className="text-[10px] text-slate-500 flex gap-2 items-center">
                        <Icon name="Info" />
                        <span>Supported: VLESS, VMess, Trojan, Shadowsocks. Invalid lines will be ignored.</span>
                    </div>
                )}
            </div>
        </Modal>
    );
};