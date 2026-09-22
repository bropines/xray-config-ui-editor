import React from 'react';
import { TagSelector } from '../../ui/TagSelector';
import { Help } from '../../ui/Help';
import { Icon } from '../../ui/Icon';
import { useConfigStore } from '../../../store/configStore';
import { Select } from '../../ui/Select';
import { Switch } from '../../ui/Switch';
import { DurationInput } from '../../ui/DurationInput';
import { ExtendedSection } from '../../ui/ExtendedSection';
import { useSockoptEditor } from '../../../hooks/useSockoptEditor';
import { t } from '../../../i18n';

export const SockoptEditor = ({ sockopt, onChange, isClient }: { sockopt: any; onChange: (value: any) => void; isClient?: boolean }) => {
    const { local, update, add, remove, hasExtendedValues } = useSockoptEditor(sockopt, onChange);
    const config = useConfigStore(state => state.config);
    const outboundTags = (config?.outbounds || []).map((o: any) => o.tag).filter(Boolean);

    if (!sockopt) {
        return (
            <div className="border-t border-slate-800 pt-4 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-blue-400 flex items-center gap-2">
                        <Icon name="Sliders" size={14} />
{t("Socket Options (Sockopt)")}
</label>
                    <button className="bg-blue-500/10 border border-blue-500/50 text-blue-500 hover:bg-blue-500/20 text-[10px] font-bold px-2 py-0.5 rounded transition-colors" onClick={add}>
                        {t("ADD")}
                        </button>
                </div>
            </div>
        );
    }

    return (
        <div className="border-t border-slate-800/60 pt-6 space-y-4">
            <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-blue-400 flex items-center gap-2">
                    <Icon name="Sliders" size={14} />
{t("Socket Options (Sockopt)")}
</label>
                <button className="bg-rose-500/10 border border-rose-500/50 text-rose-500 hover:bg-rose-500/20 text-[10px] font-bold px-2 py-0.5 rounded transition-colors" onClick={remove}>
                    {t("REMOVE")}
                    </button>
            </div>

            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/60 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* GENERAL / ROUTING */}
                    <div>
                        <label className="label-xs">{t("Mark (Routing)")}</label>
                        <input type="number" className="input-base font-mono"
                            placeholder="255"
                            value={local.mark || ""}
                            onChange={e => update('mark', parseInt(e.target.value))}
                        />
                    </div>

                    <div>
                        <label className="label-xs">{t("Interface (Bind)")}</label>
                        <input className="input-base font-mono"
                            placeholder={t("eth0 or wg0")}
                            value={local.interface || ""}
                            onChange={e => update('interface', e.target.value)}
                        />
                    </div>

                    {/* INBOUND ONLY */}
                    {!isClient && (
                        <>
                                <Select 
                                    label={t("TProxy (Linux)")}
                                    value={local.tproxy || "off"}
                                    onChange={val => update('tproxy', val)}
                                    options={[
                                        { value: "off", label: t("Off") },
                                        { value: "tproxy", label: t("TProxy") },
                                        { value: "redirect", label: t("Redirect") },
                                    ]}
                                />
                                <Select 
                                    label={t("Accept PROXY Protocol")}
                                    value={local.acceptProxyProtocol === true ? "true" : "false"}
                                    onChange={val => update('acceptProxyProtocol', val === "true")}
                                    options={[
                                        { value: "false", label: t("Disabled") },
                                        { value: "true", label: t("Enabled") },
                                    ]}
                                />
                                <Select 
                                    label={t("V6 Only (Bind ::)")}
                                    value={local.v6only === true ? "true" : "false"}
                                    onChange={val => update('v6only', val === "true")}
                                    options={[
                                        { value: "false", label: t("Disabled") },
                                        { value: "true", label: t("Enabled") },
                                    ]}
                                />
                        </>
                    )}

                    {/* OUTBOUND ONLY */}
                    {isClient && (
                        <>
                            <div className="md:col-span-2">
                                <TagSelector
                                    label={
                                        <span className="flex items-center gap-1">
                                            Dialer Proxy (Outbound Tag)
                                            <Help>{t("Forwards this outbound's traffic through another outbound (tag). Used to \"wrap\" protocols like WireGuard into obfuscation layers like Freedom+Finalmask.")}</Help>
                                        </span>
                                    }
                                    availableTags={outboundTags}
                                    selected={local.dialerProxy || ""}
                                    onChange={v => update('dialerProxy', v as string)}
                                    multi={false}
                                    placeholder={t("Select outbound...")}
                                />
                            </div>
                                <Select 
                                    label={t("Domain Strategy")}
                                    value={local.domainStrategy || "AsIs"}
                                    onChange={val => update('domainStrategy', val)}
                                    options={[
                                        { value: "AsIs", label: t("AsIs") },
                                        { value: "UseIP", label: t("UseIP") },
                                        { value: "UseIPv4", label: t("UseIPv4") },
                                        { value: "UseIPv6", label: t("UseIPv6") },
                                        { value: "UseIPv4v6", label: t("UseIPv4v6") },
                                        { value: "UseIPv6v4", label: t("UseIPv6v4") },
                                    ]}
                                />
                        </>
                    )}

                    {/* TCP ADVANCED / KERNEL */}
                                <Select 
                                    label={t("TCP Fast Open")}
                                    value={local.tcpFastOpen === true ? "true" : "false"}
                                    onChange={val => update('tcpFastOpen', val === "true")}
                                    options={[
                                        { value: "false", label: t("Disabled") },
                                        { value: "true", label: t("Enabled") },
                                    ]}
                                />

                                <Select 
                                    label={t("TCP MPTCP")}
                                    hint={t("Linux 5.6+")}
                                    value={local.tcpMptcp === true ? "true" : "false"}
                                    onChange={val => update('tcpMptcp', val === "true")}
                                    options={[
                                        { value: "false", label: t("Disabled") },
                                        { value: "true", label: t("Enabled") },
                                    ]}
                                />
                </div>

                {/* EXTENDED SOCKOPT & HAPPY EYEBALLS */}
                <ExtendedSection
                    title={t("Extended Socket & Kernel Options")}
                    description={t("Happy Eyeballs (RFC 8305 Dual-Stack), TCP window clamping, and penetrate.")}
                    hasActiveValues={hasExtendedValues}
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select
                                label={t("Address Port Strategy")}
                                value={local.addressPortStrategy || "none"}
                                onChange={val => update('addressPortStrategy', val === "none" ? undefined : val)}
                                options={[
                                    { value: "none", label: t("None (Default)") },
                                    { value: "same", label: t("Same (Reuse)") },
                                    { value: "different", label: t("Different") },
                                    { value: "random", label: t("Random") },
                                ]}
                            />

                            <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                                <div>
                                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                                        Penetrate Sockopt
                                        <Help>{t("Applies upload stream socket options to the downstream connection.")}</Help>
                                    </label>
                                    <p className="text-[10px] text-slate-500">{t("Inherit socket options across streams")}</p>
                                </div>
                                <Switch
                                    checked={local.penetrate || false}
                                    onChange={checked => update('penetrate', checked ? true : undefined)}
                                />
                            </div>
                        </div>

                        {/* Happy Eyeballs (RFC 8305) */}
                        <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                                        Happy Eyeballs (RFC 8305 Dual-Stack)
                                        <Help>{t("Simultaneously attempts IPv4 and IPv6 connections and selects the fastest path.")}</Help>
                                    </span>
                                    <p className="text-[10px] text-slate-500">{t("Fast fallback between IPv4 & IPv6")}</p>
                                </div>
                                <Switch
                                    checked={!!local.happyEyeballs}
                                    onChange={checked => update('happyEyeballs', checked ? { tryDelayMs: 250, prioritizeIPv6: true } : undefined)}
                                />
                            </div>

                            {local.happyEyeballs && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-800/60 animate-in fade-in">
                                    <div>
                                        <label className="label-xs text-[10px]">{t("Try Delay (ms)")}</label>
                                        <input
                                            type="number"
                                            className="input-base font-mono text-xs"
                                            placeholder="250"
                                            value={local.happyEyeballs.tryDelayMs ?? ""}
                                            onChange={e => update('happyEyeballs', { ...local.happyEyeballs, tryDelayMs: parseInt(e.target.value) || undefined })}
                                        />
                                    </div>
                                    <div>
                                        <label className="label-xs text-[10px]">{t("Interleave")}</label>
                                        <input
                                            type="number"
                                            className="input-base font-mono text-xs"
                                            placeholder="1"
                                            value={local.happyEyeballs.interleave ?? ""}
                                            onChange={e => update('happyEyeballs', { ...local.happyEyeballs, interleave: parseInt(e.target.value) || undefined })}
                                        />
                                    </div>
                                    <div>
                                        <label className="label-xs text-[10px]">{t("Max Concurrent Try")}</label>
                                        <input
                                            type="number"
                                            className="input-base font-mono text-xs"
                                            placeholder="2"
                                            value={local.happyEyeballs.maxConcurrentTry ?? ""}
                                            onChange={e => update('happyEyeballs', { ...local.happyEyeballs, maxConcurrentTry: parseInt(e.target.value) || undefined })}
                                        />
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <label className="label-xs text-[10px] mb-1.5">{t("Prioritize IPv6")}</label>
                                        <Switch
                                            checked={local.happyEyeballs.prioritizeIPv6 ?? true}
                                            onChange={checked => update('happyEyeballs', { ...local.happyEyeballs, prioritizeIPv6: checked })}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* TCP Low-level tuning */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800/60">
                            <div>
                                <label className="label-xs text-[10px]">{t("TCP Keep-Alive Idle")}</label>
                                <DurationInput
                                    placeholder="300"
                                    value={local.tcpKeepAliveIdle}
                                    onChange={val => update('tcpKeepAliveIdle', val)}
                                    defaultUnit="s"
                                    mode="number"
                                    baseUnit="s"
                                    unitOptions={['ms', 's', 'm', 'h']}
                                />
                            </div>
                            <div>
                                <label className="label-xs text-[10px]">{t("TCP Keep-Alive Interval")}</label>
                                <DurationInput
                                    placeholder="0"
                                    value={local.tcpKeepAliveInterval}
                                    onChange={val => update('tcpKeepAliveInterval', val)}
                                    defaultUnit="s"
                                    mode="number"
                                    baseUnit="s"
                                    unitOptions={['ms', 's', 'm', 'h']}
                                />
                            </div>
                            <div>
                                <label className="label-xs text-[10px]">{t("TCP User Timeout")}</label>
                                <DurationInput
                                    placeholder="10000"
                                    value={local.tcpUserTimeout}
                                    onChange={val => update('tcpUserTimeout', val)}
                                    defaultUnit="ms"
                                    mode="number"
                                    baseUnit="ms"
                                    unitOptions={['ms', 's', 'm', 'h']}
                                />
                            </div>
                            <div>
                                <label className="label-xs text-[10px]">{t("TCP Max Segment (MTU)")}</label>
                                <input type="number" className="input-base font-mono text-xs"
                                    placeholder="1440"
                                    value={local.tcpMaxSeg || ""}
                                    onChange={e => update('tcpMaxSeg', parseInt(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="label-xs text-[10px]">{t("TCP Congestion")}</label>
                                <input type="text" className="input-base font-mono text-xs"
                                    placeholder={t("bbr, cubic...")}
                                    value={local.tcpCongestion || ""}
                                    onChange={e => update('tcpCongestion', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="label-xs text-[10px]">{t("TCP Window Clamp")}</label>
                                <input type="number" className="input-base font-mono text-xs"
                                    placeholder="600"
                                    value={local.tcpWindowClamp || ""}
                                    onChange={e => update('tcpWindowClamp', parseInt(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>
                </ExtendedSection>
            </div>
        </div>
    );
};