import React from 'react';
import { Icon } from '../../ui/Icon';
import { Button } from '../../ui/Button';
import { Help } from '../../ui/Help';
import { Select } from '../../ui/Select';
import { DurationInput } from '../../ui/DurationInput';
import { useFinalmaskEditor, FINALMASK_LAYER_TYPES as TYPES } from '../../../hooks/useFinalmaskEditor';
import { t } from '../../../i18n';

export const FinalmaskEditor = ({ finalmask, onChange }) => {
    const {
        enabled,
        toggle,
        addLayer,
        removeLayer,
        changeType,
        updateSetting,
        updateQuic,
    } = useFinalmaskEditor(finalmask, onChange);

    return (
        <div className="border-t border-slate-800 pt-4 space-y-4">
            <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                    <Icon name="Shield" size={14} />
{t("Finalmask Configuration")}
</label>
                <button
                    onClick={toggle}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${enabled ? 'bg-rose-500/10 border-rose-500/50 text-rose-500 hover:bg-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/20'}`}
                >
                    {enabled ? "REMOVE" : "ADD"}
                </button>
            </div>

            {enabled && (
                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/60 space-y-8">
                    {/* UDP & TCP Configurations */}
                    {(['udp', 'tcp'] as const).map(netType => {
                        const layers = finalmask[netType] || [];

                        return (
                            <div key={netType} className="space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-800/50 pb-2">
                                    <span className="text-xs text-emerald-500 uppercase font-bold">
                                        {t("{net} obfuscation chain", { net: netType.toUpperCase() })}
                                    </span>
                                    <Button variant="secondary" className="px-2 py-1 text-[10px]" onClick={() => addLayer(netType)}>
                                        + {t("Add Layer")}
                                    </Button>
                                </div>

                                {layers.length === 0 ? (
                                    <div className="text-xs text-slate-600 italic">
                                        {t("No {net} obfuscation layers.", { net: netType.toUpperCase() })}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {layers.map((layer: any, index: number) => {
                                            const currentType = layer.type || "none";
                                            return (
                                                <div key={index} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 space-y-3 relative">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-bold text-slate-400">
                                                            {t("Layer {n}", { n: index + 1 })}
                                                        </span>
                                                        <button onClick={() => removeLayer(netType, index)} className="text-rose-500 hover:text-rose-400 p-1">
                                                            <Icon name="Trash" size={14} />
                                                        </button>
                                                    </div>

                                                        <Select
                                                            label={t("Layer Type")}
                                                            value={currentType}
                                                            onChange={val => changeType(netType, index, val)}
                                                            options={TYPES.map(t => ({ value: t, label: t }))}
                                                            className="flex-1"
                                                        />

                                                    {currentType === 'noise' && layer.settings?.noise && (
                                                        <div className="space-y-2">
                                                            {layer.settings.noise.map((n: any, i: number) => (
                                                                <div key={i} className="flex gap-2 items-center bg-slate-950 p-2 rounded border border-slate-800/50">
                                                                    <Select
                                                                        value={n.packet !== undefined ? "hex" : "rand"}
                                                                        onChange={val => {
                                                                            const newNoise = [...layer.settings.noise];
                                                                            const newN = { ...n };
                                                                            if (val === 'hex') {
                                                                                delete newN.rand;
                                                                                newN.packet = "";
                                                                                newN.type = "hex";
                                                                            } else {
                                                                                delete newN.packet;
                                                                                delete newN.type;
                                                                                newN.rand = "40-70";
                                                                            }
                                                                            newNoise[i] = newN;
                                                                            updateSetting(netType, index, 'noise', newNoise);
                                                                        }}
                                                                        options={[
                                                                            { value: "hex", label: t("HEX") },
                                                                            { value: "rand", label: t("RAND") },
                                                                        ]}
                                                                        className="w-24 shrink-0"
                                                                    />

                                                                    {n.packet !== undefined ? (
                                                                        <div className="flex-1 relative group/input">
                                                                            <input className="input-base text-[10px] font-mono w-full py-1 h-7 pr-6" placeholder="Hex (supports <b 0x...>)" value={n.packet} onChange={e => {
                                                                                let val = e.target.value;
                                                                                if (val.includes('0x')) {
                                                                                    const match = val.match(/0x([0-9a-fA-F]+)/);
                                                                                    if (match) val = match[1];
                                                                                }
                                                                                const newNoise = [...layer.settings.noise];
                                                                                newNoise[i] = { ...n, packet: val };
                                                                                updateSetting(netType, index, 'noise', newNoise);
                                                                            }} />
                                                                        </div>
                                                                    ) : (
                                                                        <input className="input-base text-[10px] font-mono flex-1 py-1 h-7" placeholder="40-70" value={n.rand} onChange={e => {
                                                                            const newNoise = [...layer.settings.noise];
                                                                            newNoise[i] = { ...n, rand: e.target.value };
                                                                            updateSetting(netType, index, 'noise', newNoise);
                                                                        }} />
                                                                    )}
                                                                    <input className="input-base text-[10px] font-mono w-16 py-1 h-7 text-center" placeholder={t("Delay")} value={n.delay || ""} onChange={e => {
                                                                        const newNoise = [...layer.settings.noise];
                                                                        newNoise[i] = { ...n, delay: e.target.value };
                                                                        updateSetting(netType, index, 'noise', newNoise);
                                                                    }} />
                                                                    <button onClick={() => {
                                                                        const newNoise = [...layer.settings.noise];
                                                                        newNoise.splice(i, 1);
                                                                        updateSetting(netType, index, 'noise', newNoise);
                                                                    }} className="text-rose-500 hover:text-rose-400 p-1"><Icon name="Trash" size={14} /></button>
                                                                </div>
                                                            ))}
                                                            <Button variant="secondary" className="px-2 py-1 text-[10px]" onClick={() => {
                                                                const newNoise = [...(layer.settings.noise || []), { rand: "40-70", delay: "5-10" }];
                                                                updateSetting(netType, index, 'noise', newNoise);
                                                            }}>+ Add Noise Packet</Button>
                                                        </div>
                                                    )}

                                                    {['salamander', 'mkcp-aes128gcm', 'sudoku'].includes(currentType) && (
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <input className="input-base text-xs font-mono" placeholder={t("Password")} value={layer.settings?.password || ""} onChange={e => updateSetting(netType, index, 'password', e.target.value)} />
                                                            {currentType === 'sudoku' && (
                                                                <input className="input-base text-xs font-mono" placeholder={t("ASCII")} value={layer.settings?.ascii || ""} onChange={e => updateSetting(netType, index, 'ascii', e.target.value)} />
                                                            )}
                                                        </div>
                                                    )}

                                                    {['header-dns', 'xdns'].includes(currentType) && (
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <input className="input-base text-xs font-mono" placeholder={t("Domain")} value={layer.settings?.domain || ""} onChange={e => updateSetting(netType, index, 'domain', e.target.value)} />
                                                        </div>
                                                    )}

                                                    {currentType === 'xicmp' && (
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <input className="input-base text-xs font-mono" placeholder={t("Listen IP (0.0.0.0)")} value={layer.settings?.listenIp || "0.0.0.0"} onChange={e => updateSetting(netType, index, 'listenIp', e.target.value)} />
                                                            <input className="input-base text-xs font-mono" type="number" placeholder={t("ID")} value={layer.settings?.id || 0} onChange={e => updateSetting(netType, index, 'id', Number(e.target.value))} />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* QUIC Params */}
                    <div className="space-y-4 pt-4 border-t border-slate-800/50">
                        <span className="text-[10px] text-blue-400 uppercase font-bold flex items-center gap-1.5">
                            QUIC Parameters <Help>{t("Experimental. Controls BBR/Brutal congestion and limits.")}</Help>
                        </span>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] uppercase font-bold text-slate-600 ml-1">{t("Max Idle Timeout")}</label>
                                <DurationInput
                                    placeholder="30"
                                    value={finalmask.quicParams?.max_idle_timeout}
                                    onChange={val => updateQuic('max_idle_timeout', val)}
                                    defaultUnit="s"
                                    mode="number"
                                    baseUnit="s"
                                    unitOptions={['ms', 's', 'm', 'h']}
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] uppercase font-bold text-slate-600 ml-1">{t("Handshake Timeout")}</label>
                                <DurationInput
                                    placeholder="20"
                                    value={finalmask.quicParams?.handshake_timeout}
                                    onChange={val => updateQuic('handshake_timeout', val)}
                                    defaultUnit="s"
                                    mode="number"
                                    baseUnit="s"
                                    unitOptions={['ms', 's', 'm', 'h']}
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] uppercase font-bold text-slate-600 ml-1">{t("Congestion Control")}</label>
                                <Select
                                    value={finalmask.quicParams?.congestion || ""}
                                    onChange={val => updateQuic('congestion', val)}
                                    options={[
                                        { value: "", label: t("Auto") },
                                        { value: "bbr", label: t("BBR") },
                                        { value: "brutal", label: t("Brutal") },
                                        { value: "force-brutal", label: t("Force Brutal") },
                                        { value: "reno", label: t("Reno") },
                                    ]}
                                    className="w-full"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] uppercase font-bold text-slate-600 ml-1">{t("Brutal Up (Mbps)")}</label>
                                <input className="input-base text-xs font-mono bg-slate-950/50" placeholder="e.g. 100" value={finalmask.quicParams?.brutalUp || ""} onChange={e => updateQuic('brutalUp', e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
