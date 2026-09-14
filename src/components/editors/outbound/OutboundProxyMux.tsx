import React from 'react';
import { TagSelector } from '../../ui/TagSelector';
import { Switch } from '../../ui/Switch';
import { Select } from '../../ui/Select';
import { Help } from '../../ui/Help';
import { ExtendedSection } from '../../ui/ExtendedSection';
import { useField } from '../../../hooks/useField';
import { t } from '../../../i18n';

export const OutboundProxyMux = ({ outbound, onChange, allTags }: any) => {
    const availableProxies = allTags.filter((tag: string) => tag !== outbound.tag);

    // `outbound` is the editor's `local` state and `onChange` is its
    // `updateField(path, value)` (see OutboundModal.tsx).
    const transportLayer = useField<boolean>(outbound, onChange, ['proxySettings', 'transportLayer']);
    const concurrency = useField<number>(outbound, onChange, ['mux', 'concurrency']);
    const xudpConcurrency = useField<number>(outbound, onChange, ['mux', 'xudpConcurrency']);
    const xudpProxyUDP443 = useField<string>(outbound, onChange, ['mux', 'xudpProxyUDP443']);
    const targetStrategy = useField<string | undefined>(outbound, onChange, ['targetStrategy']);

    // Setting the proxy tag replaces the whole `proxySettings` object (and
    // clearing it drops `transportLayer` too), so this stays a dedicated
    // writer rather than a single-leaf useField binding.
    const updateProxy = (tag: string) => {
        if (!tag) {
            onChange('proxySettings', undefined);
        } else {
            onChange('proxySettings', { ...outbound.proxySettings, tag });
        }
    };

    // Enabling seeds a full set of mux defaults; disabling drops the whole
    // `mux` object rather than just flipping `enabled` to false.
    const updateMux = (enabled: boolean) => {
        if (!enabled) {
            onChange('mux', undefined);
        } else {
            onChange('mux', { enabled: true, concurrency: 8, xudpConcurrency: 8, xudpProxyUDP443: "reject" });
        }
    };

    const hasExtendedValues = !!outbound.targetStrategy || !!outbound.proxySettings?.transportLayer;

    return (
        <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Proxy Chain */}
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3">
                    <h4 className="label-xs text-slate-400">{t("Proxy Chaining (Optional)")}</h4>
                    <TagSelector
                        availableTags={availableProxies}
                        selected={outbound.proxySettings?.tag || ""}
                        onChange={v => updateProxy(v as string)}
                        placeholder={t("Direct (None)")}
                    />
                    {outbound.proxySettings?.tag && (
                        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                Transport Layer Chaining
                                <Help>{t("When enabled, proxy chaining occurs at the transport layer instead of the application layer.")}</Help>
                            </span>
                            <Switch
                                checked={transportLayer.value || false}
                                onChange={checked => transportLayer.onChange(checked)}
                            />
                        </div>
                    )}
                </div>

                {/* Mux */}
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="label-xs text-slate-400">{t("Mux (Multiplexing)")}</h4>
                        <Switch
                            checked={outbound.mux?.enabled || false}
                            onChange={checked => updateMux(checked)}
                        />
                    </div>

                    {outbound.mux?.enabled && (
                        <div className="space-y-3 animate-in fade-in">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="label-xs">{t("TCP Concurrency")}</label>
                                    <input type="number" className="input-base"
                                        value={concurrency.value || 8}
                                        onChange={e => concurrency.onChange(parseInt(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label className="label-xs">{t("XUDP Concurrency")}</label>
                                    <input type="number" className="input-base"
                                        value={xudpConcurrency.value || 8}
                                        onChange={e => xudpConcurrency.onChange(parseInt(e.target.value))}
                                    />
                                </div>
                            </div>

                            <Select
                                label={t("UDP 443 Strategy (QUIC)")}
                                value={xudpProxyUDP443.value || "reject"}
                                onChange={val => xudpProxyUDP443.onChange(val)}
                                options={[
                                    { value: "reject", label: t("Reject"), description: t("Recommended") },
                                    { value: "allow", label: t("Allow") },
                                    { value: "skip", label: t("Skip") },
                                ]}
                            />
                        </div>
                    )}
                    {!outbound.mux?.enabled && <p className="text-[10px] text-slate-500">{t("Enable to reduce handshake latency.")}</p>}
                </div>
            </div>

            {/* Extended Outbound Options */}
            <ExtendedSection
                title={t("Extended Outbound Settings")}
                description={t("Target domain resolution strategy and advanced proxy routing.")}
                hasActiveValues={hasExtendedValues}
                activeCount={hasExtendedValues ? 1 : 0}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label={t("Target Domain Strategy (targetStrategy)")}
                        hint={t("Resolution behavior when connecting to target domain via this outbound.")}
                        value={targetStrategy.value || "AsIs"}
                        onChange={val => targetStrategy.onChange(val === "AsIs" ? undefined : val)}
                        options={[
                            { value: "AsIs", label: t("AsIs (Default)"), description: t("Leave domain as is without prior resolution") },
                            { value: "UseIP", label: t("UseIP"), description: t("Resolve and connect via IP") },
                            { value: "UseIPv4", label: t("UseIPv4"), description: t("Resolve and prefer IPv4 only") },
                            { value: "UseIPv6", label: t("UseIPv6"), description: t("Resolve and prefer IPv6 only") },
                            { value: "UseIPv4v6", label: t("UseIPv4v6"), description: t("Prefer IPv4, fallback to IPv6") },
                            { value: "UseIPv6v4", label: t("UseIPv6v4"), description: t("Prefer IPv6, fallback to IPv4") },
                            { value: "ForceIP", label: t("ForceIP"), description: t("Enforce IP connection (fails if unresolved)") },
                            { value: "ForceIPv4", label: t("ForceIPv4"), description: t("Enforce IPv4 connection") },
                            { value: "ForceIPv6", label: t("ForceIPv6"), description: t("Enforce IPv6 connection") },
                            { value: "ForceIPv4v6", label: t("ForceIPv4v6"), description: t("Enforce IPv4, fallback to IPv6") },
                            { value: "ForceIPv6v4", label: t("ForceIPv6v4"), description: t("Enforce IPv6, fallback to IPv4") },
                        ]}
                    />
                </div>
            </ExtendedSection>
        </div>
    );
};
