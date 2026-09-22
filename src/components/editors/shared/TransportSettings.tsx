import React from 'react';
import { Icon } from '../../ui/Icon';
import { Button } from '../../ui/Button';
import { Help } from '../../ui/Help';
import { generateRealityShortIds } from '../../../core/generators';
import { REALITY_FIELDS, TLS_FIELDS, hiddenKeysFor, foreignFieldsIn } from '../../../core/xray/field-directions';
import { SockoptEditor } from './SockoptEditor';
import { FinalmaskEditor } from './FinalmaskEditor';
import { Select } from '../../ui/Select';
import { NumberInput } from '../../ui/NumberInput';
import { RealitySchema, TlsSchema } from '../../../core/xray/schemas';
import { SchemaForm } from '../../ui/SchemaForm';
import { ExtendedSection } from '../../ui/ExtendedSection';
import { useConfigStore } from '../../../store/configStore';
import { useTransportFields } from '../../../hooks/useTransportFields';
import { NetworkSection } from './NetworkSection';
import { toast } from 'sonner';
import { t, tn } from '../../../i18n';

interface TransportProps {
    streamSettings: any;
    onChange: (newSettings: any) => void;
    isClient?: boolean;
    errors?: Record<string, string | undefined> | { field: string; message: string }[];
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
    // Paths the user collected from the real REALITY target. The spiderX
    // generator prefers them to anything it can invent.
    const spiderPaths = useConfigStore(state => state.spiderPaths);

    const { realityErrors, tlsErrors } = parseTransportErrors(errors);

    // Every binding to `streamSettings` lives in the hook.
    const {
        update,
        network,
        security,
        realitySettings,
        tlsSettings,
        tlsCertificates,
    } = useTransportFields(streamSettings, onChange);

    const net = network.value || "tcp";
    const sec = security.value || "none";

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
            <NetworkSection
                streamSettings={streamSettings}
                onChange={onChange}
                net={net}
                isClient={isClient}
            />

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
                        spiderPaths={spiderPaths}
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
                            spiderPaths={spiderPaths}
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
