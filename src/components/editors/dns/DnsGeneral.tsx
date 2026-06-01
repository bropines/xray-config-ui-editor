import React from 'react';
import { SchemaForm } from '../../ui';
import { DnsSchema } from '../../../core/xray/schemas/dns.schema';

export const DnsGeneral = ({ dns, onChange }: any) => {
    return (
        <div className="space-y-6 animate-in fade-in">
            <SchemaForm
                schema={DnsSchema}
                value={dns}
                onChange={onChange}
                excludeKeys={['hosts', 'servers']}
                fieldConfigs={{
                    tag: {
                        label: 'DNS Tag (Inbound)',
                        placeholder: 'dns_inbound',
                        help: 'Tag for the DNS module (used for routing DNS queries).'
                    },
                    clientIp: {
                        label: 'Client IP',
                        placeholder: 'Your public IP (for ECS)',
                        help: 'Client IP for EDNS Client Subnet (global).'
                    },
                    queryStrategy: {
                        label: 'Query Strategy',
                        help: 'Global query strategy: UseIP (dual-stack), UseIPv4, UseIPv6.',
                        options: ['UseIP', 'UseIPv4', 'UseIPv6']
                    },
                    disableCache: {
                        label: 'Disable Cache',
                        help: 'Disable DNS cache globally.'
                    },
                    serveStale: {
                        label: 'Serve Stale Cache',
                        help: 'Serve stale/expired cache entries globally.'
                    },
                    serveExpiredTTL: {
                        label: 'Serve Expired TTL (sec)',
                        placeholder: 'e.g. 86400',
                        help: 'Extended TTL for stale cache entries globally.'
                    },
                    disableFallback: {
                        label: 'Disable Fallback',
                        help: 'Disable fallback when expectIPs/unexpectedIPs don\'t match.'
                    },
                    disableFallbackIfMatch: {
                        label: 'Disable Fallback If Match',
                        help: 'Disable fallback if at least one server matched.'
                    },
                    enableParallelQuery: {
                        label: 'Enable Parallel Query',
                        help: 'Enable parallel querying of all DNS servers.'
                    },
                    useSystemHosts: {
                        label: 'Use System Hosts',
                        help: 'Whether to use system hosts file.'
                    }
                }}
            />
        </div>
    );
};