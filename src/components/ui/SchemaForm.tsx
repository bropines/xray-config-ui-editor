import React from 'react';
import { z } from 'zod';
import { SchemaField, getSchemaTypeAndDetails } from './SchemaField';
import type { TimeUnit } from './DurationInput';

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

// Standard field configurations for premium user experience
const STANDARD_FIELD_CONFIGS: Record<string, FieldConfig> = {
    tag: {
        label: 'Tag / Alias',
        help: 'Unique identifier for routing and logs.',
        placeholder: 'e.g. inbound-socks'
    },
    port: {
        label: 'Port',
        help: 'Port or port range (e.g. 1080 or 10000-20000) to listen on.',
        placeholder: 'e.g. 1080'
    },
    listen: {
        label: 'Listen Address',
        help: 'IP address to bind the listener to. Default is 0.0.0.0 (all interfaces).',
        placeholder: '0.0.0.0'
    },
    protocol: {
        label: 'Protocol',
        help: 'The protocol used to accept incoming traffic.',
    },
    enabled: {
        label: 'Enabled',
        help: 'Toggle to enable or disable this feature.',
    },
    destOverride: {
        label: 'Destination Override',
        help: 'Override target destination based on sniffed protocol (e.g., redirect HTTP to FakeDNS).',
        placeholder: 'http, tls, fakedns'
    },
    metadataOnly: {
        label: 'Metadata Only',
        help: 'Only sniff connection metadata (like SNI or IP headers) without inspecting actual payload.',
    },
    domainsExcluded: {
        label: 'Excluded Domains',
        help: 'List of domains to exclude from sniffing.',
        placeholder: 'e.g. bypass.com, internal.lan'
    },
    ipsExcluded: {
        label: 'Excluded IPs',
        help: 'List of IP addresses/CIDRs to exclude from sniffing.',
        placeholder: 'e.g. 127.0.0.1, 10.0.0.0/8'
    },
    routeOnly: {
        label: 'Route Only',
        help: 'Only use sniffed info for routing. Do not override destination.',
    },
    strategy: {
        label: 'Allocation Strategy',
        help: 'How ports are allocated: Always listen on all ports, or random port rotation.',
    },
    refresh: {
        label: 'Refresh Interval',
        help: 'Interval in minutes to refresh port allocation.',
        placeholder: 'e.g. 5',
        type: 'duration',
        defaultUnit: 'm',
        durationMode: 'number',
        baseUnit: 'm'
    },
    concurrency: {
        label: 'Concurrency',
        help: 'Number of concurrent ports to allocate.',
        placeholder: 'e.g. 3'
    },
    // Duration / Interval / Timeout settings
    probeInterval: {
        label: 'Probe Interval',
        help: 'Probe interval (e.g. "10s", "1m", "2h").',
        placeholder: '1m',
        type: 'duration',
        defaultUnit: 'm',
        durationMode: 'string'
    },
    interval: {
        label: 'Interval',
        help: 'Average probe interval per outbound. Min 10s.',
        placeholder: '1m',
        type: 'duration',
        defaultUnit: 'm',
        durationMode: 'string'
    },
    timeout: {
        label: 'Timeout',
        help: 'Probe timeout.',
        placeholder: '5s',
        type: 'duration',
        defaultUnit: 's',
        durationMode: 'string'
    },
    maxRTT: {
        label: 'Max RTT',
        help: 'Maximum acceptable RTT (e.g. "1s", "500ms").',
        placeholder: '1s',
        type: 'duration',
        defaultUnit: 's',
        durationMode: 'string'
    },
    handshake: {
        label: 'Handshake Timeout',
        help: 'Handshake timeout. Default: 4s.',
        placeholder: '4',
        type: 'duration',
        defaultUnit: 's',
        durationMode: 'number',
        baseUnit: 's'
    },
    connIdle: {
        label: 'Connection Idle Timeout',
        help: 'Connection idle timeout. Default: 300s.',
        placeholder: '300',
        type: 'duration',
        defaultUnit: 's',
        durationMode: 'number',
        baseUnit: 's'
    },
    uplinkOnly: {
        label: 'Uplink Only Timeout',
        help: 'Time to wait after downlink closes. Default: 2s.',
        placeholder: '2',
        type: 'duration',
        defaultUnit: 's',
        durationMode: 'number',
        baseUnit: 's'
    },
    downlinkOnly: {
        label: 'Downlink Only Timeout',
        help: 'Time to wait after uplink closes. Default: 5s.',
        placeholder: '5',
        type: 'duration',
        defaultUnit: 's',
        durationMode: 'number',
        baseUnit: 's'
    },
    timeoutMs: {
        label: 'Query Timeout',
        help: 'Per-server query timeout.',
        placeholder: '5000',
        type: 'duration',
        defaultUnit: 'ms',
        durationMode: 'number',
        baseUnit: 'ms'
    },
    serveExpiredTTL: {
        label: 'Serve Expired TTL',
        help: 'Extended TTL for stale cache entries.',
        placeholder: '86400',
        type: 'duration',
        defaultUnit: 's',
        durationMode: 'number',
        baseUnit: 's'
    },
    deduplication: {
        label: 'Deduplication Interval',
        help: 'Deduplication interval in seconds.',
        placeholder: '10',
        type: 'duration',
        defaultUnit: 's',
        durationMode: 'number',
        baseUnit: 's'
    },
    tcpKeepAliveIdle: {
        label: 'TCP Keep-Alive Idle',
        help: 'TCP keep-alive idle time.',
        placeholder: '300',
        type: 'duration',
        defaultUnit: 's',
        durationMode: 'number',
        baseUnit: 's'
    },
    tcpKeepAliveInterval: {
        label: 'TCP Keep-Alive Interval',
        help: 'TCP keep-alive interval.',
        placeholder: '0',
        type: 'duration',
        defaultUnit: 's',
        durationMode: 'number',
        baseUnit: 's'
    },
    tcpUserTimeout: {
        label: 'TCP User Timeout',
        help: 'TCP user timeout.',
        placeholder: '10000',
        type: 'duration',
        defaultUnit: 'ms',
        durationMode: 'number',
        baseUnit: 'ms'
    },
    scMinPostsIntervalMs: {
        label: 'Min Post Interval',
        help: 'Min interval between POSTs.',
        placeholder: '30',
        type: 'duration',
        defaultUnit: 'ms',
        durationMode: 'number',
        baseUnit: 'ms'
    },
    hKeepAlivePeriod: {
        label: 'Keep-Alive Period',
        help: 'H2/H3 keep-alive period in seconds.',
        placeholder: '45',
        type: 'duration',
        defaultUnit: 's',
        durationMode: 'number',
        baseUnit: 's'
    },
    // Reality Settings
    show: {
        label: 'Show Debug Logs',
        help: 'Print Reality keys and debug info to server log on startup.',
    },
    dest: {
        label: 'Destination Target',
        help: 'The target TLS server to mimic (domain:port). E.g. ads.x5.ru:443.',
        placeholder: 'ads.x5.ru:443'
    },
    xver: {
        label: 'PROXY Protocol Version (xver)',
        help: 'Sends PROXY protocol header to destination. 0: disable, 1: PROXY v1, 2: PROXY v2.',
        placeholder: '0'
    },
    serverNames: {
        label: 'Server Names (SNI List)',
        help: 'List of server names (SNI) that the server allows clients to use.',
        placeholder: 'e.g. ads.x5.ru, x5.ru'
    },
    privateKey: {
        label: 'Private Key',
        help: 'Reality private key (x25519). Keep this secret!',
        placeholder: 'xNz35zN9FfsM7e27mvyPdLIEuzKnSpoqd7qjjJJHxIw'
    },
    publicKey: {
        label: 'Public Key',
        help: 'Reality public key (x25519) to match private key.',
        placeholder: 'xNz35zN9FfsM...'
    },
    shortIds: {
        label: 'Short IDs',
        help: 'Hexadecimal strings used to authenticate clients. CSV or comma separated.',
        placeholder: 'e.g. 392562c0c3f46bbe'
    },
    fingerprint: {
        label: 'Fingerprint (uTLS)',
        help: 'TLS Client Hello fingerprint to simulate standard browser behavior.',
        options: ['chrome', 'firefox', 'safari', 'ios', 'android', 'edge', '360', 'qq', 'random', 'randomized']
    },
    spiderX: {
        label: 'SpiderX Path',
        help: 'Web spider crawl path to authenticate handshake.',
        placeholder: '/'
    },
    shortId: {
        label: 'Short ID',
        help: 'Specific short ID matching the server list.',
        placeholder: 'e.g. 392562c0'
    },
    minClientVer: {
        label: 'Min Client Version',
        help: 'Minimum required Xray client version (e.g. 1.8.0, 24.9.0, or 0.0.0 for any). Leave empty if not restricting.',
        placeholder: 'e.g. 1.8.0'
    },
    maxClientVer: {
        label: 'Max Client Version',
        help: 'Maximum allowed Xray client version (e.g. 1.8.24, 24.9.0, or 0.0.0 for any). Leave empty if not restricting.',
        placeholder: 'e.g. 0.0.0'
    },
    maxTimeDiff: {
        label: 'Max Time Difference',
        help: 'Maximum allowed timestamp difference between client and server.',
        placeholder: '60000',
        type: 'duration',
        defaultUnit: 'ms',
        durationMode: 'number',
        baseUnit: 'ms'
    },
    mldsa65Seed: {
        label: 'ML-DSA-65 Seed',
        help: 'Post-quantum signature seed (base64 string) for PQ-REALITY.',
        placeholder: 'Base64 seed string'
    },
    // TLS settings
    minVersion: {
        label: 'Min TLS Version',
        help: 'Minimum TLS version allowed for handshake.',
        options: ['1.2', '1.3', '1.1', '1.0']
    },
    maxVersion: {
        label: 'Max TLS Version',
        help: 'Maximum TLS version allowed for handshake.',
        options: ['1.3', '1.2', '1.1', '1.0']
    },
    allowInsecure: {
        label: 'Allow Insecure Connections',
        help: 'Disable TLS certificate verification (insecure, use with caution!).'
    },
    rejectUnknownSni: {
        label: 'Reject Unknown SNI',
        help: 'Reject connection attempts with unknown SNI.'
    },
    masterKeyLog: {
        label: 'Master Key Log File (SSLKEYLOGFILE)',
        help: 'File path to write TLS master keys for Wireshark traffic inspection/debugging.',
        placeholder: 'e.g. /var/log/xray/sslkey.log'
    },
    pinnedPeerCertSha256: {
        label: 'Pinned Peer Certificate SHA-256',
        help: 'Base64 SHA-256 hash for strict certificate pinning.',
        placeholder: 'Base64 hash string'
    },
    mldsa65Verify: {
        label: 'ML-DSA-65 Public Key (PQ-REALITY)',
        help: 'Post-Quantum signature verification key for client.',
        placeholder: 'Base64 verify key'
    },
    disableSystemRoot: {
        label: 'Disable System Root CA',
        help: 'Ignore system root certificates and only trust custom provided certificates.'
    },
    enableSessionResumption: {
        label: 'Enable Session Resumption',
        help: 'Allow TLS session ticket resumption to speed up re-connections.'
    },
    cipherSuites: {
        label: 'Cipher Suites',
        help: 'Colon-separated TLS cipher suites.',
        placeholder: 'e.g. TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384'
    },
    // Routing extended
    ruleTag: {
        label: 'Rule Tag / Alias',
        help: 'Unique identifier or label for this rule in stats and metrics.',
        placeholder: 'e.g. bypass-direct'
    },
    // DNS extended
    clientSubnet: {
        label: 'EDNS Client Subnet (ECS)',
        help: 'Client IP or CIDR network forwarded in DNS queries for CDN localization.',
        placeholder: 'e.g. 1.2.3.4 or 1.2.3.0/24'
    },
    fallbackStrategy: {
        label: 'DNS Fallback Strategy',
        help: 'Strategy for falling back to secondary DNS servers.',
        options: ['Disabled', 'Enabled', 'Always']
    },
    queryStrategy: {
        label: 'DNS Query Strategy',
        help: 'Preference for DNS query domain resolution.',
        options: ['UseIP', 'UseIPv4', 'UseIPv6']
    },
    cacheStrategy: {
        label: 'DNS Cache Strategy',
        help: 'Cache strategy for DNS query responses.',
        options: ['CacheOnQuery', 'CacheOnResolved']
    }
};

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
                        const standardConfig = STANDARD_FIELD_CONFIGS[key] || {};
                        
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
                        const standardConfig = STANDARD_FIELD_CONFIGS[key] || {};
                        
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
