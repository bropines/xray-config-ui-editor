import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Select } from '../ui/Select';
import { useWarpGenerator, type WarpTunnel } from '../../hooks/useWarpGenerator';
import { t } from '../../i18n';

interface WarpGeneratorModalProps {
    onClose: () => void;
    onGenerate: (outbound: any) => void;
}

export const WarpGeneratorModal = ({ onClose, onGenerate }: WarpGeneratorModalProps) => {
    const {
        loading,
        tunnel,
        setTunnel,
        masqueOffered,
        coreTag,
        presetType,
        setPresetType,
        excludeLocal,
        setExcludeLocal,
        handleGenerate,
    } = useWarpGenerator(onGenerate, onClose);

    // Which way the device is reached: a mode, so it sits with the footer
    // controls rather than above the content.
    const tunnelTab = (id: WarpTunnel, label: string, disabled = false) => (
        <button
            key={id}
            onClick={() => setTunnel(id)}
            disabled={disabled || loading}
            title={disabled ? t("Needs Xray 26.10 or newer") : undefined}
            className={`px-2.5 py-1.5 text-xs font-bold rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                tunnel === id ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
        >
            {label}
        </button>
    );

    return (
        <Modal
            title={t("WARP Generator")}
            onClose={onClose}
            onSave={onClose}
            extraButtons={null}
            className="max-w-md"
            tabs={
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0" data-testid="warp-tunnel">
                    {tunnelTab('wireguard', t("WireGuard"))}
                    {tunnelTab('masque', t("MASQUE"), !masqueOffered)}
                </div>
            }
        >
            <div className="space-y-8 py-2">
                <div className="p-4 bg-indigo-900/10 border border-indigo-500/20 rounded-xl flex items-start gap-3">
                    <Icon name="Lightning" className="text-amber-400 text-xl shrink-0 mt-0.5" weight="fill" />
                    <div className="text-[11px] text-indigo-200 leading-relaxed">
                        {tunnel === 'masque'
                            ? t("Registers a new Cloudflare WARP device and enrols a key for MASQUE on it. The outbound reaches Cloudflare over HTTP/3 — QUIC on UDP 443, like the official app's MASQUE mode — instead of WireGuard. The key is made in this browser and never sent anywhere.")
                            : t("This tool registers a new Cloudflare WARP account and generates a pre-configured WireGuard outbound profile.")}
                    </div>
                </div>

                {!masqueOffered && (
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                        {t("MASQUE needs Xray 26.10 or newer, which connects to WARP over it by itself; the editor targets {tag}. Pick the newer line in Settings → General to use it.", { tag: coreTag })}
                    </p>
                )}

                {tunnel === 'wireguard' ? (
                    <div className="space-y-6">
                        <Select
                            label={t("WARP Configuration Profile")}
                            hint={t("Choose a profile based on your network. Profiles A-C use advanced obfuscation (AmneziaWG/Finalmask).")}
                            value={presetType}
                            onChange={val => setPresetType(val)}
                            options={[
                                { value: 'standard', label: t("Standard WARP (Direct)") },
                                { value: 'awgm1', label: t("WARP Profile A (Optimized)") },
                                { value: 'awgm2', label: t("WARP Profile B (Optimized Alt)") },
                                { value: 'awgm3', label: t("WARP Profile C (Aggressive)") },
                            ]}
                        />

                        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-200">{t("Exclude Local Traffic")}</span>
                                <span className="text-[10px] text-slate-500">{t("Bypass local networks (192.168.x.x, etc.)")}</span>
                            </div>
                            <input
                                type="checkbox"
                                className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                checked={excludeLocal}
                                onChange={e => setExcludeLocal(e.target.checked)}
                            />
                        </div>
                    </div>
                ) : (
                    <ul className="text-[11px] text-slate-400 leading-relaxed space-y-2 list-disc pl-4">
                        <li>{t("Every machine that runs this config needs Xray 26.10 or newer: older cores either have no masque or cannot speak Cloudflare's version of it.")}</li>
                        <li>{t("There is no allowed-IPs list here. Keep local networks off the tunnel with a routing rule that sends them to direct.")}</li>
                        <li>{t("Where UDP is blocked, set the outbound's TLS ALPN to h2 to use HTTP/2 over TCP instead.")}</li>
                    </ul>
                )}

                <div className="pt-6 border-t border-slate-800 flex flex-col gap-3">
                    <Button variant="success" icon={loading ? "CircleNotch" : "Lightning"} className={`w-full py-3 h-12 text-sm font-bold ${loading ? "animate-pulse" : ""}`} onClick={handleGenerate} disabled={loading || (tunnel === 'masque' && !masqueOffered)}>
                        {loading ? t("Registering WARP...") : t("Generate & Add Outbound")}
                    </Button>
                    <Button variant="secondary" className="w-full py-2 text-xs" onClick={onClose} disabled={loading}>{t("Cancel")}</Button>
                </div>
            </div>
        </Modal>
    );
};
