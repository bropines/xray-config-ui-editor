import React from 'react';
import { SchemaForm, ExtendedSection } from '../../ui';
import { DnsSchema } from '../../../core/xray/schemas/dns.schema';
import { t } from '../../../i18n';

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
                        label: t("DNS Tag (Inbound)"),
                        placeholder: t("dns_inbound"),
                        help: t("Tag for the DNS module (used for routing DNS queries).")
                    },
                    clientIp: {
                        label: t("Client IP (ECS)"),
                        placeholder: t("Your public IP (for ECS)"),
                        help: t("Client IP for EDNS Client Subnet (global).")
                    },
                    queryStrategy: {
                        label: t("Query Strategy"),
                        help: t("Global query strategy: UseIP (dual-stack), UseIPv4, UseIPv6."),
                        options: ['UseIP', 'UseIPv4', 'UseIPv6']
                    },
                    enableParallelQuery: {
                        label: t("Enable Parallel Query"),
                        help: t("Enable parallel querying of all DNS servers simultaneously.")
                    },
                    useSystemHosts: {
                        label: t("Use System Hosts"),
                        help: t("Whether to use system hosts file.")
                    }
                }}
            />

            {/* Extended DNS Options */}
            <ExtendedSection
                title={t("Extended DNS Cache & Fallback Settings")}
                description={t("Stale cache serving, fallback strategies, and TTL expiration tuning.")}
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
                            label: t("Disable Cache"),
                            help: t("Disable DNS cache globally.")
                        },
                        serveStale: {
                            label: t("Serve Stale Cache"),
                            help: t("Serve stale/expired cache entries when upstream is slow or unresponsive.")
                        },
                        serveExpiredTTL: {
                            label: t("Serve Expired TTL"),
                            placeholder: 'e.g. 86400',
                            help: t("Extended TTL for serving stale cache entries.")
                        },
                        disableFallback: {
                            label: t("Disable Fallback"),
                            help: t("Disable fallback when expectIPs/unexpectedIPs do not match.")
                        },
                        disableFallbackIfMatch: {
                            label: t("Disable Fallback If Match"),
                            help: t("Disable fallback if at least one server matched.")
                        },
                        fallbackStrategy: {
                            label: t("Fallback Strategy"),
                            help: t("When to fallback to secondary DNS servers."),
                            options: ['Disabled', 'Enabled', 'Always']
                        },
                        cacheStrategy: {
                            label: t("Cache Strategy"),
                            help: t("Cache strategy for DNS query responses."),
                            options: ['CacheOnQuery', 'CacheOnResolved']
                        }
                    }}
                />
            </ExtendedSection>
        </div>
    );
};