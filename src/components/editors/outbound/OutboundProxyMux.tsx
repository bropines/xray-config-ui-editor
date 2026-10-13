import React from 'react';
import { Switch } from '../../ui/Switch';
import { Select } from '../../ui/Select';
import { ExtendedSection } from '../../ui/ExtendedSection';
import { useField } from '../../../hooks/useField';
import { OutboundChain } from './OutboundChain';
import { DOMAIN_STRATEGY_OPTIONS } from './domain-strategies';
import { t } from '../../../i18n';

export const OutboundProxyMux = ({
    outbound,
    onChange,
    showChain = true,
    showMux = true,
    showStrategy = true,
    /** Whether the protocol is offered mux at all, as opposed to merely holding one. */
    muxOffered = true,
    outboundTags = [],
}: any) => {
    // `outbound` is the editor's `local` state and `onChange` is its
    // `updateField(path, value)` (see OutboundModal.tsx).
    const concurrency = useField<number>(outbound, onChange, ['mux', 'concurrency']);
    const xudpConcurrency = useField<number>(outbound, onChange, ['mux', 'xudpConcurrency']);
    const xudpProxyUDP443 = useField<string>(outbound, onChange, ['mux', 'xudpProxyUDP443']);
    const targetStrategy = useField<string | undefined>(outbound, onChange, ['targetStrategy']);
    // Enabling seeds a full set of mux defaults; disabling drops the whole
    // `mux` object rather than just flipping `enabled` to false.
    const updateMux = (enabled: boolean) => {
        if (!enabled) {
            onChange('mux', undefined);
        } else {
            onChange('mux', { enabled: true, concurrency: 8, xudpConcurrency: 8, xudpProxyUDP443: "reject" });
        }
    };
    const hasExtendedValues = !!outbound.targetStrategy;
    return (
        <div className="space-y-4 mt-4">
            {(showChain || showMux) && (
            <div className={`grid grid-cols-1 gap-6 ${showChain && showMux ? 'md:grid-cols-2' : ''}`}>
                {/* Which outbound this one goes through, and at which layer. */}
                {showChain && <OutboundChain outbound={outbound} onChange={onChange} outboundTags={outboundTags} />}
                {/* Mux. A protocol whose far end cannot demultiplex a
                    Mux.Cool stream — a plain SOCKS or HTTP proxy, a direct
                    connection — is not offered it. */}
                {showMux && (
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                    {/* The far end has to be Xray: Mux.Cool is its own
                        protocol, and a plain proxy of the same name has
                        nothing to answer it with. */}
                    {muxOffered
                        ? <p className="text-[10px] text-slate-500 mt-2">{t("Needs Xray on the far end — any Xray inbound answers Mux, a plain proxy of the same protocol does not.")}</p>
                        : <p className="text-[10px] text-amber-300/80 mt-2">{t("This protocol cannot carry Mux: it would try to reach the Mux address for real. It is shown because the config has it — switch it off to remove it.")}</p>}
                </div>
                )}
            </div>
            )}
            {/* Extended Outbound Options */}
            {showStrategy && (
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
                        options={DOMAIN_STRATEGY_OPTIONS()}
                    />
                </div>
            </ExtendedSection>
            )}
        </div>
    );
};
