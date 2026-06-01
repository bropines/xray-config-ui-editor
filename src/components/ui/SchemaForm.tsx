import React from 'react';
import { z } from 'zod';
import { SchemaField, getSchemaTypeAndDetails } from './SchemaField';

// Standard field configurations for premium user experience
const STANDARD_FIELD_CONFIGS: Record<string, { label: string; help: string; placeholder?: string; options?: string[] }> = {
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
        placeholder: 'e.g. 5'
    },
    concurrency: {
        label: 'Concurrency',
        help: 'Number of concurrent ports to allocate.',
        placeholder: 'e.g. 3'
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
    }
};

interface SchemaFormProps {
    schema: z.ZodObject<any>;
    value: any;
    onChange: (newValue: any) => void;
    errors?: Record<string, string | undefined>;
    fieldConfigs?: Record<string, { label?: string; help?: string; placeholder?: string; options?: string[] }>;
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
            details.type === 'array' ||
            key.toLowerCase().includes('path') ||
            key.toLowerCase().includes('cert')
        ) {
            return 'col-span-full';
        }
        return '';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
            {keys.map(key => {
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
                        />
                    </div>
                );
            })}
        </div>
    );
};
