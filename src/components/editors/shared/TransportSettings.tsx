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
import { SchemaForm, type FieldEditorProps } from '../../ui/SchemaForm';
import { WrongTypeNotice } from '../../ui/WrongTypeNotice';
import { FallbackLimitEditor } from './FallbackLimitEditor';
import { checkPinnedCertSha256 } from '../../../core/xray/security-fields';
import { ExtendedSection } from '../../ui/ExtendedSection';
import { useConfigStore } from '../../../store/configStore';
import { useTransportFields } from '../../../hooks/useTransportFields';
import { NetworkSection, VersionKeyNotice } from './NetworkSection';
import {
    effectiveNetwork,
    keyNotices,
    leftoverTransportSettings,
    networkOptions,
    networkProblem,
    securityOptions,
    securityProblem,
    type KeyNotice,
} from '../../../core/xray/transport-networks';
import { useCoreVersion } from '../../../hooks/useCoreVersion';
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

/**
 * The quick pair of paths edits the first certificate and leaves the rest of
 * the list alone. It used to write `[{ ...first, keyFile }]` — which is the
 * whole array — so a config with two certificates lost the second one the
 * moment either box was typed in.
 */
const withFirstCertificate = (list: any[] | undefined, patch: Record<string, string>): any[] => {
    const certificates = Array.isArray(list) ? [...list] : [];
    certificates[0] = { ...(certificates[0] ?? {}), ...patch };
    return certificates;
};

/**
 * REALITY's two fallback limits are a struct of three numbers each, so they
 * are drawn as three numbers — see FallbackLimitEditor. Handed to every
 * REALITY form, basic and extended: a limit a config holds on the side that
 * does not read it is shown at the basic level, next to the warning about it.
 */
const REALITY_FIELD_EDITORS = {
    limitFallbackUpload: (field: FieldEditorProps) => (
        <FallbackLimitEditor limit="limitFallbackUpload" value={field.value} onChange={field.onChange} error={field.error} />
    ),
    limitFallbackDownload: (field: FieldEditorProps) => (
        <FallbackLimitEditor limit="limitFallbackDownload" value={field.value} onChange={field.onChange} error={field.error} />
    ),
};

/**
 * `tlsSettings.echSockopt`: the socket the ECH config is fetched over.
 *
 * It decodes into `*SocketConfig` — the very struct `streamSettings.sockopt`
 * decodes into — on every supported line
 * (v26.7.28:infra/conf/transport_security.go:318, the same at v26.9.9;
 * v26.3.27:infra/conf/transport_internet.go:666), is built by the same
 * SocketConfig.Build() (v26.7.28:infra/conf/transport_security.go:399-405),
 * and is handed to internet.DialSystem for the DNS query, over DoH or UDP
 * (v26.7.28:transport/internet/tls/ech.go:207 and :272).
 *
 * So it gets SockoptEditor rather than the JSON box, for two reasons. One
 * struct should have one editor: the fields, their types and the per-version
 * value sets are already right there, and a JSON box would only move the
 * wrong-type bug one level down — `{"mark": "5"}` is as unloadable as the
 * string the old text input wrote. And DialSystem is the dialing half of
 * SocketConfig on all three lines — addressPortStrategy, domainStrategy,
 * happyEyeballs and dialerProxy are all read there
 * (v26.7.28:transport/internet/dialer.go:246-279) — which is exactly what
 * SockoptEditor draws for a client. Hence `isClient` whatever side the TLS
 * settings are on: this socket is always dialed, never accepted, so tproxy,
 * acceptProxyProtocol and v6only have nothing to act on.
 *
 * No `protocol` is passed: the freedom-only narrowing of addressPortStrategy
 * (v26.9.9:infra/conf/xray.go:344) is a check on the outbound's own sockopt.
 */
const EchSockoptEditor = ({ value, onChange }: FieldEditorProps) => {
    // The old form's string. SockoptEditor would spread it into one key per
    // character, so it never sees it: the notice shows it, ADD replaces it.
    const wrongType = value !== undefined && value !== null && (typeof value !== 'object' || Array.isArray(value));
    return (
        <div className="space-y-3" data-ech-sockopt>
            {wrongType && <WrongTypeNotice field="echSockopt" held={value} onRemove={() => onChange(undefined)} />}
            <SockoptEditor
                sockopt={wrongType ? undefined : value ?? undefined}
                // SockoptEditor says "removed" with null; the form removes a key on undefined.
                onChange={next => onChange(next === null ? undefined : next)}
                isClient
                title={t("ECH Query Socket Options (echSockopt)")}
                hint={t("Socket options for the DNS query that fetches the ECH config. Xray makes that query only when ECH Config List names a DNS server instead of holding the config itself, so without one these do nothing.")}
            />
        </div>
    );
};

const TLS_FIELD_EDITORS = {
    echSockopt: (field: FieldEditorProps) => <EchSockoptEditor {...field} />,
};

/** Labels for TLS keys SchemaForm has no standard entry for. */
const TLS_FIELD_CONFIGS = () => ({
    echForceQuery: {
        label: t("ECH Force Query"),
        help: t("How hard to insist on fetching the ECH config over DNS: none, half or full. Only Xray 26.3 reads it."),
    },
});

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
        setNetwork,
        foldMethodIntoNetwork,
        removeStreamKeys,
        security,
        realitySettings,
        tlsSettings,
        tlsCertificates,
        removeTlsKeys,
    } = useTransportFields(streamSettings, onChange);

    // What the chosen core runs, which is not always what `network` says:
    // 26.7+ read `method` over it. See effectiveNetwork.
    const { version, tag, statusAt } = useCoreVersion();
    const net = effectiveNetwork(streamSettings, version);
    const sec = security.value || "none";
    const method: string | undefined = typeof streamSettings?.method === 'string' ? streamSettings.method : undefined;
    const methodStatus = statusAt(side, 'streamSettings.method', protocol);
    const leftovers = leftoverTransportSettings(streamSettings, net);

    /**
     * TLS keys the chosen line does not simply accept. `allowInsecure` is
     * matched on its value — only `true` is refused, `false` means nothing —
     * so it is looked up with the value its row is keyed on.
     */
    const tlsValue = tlsSettings.value || {};
    const tlsNotices: KeyNotice[] = [
        ...(tlsValue.allowInsecure === true
            ? [{
                key: 'allowInsecure',
                status: statusAt(side, 'streamSettings.tlsSettings.allowInsecure', protocol, 'true'),
                replacement: 'pinnedPeerCertSha256 / verifyPeerCertByName',
            }]
            : []),
        ...keyNotices(tlsValue, ['verifyPeerCertInNames', 'echForceQuery'], { scope: side, settingsPath: 'streamSettings.tlsSettings', protocol }, version),
    ].filter(notice => notice.status !== 'accepted');
    // Keys the line refuses or drops stay out of the form; a held one is in
    // the notices above it, with a remove button.
    const tlsVersionHidden = tlsKeys.filter(key =>
        statusAt(side, `streamSettings.tlsSettings.${key}`, protocol) !== 'accepted');
    const tlsExclude = (level: 'basic' | 'advanced') =>
        [...hiddenKeysFor(tlsKeys, TLS_FIELDS, side, level, tlsSettings.value), ...tlsVersionHidden];
    // Said next to the field as well as in diagnostics: a hash that is not
    // hex is the one mistake here that stops the whole config loading, and
    // the help under this field used to ask for exactly that.
    const pinProblem = checkPinnedCertSha256(tlsValue.pinnedPeerCertSha256, tag).problem;
    const tlsFieldErrors = pinProblem ? { ...tlsErrors, pinnedPeerCertSha256: pinProblem.message } : tlsErrors;

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
                        onChange={val => setNetwork(val)}
                        options={networkOptions(protocol, net, version)}
                        error={networkProblem(protocol, net, version)}
                    />
                    <Select
                        label={t("Security")}
                        hint={t("Encryption layer (TLS/Reality).")}
                        value={sec}
                        onChange={val => security.onChange(val)}
                        options={securityOptions(protocol, net, sec, version)}
                        error={securityProblem(protocol, net, sec, version)}
                    />
            </div>

            {/* 26.7's alias of network. The editor never writes it; one a
                config has decides the transport on 26.7+ and is ignored on 26.3. */}
            {method !== undefined && (
                <VersionKeyNotice
                    what="method"
                    status={methodStatus}
                    tag={tag}
                    message={methodStatus === 'accepted'
                        ? t("This config also sets method = \"{method}\", the alias of network that Xray {tag} reads first — so {method} is the transport that runs, whatever network says.", { method, tag })
                        : undefined}
                    actions={[
                        { label: t("Move it to network"), onClick: foldMethodIntoNetwork },
                        { label: t("Remove it"), onClick: () => removeStreamKeys(['method']) },
                    ]}
                />
            )}

            <div className="border-t border-slate-800/50 my-2" />

            {/* --- NETWORK SPECIFIC SETTINGS --- */}
            <NetworkSection
                streamSettings={streamSettings}
                onChange={onChange}
                net={net}
                isClient={isClient}
                protocol={protocol}
            />

            {/* Every settings object present is built, whichever transport is
                selected (v26.7.28:infra/conf/transport_internet.go:145), so a
                broken leftover stops the config from loading all the same. */}
            {leftovers.length > 0 && (
                <VersionKeyNotice
                    what={leftovers.join(', ')}
                    status="accepted"
                    tag={tag}
                    message={t("{keys} belong to another transport. Xray builds them anyway, so one that no longer loads stops the whole config.", { keys: leftovers.join(', ') })}
                    actions={[{ label: t("Remove them"), onClick: () => removeStreamKeys(leftovers) }]}
                />
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
                        spiderPaths={spiderPaths}
                        fieldEditors={REALITY_FIELD_EDITORS}
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
                            fieldEditors={REALITY_FIELD_EDITORS}
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
                                    onChange={e => tlsCertificates.onChange(withFirstCertificate(tlsCertificates.value, { certificateFile: e.target.value }))} />
                                <input className="input-base text-xs font-mono" placeholder={t("Private key file path (e.g. /path/to/private.key)")}
                                    value={tlsCertificates.value?.[0]?.keyFile || ""}
                                    onChange={e => tlsCertificates.onChange(withFirstCertificate(tlsCertificates.value, { keyFile: e.target.value }))} />
                            </div>
                        </div>
                    )}

                    <ForeignFieldNotice
                        fields={foreignFieldsIn(TLS_FIELDS, side, tlsSettings.value)}
                        side={side}
                    />

                    {tlsNotices.length > 0 && (
                        <div className="space-y-2">
                            {tlsNotices.map(notice => (
                                <VersionKeyNotice
                                    key={notice.key}
                                    what={notice.key === 'allowInsecure' ? 'allowInsecure: true' : `tlsSettings.${notice.key}`}
                                    status={notice.status}
                                    tag={tag}
                                    replacement={notice.replacement}
                                    actions={[{ label: t("Remove it"), onClick: () => removeTlsKeys([notice.key]) }]}
                                >
                                    {notice.key === 'allowInsecure' && (
                                        <p className="text-slate-500">
                                            {t("It turned off certificate checks. Pin the server certificate by its SHA-256, or name the certificate you expect, instead.")}
                                        </p>
                                    )}
                                </VersionKeyNotice>
                            ))}
                        </div>
                    )}

                    <SchemaForm
                        schema={TlsSchema}
                        value={tlsSettings.value || {}}
                        onChange={val => tlsSettings.onChange(val)}
                        errors={tlsFieldErrors}
                        excludeKeys={tlsExclude('basic')}
                        fieldConfigs={TLS_FIELD_CONFIGS()}
                        fieldEditors={TLS_FIELD_EDITORS}
                    />

                    {/* TLS EXTENDED SECTION */}
                    <ExtendedSection
                        title={t("Extended TLS Settings")}
                        description={t("Cipher suites, session resumption, certificate pinning, and SSLKEYLOGFILE.")}
                        hasActiveValues={hasAnyValue(tlsSettings.value, tlsKeys.filter(key => !tlsExclude('advanced').includes(key)))}
                    >
                        <SchemaForm
                            schema={TlsSchema}
                            value={tlsSettings.value || {}}
                            onChange={val => tlsSettings.onChange(val)}
                            errors={tlsFieldErrors}
                            excludeKeys={tlsExclude('advanced')}
                            fieldConfigs={TLS_FIELD_CONFIGS()}
                            fieldEditors={TLS_FIELD_EDITORS}
                        />
                    </ExtendedSection>
                </div>
            )}

            {/* FINALMASK (UDP/TCP Noise & QUIC) */}
            <FinalmaskEditor
                finalmask={streamSettings.finalmask}
                side={side}
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
                protocol={protocol}
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
