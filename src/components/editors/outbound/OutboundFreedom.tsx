import React from 'react';
import { Card } from '../../ui/Card';
import { FormField } from '../../ui/FormField';
import { Select } from '../../ui/Select';
import { Switch } from '../../ui/Switch';
import { Icon } from '../../ui/Icon';
import { ExtendedSection } from '../../ui/ExtendedSection';
import { useField } from '../../../hooks/useField';
import { DOMAIN_STRATEGY_OPTIONS } from './domain-strategies';
import { useCoreVersion } from '../../../hooks/useCoreVersion';
import { t } from '../../../i18n';
import { fragmentProblems } from '../../../core/xray/freedom-fragment';

/**
 * Freedom, with the fields it actually has.
 *
 * It used to be one chooser offering four of the eleven resolution strategies,
 * and nothing else — so fragment, noises, redirect, proxyProtocol and
 * finalRules could only be reached by hand-editing the JSON, which is a poor
 * showing for the outbound most configs spend their bypass traffic on.
 *
 * Source: infra/conf/freedom.go (FreedomConfig, Fragment, Noise,
 * FreedomFinalRuleConfig).
 */
export const OutboundFreedom = ({ outbound, onChange }: any) => {
    // `targetStrategy` is the current spelling; `domainStrategy` is the older
    // one the core still reads and logs a deprecation for. One chooser writes
    // whichever key the config already uses, so an imported config is not
    // silently rewritten.
    const legacyKey = outbound.settings?.domainStrategy !== undefined
        && outbound.settings?.targetStrategy === undefined;
    const strategy = useField<string | undefined>(
        outbound, onChange,
        ['settings', legacyKey ? 'domainStrategy' : 'targetStrategy'],
    );

    // On 26.9 both spellings are deprecated: the core copies the value into
    // sockopt.domainStrategy — overwriting whatever is set there — and logs
    // that it did (infra/conf/xray.go, v26.9.9).
    const { statusAt, tag: coreTag } = useCoreVersion();
    const strategyDeprecated = statusAt('outbound', 'settings.targetStrategy', 'freedom') === 'deprecated'
        || statusAt('outbound', 'settings.domainStrategy', 'freedom') === 'deprecated';

    const redirect = useField<string | undefined>(outbound, onChange, ['settings', 'redirect']);
    const userLevel = useField<number | undefined>(outbound, onChange, ['settings', 'userLevel']);
    const proxyProtocol = useField<number | undefined>(outbound, onChange, ['settings', 'proxyProtocol']);

    const fragment = outbound.settings?.fragment;
    // Said beside the box, since either can be emptied and the core refuses
    // the config when one is.
    const fragmentError = (field: 'length' | 'interval') =>
        fragmentProblems(fragment).find(problem => problem.field === field)?.message;
    const fragmentPackets = useField<string | undefined>(outbound, onChange, ['settings', 'fragment', 'packets']);
    const fragmentLength = useField<string | undefined>(outbound, onChange, ['settings', 'fragment', 'length']);
    const fragmentInterval = useField<string | undefined>(outbound, onChange, ['settings', 'fragment', 'interval']);
    const fragmentMaxSplit = useField<string | undefined>(outbound, onChange, ['settings', 'fragment', 'maxSplit']);

    const noises: any[] = Array.isArray(outbound.settings?.noises) ? outbound.settings.noises : [];

    const setNoises = (next: any[]) =>
        onChange(['settings', 'noises'], next.length ? next : undefined);
    const patchNoise = (index: number, patch: Record<string, unknown>) =>
        setNoises(noises.map((noise, i) => (i === index ? { ...noise, ...patch } : noise)));

    const toggleFragment = (enabled: boolean) =>
        onChange(['settings', 'fragment'], enabled ? { packets: 'tlshello', length: '100-200', interval: '10-20' } : undefined);

    const hasExtended = redirect.value !== undefined
        || userLevel.value !== undefined
        || proxyProtocol.value !== undefined;

    return (
        <Card title={t("Freedom (Direct)")} icon="ArrowSquareOut" className="mt-4">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <p className="text-[11px] text-slate-400 leading-relaxed italic">
                    {t("The Freedom outbound sends traffic straight to its destination with no proxy. Used for local traffic, or to keep something out of the tunnel.")}
                </p>
            </div>

            <div className="mt-4">
                <Select
                    label={legacyKey ? t("Domain Strategy (legacy key)") : t("Domain Strategy")}
                    hint={strategyDeprecated
                        ? t("Deprecated on {tag}: the core copies this into sockopt.domainStrategy, overwriting what is set there, and logs a warning. Set it in Sockopt under Transport instead.", { tag: coreTag })
                        : t("How a target domain is resolved before connecting. All eleven values are the ones the core accepts.")}
                    value={strategy.value || "AsIs"}
                    onChange={val => strategy.onChange(val === "AsIs" ? undefined : val)}
                    options={DOMAIN_STRATEGY_OPTIONS()}
                />
            </div>

            {/* Fragment: the reason most people reach for freedom at all. */}
            <div className="mt-5 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                    <div className="min-w-0">
                        <span className="label-xs">{t("TLS Fragmentation")}</span>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                            {t("Cuts the outgoing stream into pieces so a filter cannot read the handshake in one go.")}
                        </p>
                    </div>
                    <Switch checked={!!fragment} onChange={toggleFragment} />
                </div>

                {fragment && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 animate-in fade-in">
                        <FormField label={t("Packets")}>
                            <input
                                className="input-base font-mono text-xs"
                                placeholder="tlshello"
                                value={fragmentPackets.value ?? ''}
                                onChange={e => fragmentPackets.onChange(e.target.value || undefined)}
                            />
                        </FormField>
                        <FormField label={t("Length (bytes)")} error={fragmentError('length')}>
                            <input
                                className="input-base font-mono text-xs"
                                placeholder="100-200"
                                value={fragmentLength.value ?? ''}
                                onChange={e => fragmentLength.onChange(e.target.value || undefined)}
                            />
                        </FormField>
                        <FormField label={t("Interval (ms)")} error={fragmentError('interval')}>
                            <input
                                className="input-base font-mono text-xs"
                                placeholder="10-20"
                                value={fragmentInterval.value ?? ''}
                                onChange={e => fragmentInterval.onChange(e.target.value || undefined)}
                            />
                        </FormField>
                        <FormField label={t("Max Split")}>
                            <input
                                className="input-base font-mono text-xs"
                                placeholder="1-5"
                                value={fragmentMaxSplit.value ?? ''}
                                onChange={e => fragmentMaxSplit.onChange(e.target.value || undefined)}
                            />
                        </FormField>
                    </div>
                )}
            </div>

            {/* Noises */}
            <div className="mt-5 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                    <div className="min-w-0">
                        <span className="label-xs">{t("Noise Packets")}</span>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                            {t("Junk sent before the real traffic, to spoil a fingerprint taken from the first packet.")}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setNoises([...noises, { type: 'rand', packet: '50-100', delay: '10-20' }])}
                        className="shrink-0 h-8 px-3 rounded-lg border border-slate-700 bg-slate-900 text-[11px] font-bold text-slate-300 hover:border-slate-500 transition-colors"
                    >
                        <Icon name="Plus" className="mr-1" />
                        {t("Add")}
                    </button>
                </div>

                <div className="space-y-2">
                    {noises.map((noise, index) => (
                        <div key={index} className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                            <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Select
                                        label={t("Type")}
                                        value={noise.type || 'rand'}
                                        onChange={val => patchNoise(index, { type: val })}
                                        options={[
                                            { value: 'rand', label: 'rand', description: t("Random bytes, packet is a length range") },
                                            { value: 'str', label: 'str', description: t("The text as typed") },
                                            { value: 'hex', label: 'hex', description: t("Hex-decoded bytes") },
                                            { value: 'base64', label: 'base64', description: t("Base64-decoded bytes") },
                                        ]}
                                    />
                                    <FormField label={t("Packet")}>
                                        <input
                                            className="input-base font-mono text-xs"
                                            placeholder={noise.type === 'rand' ? '50-100' : 'hello'}
                                            value={noise.packet ?? ''}
                                            onChange={e => patchNoise(index, { packet: e.target.value || undefined })}
                                        />
                                    </FormField>
                                    <FormField label={t("Delay (ms)")}>
                                        <input
                                            className="input-base font-mono text-xs"
                                            placeholder="10-20"
                                            value={noise.delay ?? ''}
                                            onChange={e => patchNoise(index, { delay: e.target.value || undefined })}
                                        />
                                    </FormField>
                                    <Select
                                        label={t("Apply To")}
                                        value={noise.applyTo || 'ip'}
                                        onChange={val => patchNoise(index, { applyTo: val === 'ip' ? undefined : val })}
                                        options={[
                                            { value: 'ip', label: t("Any IP") },
                                            { value: 'ipv4', label: 'IPv4' },
                                            { value: 'ipv6', label: 'IPv6' },
                                        ]}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setNoises(noises.filter((_, i) => i !== index))}
                                    title={t("Remove")}
                                    className="shrink-0 p-2 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-slate-800/60 transition-colors"
                                >
                                    <Icon name="Trash" className="text-sm" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <ExtendedSection
                title={t("Extended Freedom Settings")}
                description={t("Redirect, PROXY protocol and policy level.")}
                hasActiveValues={hasExtended}
                activeCount={hasExtended ? 1 : 0}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label={t("Redirect (addr:port)")}>
                        <input
                            className="input-base font-mono text-xs"
                            placeholder="127.0.0.1:3366"
                            value={redirect.value ?? ''}
                            onChange={e => redirect.onChange(e.target.value || undefined)}
                        />
                    </FormField>
                    <Select
                        label={t("PROXY Protocol")}
                        hint={t("Announce the original client address to the destination.")}
                        value={String(proxyProtocol.value ?? 0)}
                        onChange={val => proxyProtocol.onChange(Number(val) || undefined)}
                        options={[
                            { value: '0', label: t("Off") },
                            { value: '1', label: 'v1' },
                            { value: '2', label: 'v2' },
                        ]}
                    />
                    <FormField label={t("User Level")}>
                        <input
                            type="number"
                            className="input-base"
                            placeholder="0"
                            value={userLevel.value ?? ''}
                            onChange={e => userLevel.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                        />
                    </FormField>
                </div>
            </ExtendedSection>
        </Card>
    );
};
