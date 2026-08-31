import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Select } from '../ui/Select';
import { useWarpGenerator } from '../../hooks/useWarpGenerator';

interface WarpGeneratorModalProps {
    onClose: () => void;
    onGenerate: (outbound: any) => void;
}

export const WarpGeneratorModal = ({ onClose, onGenerate }: WarpGeneratorModalProps) => {
    const {
        loading,
        presetType,
        setPresetType,
        excludeLocal,
        setExcludeLocal,
        handleGenerate,
    } = useWarpGenerator(onGenerate, onClose);

    return (
        <Modal title="Generate WARP(WG) Outbound" onClose={onClose} onSave={onClose} extraButtons={null} className="max-w-md">
            <div className="space-y-8 py-2">
                <div className="p-4 bg-indigo-900/10 border border-indigo-500/20 rounded-xl flex items-start gap-3">
                    <Icon name="Lightning" className="text-amber-400 text-xl shrink-0 mt-0.5" weight="fill" />
                    <div className="text-[11px] text-indigo-200 leading-relaxed">
                        This tool registers a new Cloudflare WARP account and generates a pre-configured WireGuard outbound profile.
                    </div>
                </div>

                <div className="space-y-6">
                    <Select
                        label="WARP Configuration Profile"
                        hint="Choose a profile based on your network. Profiles A-C use advanced obfuscation (AmneziaWG/Finalmask)."
                        value={presetType}
                        onChange={val => setPresetType(val)}
                        options={[
                            { value: 'standard', label: 'Standard WARP (Direct)' },
                            { value: 'awgm1', label: 'WARP Profile A (Optimized)' },
                            { value: 'awgm2', label: 'WARP Profile B (Optimized Alt)' },
                            { value: 'awgm3', label: 'WARP Profile C (Aggressive)' },
                        ]}
                    />

                    <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-200">Exclude Local Traffic</span>
                            <span className="text-[10px] text-slate-500">Bypass local networks (192.168.x.x, etc.)</span>
                        </div>
                        <input
                            type="checkbox"
                            className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            checked={excludeLocal}
                            onChange={e => setExcludeLocal(e.target.checked)}
                        />
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-800 flex flex-col gap-3">
                    <Button variant="success" icon={loading ? "CircleNotch" : "Lightning"} className={`w-full py-3 h-12 text-sm font-bold ${loading ? "animate-pulse" : ""}`} onClick={handleGenerate} disabled={loading}>
                        {loading ? "Registering WARP..." : "Generate & Add Outbound"}
                    </Button>
                    <Button variant="secondary" className="w-full py-2 text-xs" onClick={onClose} disabled={loading}>Cancel</Button>
                </div>
            </div>
        </Modal>
    );
};
