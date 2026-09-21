import React, { useState } from 'react';
import { Icon } from '../../ui/Icon';
import { Button } from '../../ui/Button';
import { Help } from '../../ui/Help';
import { generateRealitySpiderX, generateRealityShortIds, generateX25519Keys } from '../../../core/generators';
import { REALITY_FIELDS, TLS_FIELDS, hiddenKeysFor, foreignFieldsIn } from '../../../core/xray/field-directions';
import { SockoptEditor } from './SockoptEditor';
import { TagSelector } from '../../ui/TagSelector';
import { XhttpSettingsEditor } from './XhttpSettingsEditor';
import { FinalmaskEditor } from './FinalmaskEditor';
import { Switch } from '../../ui/Switch';
import { Select } from '../../ui/Select';
import { NumberInput } from '../../ui/NumberInput';
import { DurationInput } from '../../ui/DurationInput';
import { RealitySchema, TlsSchema } from '../../../core/xray/schemas';
import { SchemaForm } from '../../ui/SchemaForm';
import { ExtendedSection } from '../../ui/ExtendedSection';
import { useField } from '../../../hooks/useField';
import type { FieldPath } from '../../../hooks/useField';
import { toast } from 'sonner';
import { t, tn } from '../../../i18n';

interface TransportProps {
    streamSettings: any;
    onChange: (newSettings: any) => void;
    isClient?: boolean;
    errors?: Record<string, string | undefined>;
    protocol?: string;
}

// Pure derivation, no component state involved — pulled out of the render
// body so TransportSettings itself only has to call it and use the result.
// `errors` arrives either as a flat/keyed map or as an array of
// {field, message} entries (see callers); either way we only care about the
// two nested slices (reality/tls) that SchemaForm needs per-field errors for.
function parseTransportErrors(errors: TransportProps['errors']) {
    const parsedErrors: Record<string, string | undefined> = {};
    if (Array.isArray(errors)) {
        (errors as any[]).forEach((err: any) => {
            if (err.field) {
                parsedErrors[err.field] = err.message;
            }
        });
    } else if (errors && typeof errors === 'object') {
        Object.assign(parsedErrors, errors);
    }

    const realityErrors: Record<string, string | undefined> = {};
    const tlsErrors: Record<string, string | undefined> = {};

    Object.entries(parsedErrors).forEach(([key, val]) => {
        if (key.startsWith('streamSettings.realitySettings.')) {
            const field = key.replace('streamSettings.realitySettings.', '');
            realityErrors[field] = val;
        } else if (key.startsWith('streamSettings.tlsSettings.')) {
            const field = key.replace('streamSettings.tlsSettings.', '');
            tlsErrors[field] = val;
        }
    });

    return { realityErrors, tlsErrors };
}

/**
 * Names fields the config carries that this side's core will not read.
 *
 * They stay editable — the value is in the config and hiding it would make it
 * unremovable — but silently rendering a client key on a server form would
 * suggest it does something. Panels copy `fingerprint` and `spiderX` from
 * client templates into server inbounds often enough that this is worth
 * spelling out.
 */
const ForeignFieldNotice = ({ fields, side }: { fields: string[]; side: 'inbound' | 'outbound' }) => {
    if (fields.length === 0) return null;
    return (
        <div className="flex gap-2 p-2.5 rounded-lg border border-amber-500/40 bg-amber-950/20 text-[11px] text-amber-200/90 mb-3">
            <Icon name="Warning" weight="fill" className="shrink-0 mt-0.5 text-amber-400" />
            <div>
                <span className="font-mono font-bold">{fields.join(', ')}</span>
                {' — '}
                {side === 'inbound'
                    ? t("client-side fields on a server inbound. Xray never reads them here, so they change nothing. They are shown because they are in your config: clear them if they were copied in by mistake.")
                    : t("server-side fields on a client outbound. Xray never reads them here, so they change nothing. They are shown because they are in your config: clear them if they were copied in by mistake.")}
            </div>
        </div>
    );
};

export const TransportSettings = ({ streamSettings = {}, onChange, isClient = false, errors = {}, protocol }: TransportProps) => {
    // Which security fields belong to which side is declared once, in
    // core/xray/field-directions. These used to be five hand-written
    // arrays that nothing checked against the schema, so a new field
    // appeared on both sides and several were hidden from every form at
    // once — reachable only by editing raw JSON.
    const [shortIdBatch, setShortIdBatch] = React.useState(3);
    const side = isClient ? 'outbound' : 'inbound';
    const realityKeys = Object.keys(RealitySchema.shape);
    const tlsKeys = Object.keys(TlsSchema.shape);
    const shownIn = (keys: string[], fields: typeof REALITY_FIELDS, level: 'basic' | 'advanced', value?: any) =>
        keys.filter(key => !hiddenKeysFor(keys, fields, side, level, value).includes(key));
    const hasAnyValue = (value: any, keys: string[]) =>
        keys.some(key => {
            const v = value?.[key];
            return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== '' && v !== false;
        });
    const [tempPublicKey, setTempPublicKey] = useState<string | null>(null);

    const { realityErrors, tlsErrors } = parseTransportErrors(errors);

    // `streamSettings` is this editor's `local` state and `update` below is
    // its `updateField(path, value)` — same shape as useXrayEditor's, just
    // scoped to this one sub-object. useField binds directly on top of it, so
    // every path below is the ONE place the wiring to streamSettings lives;
    // the JSX under it can be restyled freely (see InboundClients.tsx for the
    // same pattern against the full editor state).
    const update = (path: FieldPath, value: any) => {
        const pathArr = Array.isArray(path) ? path : [path];
        const newObj = JSON.parse(JSON.stringify(streamSettings));
        let curr = newObj;
        for (let i = 0; i < pathArr.length - 1; i++) {
            if (!curr[pathArr[i]]) curr[pathArr[i]] = {};
            curr = curr[pathArr[i]];
        }
        curr[pathArr[pathArr.length - 1]] = value;
        onChange(newObj);
    };

    const network = useField<string>(streamSettings, update, ['network']);
    const security = useField<string>(streamSettings, update, ['security']);

    const httpupgradePath = useField<string>(streamSettings, update, ['httpupgradeSettings', 'path']);
    const httpupgradeHost = useField<string>(streamSettings, update, ['httpupgradeSettings', 'host']);

    const tcpAcceptProxyProtocol = useField<boolean>(streamSettings, update, ['tcpSettings', 'acceptProxyProtocol']);
    const tcpHeaderType = useField<string>(streamSettings, update, ['tcpSettings', 'header', 'type']);
    const tcpHeaderPath = useField<string[]>(streamSettings, update, ['tcpSettings', 'header', 'request', 'path']);
    const tcpHeaderHost = useField<string[]>(streamSettings, update, ['tcpSettings', 'header', 'request', 'headers', 'Host']);

    const wsAcceptProxyProtocol = useField<boolean>(streamSettings, update, ['wsSettings', 'acceptProxyProtocol']);
    const wsPath = useField<string>(streamSettings, update, ['wsSettings', 'path']);
    const wsHost = useField<string>(streamSettings, update, ['wsSettings', 'headers', 'Host']);
    const wsHeartbeatPeriod = useField<number | undefined>(streamSettings, update, ['wsSettings', 'heartbeatPeriod']);

    const grpcMultiMode = useField<boolean>(streamSettings, update, ['grpcSettings', 'multiMode']);
    const grpcPermitWithoutStream = useField<boolean>(streamSettings, update, ['grpcSettings', 'permit_without_stream']);
    const grpcServiceName = useField<string>(streamSettings, update, ['grpcSettings', 'serviceName']);
    const grpcAuthority = useField<string>(streamSettings, update, ['grpcSettings', 'authority']);
    const grpcUserAgent = useField<string>(streamSettings, update, ['grpcSettings', 'user_agent']);
    const grpcIdleTimeout = useField<number | undefined>(streamSettings, update, ['grpcSettings', 'idle_timeout']);
    const grpcHealthCheckTimeout = useField<number | undefined>(streamSettings, update, ['grpcSettings', 'health_check_timeout']);
    const grpcInitialWindowsSize = useField<number | undefined>(streamSettings, update, ['grpcSettings', 'initial_windows_size']);

    const kcpCongestion = useField<boolean>(streamSettings, update, ['kcpSettings', 'congestion']);
    const kcpHeaderType = useField<string>(streamSettings, update, ['kcpSettings', 'header', 'type']);
    const kcpSeed = useField<string>(streamSettings, update, ['kcpSettings', 'seed']);
    const kcpMtu = useField<number | undefined>(streamSettings, update, ['kcpSettings', 'mtu']);
    const kcpTti = useField<number | undefined>(streamSettings, update, ['kcpSettings', 'tti']);
    const kcpUplinkCapacity = useField<number | undefined>(streamSettings, update, ['kcpSettings', 'uplinkCapacity']);
    const kcpDownlinkCapacity = useField<number | undefined>(streamSettings, update, ['kcpSettings', 'downlinkCapacity']);
    const kcpReadBufferSize = useField<number | undefined>(streamSettings, update, ['kcpSettings', 'readBufferSize']);
    const kcpWriteBufferSize = useField<number | undefined>(streamSettings, update, ['kcpSettings', 'writeBufferSize']);

    const quicSecurity = useField<string>(streamSettings, update, ['quicSettings', 'security']);
    const quicHeaderType = useField<string>(streamSettings, update, ['quicSettings', 'header', 'type']);
    const quicKey = useField<string>(streamSettings, update, ['quicSettings', 'key']);

    const realitySettings = useField<any>(streamSettings, update, ['realitySettings']);
    const tlsSettings = useField<any>(streamSettings, update, ['tlsSettings']);
    // certificates is always written as a single-element array (server cert +
    // key), so it's bound as one leaf field rather than useArrayField's
    // CRUD-list semantics (which would preserve any extra elements instead of
    // collapsing to one, changing behavior for hand-edited multi-cert JSON).
    const tlsCertificates = useField<any[]>(streamSettings, update, ['tlsSettings', 'certificates']);

    const net = network.value || "tcp";
    const sec = security.value || "none";

    const handleGenKeys = () => {
        const keys = generateX25519Keys();
        if (isClient) {
            update(['realitySettings', 'privateKey'], keys.privateKey);
            update(['realitySettings', 'publicKey'], keys.publicKey);
        } else {
            update(['realitySettings', 'privateKey'], keys.privateKey);
            setTempPublicKey(keys.publicKey);
            if (!streamSettings.realitySettings?.shortIds) {
                update(['realitySettings', 'shortIds'], [Math.random().toString(16).substring(2, 10)]);
            }
        }
    };

    return (
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2.5">
                    <Icon name="GlobeHemisphereWest" size={18} />
{t("Stream Settings")}
</h4>
            </div>

            {/* --- MAIN SELECTORS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label={t("Network")}
                        hint={t("Transport protocol used to deliver data.")}
                        value={net}
                        onChange={val => network.onChange(val)}
                        options={[
                            { value: "tcp", label: "TCP", description: t("Standard reliable stream") },
                            { value: "ws", label: t("WebSocket"), description: t("Standard web transport") },
                            { value: "xhttp", label: t("XHTTP"), description: t("Next-gen HTTP transport") },
                            { value: "splithttp", label: t("SplitHTTP"), description: t("High-performance split stream") },
                            { value: "grpc", label: t("gRPC"), description: t("Modern RPC framework") },
                            { value: "http", label: "HTTP", description: t("Standard HTTP proxying") },
                            { value: "quic", label: t("QUIC"), description: t("UDP-based transport (HTTP/3)") },
                            { value: "kcp", label: t("mKCP"), description: t("Aggressive UDP transport") },
                            { value: "raw", label: t("RAW"), description: t("Raw socket access") },
                            { value: "httpupgrade", label: t("HTTP Upgrade"), description: t("Modern WebSocket alternative") },
                        ]}
                    />
                    <Select
                        label={t("Security")}
                        hint={t("Encryption layer (TLS/Reality).")}
                        value={sec}
                        onChange={val => security.onChange(val)}
                        options={[
                            { value: "none", label: t("NONE"), description: t("Plaintext (unsafe)") },
                            { value: "tls", label: "TLS", description: t("Standard SSL/TLS encryption") },
                            ...(['vless', 'vmess', 'trojan', 'shadowsocks'].includes(protocol || '') ? [
                                { value: "reality", label: t("REALITY"), description: t("Next-gen stealth encryption") }
                            ] : []),
                        ]}
                    />
            </div>

            <div className="border-t border-slate-800/50 my-2" />

            {/* --- NETWORK SPECIFIC SETTINGS --- */}

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
                                <div className="grid grid-cols-2 gap-2">
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
                        onChange={v => update([net === 'splithttp' ? 'splithttpSettings' : 'xhttpSettings'], v)}
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

            {/* --- SECURITY SETTINGS --- */}

            {/* 1. REALITY SETTINGS */}
            {sec === 'reality' && (
                <div className="space-y-4 border-t border-slate-800 pt-4 animate-in fade-in">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-purple-400 flex items-center">
                            REALITY Keys
                            <Help>{t("Reality: A TLS extension for mimicking popular websites to bypass firewalls.")}</Help>
                        </span>
                    </div>

                    {!isClient && (
                        // A server usually wants a handful of shortIds at once —
                        // one per client group — and generating them one dice
                        // click at a time is the tedious way to get there.
                        <div className="flex flex-wrap items-end gap-3 mb-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                            <div className="w-24">
                                <span className="label-xs">{t("How many")}</span>
                                <NumberInput value={shortIdBatch} onChange={v => setShortIdBatch(v ?? 1)} min={1} max={32} />
                            </div>
                            <Button
                                variant="secondary"
                                icon="DiceFive"
                                className="h-11 px-4"
                                onClick={() => {
                                    const existing: string[] = realitySettings.value?.shortIds || [];
                                    const made = generateRealityShortIds(shortIdBatch, { existing });
                                    update(['realitySettings', 'shortIds'], [...existing, ...made]);
                                    toast.success(tn(made.length, "Added {n} shortId", "Added {n} shortIds"));
                                }}
                            >
                                {t("Generate shortIds")}
                            </Button>
                            <span className="text-[11px] text-slate-500 pb-3">
                                {(realitySettings.value?.shortIds?.length ?? 0) > 0
                                    ? tn(realitySettings.value.shortIds.length, "{n} already in the list", "{n} already in the list")
                                    : t("appended to the list below")}
                            </span>
                        </div>
                    )}

                    <ForeignFieldNotice
                        fields={foreignFieldsIn(REALITY_FIELDS, side, realitySettings.value)}
                        side={side}
                    />

                    <SchemaForm
                        schema={RealitySchema}
                        value={realitySettings.value || {}}
                        onChange={val => realitySettings.onChange(val)}
                        errors={realityErrors}
                        excludeKeys={hiddenKeysFor(realityKeys, REALITY_FIELDS, side, 'basic', realitySettings.value)}
                    />

                    {/* REALITY EXTENDED SECTION */}
                    <ExtendedSection
                        title={t("Extended REALITY Settings")}
                        description={t("Post-quantum signature verification, master key logs, and server debug options.")}
                        hasActiveValues={hasAnyValue(realitySettings.value, shownIn(realityKeys, REALITY_FIELDS, 'advanced', realitySettings.value))}
                    >
                        <SchemaForm
                            schema={RealitySchema}
                            value={realitySettings.value || {}}
                            onChange={val => realitySettings.onChange(val)}
                            errors={realityErrors}
                            excludeKeys={hiddenKeysFor(realityKeys, REALITY_FIELDS, side, 'advanced', realitySettings.value)}
                        />
                    </ExtendedSection>
                </div>
            )}

            {/* 2. STANDARD TLS SETTINGS */}
            {sec === 'tls' && (
                <div className="space-y-4 border-t border-slate-800 pt-4 animate-in fade-in">
                    <div className="text-xs font-bold text-blue-400">{t("Standard TLS Settings")}</div>

                    {!isClient && (
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 mb-4">
                            <label className="label-xs font-bold text-slate-400">{t("Certificates (Paths)")}</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <input className="input-base text-xs font-mono" placeholder={t("Certificate file path (e.g. /path/to/fullchain.crt)")}
                                    value={tlsCertificates.value?.[0]?.certificateFile || ""}
                                    onChange={e => tlsCertificates.onChange([{ ...tlsCertificates.value?.[0], certificateFile: e.target.value }])} />
                                <input className="input-base text-xs font-mono" placeholder={t("Private key file path (e.g. /path/to/private.key)")}
                                    value={tlsCertificates.value?.[0]?.keyFile || ""}
                                    onChange={e => tlsCertificates.onChange([{ ...tlsCertificates.value?.[0], keyFile: e.target.value }])} />
                            </div>
                        </div>
                    )}

                    <ForeignFieldNotice
                        fields={foreignFieldsIn(TLS_FIELDS, side, tlsSettings.value)}
                        side={side}
                    />

                    <SchemaForm
                        schema={TlsSchema}
                        value={tlsSettings.value || {}}
                        onChange={val => tlsSettings.onChange(val)}
                        errors={tlsErrors}
                        excludeKeys={hiddenKeysFor(tlsKeys, TLS_FIELDS, side, 'basic', tlsSettings.value)}
                    />

                    {/* TLS EXTENDED SECTION */}
                    <ExtendedSection
                        title={t("Extended TLS Settings")}
                        description={t("Cipher suites, session resumption, certificate pinning, and SSLKEYLOGFILE.")}
                        hasActiveValues={hasAnyValue(tlsSettings.value, shownIn(tlsKeys, TLS_FIELDS, 'advanced', tlsSettings.value))}
                    >
                        <SchemaForm
                            schema={TlsSchema}
                            value={tlsSettings.value || {}}
                            onChange={val => tlsSettings.onChange(val)}
                            errors={tlsErrors}
                            excludeKeys={hiddenKeysFor(tlsKeys, TLS_FIELDS, side, 'advanced', tlsSettings.value)}
                        />
                    </ExtendedSection>
                </div>
            )}

            {/* FINALMASK (UDP/TCP Noise & QUIC) */}
            <FinalmaskEditor
                finalmask={streamSettings.finalmask}
                onChange={v => {
                    if (v === null) {
                        const newSettings = { ...streamSettings };
                        delete newSettings.finalmask;
                        onChange(newSettings);
                    } else {
                        update(['finalmask'], v);
                    }
                }}
            />

            {/* --- SOCKOPT (Advanced) --- */}
            <SockoptEditor
                sockopt={streamSettings.sockopt}
                onChange={v => {
                    if (v === null) {
                        const newSettings = { ...streamSettings };
                        delete newSettings.sockopt;
                        onChange(newSettings);
                    } else {
                        update(['sockopt'], v);
                    }
                }}
                isClient={isClient}
            />
        </div>
    );
};
