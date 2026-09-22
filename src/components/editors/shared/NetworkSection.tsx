import React from 'react';
import { Select } from '../../ui/Select';
import { Switch } from '../../ui/Switch';
import { NumberInput } from '../../ui/NumberInput';
import { DurationInput } from '../../ui/DurationInput';
import { Help } from '../../ui/Help';
import { XhttpSettingsEditor } from './XhttpSettingsEditor';
import { useTransportFields } from '../../../hooks/useTransportFields';
import { t } from '../../../i18n';

/**
 * The settings that belong to the chosen transport, and only that one.
 *
 * Binds `streamSettings` itself rather than taking forty props: the bindings
 * are closures over the same object the parent passes, so computing them here
 * costs nothing and keeps every path in one place (see useTransportFields).
 */
export const NetworkSection = ({
    streamSettings,
    onChange,
    net,
    isClient,
}: {
    streamSettings: any;
    onChange: (next: any) => void;
    net: string;
    isClient: boolean;
}) => {
    const {
        update,
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
        kcpCongestion,
        kcpHeaderType,
        kcpSeed,
        kcpMtu,
        kcpTti,
        kcpUplinkCapacity,
        kcpDownlinkCapacity,
        kcpReadBufferSize,
        kcpWriteBufferSize,
        quicSecurity,
        quicHeaderType,
        quicKey,
    } = useTransportFields(streamSettings, onChange);

    return (
        <>

        {/* RAW (for Finalmask) */}
        {net === 'raw' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/50 pt-4">
                <div className="col-span-full flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400">{t("RAW Socket Settings")}</span>
                    <Help>{t("Used primarily with Finalmask for obfuscation.")}</Help>
                </div>
            </div>
        )}

        {/* HTTP Upgrade */}
        {net === 'httpupgrade' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/50 pt-4">
                <div className="col-span-full flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-400">{t("HTTP Upgrade Configuration")}</span>
                </div>
                <div><label className="label-xs">{t("Path")}</label><input className="input-base font-mono" placeholder="/" value={httpupgradePath.value || ""} onChange={e => httpupgradePath.onChange(e.target.value)} /></div>
                <div><label className="label-xs">{t("Host")}</label><input className="input-base font-mono" placeholder={t("example.com")} value={httpupgradeHost.value || ""} onChange={e => httpupgradeHost.onChange(e.target.value)} /></div>
            </div>
        )}

        {/* TCP (RAW) */}
        {net === 'tcp' && (
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

        {(net === 'xhttp' || net === 'splithttp') && (
            <div className="border-t border-slate-800 pt-4">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                        {t("{net} configuration", { net: net.toUpperCase() })}
                    </span>
                    <span className="text-[10px] text-white bg-blue-600 px-1.5 py-0.5 rounded font-bold animate-pulse">{t("BEYOND REALITY")}</span>
                </div>
                <XhttpSettingsEditor
                    xhttpSettings={streamSettings.xhttpSettings || streamSettings.splithttpSettings}
                    onChange={(v: any) => update([net === 'splithttp' ? 'splithttpSettings' : 'xhttpSettings'], v)}
                    isClient={isClient}
                />
            </div>
        )}

        {net === 'ws' && (
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

        {net === 'grpc' && (
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

        {net === 'kcp' && (
            <div className="space-y-4 border-t border-slate-800 pt-4 animate-in fade-in">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-indigo-400">{t("mKCP Settings")}</span>
                </div>

                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/50 flex flex-wrap gap-4">
                    <Switch
                        checked={kcpCongestion.value || false}
                        onChange={checked => kcpCongestion.onChange(checked)}
                        label={t("Enable Congestion Control")}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label={t("Header Type")}
                        value={kcpHeaderType.value || "none"}
                        onChange={val => kcpHeaderType.onChange(val)}
                        options={[
                            { value: "none", label: t("None") },
                            { value: "srtp", label: t("SRTP"), description: t("Video call simulation") },
                            { value: "utp", label: "uTP", description: t("BitTorrent simulation") },
                            { value: "wechat-video", label: t("WeChat"), description: t("WeChat video call") },
                            { value: "dtls", label: t("DTLS"), description: t("DTLS 1.2 simulation") },
                            { value: "wireguard", label: t("WireGuard"), description: t("WireGuard simulation") },
                        ]}
                    />
                    <div><label className="label-xs">{t("Seed")}</label><input className="input-base font-mono" placeholder={t("password")} value={kcpSeed.value || ""} onChange={e => kcpSeed.onChange(e.target.value)} /></div>
                    <div>
                        <label className="label-xs">{t("MTU")}</label>
                        <NumberInput
                            placeholder="1350"
                            value={kcpMtu.value}
                            onChange={val => kcpMtu.onChange(val)}
                        />
                    </div>
                    <div>
                        <label className="label-xs">{t("TTI (ms)")}</label>
                        <NumberInput
                            placeholder="50"
                            value={kcpTti.value}
                            onChange={val => kcpTti.onChange(val)}
                        />
                    </div>
                    <div>
                        <label className="label-xs">{t("Uplink Capacity (MB/s)")}</label>
                        <NumberInput
                            placeholder="5"
                            value={kcpUplinkCapacity.value}
                            onChange={val => kcpUplinkCapacity.onChange(val)}
                        />
                    </div>
                    <div>
                        <label className="label-xs">{t("Downlink Capacity (MB/s)")}</label>
                        <NumberInput
                            placeholder="20"
                            value={kcpDownlinkCapacity.value}
                            onChange={val => kcpDownlinkCapacity.onChange(val)}
                        />
                    </div>
                    <div>
                        <label className="label-xs">{t("Read Buffer Size (MB)")}</label>
                        <NumberInput
                            placeholder="2"
                            value={kcpReadBufferSize.value}
                            onChange={val => kcpReadBufferSize.onChange(val)}
                        />
                    </div>
                    <div>
                        <label className="label-xs">{t("Write Buffer Size (MB)")}</label>
                        <NumberInput
                            placeholder="2"
                            value={kcpWriteBufferSize.value}
                            onChange={val => kcpWriteBufferSize.onChange(val)}
                        />
                    </div>
                </div>
            </div>
        )}

        {net === 'quic' && (
            <div className="space-y-4 border-t border-slate-800 pt-4 animate-in fade-in">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-indigo-400">{t("QUIC Settings")}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label={t("Security")}
                        value={quicSecurity.value || "none"}
                        onChange={val => quicSecurity.onChange(val)}
                        options={[
                            { value: "none", label: t("None") },
                            { value: "aes-128-gcm", label: t("AES-128-GCM") },
                            { value: "chacha20-poly1305", label: t("ChaCha20") },
                        ]}
                    />
                    <Select
                        label={t("Header Type")}
                        value={quicHeaderType.value || "none"}
                        onChange={val => quicHeaderType.onChange(val)}
                        options={[
                            { value: "none", label: t("None") },
                            { value: "srtp", label: t("SRTP") },
                            { value: "utp", label: "uTP" },
                            { value: "wechat-video", label: t("WeChat") },
                            { value: "dtls", label: t("DTLS") },
                            { value: "wireguard", label: t("WireGuard") },
                        ]}
                    />
                    <div className="col-span-full"><label className="label-xs">{t("Key")}</label><input className="input-base font-mono" placeholder="key" value={quicKey.value || ""} onChange={e => quicKey.onChange(e.target.value)} /></div>
                </div>
            </div>
        )}
        </>
    );
};
