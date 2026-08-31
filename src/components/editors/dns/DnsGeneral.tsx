import React from 'react';
import { SchemaForm, ExtendedSection } from '../../ui';
import { DnsSchema } from '../../../core/xray/schemas/dns.schema';

export const DnsGeneral = ({ dns, onChange }: any) => {
    const hasExtendedValues = (
        !!dns?.disableCache ||
        !!dns?.serveStale ||
        !!dns?.serveExpiredTTL ||
        !!dns?.disableFallback ||
        !!dns?.disableFallbackIfMatch ||
        !!dns?.fallbackStrategy ||
        !!dns?.cacheStrategy
    );

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Primary DNS Settings */}
            <SchemaForm
                schema={DnsSchema}
                value={dns}
                onChange={onChange}
                excludeKeys={[
                    'hosts', 'servers',
                    'disableCache', 'serveStale', 'serveExpiredTTL',
                    'disableFallback', 'disableFallbackIfMatch',
                    'fallbackStrategy', 'cacheStrategy'
                ]}
                fieldConfigs={{
                    tag: {
                        label: 'DNS Tag (Inbound)',
                        placeholder: 'dns_inbound',
                        help: 'Tag for the DNS module (used for routing DNS queries).'
                    },
                    clientIp: {
                        label: 'Client IP (ECS)',
                        placeholder: 'Your public IP (for ECS)',
                        help: 'Client IP for EDNS Client Subnet (global).'
                    },
                    queryStrategy: {
                        label: 'Query Strategy',
                        help: 'Global query strategy: UseIP (dual-stack), UseIPv4, UseIPv6.',
                        options: ['UseIP', 'UseIPv4', 'UseIPv6']
                    },
                    enableParallelQuery: {
                        label: 'Enable Parallel Query',
                        help: 'Enable parallel querying of all DNS servers simultaneously.'
                    },
                    useSystemHosts: {
                        label: 'Use System Hosts',
                        help: 'Whether to use system hosts file.'
                    }
                }}
            />

            {/* Extended DNS Options */}
            <ExtendedSection
                title="Extended DNS Cache & Fallback Settings"
                description="Stale cache serving, fallback strategies, and TTL expiration tuning."
                hasActiveValues={hasExtendedValues}
                activeCount={hasExtendedValues ? 1 : 0}
            >
                <SchemaForm
                    schema={DnsSchema}
                    value={dns}
                    onChange={onChange}
                    excludeKeys={[
                        'hosts', 'servers', 'tag', 'clientIp', 'queryStrategy',
                        'enableParallelQuery', 'useSystemHosts'
                    ]}
                    fieldConfigs={{
                        disableCache: {
                            label: 'Disable Cache',
                            help: 'Disable DNS cache globally.'
                        },
                        serveStale: {
                            label: 'Serve Stale Cache',
                            help: 'Serve stale/expired cache entries when upstream is slow or unresponsive.'
                        },
                        serveExpiredTTL: {
                            label: 'Serve Expired TTL',
                            placeholder: 'e.g. 86400',
                            help: 'Extended TTL for serving stale cache entries.'
                        },
                        disableFallback: {
                            label: 'Disable Fallback',
                            help: 'Disable fallback when expectIPs/unexpectedIPs do not match.'
                        },
                        disableFallbackIfMatch: {
                            label: 'Disable Fallback If Match',
                            help: 'Disable fallback if at least one server matched.'
                        },
                        fallbackStrategy: {
                            label: 'Fallback Strategy',
                            help: 'When to fallback to secondary DNS servers.',
                            options: ['Disabled', 'Enabled', 'Always']
                        },
                        cacheStrategy: {
                            label: 'Cache Strategy',
                            help: 'Cache strategy for DNS query responses.',
                            options: ['CacheOnQuery', 'CacheOnResolved']
                        }
                    }}
                />
            </ExtendedSection>
        </div>
    );
};