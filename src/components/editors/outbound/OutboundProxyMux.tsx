import React from 'react';
import { TagSelector } from '../../ui/TagSelector';
import { Switch } from '../../ui/Switch';
import { Select } from '../../ui/Select';
import { Help } from '../../ui/Help';
import { ExtendedSection } from '../../ui/ExtendedSection';
import { useField } from '../../../hooks/useField';

export const OutboundProxyMux = ({ outbound, onChange, allTags }: any) => {
    const availableProxies = allTags.filter((t: string) => t !== outbound.tag);

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
                    <h4 className="label-xs text-slate-400">Proxy Chaining (Optional)</h4>
                    <TagSelector
                        availableTags={availableProxies}
                        selected={outbound.proxySettings?.tag || ""}
                        onChange={v => updateProxy(v as string)}
                        placeholder="Direct (None)"
                    />
                    {outbound.proxySettings?.tag && (
                        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                Transport Layer Chaining
                                <Help>When enabled, proxy chaining occurs at the transport layer instead of the application layer.</Help>
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
                        <h4 className="label-xs text-slate-400">Mux (Multiplexing)</h4>
                        <Switch
                            checked={outbound.mux?.enabled || false}
                            onChange={checked => updateMux(checked)}
                        />
                    </div>

                    {outbound.mux?.enabled && (
                        <div className="space-y-3 animate-in fade-in">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="label-xs">TCP Concurrency</label>
                                    <input type="number" className="input-base"
                                        value={concurrency.value || 8}
                                        onChange={e => concurrency.onChange(parseInt(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label className="label-xs">XUDP Concurrency</label>
                                    <input type="number" className="input-base"
                                        value={xudpConcurrency.value || 8}
                                        onChange={e => xudpConcurrency.onChange(parseInt(e.target.value))}
                                    />
                                </div>
                            </div>

                            <Select
                                label="UDP 443 Strategy (QUIC)"
                                value={xudpProxyUDP443.value || "reject"}
                                onChange={val => xudpProxyUDP443.onChange(val)}
                                options={[
                                    { value: "reject", label: "Reject", description: "Recommended" },
                                    { value: "allow", label: "Allow" },
                                    { value: "skip", label: "Skip" },
                                ]}
                            />
                        </div>
                    )}
                    {!outbound.mux?.enabled && <p className="text-[10px] text-slate-500">Enable to reduce handshake latency.</p>}
                </div>
            </div>

            {/* Extended Outbound Options */}
            <ExtendedSection
                title="Extended Outbound Settings"
                description="Target domain resolution strategy and advanced proxy routing."
                hasActiveValues={hasExtendedValues}
                activeCount={hasExtendedValues ? 1 : 0}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label="Target Domain Strategy (targetStrategy)"
                        hint="Resolution behavior when connecting to target domain via this outbound."
                        value={targetStrategy.value || "AsIs"}
                        onChange={val => targetStrategy.onChange(val === "AsIs" ? undefined : val)}
                        options={[
                            { value: "AsIs", label: "AsIs (Default)", description: "Leave domain as is without prior resolution" },
                            { value: "UseIP", label: "UseIP", description: "Resolve and connect via IP" },
                            { value: "UseIPv4", label: "UseIPv4", description: "Resolve and prefer IPv4 only" },
                            { value: "UseIPv6", label: "UseIPv6", description: "Resolve and prefer IPv6 only" },
                            { value: "UseIPv4v6", label: "UseIPv4v6", description: "Prefer IPv4, fallback to IPv6" },
                            { value: "UseIPv6v4", label: "UseIPv6v4", description: "Prefer IPv6, fallback to IPv4" },
                            { value: "ForceIP", label: "ForceIP", description: "Enforce IP connection (fails if unresolved)" },
                            { value: "ForceIPv4", label: "ForceIPv4", description: "Enforce IPv4 connection" },
                            { value: "ForceIPv6", label: "ForceIPv6", description: "Enforce IPv6 connection" },
                            { value: "ForceIPv4v6", label: "ForceIPv4v6", description: "Enforce IPv4, fallback to IPv6" },
                            { value: "ForceIPv6v4", label: "ForceIPv6v4", description: "Enforce IPv6, fallback to IPv4" },
                        ]}
                    />
                </div>
            </ExtendedSection>
        </div>
    );
};
