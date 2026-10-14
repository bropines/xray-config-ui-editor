import React from 'react';
import { Select } from '../../ui/Select';
import { Switch } from '../../ui/Switch';
import { NumberInput } from '../../ui/NumberInput';
import { DurationInput } from '../../ui/DurationInput';
import { Help } from '../../ui/Help';
import { Icon } from '../../ui/Icon';
import { XhttpSettingsEditor } from './XhttpSettingsEditor';
import { MasqueSettingsEditor } from './MasqueSettingsEditor';
import { XDriveSettingsEditor } from './XDriveSettingsEditor';
import { useTransportFields } from '../../../hooks/useTransportFields';
import { useCoreVersion } from '../../../hooks/useCoreVersion';
import type { FeatureStatus } from '../../../core/xray/versions/features';
import {
    HYSTERIA_RETIRED_KEYS,
    HYSTERIA_UDP_IDLE,
    KCP_RETIRED_KEYS,
    KCP_VERSIONED_KEYS,
    hysteriaUdpIdleProblem,
    isRemovedNetwork,
    kcpMtuMin,
    kcpProblems,
    kcpReplacementMasks,
    kcpTtiRange,
    keyNotices,
    networkSection,
    removedNetworkReplacement,
    statusMessage,
} from '../../../core/xray/transport-networks';
import { t } from '../../../i18n';

const TONE: Record<FeatureStatus, { box: string; mark: string; text: string; button: string }> = {
    rejected: {
        box: 'bg-rose-950/20 border-rose-500/40',
        mark: 'text-rose-400',
        text: 'text-rose-200/90',
        button: 'border-rose-500/40 text-rose-200 hover:border-rose-400',
    },
    absent: {
        box: 'bg-amber-950/20 border-amber-500/40',
        mark: 'text-amber-400',
        text: 'text-amber-200/90',
        button: 'border-amber-500/40 text-amber-200 hover:border-amber-400',
    },
    deprecated: {
        box: 'bg-sky-950/20 border-sky-500/30',
        mark: 'text-sky-400',
        text: 'text-sky-200/90',
        button: 'border-sky-500/40 text-sky-200 hover:border-sky-400',
    },
    accepted: {
        box: 'bg-slate-950/40 border-slate-700',
        mark: 'text-slate-400',
        text: 'text-slate-300',
        button: 'border-slate-600 text-slate-200 hover:border-slate-400',
    },
};

export interface NoticeAction {
    label: string;
    onClick: () => void;
}

/**
 * A key the config holds that the chosen core refuses, ignores or deprecates.
 *
 * The value is real and saved, so it is not hidden — hiding it would leave it
 * in the config with no way to see or remove it. The words are the ones the
 * diagnostics panel uses for the same key; the actions sit at the bottom, where
 * a thumb finds them on a phone.
 */
export const VersionKeyNotice = ({
    what,
    status,
    tag,
    message,
    replacement,
    children,
    actions = [],
}: {
    /** The key, as a config path fragment: `kcpSettings.seed`. */
    what: string;
    status: FeatureStatus;
    tag: string;
    /** Overrides the standard sentence for `status`. */
    message?: string;
    replacement?: string;
    children?: React.ReactNode;
    actions?: NoticeAction[];
}) => {
    const tone = TONE[status];
    return (
        <div className={`p-3 rounded-xl border space-y-3 ${tone.box}`} data-version-notice={what}>
            <div className="flex gap-2 text-[11px] leading-relaxed">
                <Icon
                    name={status === 'rejected' ? 'WarningOctagon' : status === 'accepted' ? 'Info' : 'Warning'}
                    weight="fill"
                    className={`shrink-0 mt-0.5 ${tone.mark}`}
                />
                <div className="space-y-1 min-w-0">
                    <p className={`${tone.text} break-words`}>{message ?? statusMessage(status, what, tag)}</p>
                    {replacement && (
                        <p className="text-slate-400 break-words">{t("Use {replacement} instead.", { replacement })}</p>
                    )}
                    {children}
                </div>
            </div>
            {actions.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-2">
                    {actions.map(action => (
                        <button
                            key={action.label}
                            type="button"
                            onClick={action.onClick}
                            className={`h-9 px-4 rounded-lg border bg-slate-950/40 text-[11px] font-bold transition-colors ${tone.button}`}
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

/** A line under a field saying why the chosen core will not take its value. */
const FieldProblem = ({ message }: { message?: string }) =>
    message ? <p className="text-[10px] text-rose-400 mt-1 leading-snug">{message}</p> : null;

/**
 * The settings that belong to the chosen transport, and only that one.
 *
 * Binds `streamSettings` itself rather than taking forty props: the bindings
 * are closures over the same object the parent passes, so computing them here
 * costs nothing and keeps every path in one place (see useTransportFields).
 *
 * What each field offers depends on the core line: a key is offered where the
 * feature table says the line accepts it, and a key the config already holds
 * that the line refuses or ignores is shown as a notice with a remove button
 * instead of a field.
 */
export const NetworkSection = ({
    streamSettings,
    onChange,
    net,
    isClient,
    protocol,
}: {
    streamSettings: any;
    onChange: (next: any) => void;
    /** The transport the line runs — TransportSettings resolves `method` and case. */
    net: string;
    isClient: boolean;
    protocol?: string;
}) => {
    const fields = useTransportFields(streamSettings, onChange);
    const {
        httpupgradePath,
        httpupgradeHost,
        tcpAcceptProxyProtocol,
        tcpHeaderType,
        tcpHeaderPath,
        tcpHeaderHost,
        wsAcceptProxyProtocol,
        wsPath,
        wsHost,
        wsHeartbeatPeriod,
        grpcMultiMode,
        grpcPermitWithoutStream,
        grpcServiceName,
        grpcAuthority,
        grpcUserAgent,
        grpcIdleTimeout,
        grpcHealthCheckTimeout,
        grpcInitialWindowsSize,
        xhttpSettings,
        masqueSettings,
        xdriveSettings,
    } = fields;
    const { tag } = useCoreVersion();
    const section = networkSection(net);
    const side = isClient ? 'outbound' : 'inbound';

    return (
        <>
        {/* Removed transports: shown for what they are, never edited. */}
        {isRemovedNetwork(net) && (
            <div className="border-t border-slate-800/50 pt-4">
                <VersionKeyNotice
                    what={`network = "${net}"`}
                    status="rejected"
                    tag={tag}
                    replacement={removedNetworkReplacement(net)}
                >
                    <p className="text-slate-400">
                        {t("This transport was removed from Xray, so there is nothing here to edit. Pick another network above.")}
                    </p>
                </VersionKeyNotice>
            </div>
        )}

        {/* TCP / RAW: one transport, two names. */}
        {section === 'tcp' && (
            <div className="space-y-4 border-t border-slate-800/50 pt-4 animate-in fade-in">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400">{t("TCP (RAW) Settings")}</span>
                </div>

                {!isClient && (
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/50 flex flex-wrap gap-4">
                        <Switch
                            checked={tcpAcceptProxyProtocol.value || false}
                            onChange={checked => tcpAcceptProxyProtocol.onChange(checked)}
                            label={<span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">{t("Accept PROXY Protocol")}</span>}
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label={t("Header Type (Obfuscation)")}
                        value={tcpHeaderType.value || "none"}
                        onChange={val => tcpHeaderType.onChange(val)}
                        options={[
                            { value: "none", label: t("None"), description: t("No obfuscation") },
                            { value: "http", label: "HTTP", description: t("Simulate HTTP request") },
                        ]}
                    />

                    {tcpHeaderType.value === 'http' && (
                        <div className="col-span-full space-y-2 bg-slate-950 p-3 rounded border border-slate-800">
                            <label className="label-xs text-yellow-500">{t("HTTP Request (Legacy Obfuscation)")}</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <input className="input-base text-xs font-mono" placeholder={t("Path (e.g. /)")}
                                    value={tcpHeaderPath.value?.[0] || "/"}
                                    onChange={e => tcpHeaderPath.onChange([e.target.value])} />
                                <input className="input-base text-xs font-mono" placeholder={t("Host (e.g. bing.com)")}
                                    value={tcpHeaderHost.value?.[0] || ""}
                                    onChange={e => tcpHeaderHost.onChange([e.target.value])} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* HTTP Upgrade */}
        {section === 'httpupgrade' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/50 pt-4">
                <div className="col-span-full flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-400">{t("HTTP Upgrade Configuration")}</span>
                </div>
                <div><label className="label-xs">{t("Path")}</label><input className="input-base font-mono" placeholder="/" value={httpupgradePath.value || ""} onChange={e => httpupgradePath.onChange(e.target.value)} /></div>
                <div><label className="label-xs">{t("Host")}</label><input className="input-base font-mono" placeholder={t("example.com")} value={httpupgradeHost.value || ""} onChange={e => httpupgradeHost.onChange(e.target.value)} /></div>
            </div>
        )}

        {section === 'xhttp' && (
            <div className="border-t border-slate-800 pt-4">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                        {t("{net} configuration", { net: net.toUpperCase() })}
                    </span>
                    <span className="text-[10px] text-white bg-blue-600 px-1.5 py-0.5 rounded font-bold animate-pulse">{t("BEYOND REALITY")}</span>
                </div>
                <XhttpSettingsEditor
                    xhttpSettings={xhttpSettings.value}
                    onChange={(v: any) => xhttpSettings.onChange(v)}
                    isClient={isClient}
                />
            </div>
        )}

        {section === 'ws' && (
            <div className="space-y-4 border-t border-slate-800/50 pt-4 animate-in fade-in">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-indigo-400">{t("WebSocket Settings")}</span>
                </div>

                {!isClient && (
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/50 flex flex-wrap gap-4">
                        <Switch
                            checked={wsAcceptProxyProtocol.value || false}
                            onChange={checked => wsAcceptProxyProtocol.onChange(checked)}
                            label={<span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">{t("Accept PROXY Protocol")}</span>}
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="label-xs">{t("Path")}</label><input className="input-base font-mono" value={wsPath.value || "/"} onChange={e => wsPath.onChange(e.target.value)} /></div>
                    <div><label className="label-xs">{t("Host")}</label><input className="input-base font-mono" placeholder={t("host.com")} value={wsHost.value || ""} onChange={e => wsHost.onChange(e.target.value)} /></div>
                    <div>
                        <label className="label-xs">{t("Heartbeat Period (s)")}</label>
                        <NumberInput
                            placeholder="10"
                            value={wsHeartbeatPeriod.value}
                            onChange={val => wsHeartbeatPeriod.onChange(val)}
                        />
                    </div>
                </div>
            </div>
        )}

        {section === 'grpc' && (
            <div className="space-y-4 border-t border-slate-800 pt-4 animate-in fade-in">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-indigo-400">{t("gRPC Settings")}</span>
                </div>

                {isClient && (
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/50 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Switch
                            checked={grpcMultiMode.value || false}
                            onChange={checked => grpcMultiMode.onChange(checked)}
                            label={t("Enable Multi Mode")}
                        />
                        <Switch
                            checked={grpcPermitWithoutStream.value || false}
                            onChange={checked => grpcPermitWithoutStream.onChange(checked)}
                            label={t("Permit Without Stream")}
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-full"><label className="label-xs">{t("Service Name")}</label><input className="input-base font-mono" placeholder={t("GunService")} value={grpcServiceName.value || ""} onChange={e => grpcServiceName.onChange(e.target.value)} /></div>
                    <div><label className="label-xs">{t("Authority")}</label><input className="input-base font-mono" placeholder={t("grpc.example.com")} value={grpcAuthority.value || ""} onChange={e => grpcAuthority.onChange(e.target.value)} /></div>
                    {isClient && (
                        <>
                            <div><label className="label-xs">{t("User Agent")}</label><input className="input-base font-mono" placeholder={t("custom user agent")} value={grpcUserAgent.value || ""} onChange={e => grpcUserAgent.onChange(e.target.value)} /></div>
                            <div>
                                <label className="label-xs">{t("Idle Timeout")}</label>
                                <DurationInput
                                    placeholder="60"
                                    value={grpcIdleTimeout.value}
                                    onChange={val => grpcIdleTimeout.onChange(val)}
                                    defaultUnit="s"
                                    mode="number"
                                    baseUnit="s"
                                    unitOptions={['ms', 's', 'm', 'h']}
                                />
                            </div>
                            <div>
                                <label className="label-xs">{t("Health Check Timeout")}</label>
                                <DurationInput
                                    placeholder="20"
                                    value={grpcHealthCheckTimeout.value}
                                    onChange={val => grpcHealthCheckTimeout.onChange(val)}
                                    defaultUnit="s"
                                    mode="number"
                                    baseUnit="s"
                                    unitOptions={['ms', 's', 'm', 'h']}
                                />
                            </div>
                            <div>
                                <label className="label-xs">{t("Initial Windows Size")}</label>
                                <NumberInput
                                    placeholder="0"
                                    value={grpcInitialWindowsSize.value}
                                    onChange={val => grpcInitialWindowsSize.onChange(val)}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
        )}

        {section === 'kcp' && (
            <KcpSection streamSettings={streamSettings} fields={fields} side={side} protocol={protocol} />
        )}

        {section === 'hysteria' && (
            <HysteriaSection streamSettings={streamSettings} fields={fields} side={side} protocol={protocol} />
        )}

        {section === 'masque' && (
            <MasqueSettingsEditor
                settings={masqueSettings.value}
                onChange={masqueSettings.onChange}
                isClient={isClient}
                protocol={protocol}
            />
        )}

        {/* v26.9.30's other new transport: a shared store as the carrier. What
            Build() and the store refuse is core/xray/xdrive's, said beside the
            fields and in the diagnostics alike. */}
        {section === 'xdrive' && (
            <XDriveSettingsEditor
                settings={xdriveSettings.value}
                onChange={xdriveSettings.onChange}
                isClient={isClient}
                protocol={protocol}
            />
        )}
        </>
    );
};

type Fields = ReturnType<typeof useTransportFields>;

interface SectionProps {
    streamSettings: any;
    fields: Fields;
    side: 'inbound' | 'outbound';
    protocol?: string;
}

/**
 * mKCP, as each line reads it.
 *
 *   26.3   mtu, tti (10-5000), uplink/downlinkCapacity, congestion,
 *          readBufferSize (decoded, never used), writeBufferSize (MB)
 *   26.7+  mtu (≥ 21), tti (10-1000), uplink/downlinkCapacity,
 *          maxSendingWindow (bytes, ≥ mtu), cwndMultiplier (≥ 1)
 *
 * `header` and `seed` are refused by 26.3 and 26.7 and ignored by 26.9; the
 * obfuscation they gave is a finalmask UDP mask now.
 */
const KcpSection = ({ streamSettings, fields, side, protocol }: SectionProps) => {
    const { version, tag, offersAt } = useCoreVersion();
    const kcp = streamSettings?.kcpSettings;
    const where = { scope: side, settingsPath: 'streamSettings.kcpSettings', protocol } as const;
    const retired = keyNotices(kcp, KCP_RETIRED_KEYS, where, version);
    const versioned = keyNotices(kcp, KCP_VERSIONED_KEYS, where, version);
    const problems = kcpProblems(kcp, version);
    const tti = kcpTtiRange(version);
    const masks = kcpReplacementMasks(version);
    /** Offered where the line accepts it; a held one the line does not is in `versioned`. */
    const offers = (key: string) => offersAt(side, `streamSettings.kcpSettings.${key}`, protocol);

    return (
        <div className="space-y-4 border-t border-slate-800 pt-4 animate-in fade-in">
            <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-indigo-400">{t("mKCP Settings")}</span>
            </div>

            {retired.map(notice => (
                <VersionKeyNotice
                    key={notice.key}
                    what={`kcpSettings.${notice.key}`}
                    status={notice.status}
                    tag={tag}
                    actions={[{ label: t("Remove it"), onClick: () => fields.removeKcpKeys([notice.key]) }]}
                >
                    <p className="text-slate-400">
                        {t("mKCP obfuscation is a Finalmask UDP mask now. On Xray {tag}: {masks}. Add one under Finalmask below.", { tag, masks: masks.join(', ') })}
                    </p>
                </VersionKeyNotice>
            ))}

            {versioned.map(notice => (
                <VersionKeyNotice
                    key={notice.key}
                    what={`kcpSettings.${notice.key}`}
                    status={notice.status}
                    tag={tag}
                    replacement={notice.replacement}
                    actions={[{ label: t("Remove it"), onClick: () => fields.removeKcpKeys([notice.key]) }]}
                />
            ))}

            {offers('congestion') && (
                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/50 flex flex-wrap gap-4">
                    <Switch
                        checked={fields.kcpCongestion.value || false}
                        onChange={checked => fields.kcpCongestion.onChange(checked || undefined)}
                        label={t("Enable Congestion Control")}
                    />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="label-xs">{t("MTU")}</label>
                    <NumberInput
                        placeholder="1350"
                        value={fields.kcpMtu.value}
                        onChange={val => fields.kcpMtu.onChange(val)}
                        min={kcpMtuMin(version)}
                    />
                    <FieldProblem message={problems.mtu} />
                </div>
                <div>
                    <label className="label-xs">{t("TTI (ms)")}</label>
                    <NumberInput
                        placeholder="50"
                        value={fields.kcpTti.value}
                        onChange={val => fields.kcpTti.onChange(val)}
                        min={tti.min}
                        max={tti.max}
                    />
                    <FieldProblem message={problems.tti} />
                </div>
                <div>
                    <label className="label-xs">{t("Uplink Capacity (MB/s)")}</label>
                    <NumberInput
                        placeholder="5"
                        value={fields.kcpUplinkCapacity.value}
                        onChange={val => fields.kcpUplinkCapacity.onChange(val)}
                        min={0}
                    />
                </div>
                <div>
                    <label className="label-xs">{t("Downlink Capacity (MB/s)")}</label>
                    <NumberInput
                        placeholder="20"
                        value={fields.kcpDownlinkCapacity.value}
                        onChange={val => fields.kcpDownlinkCapacity.onChange(val)}
                        min={0}
                    />
                </div>
                {offers('maxSendingWindow') && (
                    <div>
                        <label className="label-xs flex items-center">
                            {t("Max Sending Window (bytes)")}
                            <Help>{t("Replaced writeBufferSize in Xray 26.7. Must be at least the MTU.")}</Help>
                        </label>
                        <NumberInput
                            placeholder="2097152"
                            value={fields.kcpMaxSendingWindow.value}
                            onChange={val => fields.kcpMaxSendingWindow.onChange(val)}
                            min={0}
                        />
                        <FieldProblem message={problems.maxSendingWindow} />
                    </div>
                )}
                {offers('cwndMultiplier') && (
                    <div>
                        <label className="label-xs">{t("Congestion Window Multiplier")}</label>
                        <NumberInput
                            placeholder="1"
                            value={fields.kcpCwndMultiplier.value}
                            onChange={val => fields.kcpCwndMultiplier.onChange(val)}
                            min={1}
                        />
                        <FieldProblem message={problems.cwndMultiplier} />
                    </div>
                )}
                {/* 26.3 decodes readBufferSize and its mKCP never uses it,
                    so it is shown only when a config already has one. */}
                {offers('readBufferSize') && kcp?.readBufferSize !== undefined && (
                    <div>
                        <label className="label-xs">{t("Read Buffer Size (MB)")}</label>
                        <NumberInput
                            placeholder="2"
                            value={fields.kcpReadBufferSize.value}
                            onChange={val => fields.kcpReadBufferSize.onChange(val)}
                            min={0}
                        />
                    </div>
                )}
                {offers('writeBufferSize') && (
                    <div>
                        <label className="label-xs">{t("Write Buffer Size (MB)")}</label>
                        <NumberInput
                            placeholder="2"
                            value={fields.kcpWriteBufferSize.value}
                            onChange={val => fields.kcpWriteBufferSize.onChange(val)}
                            min={0}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * The hysteria transport: `version`, `auth`, and on a server the UDP idle
 * timeout and masquerade. Congestion, bandwidth and port hopping moved to
 * finalmask, and are shown only as notices on a config that still has them.
 */
const HysteriaSection = ({ streamSettings, fields, side, protocol }: SectionProps) => {
    const { version, tag, offersAt } = useCoreVersion();
    const hysteria = streamSettings?.hysteriaSettings;
    const where = { scope: side, settingsPath: 'streamSettings.hysteriaSettings', protocol } as const;
    const retired = keyNotices(hysteria, HYSTERIA_RETIRED_KEYS, where, version);
    const masquerade = hysteria?.masquerade ?? {};
    const masqueradeWhere = { scope: side, settingsPath: 'streamSettings.hysteriaSettings.masquerade', protocol } as const;
    const xForwardedNotice = keyNotices(masquerade, ['xForwarded'], masqueradeWhere, version)[0];
    const offersXForwarded = offersAt(side, 'streamSettings.hysteriaSettings.masquerade.xForwarded', protocol);
    const isServer = side === 'inbound';
    const versionWrong = hysteria && typeof hysteria === 'object' && hysteria.version !== 2;
    const type = typeof masquerade.type === 'string' ? masquerade.type.toLowerCase() : '';
    const knownTypes = ['', '404', 'file', 'proxy', 'string'];
    const typeOptions = [
        { value: '', label: t("404 Not Found (default)") },
        { value: 'file', label: t("Files from a directory") },
        { value: 'proxy', label: t("Reverse proxy") },
        { value: 'string', label: t("Fixed response") },
    ];
    const unknownType = !knownTypes.includes(type);
    if (unknownType) typeOptions.push({ value: masquerade.type, label: masquerade.type });

    return (
        <div className="space-y-4 border-t border-slate-800 pt-4 animate-in fade-in">
            <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-indigo-400">{t("Hysteria Settings")}</span>
            </div>

            {versionWrong && (
                <VersionKeyNotice
                    what="hysteriaSettings.version"
                    status="rejected"
                    tag={tag}
                    message={t("hysteriaSettings.version must be 2 — Xray {tag} refuses anything else, including no version at all.", { tag })}
                    actions={[{ label: t("Set version 2"), onClick: fields.setHysteriaVersion }]}
                />
            )}

            {retired.map(notice => (
                <VersionKeyNotice
                    key={notice.key}
                    what={`hysteriaSettings.${notice.key}`}
                    status={notice.status}
                    tag={tag}
                    replacement={notice.replacement}
                    actions={[{ label: t("Remove it"), onClick: () => fields.removeHysteriaKeys([notice.key]) }]}
                />
            ))}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={isServer ? '' : 'md:col-span-2'}>
                    <label className="label-xs flex items-center">
                        {t("Auth")}
                        <Help>
                            {isServer
                                ? t("Checked only when this inbound has no users of its own.")
                                : t("The password this client sends to the server.")}
                        </Help>
                    </label>
                    <input
                        className="input-base font-mono"
                        value={fields.hysteriaAuth.value || ''}
                        onChange={e => fields.hysteriaAuth.onChange(e.target.value)}
                    />
                </div>
                {isServer && (
                    <div>
                        <label className="label-xs">{t("UDP Idle Timeout (s)")}</label>
                        <NumberInput
                            placeholder={String(HYSTERIA_UDP_IDLE.fallback)}
                            value={fields.hysteriaUdpIdleTimeout.value}
                            onChange={val => fields.hysteriaUdpIdleTimeout.onChange(val)}
                            min={0}
                            max={HYSTERIA_UDP_IDLE.max}
                        />
                        <FieldProblem message={hysteriaUdpIdleProblem(fields.hysteriaUdpIdleTimeout.value, version)} />
                    </div>
                )}
            </div>

            {isServer && (
                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/50 space-y-4">
                    <Select
                        label={t("Masquerade")}
                        help={t("What the server shows to anything that is not a Hysteria client.")}
                        // `404` and empty are the same page; the option says so.
                        value={unknownType ? masquerade.type : type === '404' ? '' : type}
                        onChange={val => fields.masqueradeType.onChange(val)}
                        options={typeOptions}
                        error={unknownType
                            ? t("Xray {tag} does not know this masquerade — the inbound will not start.", { tag })
                            : undefined}
                    />

                    {type === 'file' && (
                        <div>
                            <label className="label-xs">{t("Directory")}</label>
                            <input className="input-base font-mono" placeholder="/var/www/html"
                                value={fields.masqueradeDir.value || ''}
                                onChange={e => fields.masqueradeDir.onChange(e.target.value)} />
                        </div>
                    )}

                    {type === 'proxy' && (
                        <div className="space-y-3">
                            <div>
                                <label className="label-xs">{t("Upstream URL")}</label>
                                <input className="input-base font-mono" placeholder="https://example.com"
                                    value={fields.masqueradeUrl.value || ''}
                                    onChange={e => fields.masqueradeUrl.onChange(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Switch
                                    checked={fields.masqueradeRewriteHost.value || false}
                                    onChange={checked => fields.masqueradeRewriteHost.onChange(checked)}
                                    label={t("Rewrite Host header")}
                                />
                                <Switch
                                    checked={fields.masqueradeInsecure.value || false}
                                    onChange={checked => fields.masqueradeInsecure.onChange(checked)}
                                    label={t("Skip upstream certificate check")}
                                />
                                {offersXForwarded && (
                                    <Switch
                                        checked={fields.masqueradeXForwarded.value || false}
                                        onChange={checked => fields.masqueradeXForwarded.onChange(checked)}
                                        label={t("Add X-Forwarded-* headers")}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {xForwardedNotice && (
                        <VersionKeyNotice
                            what="masquerade.xForwarded"
                            status={xForwardedNotice.status}
                            tag={tag}
                            actions={[{ label: t("Remove it"), onClick: () => fields.masqueradeXForwarded.onChange(false) }]}
                        />
                    )}

                    {type === 'string' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="md:col-span-2">
                                <label className="label-xs">{t("Response Body")}</label>
                                <input className="input-base font-mono"
                                    value={fields.masqueradeContent.value || ''}
                                    onChange={e => fields.masqueradeContent.onChange(e.target.value)} />
                            </div>
                            <div>
                                <label className="label-xs">{t("Status Code")}</label>
                                <NumberInput
                                    placeholder="200"
                                    value={fields.masqueradeStatusCode.value}
                                    onChange={val => fields.masqueradeStatusCode.onChange(val)}
                                    min={100}
                                    max={599}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            <p className="text-[10px] text-slate-500 leading-relaxed">
                {t("Protocol version 2 is written for you — it is the only one Xray takes. Congestion control, bandwidth and port hopping are set under Finalmask.")}
            </p>
        </div>
    );
};
