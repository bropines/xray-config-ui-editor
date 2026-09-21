import React from 'react';
import { z } from 'zod';
import { SchemaField, getSchemaTypeAndDetails } from './SchemaField';
import type { TimeUnit } from './DurationInput';
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
    publicKey: {
        label: t("Public Key"),
        help: t("Reality public key (x25519) to match private key."),
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
        help: t("Web spider crawl path to authenticate handshake."),
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
    pinnedPeerCertSha256: {
        label: t("Pinned Peer Certificate SHA-256"),
        help: t("Base64 SHA-256 hash for strict certificate pinning."),
        placeholder: t("Base64 hash string")
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
}

export const SchemaForm = ({
    schema,
    value = {},
    onChange,
    errors = {},
    fieldConfigs = {},
    excludeKeys = []
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

    const getColSpanClass = (key: string, zodType: z.ZodTypeAny) => {
        const details = getSchemaTypeAndDetails(zodType);
        if (
            key.toLowerCase().includes('path') ||
            key.toLowerCase().includes('cert')
        ) {
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

                        const colSpanClass = getColSpanClass(key, fieldSchema);

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
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
