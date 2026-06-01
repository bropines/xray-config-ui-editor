import React, { useEffect, useState } from 'react';
import { Button, SmartTagInput, SchemaForm } from '../../ui';
import { getDefaultGeoList } from '../../../utils/geo-data';
import { DnsServerObjectSchema } from '../../../core/xray/schemas/dns.schema';

export const DnsServerEditor = ({ server, onChange, onCancel }: any) => {
    const isString = typeof server === 'string';
    const [local, setLocal] = useState(isString ? { address: server } : { ...server });

    const [geoSites, setGeoSites] = useState([]);
    const [geoIps, setGeoIps] = useState([]);
    const [loadingGeo, setLoadingGeo] = useState(false);

    useEffect(() => {
        if (!isString) { 
            let isMounted = true;
            setLoadingGeo(true);
            Promise.all([
                getDefaultGeoList('geosite'),
                getDefaultGeoList('geoip')
            ]).then(([sites, ips]) => {
                if (isMounted) {
                    setGeoSites(sites);
                    setGeoIps(ips);
                    setLoadingGeo(false);
                }
            });
            return () => { isMounted = false; };
        }
    }, [isString]);

    const update = (field: string, val: any) => {
        setLocal(prev => ({ ...prev, [field]: val }));
    };

    const convertToAdvanced = () => {
        onChange({ address: server, domains: [], expectIPs: [] });
    };

    if (isString) {
        return (
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-6">
                <h3 className="text-sm font-bold text-white">Simple DNS Server</h3>
                <div>
                    <label className="label-xs">Address</label>
                    <input className="input-base font-mono" 
                        value={server} 
                        onChange={e => onChange(e.target.value)} 
                        placeholder="8.8.8.8 or https://..."
                    />
                </div>
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 text-center">
                    <p className="text-xs text-slate-400 mb-3">Need domains filtering or specific IPs?</p>
                    <Button variant="secondary" className="text-xs w-full" onClick={convertToAdvanced}>Convert to Advanced Object</Button>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="ghost" onClick={onCancel}>Done</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-4 h-full flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-indigo-400">Advanced Server Config</h3>
                <Button variant="ghost" onClick={() => onChange(local)}>Save & Close</Button>
            </div>

            <div className="overflow-y-auto custom-scroll flex-1 space-y-4 pr-2">
                <SchemaForm
                    schema={DnsServerObjectSchema}
                    value={local}
                    onChange={setLocal}
                    excludeKeys={['domains', 'expectIPs']}
                    fieldConfigs={{
                        address: {
                            label: 'Server Address',
                            help: 'DNS server address. E.g. 8.8.8.8, https://dns.google/dns-query, udp://1.1.1.1',
                            placeholder: '8.8.8.8'
                        },
                        port: {
                            label: 'Port',
                            help: 'DNS server port (default 53).',
                            placeholder: '53'
                        },
                        unexpectedIPs: {
                            label: 'Unexpected IPs (Optional)',
                            help: 'List of unexpected IPs (e.g. geoip:cn) that trigger fallback.',
                            placeholder: 'geoip:cn'
                        },
                        skipFallback: {
                            label: 'Skip Fallback',
                            help: 'Skip this server when other servers\' expectIPs match failed.'
                        },
                        finalQuery: {
                            label: 'Final Query',
                            help: 'If enabled, always query even if other servers already matched.'
                        },
                        timeoutMs: {
                            label: 'Timeout (ms)',
                            help: 'Per-server query timeout in milliseconds.',
                            placeholder: 'e.g. 5000'
                        },
                        clientIp: {
                            label: 'Client IP (ECS)',
                            help: 'Client IP for EDNS Client Subnet (ECS) on this server.',
                            placeholder: 'e.g. 1.2.3.4'
                        },
                        queryStrategy: {
                            label: 'Query Strategy',
                            help: 'Per-server query strategy: UseIP (dual-stack), UseIPv4, UseIPv6.',
                            options: ['UseIP', 'UseIPv4', 'UseIPv6']
                        },
                        disableCache: {
                            label: 'Disable Cache',
                            help: 'Disable DNS cache for this server.'
                        },
                        serveStale: {
                            label: 'Serve Stale',
                            help: 'Serve stale/expired cache entries from this server.'
                        },
                        serveExpiredTTL: {
                            label: 'Serve Expired TTL (sec)',
                            help: 'Extended TTL for stale cache entries in seconds.',
                            placeholder: 'e.g. 86400'
                        },
                        tag: {
                            label: 'Server Tag',
                            help: 'Unique tag for this server, used in DNS routing.',
                            placeholder: 'e.g. google-dns'
                        }
                    }}
                />

                <div className="pt-4 border-t border-slate-800">
                    <SmartTagInput 
                        label="Domains (Routing)" 
                        prefix="geosite:" 
                        placeholder="geosite:cn, google.com..." 
                        value={local.domains || []} 
                        onChange={v => update('domains', v)}
                        suggestions={geoSites}
                        isLoading={loadingGeo}
                    />
                </div>

                <div>
                    <SmartTagInput 
                        label="Expect IPs (Optional)" 
                        prefix="geoip:" 
                        placeholder="geoip:cn..." 
                        value={local.expectIPs || []} 
                        onChange={v => update('expectIPs', v)}
                        suggestions={geoIps}
                        isLoading={loadingGeo}
                    />
                </div>
            </div>
        </div>
    );
};