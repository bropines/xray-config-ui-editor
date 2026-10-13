import React from 'react';
import { z } from 'zod';
import { SchemaField } from './SchemaField';
import { getSchemaTypeAndDetails, humanizeKey } from './schema-introspection';
import type { TimeUnit } from './duration';
import { perLanguage, t } from '../../i18n';

export interface FieldConfig {
    label?: string;
    help?: string;
    placeholder?: string;
    options?: string[];
    type?: 'string' | 'number' | 'boolean' | 'enum' | 'duration' | 'array';
    unitOptions?: TimeUnit[];
    defaultUnit?: TimeUnit;
    durationMode?: 'string' | 'number';
    baseUnit?: TimeUnit;
}

// Standard field configurations for premium user experience. Built through
// perLanguage because a plain const would freeze the labels at import time.
const standardFieldConfigs = perLanguage((): Record<string, FieldConfig> => ({
    tag: {
        label: t("Tag / Alias"),
        help: t("Unique identifier for routing and logs."),
        placeholder: t("e.g. inbound-socks")
    },
    port: {
        label: t("Port"),
        help: t("Port or port range (e.g. 1080 or 10000-20000) to listen on."),
        placeholder: 'e.g. 1080'
    },
    listen: {
        label: t("Listen Address"),
        help: t("IP address to bind the listener to. Default is 0.0.0.0 (all interfaces)."),
        placeholder: '0.0.0.0'
    },
    protocol: {
        label: t("Protocol"),
        help: t("The protocol used to accept incoming traffic."),
    },
    enabled: {
        label: t("Enabled"),
        help: t("Toggle to enable or disable this feature."),
    },
    destOverride: {
        label: t("Destination Override"),
        help: t("Override target destination based on sniffed protocol (e.g., redirect HTTP to FakeDNS)."),
        placeholder: t("http, tls, fakedns")
    },
    metadataOnly: {
        label: t("Metadata Only"),
        help: t("Only sniff connection metadata (like SNI or IP headers) without inspecting actual payload."),
    },
    domainsExcluded: {
        label: t("Excluded Domains"),
        help: t("List of domains to exclude from sniffing."),
        placeholder: t("e.g. bypass.com, internal.lan")
    },
    ipsExcluded: {
        label: t("Excluded IPs"),
        help: t("List of IP addresses/CIDRs to exclude from sniffing."),
        placeholder: 'e.g. 127.0.0.1, 10.0.0.0/8'
    },
    routeOnly: {
        label: t("Route Only"),
        help: t("Only use sniffed info for routing. Do not override destination."),
    },
    strategy: {
        label: t("Allocation Strategy"),
        help: t("How ports are allocated: Always listen on all ports, or random port rotation."),
    },
    refresh: {
        label: t("Refresh Interval"),
        help: t("Interval in minutes to refresh port allocation."),
        placeholder: 'e.g. 5',
        type: 'duration',
        defaultUnit: 'm',
        durationMode: 'number',
        baseUnit: 'm'
    },
    concurrency: {
        label: t("Concurrency"),
        help: t("Number of concurrent ports to allocate."),
        placeholder: 'e.g. 3'
    },
    // Duration / Interval / Timeout settings
    probeInterval: {
        label: t("Probe Interval"),
        help: 'Probe interval (e.g. "10s", "1m", "2h").',
        placeholder: '1m',
        type: 'duration',
        defaultUnit: 'm',
        durationMode: 'string'
    },
    interval: {
        label: t("Interval"),
        help: t("Average probe interval per outbound. Min 10s."),
        placeholder: '1m',
        type: 'duration',
        defaultUnit: 'm',
        durationMode: 'string'
    },
    timeout: {
        label: t("Timeout"),
        help: t("Probe timeout."),
        placeholder: '5s',
        type: 'duration',
        defaultUnit: 's',
        durationMode: 'string'
    },
    maxRTT: {
        label: t("Max RTT"),
        help: 'Maximum acceptable RTT (e.g. "1s", "500ms").',
        placeholder: '1s',
        type: 'duration',
        defaultUnit: 's',
        durationMode: 'string'
    },
    handshake: {
        label: t("Handshake Timeout"),
        help: t("Handshake timeout. Default: 4s."),
        placeholder: '4',
        type: 'duration',
        defaultUnit: 's',
        durationMode: 'number',
        baseUnit: 's'
    },
    connIdle: {
        label: t("Connection Idle Timeout"),
        help: t("Connection idle timeout. Default: 300s."),
        placeholder: '300',
        type: 'duration',
        defaultUnit: 's',
        durationMode: 'number',
        baseUnit: 's'
    },
    uplinkOnly: {
        label: t("Uplink Only Timeout"),
        help: t("Time to wait after downlink closes. Default: 2s."),
        placeholder: '2',
        type: 'duration',
        defaultUnit: 's',
        durationMode: 'number',
        baseUnit: 's'
    },
    downlinkOnly: {
        label: t("Downlink Only Timeout"),
        help: t("Time to wait after uplink closes. Default: 5s."),
        placeholder: '5',
        type: 'duration',
        defaultUnit: 's',
        durationMode: 'number',
        baseUnit: 's'
    },
    timeoutMs: {
        label: t("Query Timeout"),
        help: t("Per-server query timeout."),
        placeholder: '5000',
        type: 'duration',
        defaultUnit: 'ms',
        durationMode: 'number',
        baseUnit: 'ms'
    },
    serveExpiredTTL: {
        label: t("Serve Expired TTL"),
        help: t("Extended TTL for stale cache entries."),
        placeholder: '86400',
        type: 'duration',
        defaultUnit: 's',
        durationMode: 'number',
        baseUnit: 's'
    },
    deduplication: {
        label: t("Deduplication Interval"),
        help: t("Deduplication interval in seconds."),
        placeholder: '10',
        type: 'duration',
        defaultUnit: 's',
        durationMode: 'number',
        baseUnit: 's'
    },
    tcpKeepAliveIdle: {
        label: t("TCP Keep-Alive Idle"),
        help: t("TCP keep-alive idle time."),
        placeholder: '300',
        type: 'duration',
        defaultUnit: 's',
        durationMode: 'number',
        baseUnit: 's'
    },
    tcpKeepAliveInterval: {
        label: t("TCP Keep-Alive Interval"),
        help: t("TCP keep-alive interval."),
        placeholder: '0',
        type: 'duration',
        defaultUnit: 's',
        durationMode: 'number',
        baseUnit: 's'
    },
    tcpUserTimeout: {
        label: t("TCP User Timeout"),
        help: t("TCP user timeout."),
        placeholder: '10000',
        type: 'duration',
        defaultUnit: 'ms',
        durationMode: 'number',
        baseUnit: 'ms'
    },
    scMinPostsIntervalMs: {
        label: t("Min Post Interval"),
        help: t("Min interval between POSTs."),
        placeholder: '30',
        type: 'duration',
        defaultUnit: 'ms',
        durationMode: 'number',
        baseUnit: 'ms'
    },
    hKeepAlivePeriod: {
        label: t("Keep-Alive Period"),
        help: t("H2/H3 keep-alive period in seconds."),
        placeholder: '45',
        type: 'duration',
        defaultUnit: 's',
        durationMode: 'number',
        baseUnit: 's'
    },
    // Reality Settings
    show: {
        label: t("Show Debug Logs"),
        help: t("Print Reality keys and debug info to server log on startup."),
    },
    target: {
        label: t("Handshake Target"),
        help: t("The real TLS server REALITY forwards unrecognised traffic to (domain:port). Setting it is what puts REALITY in server mode. `dest` is the older name for this same field — set one, not both."),
        placeholder: t("ads.x5.ru:443")
    },
    dest: {
        label: t("Handshake Target (dest)"),
        help: t("The older name for `target`, still accepted by the core. Configs written by panels usually use this one. Set either, not both."),
        placeholder: t("ads.x5.ru:443")
    },
    xver: {
        label: t("PROXY Protocol Version (xver)"),
        help: t("Sends PROXY protocol header to destination. 0: disable, 1: PROXY v1, 2: PROXY v2."),
        placeholder: '0'
    },
    serverNames: {
        label: t("Server Names (SNI List)"),
        help: t("List of server names (SNI) that the server allows clients to use."),
        placeholder: t("e.g. ads.x5.ru, x5.ru")
    },
    privateKey: {
        label: t("Private Key"),
        help: t("Reality private key (x25519). Keep this secret!"),
        placeholder: t("xNz35zN9FfsM7e27mvyPdLIEuzKnSpoqd7qjjJJHxIw")
    },
    password: {
        label: t("Server Public Key"),
        help: t("The server's REALITY public key (x25519) — the half that pairs with its private key. Newer xray-core renamed the field from `publicKey` to `password`; it is not a passphrase and there is nothing to invent here. Set this or `publicKey`, not both."),
        placeholder: t("xNz35zN9FfsM...")
    },
    publicKey: {
        label: t("Server Public Key (publicKey)"),
        help: t("The older name for `password`, still accepted by the core. Links and configs written before the rename use this one. Set either, not both."),
        placeholder: t("xNz35zN9FfsM...")
    },
    shortIds: {
        label: t("Short IDs"),
        help: t("Hexadecimal strings used to authenticate clients. CSV or comma separated."),
        placeholder: t("e.g. 392562c0c3f46bbe")
    },
    fingerprint: {
        label: t("Fingerprint (uTLS)"),
        help: t("TLS Client Hello fingerprint to simulate standard browser behavior."),
        options: ['chrome', 'firefox', 'safari', 'ios', 'android', 'edge', '360', 'qq', 'random', 'randomized']
    },
    spiderX: {
        label: t("SpiderX Path"),
        help: t("Path the client requests on the target site after the handshake. A path the target actually serves is best — the dice only makes one that looks real."),
        placeholder: '/'
    },
    shortId: {
        label: t("Short ID"),
        help: t("Specific short ID matching the server list."),
        placeholder: 'e.g. 392562c0'
    },
    minClientVer: {
        label: t("Min Client Version"),
        help: t("Minimum required Xray client version (e.g. 1.8.0, 24.9.0, or 0.0.0 for any). Leave empty if not restricting."),
        placeholder: 'e.g. 1.8.0'
    },
    maxClientVer: {
        label: t("Max Client Version"),
        help: t("Maximum allowed Xray client version (e.g. 1.8.24, 24.9.0, or 0.0.0 for any). Leave empty if not restricting."),
        placeholder: 'e.g. 0.0.0'
    },
    maxTimeDiff: {
        label: t("Max Time Difference"),
        help: t("Maximum allowed timestamp difference between client and server."),
        placeholder: '60000',
        type: 'duration',
        defaultUnit: 'ms',
        durationMode: 'number',
        baseUnit: 'ms'
    },
    mldsa65Seed: {
        label: t("ML-DSA-65 Seed"),
        help: t("Post-quantum signature seed (base64 string) for PQ-REALITY."),
        placeholder: t("Base64 seed string")
    },
    // TLS settings
    minVersion: {
        label: t("Min TLS Version"),
        help: t("Minimum TLS version allowed for handshake."),
        options: ['1.2', '1.3', '1.1', '1.0']
    },
    maxVersion: {
        label: t("Max TLS Version"),
        help: t("Maximum TLS version allowed for handshake."),
        options: ['1.3', '1.2', '1.1', '1.0']
    },
    allowInsecure: {
        label: t("Allow Insecure Connections"),
        help: t("Disable TLS certificate verification (insecure, use with caution!).")
    },
    rejectUnknownSni: {
        label: t("Reject Unknown SNI"),
        help: t("Reject connection attempts with unknown SNI.")
    },
    masterKeyLog: {
        label: t("Master Key Log File (SSLKEYLOGFILE)"),
        help: t("File path to write TLS master keys for Wireshark traffic inspection/debugging."),
        placeholder: t("e.g. /var/log/xray/sslkey.log")
    },
    // Hex, not Base64: Build() splits on commas, strips colons and runs
    // hex.DecodeString, then demands 32 bytes — and returns the error, so a
    // Base64 hash stops the config loading rather than failing to match
    // (v26.7.28:infra/conf/transport_security.go:364-380, identical in
    // v26.9.9 and at v26.3.27:infra/conf/transport_internet.go:717-733). What
    // is hashed is the whole certificate, DER
    // (v26.7.28:transport/internet/tls/pin.go:14), the leaf or a CA the peer
    // sends (v26.7.28:transport/internet/tls/config.go:561-580; :559-578 at
    // v26.3.27) — the number `xray tls hash` prints on every line
    // (v26.7.28:main/commands/all/tls/hash.go:70). The reading itself, and the
    // check the editor shows next to this field, is core/xray/security-fields.
    pinnedPeerCertSha256: {
        label: t("Pinned Peer Certificate SHA-256"),
        help: t("SHA-256 of the certificate to expect — the server's own, or a CA in the chain it sends — as 64 hex digits. Colons between bytes are fine, and several hashes go in this one field separated by commas. `xray tls hash --cert fullchain.pem` prints it. Not Base64: Xray refuses the config when this is anything but hex."),
        placeholder: t("64 hex digits, e.g. e3b0c44298fc1c14…7852b855")
    },
    mldsa65Verify: {
        label: t("ML-DSA-65 Public Key (PQ-REALITY)"),
        help: t("Post-Quantum signature verification key for client."),
        placeholder: t("Base64 verify key")
    },
    disableSystemRoot: {
        label: t("Disable System Root CA"),
        help: t("Ignore system root certificates and only trust custom provided certificates.")
    },
    enableSessionResumption: {
        label: t("Enable Session Resumption"),
        help: t("Allow TLS session ticket resumption to speed up re-connections.")
    },
    cipherSuites: {
        label: t("Cipher Suites"),
        help: t("Colon-separated TLS cipher suites."),
        placeholder: t("e.g. TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384")
    },
    // Routing extended
    ruleTag: {
        label: t("Rule Tag / Alias"),
        help: t("Unique identifier or label for this rule in stats and metrics."),
        placeholder: t("e.g. bypass-direct")
    },
    // DNS extended
    clientSubnet: {
        label: t("EDNS Client Subnet (ECS)"),
        help: t("Client IP or CIDR network forwarded in DNS queries for CDN localization."),
        placeholder: t("e.g. 1.2.3.4 or 1.2.3.0/24")
    },
    fallbackStrategy: {
        label: t("DNS Fallback Strategy"),
        help: t("Strategy for falling back to secondary DNS servers."),
        options: ['Disabled', 'Enabled', 'Always']
    },
    queryStrategy: {
        label: t("DNS Query Strategy"),
        help: t("Preference for DNS query domain resolution."),
        options: ['UseIP', 'UseIPv4', 'UseIPv6']
    },
    cacheStrategy: {
        label: t("DNS Cache Strategy"),
        help: t("Cache strategy for DNS query responses."),
        options: ['CacheOnQuery', 'CacheOnResolved']
    }
}));

interface SchemaFormProps {
    schema: z.ZodObject<any>;
    value: any;
    onChange: (newValue: any) => void;
    errors?: Record<string, string | undefined>;
    fieldConfigs?: Record<string, FieldConfig>;
    excludeKeys?: string[];
    /**
     * Real paths on the REALITY target, forwarded to the spiderX field's
     * generator. Threaded through as a prop because this folder may not read
     * the store.
     */
    spiderPaths?: string[];
    /**
     * Editors for keys that deserve better than the generic one — a key whose
     * object has a small fixed shape is drawn as its real fields, with units,
     * instead of as JSON. The form still decides whether the key is shown
     * (`excludeKeys`) and where; the editor decides how.
     *
     * A prop rather than a registry inside this folder, because such an
     * editor usually wants the core version or the store, and nothing under
     * `ui/` may read either.
     */
    fieldEditors?: Record<string, (field: FieldEditorProps) => React.ReactNode>;
}

export interface FieldEditorProps {
    name: string;
    /** Whatever the config holds, of whatever type — the editor must cope. */
    value: unknown;
    /** `undefined` removes the key. */
    onChange: (next: unknown) => void;
    label: string;
    help?: string;
    error?: string;
}

export const SchemaForm = ({
    schema,
    value = {},
    onChange,
    errors = {},
    fieldConfigs = {},
    excludeKeys = [],
    spiderPaths,
    fieldEditors = {}
}: SchemaFormProps) => {
    const shape = schema.shape;
    const keys = Object.keys(shape).filter(k => !excludeKeys.includes(k));

    const handleFieldChange = (key: string, fieldValue: any) => {
        const newValue = { ...value };
        if (fieldValue === undefined || fieldValue === '') {
            delete newValue[key];
        } else {
            newValue[key] = fieldValue;
        }
        onChange(newValue);
    };

    const getColSpanClass = (key: string) => {
        if (
            key.toLowerCase().includes('path') ||
            key.toLowerCase().includes('cert')
        ) {
            return 'col-span-full';
        }
        // A JSON box, or a custom editor with fields of its own, in half a
        // row is a box nobody can read.
        const kind = getSchemaTypeAndDetails(shape[key]).type;
        if (fieldEditors[key] || kind === 'object' || kind === 'record' || kind === 'unknown') {
            return 'col-span-full';
        }
        return '';
    };

    const toggleKeys = keys.filter(key => getSchemaTypeAndDetails(shape[key]).type === 'boolean');
    const otherKeys = keys.filter(key => getSchemaTypeAndDetails(shape[key]).type !== 'boolean');

    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            {toggleKeys.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800/50">
                    {toggleKeys.map(key => {
                        const fieldSchema = shape[key];
                        const customConfig = fieldConfigs[key] || {};
                        const standardConfig = standardFieldConfigs()[key] || {};
                        
                        const label = customConfig.label ?? standardConfig.label;
                        const help = customConfig.help ?? standardConfig.help ?? (fieldSchema._def?.description);

                        return (
                            <div key={key} className="flex items-center">
                                <SchemaField
                                    name={key}
                                    schema={fieldSchema}
                                    value={value[key]}
                                    onChange={val => handleFieldChange(key, val)}
                                    error={errors[key]}
                                    label={label}
                                    help={help}
                                    type={customConfig.type ?? standardConfig.type}
                                    unitOptions={customConfig.unitOptions ?? standardConfig.unitOptions}
                                    defaultUnit={customConfig.defaultUnit ?? standardConfig.defaultUnit}
                                    durationMode={customConfig.durationMode ?? standardConfig.durationMode}
                                    baseUnit={customConfig.baseUnit ?? standardConfig.baseUnit}
                                    spiderPaths={spiderPaths}
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            {otherKeys.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {otherKeys.map(key => {
                        const fieldSchema = shape[key];
                        const customConfig = fieldConfigs[key] || {};
                        const standardConfig = standardFieldConfigs()[key] || {};
                        
                        const label = customConfig.label ?? standardConfig.label;
                        const help = customConfig.help ?? standardConfig.help ?? (fieldSchema._def?.description);
                        const placeholder = customConfig.placeholder ?? standardConfig.placeholder;
                        const options = customConfig.options ?? standardConfig.options;

                        const colSpanClass = getColSpanClass(key);

                        const custom = fieldEditors[key];
                        if (custom) {
                            return (
                                <div key={key} className={colSpanClass}>
                                    {custom({
                                        name: key,
                                        value: value[key],
                                        onChange: val => handleFieldChange(key, val),
                                        label: label ?? humanizeKey(key),
                                        help,
                                        error: errors[key],
                                    })}
                                </div>
                            );
                        }

                        return (
                            <div key={key} className={colSpanClass}>
                                <SchemaField
                                    name={key}
                                    schema={fieldSchema}
                                    value={value[key]}
                                    onChange={val => handleFieldChange(key, val)}
                                    error={errors[key]}
                                    label={label}
                                    help={help}
                                    placeholder={placeholder}
                                    options={options}
                                    type={customConfig.type ?? standardConfig.type}
                                    unitOptions={customConfig.unitOptions ?? standardConfig.unitOptions}
                                    defaultUnit={customConfig.defaultUnit ?? standardConfig.defaultUnit}
                                    durationMode={customConfig.durationMode ?? standardConfig.durationMode}
                                    baseUnit={customConfig.baseUnit ?? standardConfig.baseUnit}
                                    spiderPaths={spiderPaths}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
